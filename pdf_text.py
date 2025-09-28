from __future__ import annotations

import io
from typing import Any, Dict, List, Literal, Union


PAGE_BREAK = "\n\n===PAGE {i}===\n\n"


def _extract_with_pymupdf(source: Union[str, bytes]) -> List[Dict[str, Any]]:
    try:
        import fitz  # PyMuPDF
    except Exception as e:  # pragma: no cover
        raise ImportError("PyMuPDF (fitz) is required for primary extraction") from e

    if isinstance(source, (bytes, bytearray)):
        doc = fitz.open(stream=source, filetype="pdf")
    else:
        doc = fitz.open(source)  # type: ignore[arg-type]

    pages: List[Dict[str, Any]] = []
    try:
        for i in range(doc.page_count):
            page = doc.load_page(i)
            # "text" gives a simple, readable layout suitable for regex parsing
            txt = page.get_text("text") or ""
            pages.append({"n": i, "text": txt})
    finally:
        doc.close()
    return pages


def _extract_with_pdfminer(source: Union[str, bytes]) -> List[Dict[str, Any]]:
    try:
        from pdfminer.high_level import extract_pages
        from pdfminer.layout import LAParams, LTTextContainer
    except Exception as e:  # pragma: no cover
        raise ImportError("pdfminer.six is required for fallback extraction") from e

    laparams = LAParams()
    if isinstance(source, (bytes, bytearray)):
        fp = io.BytesIO(source)
    else:
        fp = open(source, "rb")  # type: ignore[arg-type]

    pages: List[Dict[str, Any]] = []
    with fp:
        for i, layout in enumerate(extract_pages(fp, laparams=laparams)):
            parts: List[str] = []
            for element in layout:
                if isinstance(element, LTTextContainer):
                    parts.append(element.get_text())
            pages.append({"n": i, "text": "".join(parts)})
    return pages


def extract_pdf_text(source: Union[str, bytes]) -> Dict[str, Any]:
    """Extract text from a PDF, preferring PyMuPDF with a pdfminer fallback.

    - Returns a dict: {"pages": [{"n": i, "text": str}, ...], "full_text": str}
    - Page breaks in full_text are delimited as "\n\n===PAGE i===\n\n".
    - If initial extraction yields < 500 characters total, falls back to pdfminer.six.
    """
    # Primary: PyMuPDF
    try:
        pages = _extract_with_pymupdf(source)
    except Exception:
        pages = []

    full_text = PAGE_BREAK.format(i=0).join(p["text"] for p in pages) if pages else ""
    if pages:
        # Ensure page markers exactly as requested (before each non-first page)
        joined = []
        for i, p in enumerate(pages):
            if i > 0:
                joined.append(PAGE_BREAK.format(i=i))
            joined.append(p["text"])
        full_text = "".join(joined)

    # Fallback if insufficient content
    if len(full_text) < 500:
        try:
            pages = _extract_with_pdfminer(source)
            joined = []
            for i, p in enumerate(pages):
                if i > 0:
                    joined.append(PAGE_BREAK.format(i=i))
                joined.append(p["text"])
            full_text = "".join(joined)
        except Exception:
            # If fallback fails, keep whatever we have (possibly empty)
            pass

    return {"pages": pages, "full_text": full_text}


__all__ = ["extract_pdf_text"]

