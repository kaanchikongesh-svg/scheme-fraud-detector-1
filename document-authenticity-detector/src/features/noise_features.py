from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def extract_noise_features(document: dict[str, Any]) -> dict[str, float]:
    gray = document.get("gray")
    if gray is None and document.get("pages"):
        page = document["pages"][0]
        gray = cv2.imdecode(np.frombuffer(page["image_bytes"], np.uint8), cv2.IMREAD_GRAYSCALE)
    if gray is None:
        return {"noise_std": 0.0, "noise_local_variance": 0.0, "noise_edge_ratio": 0.0}
    gray = np.asarray(gray, dtype=np.float32)
    smooth = cv2.GaussianBlur(gray, (3, 3), 0)
    residual = gray - smooth
    edges = cv2.Canny(gray.astype(np.uint8), 80, 160)
    return {
        "noise_std": float(residual.std()),
        "noise_local_variance": float(cv2.Laplacian(gray, cv2.CV_32F).var()),
        "noise_edge_ratio": float((edges > 0).mean()),
    }
