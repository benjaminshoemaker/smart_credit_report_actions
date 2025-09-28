from __future__ import annotations

import sys
from typing import Any, Dict, Tuple

from credit_bureau import detect_bureau, detect_bureau_with_scores
from models import CreditReport
from normalize import normalize
from pdf_text import extract_pdf_text
from text_utils import clean_text


class UnknownFormatError(Exception):
  pass


def parse_report(pdf_path: str) -> CreditReport:
  """Parse any supported bureau PDF into a normalized CreditReport.

  Steps:
  1) Extract text per-page (PyMuPDF preferred, pdfminer fallback).
  2) Detect bureau from full text via keyword heuristics.
  3) Dispatch to the bureau-specific parser.
  4) Run normalize() to compute aggregate summary.
  5) Return the CreditReport model (call model_dump() for JSON).
  """
  text_result = extract_pdf_text(pdf_path)
  full_text: str = text_result.get("full_text", "")
  cleaned = clean_text(full_text)
  bureau, scores = detect_bureau_with_scores(cleaned)
  if max(scores.values()) == 0:
    # Provide first 20 lines for debugging
    head = "\n".join(cleaned.splitlines()[:20])
    raise UnknownFormatError(f"Could not detect bureau. First lines:\n{head}")

  if bureau == "transunion":
    from parse_transunion import parse as parse_tu

    report = parse_tu(cleaned)
  elif bureau == "experian":
    from parse_experian import parse as parse_exp

    report = parse_exp(cleaned)
  elif bureau == "equifax":
    from parse_equifax import parse as parse_eq

    report = parse_eq(cleaned)
  else:
    # Fallback: try Experian parser
    from parse_experian import parse as parse_exp

    report = parse_exp(cleaned)

  # Ensure bureau detected is aligned with parser choice
  report.bureau = bureau

  # Keep raw_chunks limited to parser-provided sections/blocks for audit.
  # (Avoid prepending full_text to prevent noisy matches in downstream checks.)

  # Compute summary metrics
  report = normalize(report)
  return report


def parse_report_json(pdf_path: str) -> Dict[str, Any]:
  model = parse_report(pdf_path)
  return _model_to_json(model)


def _model_to_json(model: CreditReport) -> Dict[str, Any]:
  # Pydantic v2 uses model_dump; v1 uses dict
  if hasattr(model, "model_dump"):
    return model.model_dump()  # type: ignore[attr-defined]
  return model.dict()  # type: ignore[return-value]


def _fmt_money(v: Any) -> str:
  try:
    if v is None:
      return "-"
    n = float(v)
    return f"${n:,.0f}"
  except Exception:
    return str(v)


def _print_summary(report: CreditReport) -> None:
  print(f"bureau: {report.bureau}")
  print(f"pulled_on: {report.pulled_on}")
  # Counts by kind
  kinds = {}
  for a in report.accounts:
    kinds[a.kind] = kinds.get(a.kind, 0) + 1
  if kinds:
    kinds_str = ", ".join(f"{k}={v}" for k, v in sorted(kinds.items()))
    print(f"counts: {kinds_str}")
  util = report.summary.get("utilization")
  util_str = f"{util:.2f}" if isinstance(util, (int, float)) else "-"
  print(f"utilization: {util_str}")

  # Table header
  rows = [("Creditor", "Kind", "Status", "Limit", "Balance")]
  for a in report.accounts:
    rows.append(
      (
        a.creditor or "",
        a.kind,
        a.status,
        _fmt_money(a.credit_limit),
        _fmt_money(a.balance),
      )
    )
  # Compute column widths
  widths = [0, 0, 0, 0, 0]
  for r in rows:
    for i, cell in enumerate(r):
      widths[i] = max(widths[i], len(str(cell)))
  # Print rows
  for idx, r in enumerate(rows):
    line = " | ".join(str(cell).ljust(widths[i]) for i, cell in enumerate(r))
    print(line)
    if idx == 0:
      print("-+-".join("-" * w for w in widths))


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("Usage: python -m parse_any <path-to-pdf> [--json]")
    sys.exit(2)
  json_mode = False
  args = [a for a in sys.argv[1:] if a]
  if args and args[-1] in ("--json", "-j"):
    json_mode = True
    args = args[:-1]
  pdf_path = args[0] if args else None
  try:
    if json_mode:
      import json
      print(json.dumps(parse_report_json(pdf_path), indent=2, default=str))
    else:
      _print_summary(parse_report(pdf_path))
  except UnknownFormatError as e:
    print(str(e))
    sys.exit(3)

__all__ = ["parse_report", "parse_report_json", "UnknownFormatError"]
