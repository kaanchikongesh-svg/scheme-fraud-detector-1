from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def _phash(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    small = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    dct = cv2.dct(small)[:8, :8]
    return dct > np.median(dct)


def extract_hash_features(document: dict[str, Any], reference_hash: np.ndarray | None = None) -> dict[str, float]:
    image = document.get("bgr")
    if image is None and document.get("pages"):
        image = cv2.imdecode(np.frombuffer(document["pages"][0]["image_bytes"], np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {"hash_available": 0.0, "hash_distance": 0.0, "hash_mismatch": 0.0}
    current = _phash(image)
    distance = float(np.count_nonzero(current != reference_hash)) if reference_hash is not None else 0.0
    return {
        "hash_available": float(reference_hash is not None),
        "hash_distance": distance,
        "hash_mismatch": float(reference_hash is not None and distance > 12),
    }
