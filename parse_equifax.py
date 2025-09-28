from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Literal, Optional, Tuple

from models import Account, CreditReport, Inquiry
from text_utils import clean_text


SUMMARY_HDR = re.compile(r"^\s*Your Credit Report Summary\s*$", re.I | re.M)
PERSONAL_HDR = re.compile(r"^\s*Personal Information\s*$", re.I | re.M)
ACCOUNTS_HDR = re.compile(r"^\s*Credit Accounts\s*$", re.I | re.M)
INQUIRIES_HDR = re.compile(r"^\s*Inquiries\s*$", re.I | re.M)


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


MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _detect_months_header(block: str) -> Optional[List[str]]:
  for ln in block.splitlines():
    if re.search(r"\bJan\b.*\bDec\b", ln):
      # Extract order of month tokens from the header line
      toks = [t for t in re.findall(r"Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec", ln)]
      if len(toks) >= 6:
        # Ensure unique order; fallback to default if weird
        seen = []
        for t in toks:
          if t not in seen:
            seen.append(t)
        return seen
  return None


def _parse_payment_grid(block: str) -> List[Dict[str, Any]]:
  out: List[Dict[str, Any]] = []
  months = _detect_months_header(block) or MONTHS_ABBR
  # Look for lines starting with a year followed by tokens (OK/30/60/etc.)
  year_line = re.compile(r"^\s*(?P<y>20\d{2})[:\-\s]+(?P<rest>.+)$")
  for ln in block.splitlines():
    m = year_line.match(ln)
    if not m:
      continue
    y = int(m.group("y"))
    rest = m.group("rest")
    # Split by whitespace; filter empty
    tokens = [t for t in re.split(r"\s+", rest) if t]
    # Sometimes separators like '|' are used
    if "|" in rest and len(tokens) < 6:
      tokens = [t.strip() for t in rest.split("|") if t.strip()]
    for idx, tok in enumerate(tokens[: len(months)]):
      mon = months[idx]
      # Normalize rating token
      rating = tok
      if rating in {"--", "ND", "N/A", "*"}:
        continue
      # Map month name to MM
      try:
        mm = f"{MONTHS_ABBR.index(mon.capitalize()) + 1:02d}"
      except ValueError:
        continue
      out.append(
        {
          "month": f"{y}-{mm}",
          "balance": None,
          "scheduled_payment": None,
          "rating": rating,
        }
      )
  return out


def _map_kind(text: Optional[str]) -> Literal[
  "revolving",
  "mortgage",
  "installment",
  "open",
  "lease",
  "student",
  "other",
]:
  t = (text or "").lower()
  if "revolving" in t or "credit card" in t:
    return "revolving"
  if "mortgage" in t or "home" in t:
    return "mortgage"
  if "student" in t or "education" in t:
    return "student"
  if "lease" in t:
    return "lease"
  if any(k in t for k in ["installment", "auto", "loan"]):
    return "installment"
  if t.startswith("open"):
    return "open"
  return "other"


