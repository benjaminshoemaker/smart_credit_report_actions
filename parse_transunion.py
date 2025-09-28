from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Literal, Optional, Tuple

from models import Account, CreditReport, Inquiry
from text_utils import clean_text


ACCOUNTS_HDR = re.compile(r"^\s*Satisfactory Accounts\s*$", re.I | re.M)
INQUIRIES_HDR = re.compile(r"^\s*Inquiries\s*$", re.I | re.M)
PROMO_HDR = re.compile(r"^\s*Promotional Inquiries\s*$", re.I | re.M)
REVIEW_HDR = re.compile(r"^\s*Account Review Inquiries\s*$", re.I | re.M)
ACCOUNT_INFO_HDR = re.compile(r"^\s*Account Information\s*$", re.I | re.M)


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
    # Try to normalize MMM YYYY with extra punctuation
    m = re.search(r"([A-Za-z]{3})[\s/-](\d{4})", s)
    if m:
        try:
            return datetime.strptime(f"{m.group(1)} {m.group(2)}", "%b %Y").date()
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
    # Try YYYY-MM
    m = re.match(r"(\d{4})[-/](\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    # Try MMM YYYY
    m = re.match(r"([A-Za-z]{3,9})\s+(\d{4})", s)
    if m:
        try:
            d = datetime.strptime(f"{m.group(1)} {m.group(2)}", "%b %Y")
        except ValueError:
            try:
                d = datetime.strptime(f"{m.group(1)} {m.group(2)}", "%B %Y")
            except ValueError:
                return None
        return d.strftime("%Y-%m")
    # Try MM/YYYY
    m = re.match(r"(\d{2})/(\d{4})", s)
    if m:
        return f"{m.group(2)}-{m.group(1)}"
    return None


def _map_kind(account_type: str, loan_type: Optional[str]) -> Literal[
    "revolving",
    "mortgage",
    "installment",
    "open",
    "lease",
    "student",
    "other",
]:
    at = (account_type or "").lower()
    lt = (loan_type or "").lower()
    if "revolving" in at or "revolving" in lt:
        return "revolving"
    if "mortgage" in at or "mortgage" in lt:
        return "mortgage"
    if "installment" in at or "installment" in lt:
        return "installment"
    if "lease" in at or "lease" in lt:
        return "lease"
    if "student" in at or "student" in lt:
        return "student"
    if at.startswith("open") or "open account" in at:
        return "open"
    return "other"


def _map_status(pay_status: str, remarks: List[str]) -> Literal[
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
    ps = (pay_status or "").lower()
    joined = " ".join(remarks).lower()
    hay = f"{ps} {joined}"
    if "current account" in hay or re.search(r"\bcurrent\b", ps):
        return "current"
    if "paid" in hay and "closed" in hay:
        return "closed"
    if "transferred" in hay:
        return "transferred"
    if re.search(r"\bsold\b", hay):
        return "sold"
    if "collection" in hay:
        return "collection"
    if "charge-off" in hay or "chargeoff" in hay or "charge off" in hay:
        return "chargeoff"
    if any(k in hay for k in ["30", "60", "90", "120", "late", "delinquent"]):
        return "delinquent"
    # Fallbacks
    if "closed" in hay:
        return "closed"
    return "open"


def _parse_payment_history(block: str) -> List[Dict[str, Any]]:
    # Look for header indicating table
    out: List[Dict[str, Any]] = []
    if not re.search(r"Balance\s*/\s*Past Due\s*/\s*Scheduled Payment\s*/\s*Rating", block, re.I):
        return out

    # Lines after the header until a blank line or next header-like string
    lines = block.splitlines()
    start = None
    for i, ln in enumerate(lines):
        if re.search(r"Balance\s*/\s*Past Due\s*/\s*Scheduled Payment\s*/\s*Rating", ln, re.I):
            start = i + 1
            break
    if start is None:
        return out

    for ln in lines[start:]:
        if not ln.strip():
            # Allow blank lines within a multi-page table; continue until next header
            continue
        # Expect something like: "Aug 2024   $120  $0  $120  OK"
        # or "2024-08 $120 $0 $120 30"
        m = re.match(
            r"\s*(?P<month>(?:\d{4}[-/]\d{2}|[A-Za-z]{3,9}\s+\d{4}))\s+"
            r"(?P<bal>[$\d,\.]+)\s+(?P<past>[$\d,\.]+)\s+(?P<sch>[$\d,\.]+)\s+(?P<rating>\S+)",
            ln,
        )
        if not m:
            # Some rows may have month then columns separated by slashes
            m2 = re.match(
                r"\s*(?P<month>(?:\d{4}[-/]\d{2}|[A-Za-z]{3,9}\s+\d{4}))\s+"
                r"(?P<bal>[$\d,\.]+)\s*/\s*(?P<past>[$\d,\.]+)\s*/\s*(?P<sch>[$\d,\.]+)\s*/\s*(?P<rating>\S+)",
                ln,
            )
            if not m2:
                # Stop if we hit another heading-like line
                if re.search(r"Account Information|Pay Status|Remarks|Account Type|Satisfactory Accounts|Inquiries|Promotional Inquiries|Account Review Inquiries", ln, re.I):
                    break
                continue
            m = m2
        month = _month_to_yyyymm(m.group("month"))
        if not month:
            continue
        out.append(
            {
                "month": month,
                "balance": _to_float(m.group("bal")),
                "scheduled_payment": _to_float(m.group("sch")),
                "past_due": _to_float(m.group("past")),
                "rating": m.group("rating"),
            }
        )
    return out


def _parse_accounts(section: str) -> Tuple[List[Account], List[str]]:
    accounts: List[Account] = []
    raw_blocks: List[str] = []

    # Identify every "Account Information" occurrence and build blocks
    lines = section.splitlines()
    indices = [i for i, ln in enumerate(lines) if ACCOUNT_INFO_HDR.match(ln or "")]
    for idx, i in enumerate(indices):
        start_line = max(0, i - 3)  # include a couple lines before to catch creditor name
        end_line = indices[idx + 1] if idx + 1 < len(indices) else len(lines)
        block_lines = lines[start_line:end_line]
        # Creditor is the non-empty line immediately above the heading
        creditor = None
        for j in range(i - 1, start_line - 1, -1):
            if lines[j].strip():
                creditor = lines[j].strip()
                break
        # Extend search window slightly beyond the next header to capture trailing fields
        extended_end = min(end_line + 20, len(lines))
        block_ext_lines = lines[start_line:extended_end]
        block = "\n".join(block_lines)
        block_ext = "\n".join(block_ext_lines)
        raw_blocks.append(block)

        # Field extraction within the block
        def find(pattern: str) -> Optional[str]:
            m = re.search(pattern, block, re.I)
            return m.group(1).strip() if m else None

        monthly_payment = _to_float(find(r"Monthly Payment:?\s*([$\d,\.]+)"))
        date_opened = _parse_date(find(r"Date Opened:?\s*([\w/\-]+)"))
        date_closed = _parse_date(find(r"Date Closed:?\s*([\w/\-]+)"))
        responsibility = find(r"Responsibility:?\s*([^\n]+)")
        account_type = find(r"Account Type:?\s*([^\n]+)")
        loan_type = find(r"Loan Type:?\s*([^\n]+)")
        balance = _to_float(find(r"\bBalance:?\s*([$\d,\.]+)"))
        # Prefer searches on extended block for fields that may trail
        def find_ext(pattern: str) -> Optional[str]:
            m = re.search(pattern, block_ext, re.I)
            return m.group(1).strip() if m else None

        credit_limit = _to_float(find_ext(r"Credit Limit(?:\s*\(Hist\.\))?:?\s*([$\d,\.]+)"))
        if credit_limit is None:
            credit_limit = _to_float(find_ext(r"Credit Limit\s*\(Hist\.\)\s*:?\s*([$\d,\.]+)"))
        if credit_limit is None:
            # Fallback: capture any amount on the 'Credit Limit' line
            credit_limit = _to_float(find_ext(r"Credit Limit[^\n]*?([$\d,\.]+)"))
        if credit_limit is None:
            # Fallback: number may be on next line after the label
            mcl = re.search(r"Credit Limit[^\n]*?\n\s*([$\d,\.]+)", block_ext, re.I)
            if mcl:
                credit_limit = _to_float(mcl.group(1))
        if credit_limit is None:
            # Broad fallback: search anywhere after the label within 80 chars
            mcl2 = re.search(r"Credit\s*Limit[\s:\-\(\)A-Za-z/]*([$\d,\.,\xa0]+)", block_ext, re.I)
            if mcl2:
                amt = mcl2.group(1).replace("\xa0", "")
                credit_limit = _to_float(amt)
        if credit_limit is None:
            # Very broad fallback: any 'Limit' label with amount
            mcl3 = re.search(r"\bLimit\b[^\n]*?([$\d,\.,\xa0]+)", block_ext, re.I)
            if mcl3:
                credit_limit = _to_float(mcl3.group(1).replace("\xa0", ""))
        if credit_limit is None:
            # Heuristic: grab the largest currency amount near the 'Credit Limit' label
            pos = re.search(r"Credit\s*Limit", block_ext, re.I)
            if pos:
                window = block_ext[pos.start() : pos.start() + 1500]
                nums = re.findall(r"[$\s]*([\d,]+(?:\.\d+)?)", window)
                if nums:
                    vals = [
                        _to_float(n.replace("\xa0", "")) for n in nums if _to_float(n) is not None
                    ]
                    if vals:
                        credit_limit = max(vals)  # choose max as limit
        if credit_limit is None:
            # Final fallback: pick a large currency value in the account block as limit candidate
            nums_all = re.findall(r"[$\s]*([\d,]+(?:\.\d+)?)", block_ext)
            vals_all = [
                _to_float(n.replace("\xa0", "")) for n in nums_all if _to_float(n) is not None
            ]
            # Prefer values >= 10000 as plausible limits for revolving accounts
            candidates = [v for v in vals_all if v is not None and v >= 10000]
            if candidates:
                # If we have a known balance, ensure limit exceeds it by some margin
                best = max(candidates)
                if balance is None or best >= max(balance * 1.5, 1000):
                    credit_limit = best
        high_balance = _to_float(find_ext(r"High Balance(?:\s*\(Hist\.\))?:?\s*([$\d,\.]+)"))
        if high_balance is None:
            high_balance = _to_float(find_ext(r"High Balance\s*\(Hist\.\)\s*:?\s*([$\d,\.]+)"))
        if high_balance is None:
            high_balance = _to_float(find_ext(r"High Balance[^\n]*?([$\d,\.]+)"))
        if high_balance is None:
            mhi = re.search(r"High Balance[^\n]*?\n\s*([$\d,\.]+)", block_ext, re.I)
            if mhi:
                high_balance = _to_float(mhi.group(1))
        pay_status = find(r"Pay Status:?\s*([^\n]+)") or ""
        terms = find(r"Terms:?\s*([^\n]+)")
        masked_number = find(r"(?:Account Number|Acct\s*#|Account\s*#)\s*:?\s*([^\n]+)")

        # Remarks: capture lines after a 'Remarks' label until blank line or next heading
        remarks: List[str] = []
        rm = re.search(r"Remarks:?\s*([^\n]+)", block, re.I)
        if rm:
            remarks.append(rm.group(1).strip())

        payment_history = _parse_payment_history(block_ext)

        kind = _map_kind(account_type or "", loan_type)
        status = _map_status(pay_status, remarks)

        # Numeric guardrails
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
        high_balance = clamp_nonneg(high_balance)
        balance = clamp_nonneg(balance)
        monthly_payment = clamp_nonneg(monthly_payment)
        past_due_val = clamp_nonneg(_to_float(find(r"Past Due:?\s*([$\d,\.]+)")))

        # Prefer limit; if missing, use latest high balance as proxy
        if credit_limit is None and high_balance is not None:
            credit_limit = clamp_limit(high_balance)

        accounts.append(
            Account(
                creditor=creditor or "",
                masked_number=(masked_number or None),
                kind=kind,
                status=status,
                responsibility=responsibility,
                opened_on=date_opened,
                closed_on=date_closed,
                credit_limit=credit_limit,
                high_balance=high_balance,
                balance=balance,
                scheduled_payment=monthly_payment,
                past_due=past_due_val,
                payment_history=payment_history,
                remarks=remarks,
            )
        )

    return accounts, raw_blocks


DATE_PAT = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})")


