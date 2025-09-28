from __future__ import annotations

from typing import Dict, Literal, Tuple


Bureau = Literal["transunion", "experian", "equifax"]


def _scores(text: str) -> Dict[Bureau, int]:
  """Detect the credit bureau from extracted text using keyword heuristics.

  Heuristics (case-insensitive unless noted):
  - TransUnion: "Satisfactory Accounts", "Payment/Remarks Key",
    URL contains "annualcreditreport.transunion.com".
  - Experian: header "Annual Credit Report - Experian", sections like
    "Account Info", "Balance Histories", glyphs such as '', ''.
  - Equifax: "Your Credit Report Summary", "Narrative Code",
    "Credit Accounts".

  Ties are broken by a fixed order: transunion > experian > equifax.
  If no signals are found, the total score is 0 for all.
  """
  if not text:
    return {"transunion": 0, "experian": 0, "equifax": 0}

  t = text.lower()

  scores: Dict[Bureau, int] = {
    "transunion": 0,
    "experian": 0,
    "equifax": 0,
  }

  # TransUnion signals
  if "satisfactory accounts" in t:
    scores["transunion"] += 2
  if "payment/remarks key" in t:
    scores["transunion"] += 2
  if "satisfactory accounts / account information" in t:
    scores["transunion"] += 3
  if "annualcreditreport.transunion.com" in t:
    scores["transunion"] += 3

  # Experian signals
  if "annual credit report - experian" in t:
    scores["experian"] += 3
  if "balance histories" in t:
    scores["experian"] += 2
  if "account info" in t:
    scores["experian"] += 1
  # Private-use glyphs sometimes present in Experian PDFs/text extractions
  if "" in text or "" in text:
    scores["experian"] += 2

  # Equifax signals
  if "your credit report summary" in t:
    scores["equifax"] += 3
  if "narrative code" in t:
    scores["equifax"] += 2
  if "credit accounts" in t:
    scores["equifax"] += 2
  if "narrative code" in t and "description" in t:
    scores["equifax"] += 1

  return scores


def detect_bureau_with_scores(text: str) -> Tuple[Bureau, Dict[Bureau, int]]:
  scores = _scores(text)
  # Pick the bureau with the highest score; tie-break by priority order
  priority = ["transunion", "experian", "equifax"]
  best_score = max(scores.values())
  if best_score == 0:
    return ("experian", scores)
  candidates = [b for b, s in scores.items() if s == best_score]
  for b in priority:
    if b in candidates:
      return (b, scores)  # type: ignore[return-value]
  return ("experian", scores)


def detect_bureau(text: str) -> Bureau:
  b, _ = detect_bureau_with_scores(text)
  return b


__all__ = ["detect_bureau", "detect_bureau_with_scores", "Bureau"]
