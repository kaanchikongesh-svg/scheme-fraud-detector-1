from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import fitz


def load_pdf(source: str | Path | bytes, render_dpi: int = 144, max_pages: int = 8) -> dict[str, Any]:
    """Extract text, metadata, embedded image info, and rendered page images from a PDF."""
    if isinstance(source, (str, Path)):
        path = Path(source)
        raw = path.read_bytes()
        source_name = path.name
    else:
        raw = source
        source_name = "upload.pdf"

    document = fitz.open(stream=raw, filetype="pdf")
    matrix = fitz.Matrix(render_dpi / 72, render_dpi / 72)
    pages: list[dict[str, Any]] = []
    embedded_images: list[dict[str, Any]] = []
    text_parts: list[str] = []

    for page_index, page in enumerate(document):
        if page_index >= max_pages:
            break
        text = page.get_text("text")
        text_parts.append(text)
        blocks = page.get_text("dict").get("blocks", [])
        fonts = [span.get("font", "") for block in blocks for line in block.get("lines", []) for span in line.get("spans", [])]
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        pages.append({
            "page_number": page_index + 1,
            "text": text,
            "fonts": fonts,
            "width": pixmap.width,
            "height": pixmap.height,
            "image_bytes": pixmap.tobytes("png"),
            "image": pixmap,
        })
        for image_index, image_info in enumerate(page.get_images(full=True)):
            embedded_images.append({
                "page_number": page_index + 1,
                "image_index": image_index,
                "xref": image_info[0],
                "width": image_info[2],
                "height": image_info[3],
                "colorspace": image_info[5],
            })

    metadata = {key: value for key, value in (document.metadata or {}).items() if value is not None}
    document.close()
    return {
        "kind": "pdf",
        "source_name": source_name,
        "raw_bytes": raw,
        "metadata": metadata,
        "pages": pages,
        "text": "\n".join(text_parts),
        "page_count": len(pages),
        "embedded_images": embedded_images,
        "pdf_size_bytes": len(raw),
    }
