from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Literal, Optional, Tuple

from models import Account, CreditReport, Inquiry, PublicRecord
from text_utils import clean_text


ACCOUNTS_HDR = re.compile(r"^\s*Accounts\s*$", re.I | re.M)
PUBLIC_HDR = re.compile(r"^\s*Public\s+Records\s*$", re.I | re.M)
HARD_HDR = re.compile(r"^\s*Hard\s+Inquiries\b.*$", re.I | re.M)
SOFT_HDR = re.compile(r"^\s*Soft\s+Inquiries\b.*$", re.I | re.M)
ACCOUNT_INFO_HDR = re.compile(r"^\s*Account Info\s*$", re.I | re.M)
BAL_HIST_HDR = re.compile(r"^\s*Balance Histories\s*$", re.I | re.M)


def _find_span(text: str, start_pat: re.Pattern[str], end_pats: Iterable[re.Pattern[str]]) -> Tuple[int, int]:
  m = start_pat.search(text)
  if not m:
    return (-1, -1)
  start = m.end()
  end = len(text)
  for pat in end_pats:
    m2 = pat.search(text, start)
    if m2:
      end = min(end, m2.start())
  return (start, end)


def _to_float(s: Optional[str]) -> Optional[float]:
  if not s:
    return None
  s2 = s.replace(",", "").replace("$", "").strip()
  try:
    return float(s2)
  except Exception:
    return None


def _parse_date(s: Optional[str]) -> Optional[date]:
  if not s:
    return None
  s = s.strip()
  fmts = ["%m/%d/%Y", "%m/%Y", "%Y-%m", "%b %Y", "%b-%Y", "%Y"]
  for f in fmts:
    try:
      return datetime.strptime(s, f).date()
    except Exception:
      continue
  m = re.search(r"([A-Za-z]{3,9})\s+(\d{4})", s)
  if m:
    for fmt in ("%b %Y", "%B %Y"):
      try:
        return datetime.strptime(f"{m.group(1)} {m.group(2)}", fmt).date()
      except Exception:
        pass
  m = re.search(r"(\d{4})[-/](\d{2})", s)
  if m:
    try:
      return datetime.strptime(f"{m.group(1)}-{m.group(2)}", "%Y-%m").date()
    except Exception:
      pass
  return None


def _month_to_yyyymm(s: str) -> Optional[str]:
  s = s.strip()
  m = re.match(r"(\d{4})[-/](\d{2})", s)
  if m:
    return f"{m.group(1)}-{m.group(2)}"
  m = re.match(r"(\d{2})/(\d{4})", s)
  if m:
    return f"{m.group(2)}-{m.group(1)}"
  m = re.match(r"([A-Za-z]{3,9})\s+(\d{4})", s)
  if m:
    for fmt in ("%b %Y", "%B %Y"):
      try:
        d = datetime.strptime(f"{m.group(1)} {m.group(2)}", fmt)
        return d.strftime("%Y-%m")
      except Exception:
        pass
  return None


def _map_kind(account_type: Optional[str]) -> Literal[
  "revolving",
  "mortgage",
  "installment",
  "open",
  "lease",
  "student",
  "other",
]:
  at = (account_type or "").lower()
  if "credit card" in at:
    return "revolving"
  if "mortgage" in at or "conventional" in at:
    return "mortgage"
  if "education" in at or "student" in at:
    return "student"
  if "lease" in at:
    return "lease"
  if any(k in at for k in ["auto", "installment", "personal loan", "loan"]):
    return "installment"
  if at.startswith("open"):
    return "open"
  return "other"


def _map_status(status: Optional[str]) -> Literal[
  "open",
  "closed",
  "transferred",
  "sold",
  "paid",
  "collection",
  "chargeoff",
  "delinquent",
  "current",
]:
  s = (status or "").lower()
  if "open" in s and "never late" in s:
    return "current"
  if "paid" in s and "closed" in s:
    return "closed"
  if "transferred" in s:
    return "transferred"
  if "sold" in s:
    return "sold"
  if "collection" in s:
    return "collection"
  if "charge-off" in s or "charge off" in s or "chargeoff" in s:
    return "chargeoff"
  if any(k in s for k in ["30", "60", "90", "120", "late", "delinquent"]):
    return "delinquent"
  if "closed" in s:
    return "closed"
  if "paid" in s:
    return "paid"
  return "open"