def _parse_inquiries(section: str, kind: Literal["hard", "soft", "promotional", "account_review"]) -> Tuple[List[Inquiry], List[str]]:
    inquiries: List[Inquiry] = []
    blocks: List[str] = []
    if not section.strip():
        return inquiries, blocks

    lines = [ln for ln in section.splitlines()]
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = DATE_PAT.search(ln)
        name: Optional[str] = None
        dt: Optional[date] = None
        if m:
            dt = _parse_date(m.group(1))
            name_part = ln[: m.start()].strip(" -:")
            if name_part:
                name = name_part
            else:
                # fallback to previous non-empty line
                j = i - 1
                while j >= 0 and not name:
                    if lines[j].strip():
                        name = lines[j].strip()
                        break
                    j -= 1
            blk = ln
            blocks.append(blk)
            if name and dt:
                inquiries.append(Inquiry(name=name, kind=kind, date=dt))
        else:
            # Look for "Inquiry Date: mm/dd/yyyy" pattern
            m2 = re.search(r"Inquiry Date\s*:?\s*(\d{1,2}/\d{1,2}/\d{4})", ln, re.I)
            if m2:
                dt = _parse_date(m2.group(1))
                # name likely on same line before label or previous line
                name = ln.split("Inquiry Date")[0].strip(" -:") or (lines[i - 1].strip() if i > 0 else None)
                blocks.append(ln)
                if name and dt:
                    inquiries.append(Inquiry(name=name, kind=kind, date=dt))
        i += 1

    return inquiries, blocks


