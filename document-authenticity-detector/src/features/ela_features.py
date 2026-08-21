from __future__ import annotations

from io import BytesIO
from typing import Any

import cv2
import numpy as np
from PIL import Image


def _image_array(document: dict[str, Any]) -> np.ndarray | None:
    if document.get("kind") == "image":
        return document.get("bgr")
    pages = document.get("pages", [])
    if pages:
        return cv2.imdecode(np.frombuffer(pages[0]["image_bytes"], dtype=np.uint8), cv2.IMREAD_COLOR)
    return None


def extract_ela_features(document: dict[str, Any], jpeg_quality: int = 90) -> dict[str, float]:
    image = _image_array(document)
    if image is None:
        return {"ela_mean": 0.0, "ela_std": 0.0, "ela_max": 0.0, "ela_high_fraction": 0.0}
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    original = Image.fromarray(rgb)
    buffer = BytesIO()
    original.save(buffer, format="JPEG", quality=jpeg_quality)
    recompressed = np.asarray(Image.open(BytesIO(buffer.getvalue())).convert("RGB"), dtype=np.int16)
    error = np.abs(rgb.astype(np.int16) - recompressed)
    gray_error = error.mean(axis=2).astype(np.float32)
    return {
        "ela_mean": float(gray_error.mean()),
        "ela_std": float(gray_error.std()),
        "ela_max": float(gray_error.max()),
        "ela_high_fraction": float((gray_error > 18).mean()),
    }
