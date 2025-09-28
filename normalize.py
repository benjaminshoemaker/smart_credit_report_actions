from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional

from typing import Union
from models import Account, CreditReport


NONE_TOKENS = {"", "-", "—", "na", "n/a", "none"}


def parse_amount(val: Optional[Union[str, float, int]]) -> Optional[float]:
    """Parse currency/number strings to float.

    - Strips $, commas, spaces. Returns None for dashes or NA tokens.
    - Accepts numeric inputs and passes them through as float.
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if s.lower() in NONE_TOKENS:
        return None
    s = s.replace("$", "").replace(",", "").strip()
    # Extract last numeric token if string contains extra text
    m = re.findall(r"-?\d+(?:\.\d+)?", s)
    if not m:
        return None
    try:
        return float(m[-1])
    except Exception:
        return None


def latest_hist_amount(text: Optional[str]) -> Optional[float]:
    """Pick the latest number from a history label like 'High Balance (Hist.)'."""
    if not text:
        return None
    nums = re.findall(r"\$?\s*([\d,]+(?:\.\d+)?)", text)
    if not nums:
        return None
    return parse_amount(nums[-1])


def normalize_value_map(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize bureau-specific labels to common keys with parsed numbers.

    Recognized numeric synonyms (case-insensitive):
    - credit_limit: "Credit Limit", "Credit limit"
    - high_balance: "High Balance (Hist.)", "Highest Balance", "High Credit"
    - balance: "Balance"
    - monthly_payment: "Monthly Payment", "Scheduled Payment"
    """
    out: Dict[str, Any] = {}
    # Build a case-insensitive view of input
    lower_map = {k.lower(): v for k, v in data.items()}

    def get_first(keys: Iterable[str]) -> Optional[Any]:
        for k in keys:
            if k.lower() in lower_map:
                return lower_map[k.lower()]
        return None

    # Credit limit
    out["credit_limit"] = parse_amount(get_first(["Credit Limit", "Credit limit"]))

    # High balance / High credit
    hb_raw = get_first(["High Balance (Hist.)", "Highest Balance", "High Credit"])  # may be hist
    out["high_balance"] = latest_hist_amount(hb_raw if isinstance(hb_raw, str) else str(hb_raw) if hb_raw is not None else None)

    # Balance
    out["balance"] = parse_amount(get_first(["Balance"]))

    # Monthly/Scheduled payment
    out["monthly_payment"] = parse_amount(get_first(["Monthly Payment", "Scheduled Payment"]))

    return out


def _is_open(account: Account) -> bool:
    return account.status in {"open", "current"}


def _is_auto_loan(account: Account) -> bool:
    if account.kind != "installment":
        return False
    hay = f"{account.creditor} {' '.join(account.remarks)}".lower()
    return any(k in hay for k in ["auto", "vehicle", "car"])


def _latest_history_balance(account: Account) -> Optional[float]:
    if not account.payment_history:
        return None
    # Sort by 'month' descending (expects YYYY-MM) and pick first non-null balance
    try:
        rows = sorted(
            account.payment_history,
            key=lambda r: str(r.get("month", "")),
            reverse=True,
        )
    except Exception:
        rows = account.payment_history
    for r in rows:
        b = r.get("balance")
        if isinstance(b, (int, float)):
            return float(b)
    return None


def compute_summary(report: CreditReport) -> Dict[str, Any]:
    """Compute aggregate summary metrics from the report accounts."""
    # Only include revolving accounts that are open/current AND have a usable credit limit
    open_revolving = [
        a
        for a in report.accounts
        if a.kind == "revolving" and _is_open(a) and (a.credit_limit is not None) and a.credit_limit > 0
    ]
    total_revolving_limit = sum(a.credit_limit or 0.0 for a in open_revolving)
    # Use current balance, else latest from history; default to 0 if unknown
    def current_or_latest_balance(a: Account) -> float:
        if a.balance is not None:
            return float(a.balance)
        hb = _latest_history_balance(a)
        return float(hb) if hb is not None else 0.0

    total_revolving_balance = sum(current_or_latest_balance(a) for a in open_revolving)
    utilization = (
        round(total_revolving_balance / total_revolving_limit, 1)
        if total_revolving_limit > 0
        else None
    )

    open_cards = len(open_revolving)
    mortgages = sum(1 for a in report.accounts if a.kind == "mortgage")
    student_loans = sum(1 for a in report.accounts if a.kind == "student")
    auto_loans = sum(1 for a in report.accounts if _is_auto_loan(a))

    return {
        "total_revolving_limit": total_revolving_limit,
        "total_revolving_balance": total_revolving_balance,
        "utilization": utilization,
        "open_cards": open_cards,
        "mortgages": mortgages,
        "student_loans": student_loans,
        "auto_loans": auto_loans,
    }


def normalize(report: CreditReport) -> CreditReport:
    """Normalize a CreditReport in-place and compute summary.

    This focuses on derived metrics; individual Account field normalization
    should be handled by parsers or by normalize_value_map on raw label dicts.
    """
    report.summary = compute_summary(report)
    return report


__all__ = [
    "parse_amount",
    "latest_hist_amount",
    "normalize_value_map",
    "compute_summary",
    "normalize",
]
