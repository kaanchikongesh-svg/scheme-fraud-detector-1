from __future__ import annotations

from typing import Any

import pytesseract


def extract_ocr_consistency_features(document: dict[str, Any]) -> dict[str, float | str]:
    if document.get("kind") == "pdf" and document.get("text", "").strip():
        ocr_text = ""
        source_text = document["text"]
    else:
        image = document.get("pil")
        if image is None and document.get("pages"):
            image = document["pages"][0].get("image")
        try:
            ocr_text = pytesseract.image_to_string(image) if image is not None else ""
        except (OSError, pytesseract.TesseractNotFoundError):
            ocr_text = ""
        source_text = ""
    words = [word for word in (ocr_text or source_text).split() if word.strip()]
    suspicious_tokens = sum(any(char in word for char in "|~^") for word in words)
    return {
        "ocr_word_count": float(len(words)),
        "ocr_suspicious_token_ratio": float(suspicious_tokens / max(len(words), 1)),
        "ocr_text_available": float(bool(words)),
        "ocr_copy_paste_artifact": float(bool(words) and suspicious_tokens / len(words) > 0.03),
    }
