import json
import os
import sys
import warnings
from pathlib import Path

import pytest


SAMPLES = {
    "tu": "View Your Report _ TransUnion Credit Report.pdf",
    "ex": "Annual Credit Report - Experian.pdf",
    "eq": "creditReport_5258585293.pdf",
}


# Ensure repo root is on sys.path for module imports (parse_any, etc.)
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# Debug: print environment and working directory once at import time
print(
    "[tests] CWD=", Path.cwd(),
)
print(
    "[tests] CREDIT_REPORT_SAMPLES=", repr(os.environ.get("CREDIT_REPORT_SAMPLES"))
)
print(
    "[tests] sys.path[0]=", sys.path[0], " ROOT=", _ROOT
)


def _require_pdf_deps():
    # Ensure at least one PDF extractor is available
    try:
        import fitz  # type: ignore
        return
    except Exception:
        pass
    try:
        import pdfminer  # type: ignore
        return
    except Exception:
        pass
    pytest.skip("Neither PyMuPDF (fitz) nor pdfminer.six is installed")


def _find_sample(name: str) -> Path:
    # Allow override via env var
    base = os.environ.get("CREDIT_REPORT_SAMPLES")
    candidates = []
    if base:
        # Support colon-separated list and ~ expansion
        for part in str(base).split(":"):
            if part.strip():
                candidates.append(Path(part).expanduser() / name)
    here = Path(__file__).resolve().parent.parent
    candidates += [
        (here / name).expanduser(),
        (here / "tests" / "data" / name).expanduser(),
        (here / "data" / name).expanduser(),
        (here / "samples" / name).expanduser(),
    ]
    # Debug print candidates and existence
    print(f"[tests] Looking for {name} in:")
    for p in candidates:
        try:
            exists = p.exists()
        except Exception:
            exists = False
        print(f"[tests]  - {p}  exists={exists}")
    for p in candidates:
        if p.exists():
            print(f"[tests] Using: {p}")
            return p
    # Emit a warning so it shows up even under -q
    warnings.warn(
        (
            f"Sample not found: {name}. CREDIT_REPORT_SAMPLES={base!r}.\n"
            + "Candidates: \n  - "
            + "\n  - ".join(str(c) for c in candidates)
        )
    )
    pytest.skip(f"Sample not found: {name}")


@pytest.fixture(scope="session")
def tu_pdf() -> Path:
    _require_pdf_deps()
    return _find_sample(SAMPLES["tu"])


@pytest.fixture(scope="session")
def ex_pdf() -> Path:
    _require_pdf_deps()
    return _find_sample(SAMPLES["ex"])


@pytest.fixture(scope="session")
def eq_pdf() -> Path:
    _require_pdf_deps()
    return _find_sample(SAMPLES["eq"])


def _parse(pdf_path: Path):
    from parse_any import parse_report

    rpt = parse_report(str(pdf_path))
    # Ensure it can be serialized
    try:
        json.dumps(rpt.model_dump(), default=str)  # type: ignore[attr-defined]
    except AttributeError:
        json.dumps(rpt.dict(), default=str)
    return rpt


def test_transunion_parses_accounts(tu_pdf: Path):
    rpt = _parse(tu_pdf)
    assert rpt.bureau == "transunion"
    assert len(rpt.accounts) >= 1


def test_experian_parses_accounts(ex_pdf: Path):
    rpt = _parse(ex_pdf)
    assert rpt.bureau == "experian"
    assert len(rpt.accounts) >= 1


def test_equifax_parses_accounts(eq_pdf: Path):
    rpt = _parse(eq_pdf)
    assert rpt.bureau == "equifax"
    assert len(rpt.accounts) >= 1


def _find_amex_revolving(report):
    for a in report.accounts:
        if a.kind == "revolving" and (
            "american express" in a.creditor.lower() or "amex" in a.creditor.lower()
        ):
            return a
    return None


def test_amex_revolving_limits_and_balance(tu_pdf: Path, ex_pdf: Path):
    tu = _parse(tu_pdf)
    ex = _parse(ex_pdf)

    for rpt in (tu, ex):
        amex = _find_amex_revolving(rpt)
        assert amex is not None, f"AMEX not found in {rpt.bureau}"
        assert amex.credit_limit is not None
        assert amex.credit_limit == pytest.approx(35000, rel=0.05)
        # Recent balance: prefer account balance, else most recent payment_history
        bal = amex.balance
        if bal is None and amex.payment_history:
            # pick last non-null
            for row in sorted(amex.payment_history, key=lambda r: r.get("month", ""), reverse=True):
                if row.get("balance") is not None:
                    bal = row["balance"]
                    break
        assert bal is not None
        assert bal == pytest.approx(1109, rel=0.2)


def test_mortgage_open_large_balance(tu_pdf: Path, eq_pdf: Path):
    tu = _parse(tu_pdf)
    eq = _parse(eq_pdf)
    found = []
    for rpt in (tu, eq):
        for a in rpt.accounts:
            if a.kind == "mortgage" and a.balance and a.balance > 1_000_000 and a.status in {"open", "current"}:
                found.append(a)
                break
    assert found, "Expected at least one open mortgage with ~1.618M balance"
    # If found, check one close to 1,618,095
    assert any(a.balance == pytest.approx(1618095, rel=0.02) for a in found)


def test_utilization_consistency_within_one_percent(tu_pdf: Path, ex_pdf: Path, eq_pdf: Path):
    tu = _parse(tu_pdf)
    ex = _parse(ex_pdf)
    eq = _parse(eq_pdf)
    utils = [r.summary.get("utilization") for r in (tu, ex, eq) if r.summary.get("utilization") is not None]
    # Need at least two to compare
    if len(utils) < 2:
        pytest.skip("Not enough utilization values to compare")
    for i in range(len(utils)):
        for j in range(i + 1, len(utils)):
            assert abs(utils[i] - utils[j]) <= 0.01


def test_inquiry_categories(tu_pdf: Path, ex_pdf: Path):
    tu = _parse(tu_pdf)
    ex = _parse(ex_pdf)

    kinds_tu = {inq.kind for inq in tu.inquiries}
    assert "promotional" in kinds_tu or any(inq.kind == "promotional" for inq in tu.inquiries)
    assert "account_review" in kinds_tu or any(inq.kind == "account_review" for inq in tu.inquiries)

    kinds_ex = {inq.kind for inq in ex.inquiries}
    # Always expect soft inquiries on Experian
    assert "soft" in kinds_ex
    # Only require hard inquiries if the Hard Inquiries section contains dated entries
    hard_section_texts = [c for c in ex.raw_chunks if isinstance(c, str) and "Hard Inquiries" in c]
    def has_dates(s: str) -> bool:
        import re
        return bool(re.search(r"\b(\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\b", s))
    hard_has_entries = any(has_dates(txt) for txt in hard_section_texts)
    if hard_has_entries:
        assert "hard" in kinds_ex
