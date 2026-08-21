from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import cv2
import exifread
import numpy as np
from PIL import Image, ImageOps

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}


def load_image(source: str | Path | bytes, max_dimension: int = 2400) -> dict[str, Any]:
    """Load an image into a consistent RGB/PIL/OpenCV representation."""
    if isinstance(source, (str, Path)):
        path = Path(source)
        raw = path.read_bytes()
        source_name = path.name
    else:
        raw = source
        source_name = "upload"

    with Image.open(BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        if max(image.size) > max_dimension:
            scale = max_dimension / max(image.size)
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        pil_image = image.copy()

    rgb = np.asarray(pil_image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    exif: dict[str, str] = {}
    try:
        for tag, value in exifread.process_file(BytesIO(raw), details=False).items():
            exif[str(tag)] = str(value)
    except Exception:
        exif = {}

    return {
        "kind": "image",
        "source_name": source_name,
        "raw_bytes": raw,
        "pil": pil_image,
        "rgb": rgb,
        "bgr": bgr,
        "gray": gray,
        "width": pil_image.width,
        "height": pil_image.height,
        "mode": "RGB",
        "exif": exif,
    }
