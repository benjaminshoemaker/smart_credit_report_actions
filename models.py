from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


class CreditReport(BaseModel):
    bureau: Optional[Literal["transunion", "experian", "equifax"]]
    pulled_on: Optional[date]
    person: Dict[str, Any]
    accounts: List["Account"]
    inquiries: List["Inquiry"]
    public_records: List["PublicRecord"]
    summary: Dict[str, Any]
    raw_chunks: List[str]


class Account(BaseModel):
    creditor: str
    masked_number: Optional[str]
    kind: Literal[
        "revolving",
        "mortgage",
        "installment",
        "open",
        "lease",
        "student",
        "other",
    ]
    status: Literal[
        "open",
        "closed",
        "transferred",
        "sold",
        "paid",
        "collection",
        "chargeoff",
        "delinquent",
        "current",
    ]
    responsibility: Optional[str]
    opened_on: Optional[date]
    closed_on: Optional[date]
    credit_limit: Optional[float]
    high_balance: Optional[float]
    balance: Optional[float]
    scheduled_payment: Optional[float]
    past_due: Optional[float]
    payment_history: List[Dict[str, Any]]
    remarks: List[str]


class Inquiry(BaseModel):
    name: str
    kind: Literal["hard", "soft", "promotional", "account_review"]
    date: date


class PublicRecord(BaseModel):
    type: str
    date: Optional[date]
    details: Dict[str, Any]


__all__ = [
    "CreditReport",
    "Account",
    "Inquiry",
    "PublicRecord",
]
