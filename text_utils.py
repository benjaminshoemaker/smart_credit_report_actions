from __future__ import annotations

import re


PAGE_BREAK_RE = re.compile(r"\n+\s*===PAGE\s+\d+===\s*\n+", re.I)


def _is_pua(ch: str) -> bool:
    o = ord(ch)
    # Basic Multilingual Plane PUA
    if 0xE000 <= o <= 0xF8FF:
        return True
    # Supplementary Private Use Areas
    if 0xF0000 <= o <= 0xFFFFD or 0x100000 <= o <= 0x10FFFD:
        return True
    return False


def clean_text(text: str) -> str:
    """Normalize extracted PDF text for robust parsing.

    - Remove page break separators added by pdf_text (===PAGE i===)
    - Strip private-use glyphs/icons (e.g., Experian/TU icons)
    - Normalize non-breaking spaces to regular spaces
    - Tolerate extra whitespace by condensing runs of spaces
    """
    s = PAGE_BREAK_RE.sub("\n", text or "")
    s = s.replace("\xa0", " ")
    s = "".join(" " if _is_pua(c) else c for c in s)
    # Collapse long runs of spaces (keep newlines)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s


__all__ = ["clean_text"]