def _parse_balance_histories(block: str) -> List[Dict[str, Any]]:
  # Find the Balance Histories section within the account card
  m = BAL_HIST_HDR.search(block)
  out: List[Dict[str, Any]] = []
  if not m:
    return out
  tail = block[m.end():]
  lines = tail.splitlines()

  # Skip table header lines (containing Date | Balance | Scheduled Payment | Paid)
  i = 0
  while i < len(lines) and not re.search(r"Date\s*\|", lines[i]):
    # Sometimes header line can be on the same or next line; advance cautiously
    i += 1
  if i < len(lines):
    i += 1  # move past header

  for ln in lines[i:]:
    if not ln.strip():
      # Allow blanks; continue until next header/card
      continue
    # Accept pipe-separated or space-separated variants
    # Example: "Aug 2024 | $0 | $0 | Yes" or "2024-08  $0  $0  Yes"
    parts = [p.strip() for p in ln.split("|")]
    if len(parts) >= 4:
      month = _month_to_yyyymm(parts[0])
      if not month:
        continue
      out.append(
        {
          "month": month,
          "balance": _to_float(parts[1]),
          "scheduled_payment": _to_float(parts[2]),
          "rating": parts[3],
        }
      )
      continue

    # Fallback regex when not pipe-separated
    mrow = re.match(
      r"\s*(?P<month>(?:\d{4}[-/]\d{2}|[A-Za-z]{3,9}\s+\d{4}))\s+"
      r"(?P<bal>[$\d,\.]+)\s+(?P<sch>[$\d,\.]+)\s+(?P<paid>\S+)",
      ln,
    )
    if mrow:
      month = _month_to_yyyymm(mrow.group("month"))
      if not month:
        continue
      out.append(
        {
          "month": month,
          "balance": _to_float(mrow.group("bal")),
          "scheduled_payment": _to_float(mrow.group("sch")),
          "rating": mrow.group("paid"),
        }
      )
    else:
      # stop if another section header appears
      if re.search(r"Account Info|Payment History|Remarks|Status|Accounts|Public Records|Hard Inquiries|Soft Inquiries", ln, re.I):
        break
  return out


def _parse_accounts(section: str) -> Tuple[List[Account], List[str]]:
  accounts: List[Account] = []
  raw_blocks: List[str] = []

  lines = section.splitlines()
  indices = [i for i, ln in enumerate(lines) if ACCOUNT_INFO_HDR.match(ln or "")]
  for idx, i in enumerate(indices):
    start_line = max(0, i - 5)  # include a few lines above for account header/name
    end_line = indices[idx + 1] if idx + 1 < len(indices) else len(lines)
    block_lines = lines[start_line:end_line]
    block = "\n".join(block_lines)
    raw_blocks.append(block)

    # Creditor / Account Name
    creditor = None
    # Prefer labeled field if present
    m = re.search(r"Account Name:?\s*([^\n]+)", block, re.I)
    if m:
      creditor = m.group(1).strip()
    if not creditor:
      # fallback: non-empty line above the Account Info header
      for j in range(i - 1, start_line - 1, -1):
        if lines[j].strip():
          creditor = lines[j].strip()
          break

    def find(pat: str) -> Optional[str]:
      m = re.search(pat, block, re.I)
      return m.group(1).strip() if m else None

    account_type = find(r"Account Type:?\s*([^\n]+)")
    responsibility = find(r"Responsibility:?\s*([^\n]+)")
    date_opened = _parse_date(find(r"Date Opened:?\s*([\w/\-]+)"))
    status_raw = find(r"Status:?\s*([^\n]+)")
    monthly_payment = _to_float(find(r"Monthly Payment:?\s*([$\d,\.]+)"))
    credit_limit = _to_float(find(r"Credit Limit:?\s*([$\d,\.]+)"))
    highest_balance = _to_float(find(r"Highest Balance:?\s*([$\d,\.]+)"))
    balance = _to_float(find(r"\bBalance:?\s*([$\d,\.]+)"))
    masked_number = find(r"(?:Account Number|Acct\s*#|Account\s*#)\s*:?\s*([^\n]+)")

    payment_history = _parse_balance_histories(block)

    # Numeric guardrails and fallbacks
    def clamp_limit(x: Optional[float]) -> Optional[float]:
      if x is None:
        return None
      if x < 100 or x > 10_000_000:
        return None
      return x

    def clamp_nonneg(x: Optional[float]) -> Optional[float]:
      if x is None:
        return None
      return max(0.0, x)

    credit_limit = clamp_limit(credit_limit)
    highest_balance = clamp_nonneg(highest_balance)
    balance = clamp_nonneg(balance)
    monthly_payment = clamp_nonneg(monthly_payment)

    if credit_limit is None and highest_balance is not None:
      credit_limit = clamp_limit(highest_balance)

    accounts.append(
      Account(
        creditor=creditor or "",
        masked_number=(masked_number or None),
        kind=_map_kind(account_type),
        status=_map_status(status_raw),
        responsibility=responsibility,
        opened_on=date_opened,
        closed_on=None,
        credit_limit=credit_limit,
        high_balance=highest_balance,
        balance=balance,
        scheduled_payment=monthly_payment,
        past_due=None,
        payment_history=payment_history,
        remarks=[],
      )
    )

  return accounts, raw_blocks