def _map_status(status: Optional[str], narratives: List[str]) -> Literal[
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
  joined = (" ".join(narratives)).lower()
  hay = f"{s} {joined}"
  if "pays as agreed" in hay or ("open" in s and "never late" in hay):
    return "current"
  if "paid" in hay and "closed" in hay:
    return "closed"
  if "transfer" in hay and "sold" in hay:
    # Prefer sold if both present
    return "sold"
  if "transfer" in hay:
    return "transferred"
  if "sold" in hay:
    return "sold"
  if "collection" in hay:
    return "collection"
  if "charge-off" in hay or "charge off" in hay or "chargeoff" in hay:
    return "chargeoff"
  if any(k in hay for k in ["30", "60", "90", "120", "late", "delinquent"]):
    return "delinquent"
  if "closed" in hay:
    return "closed"
  if "paid" in hay:
    return "paid"
  return "open"


def _extract_accounts(section: str) -> Tuple[List[Account], List[str]]:
  accounts: List[Account] = []
  raw_blocks: List[str] = []

  lines = section.splitlines()
  # Identify blocks around occurrences of "Account Number"
  idxs = [i for i, ln in enumerate(lines) if re.search(r"Account\s*Number", ln, re.I)]
  for k, i in enumerate(idxs):
    start = max(0, i - 8)
    end = idxs[k + 1] if k + 1 < len(idxs) else len(lines)
    block = "\n".join(lines[start:end])
    raw_blocks.append(block)

    # creditor: first non-empty line above the Account Number that doesn't look like a label
    creditor = None
    for j in range(i - 1, start - 1, -1):
      cand = lines[j].strip()
      if not cand:
        continue
      if re.search(r":|Date|Balance|Status|Credit|Loan|Owner|Responsibil|Narrative|Payment|Account Type|High", cand, re.I):
        continue
      creditor = cand
      break

    def find(pat: str) -> Optional[str]:
      m = re.search(pat, block, re.I)
      return m.group(1).strip() if m else None

    account_number = find(r"Account\s*Number\s*:?\s*([^\n]+)")
    owner = find(r"(?:Owner|Responsibility)\s*:?\s*([^\n]+)")
    date_opened = _parse_date(find(r"Date\s*Opened\s*:?\s*([\w/\-]+)"))
    date_closed = _parse_date(find(r"Date\s*Closed\s*:?\s*([\w/\-]+)"))
    date_reported = _parse_date(find(r"Date\s*Reported\s*:?\s*([\w/\-]+)"))  # unused but may inform recency
    balance = _to_float(find(r"\bBalance\s*:?\s*([$\d,\.]+)"))
    credit_limit = _to_float(find(r"Credit\s*Limit\s*:?\s*([$\d,\.]+)"))
    high_credit = _to_float(find(r"High\s*Credit\s*:?\s*([$\d,\.]+)"))
    loan_type = find(r"(?:Loan|Account)\s*Type\s*:?\s*([^\n]+)")
    status_raw = find(r"Status\s*:?\s*([^\n]+)")
    narratives_line = find(r"Narrative\s*Code\(s\)\s*:?\s*([^\n]+)") or ""
    narratives = [s.strip() for s in re.split(r",|;|/", narratives_line) if s.strip()]

    payment_history = _parse_payment_grid(block)

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
    high_credit = clamp_nonneg(high_credit)
    balance = clamp_nonneg(balance)
    if credit_limit is None and high_credit is not None:
      credit_limit = clamp_limit(high_credit)

    accounts.append(
      Account(
        creditor=creditor or "",
        masked_number=(account_number or None),
        kind=_map_kind(loan_type),
        status=_map_status(status_raw, narratives),
        responsibility=owner,
        opened_on=date_opened,
        closed_on=date_closed,
        credit_limit=credit_limit,
        high_balance=high_credit,
        balance=balance,
        scheduled_payment=None,
        past_due=None,
        payment_history=payment_history,
        remarks=narratives,
      )
    )

  return accounts, raw_blocks


DATE_PAT = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})")


def _parse_inquiries(section: str) -> Tuple[List[Inquiry], List[str]]:
  inquiries: List[Inquiry] = []
  blocks: List[str] = []
  if not section.strip():
    return inquiries, blocks

  for ln in section.splitlines():
    if not ln.strip():
      continue
    m = DATE_PAT.search(ln)
    if not m:
      continue
    dt = _parse_date(m.group(1))
    name = ln[: m.start()].strip(" -:")
    if name and dt:
      # Treat as hard inquiries unless labeled otherwise (not commonly)
      inquiries.append(Inquiry(name=name, kind="hard", date=dt))
      blocks.append(ln)
  return inquiries, blocks


def parse(text: str) -> CreditReport:
  """Parse an Equifax report text into a CreditReport model.

  Anchors: "Your Credit Report Summary", "Personal Information", "Credit Accounts", "Inquiries".
  Account blocks include many labeled fields and a yearly payment grid plus Narrative Codes.
  """
  text = clean_text(text)
  summary_s, summary_e = _find_span(text, SUMMARY_HDR, [PERSONAL_HDR, ACCOUNTS_HDR, INQUIRIES_HDR])
  personal_s, personal_e = _find_span(text, PERSONAL_HDR, [ACCOUNTS_HDR, INQUIRIES_HDR])
  accounts_s, accounts_e = _find_span(text, ACCOUNTS_HDR, [INQUIRIES_HDR])
  inquiries_s, inquiries_e = _find_span(text, INQUIRIES_HDR, [])

  summary_section = text[summary_s:summary_e] if summary_s != -1 else ""
  personal_section = text[personal_s:personal_e] if personal_s != -1 else ""
  accounts_section = text[accounts_s:accounts_e] if accounts_s != -1 else ""
  inquiries_section = text[inquiries_s:inquiries_e] if inquiries_s != -1 else ""

  accounts, account_blocks = _extract_accounts(accounts_section)
  inquiries, inquiry_blocks = _parse_inquiries(inquiries_section)

  report = CreditReport(
    bureau="equifax",
    pulled_on=None,
    person={},
    accounts=accounts,
    inquiries=inquiries,
    public_records=[],
    summary={},
    raw_chunks=[
      summary_section,
      personal_section,
      accounts_section,
      inquiries_section,
      *account_blocks,
      *inquiry_blocks,
    ],
  )
  return report


__all__ = ["parse"]