def parse(text: str) -> CreditReport:
    """Parse a TransUnion report text into a CreditReport model.

    Heuristics expect sections with headings like:
    - "Satisfactory Accounts" followed by per-account "Account Information" blocks.
    - "Inquiries", "Promotional Inquiries", "Account Review Inquiries".
    """
    # Clean text to remove icons and page breaks
    text = clean_text(text)
    # Sections
    acc_s, acc_e = _find_span(
        text, ACCOUNTS_HDR, [INQUIRIES_HDR, PROMO_HDR, REVIEW_HDR]
    )
    accounts_section = text[acc_s:acc_e] if acc_s != -1 else ""

    inq_s, inq_e = _find_span(text, INQUIRIES_HDR, [PROMO_HDR, REVIEW_HDR])
    inq_section = text[inq_s:inq_e] if inq_s != -1 else ""

    promo_s, promo_e = _find_span(text, PROMO_HDR, [REVIEW_HDR])
    promo_section = text[promo_s:promo_e] if promo_s != -1 else ""

    rev_s, rev_e = _find_span(text, REVIEW_HDR, [])
    review_section = text[rev_s:rev_e] if rev_s != -1 else ""

    accounts, account_blocks = _parse_accounts(accounts_section)
    hard_inquiries, hard_blocks = _parse_inquiries(inq_section, "hard")
    promo_inquiries, promo_blocks = _parse_inquiries(promo_section, "promotional")
    review_inquiries, review_blocks = _parse_inquiries(review_section, "account_review")

    inquiries = hard_inquiries + promo_inquiries + review_inquiries

    report = CreditReport(
        bureau="transunion",
        pulled_on=None,
        person={},
        accounts=accounts,
        inquiries=inquiries,
        public_records=[],
        summary={},
        raw_chunks=[
            accounts_section,
            inq_section,
            promo_section,
            review_section,
            *account_blocks,
            *hard_blocks,
            *promo_blocks,
            *review_blocks,
        ],
    )
    return report


__all__ = ["parse"]