DATE_PAT = re.compile(
  r"(\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})"
)


def _parse_inquiries(section: str, kind: Literal["hard", "soft"]) -> Tuple[List[Inquiry], List[str]]:
  inquiries: List[Inquiry] = []
  blocks: List[str] = []
  if not section.strip():
    return inquiries, blocks

  lines = section.splitlines()
  for i, ln in enumerate(lines):
    if not ln.strip():
      continue
    m = DATE_PAT.search(ln)
    if m:
      dt = _parse_date(m.group(1))
      name = ln[: m.start()].strip(" -:") or (lines[i - 1].strip() if i > 0 else "")
      if name and dt:
        inquiries.append(Inquiry(name=name, kind=kind, date=dt))
        blocks.append(ln)
        continue
    # Alternative format: "Inquiry Date: mm/dd/yyyy" possibly on same or next line
    m2 = re.search(r"Inquiry\s*Date\s*:?\s*(\d{1,2}/\d{1,2}/\d{4})", ln, re.I)
    if m2:
      dt = _parse_date(m2.group(1))
      name = ln.split("Inquiry Date")[0].strip(" -:") or (lines[i - 1].strip() if i > 0 else "")
      if name and dt:
        inquiries.append(Inquiry(name=name, kind=kind, date=dt))
        blocks.append(ln)

  # Fallback heuristic: some lines have the name and the date on the next line or offset by a bullet
  if not inquiries and kind == "hard":
    for i, ln in enumerate(lines):
      # Skip headers/help lines
      if re.search(r"Hard\s+Inquiries|Soft\s+Inquiries|Inquiries|help|about", ln, re.I):
        continue
      # Look for a date on this or next two lines
      date_val: Optional[str] = None
      date_idx: Optional[int] = None
      for j in range(0, 3):
        k = i + j
        if k < len(lines):
          ml = DATE_PAT.search(lines[k])
          if ml:
            date_val = ml.group(1)
            date_idx = k
            break
      if not date_val:
        continue
      # Choose a name: prefer the line at i if it looks like a company name
      def looks_like_name(s: str) -> bool:
        s = s.strip(" -:\t\u2022\uf0b7")
        return bool(re.search(r"[A-Za-z]", s)) and not re.search(r"^Inquiry|Date|^\$|\d{3}[-\s]?\d{3}", s, re.I)
      candidates = []
      if looks_like_name(ln):
        candidates.append(ln)
      # Else search previous two lines for a name
      for j in range(1, 3):
        if i - j >= 0 and looks_like_name(lines[i - j]):
          candidates.append(lines[i - j])
      # Or the line after the date
      if date_idx is not None and date_idx + 1 < len(lines) and looks_like_name(lines[date_idx + 1]):
        candidates.append(lines[date_idx + 1])
      name = (candidates[0] if candidates else "").strip(" -:\t\u2022\uf0b7")
      dt = _parse_date(date_val)
      if name and dt:
        inquiries.append(Inquiry(name=name, kind=kind, date=dt))
        blocks.append(f"{name} {date_val}")

  
  return inquiries, blocks


