from __future__ import annotations

from pathlib import Path
from typing import Any

from .image_loader import load_image
from .pdf_loader import load_pdf


def load_document(source: str | Path | bytes, filename: str | None = None) -> dict[str, Any]:
    name = filename or (Path(source).name if isinstance(source, (str, Path)) else "upload")
    suffix = Path(name).suffix.lower()
    if suffix == ".pdf" or (isinstance(source, (bytes, bytearray)) and source[:4] == b"%PDF"):
        return load_pdf(source)
    return load_image(source)