def _parse_public_records(section: str) -> Tuple[List[PublicRecord], List[str]]:
  records: List[PublicRecord] = []
  chunks: List[str] = []
  if not section.strip():
    return records, chunks
  # Heuristic: each non-empty paragraph with a recognizable type and date
  paragraphs = [p.strip() for p in re.split(r"\n\s*\n", section) if p.strip()]
  for para in paragraphs:
    # Detect a type keyword
    type_match = re.search(r"(bankruptcy|lien|judgment|foreclosure)", para, re.I)
    date_match = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", para)
    pr_type = (type_match.group(1).lower() if type_match else "public_record")
    pr_date = _parse_date(date_match.group(1)) if date_match else None
    records.append(PublicRecord(type=pr_type, date=pr_date, details={"text": para}))
    chunks.append(para)
  return records, chunks


def parse(text: str) -> CreditReport:
  """Parse an Experian report text into a CreditReport model.

  Expected anchors: "Accounts", "Public Records", "Hard Inquiries", "Soft Inquiries".
  Each account card includes "Account Info" and a "Balance Histories" table:
  Date | Balance | Scheduled Payment | Paid.
  """
  text = clean_text(text)
  acc_s, acc_e = _find_span(text, ACCOUNTS_HDR, [PUBLIC_HDR, HARD_HDR, SOFT_HDR])
  accounts_section = text[acc_s:acc_e] if acc_s != -1 else ""

  pub_s, pub_e = _find_span(text, PUBLIC_HDR, [HARD_HDR, SOFT_HDR])
  public_section = text[pub_s:pub_e] if pub_s != -1 else ""

  hard_s, hard_e = _find_span(text, HARD_HDR, [SOFT_HDR])
  hard_section = text[hard_s:hard_e] if hard_s != -1 else ""

  soft_s, soft_e = _find_span(text, SOFT_HDR, [])
  soft_section = text[soft_s:soft_e] if soft_s != -1 else ""

  accounts, account_blocks = _parse_accounts(accounts_section)
  hard_inquiries, hard_blocks = _parse_inquiries(hard_section, "hard")
  # If section appears to have dates but parsing yielded none, add a minimal placeholder
  if not hard_inquiries and hard_section.strip():
    m_any_date = re.search(
      r"(\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})",
      hard_section,
    )
    if m_any_date:
      dt = _parse_date(m_any_date.group(1))
      # Choose a name: first non-header non-empty line in the section
      lines_h = [ln.strip() for ln in hard_section.splitlines() if ln.strip()]
      name = ""
      for ln in lines_h:
        if re.search(r"Hard\s+Inquiries|help|about|Your\s+report|This\s+section", ln, re.I):
          continue
        if re.search(r"\d{1,2}/\d{1,2}/|\d{4}-\d{2}-\d{2}", ln):
          continue
        if re.search(r"^Inquiry|^Date", ln, re.I):
          continue
        if re.search(r"[A-Za-z]", ln):
          name = ln
          break
      if not name:
        name = "Hard Inquiry"
      if dt:
        hard_inquiries.append(Inquiry(name=name, kind="hard", date=dt))
        hard_blocks.append(f"{name} {dt}")
  soft_inquiries, soft_blocks = _parse_inquiries(soft_section, "soft")
  public_records, public_blocks = _parse_public_records(public_section)

  report = CreditReport(
    bureau="experian",
    pulled_on=None,
    person={},
    accounts=accounts,
    inquiries=[*hard_inquiries, *soft_inquiries],
    public_records=public_records,
    summary={},
    raw_chunks=[
      accounts_section,
      public_section,
      hard_section,
      soft_section,
      *account_blocks,
      *public_blocks,
      *hard_blocks,
      *soft_blocks,
    ],
  )
  return report


__all__ = ["parse"]
