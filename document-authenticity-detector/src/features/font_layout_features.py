from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def extract_font_layout_features(document: dict[str, Any]) -> dict[str, float]:
    fonts = [font for page in document.get("pages", []) for font in page.get("fonts", []) if font]
    unique_fonts = len(set(fonts))
    font_diversity = unique_fonts / max(len(fonts), 1)
    text = document.get("text", "")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    lengths = np.asarray([len(line) for line in lines], dtype=np.float32)
    spacing_irregularity = float(lengths.std() / max(lengths.mean(), 1)) if len(lengths) > 1 else 0.0
    image = document.get("gray")
    if image is None and document.get("pages"):
        image = cv2.imdecode(np.frombuffer(document["pages"][0]["image_bytes"], np.uint8), cv2.IMREAD_GRAYSCALE)
    baseline_drift = 0.0
    if image is not None:
        horizontal = cv2.reduce(255 - image, 1, cv2.REDUCE_SUM, dtype=cv2.CV_32S).ravel()
        peaks = np.where(horizontal > horizontal.mean() + horizontal.std())[0]
        baseline_drift = float(np.std(np.diff(peaks))) if len(peaks) > 3 else 0.0
    return {
        "font_layout_unique_fonts": float(unique_fonts),
        "font_layout_font_diversity": float(font_diversity),
        "font_layout_spacing_irregularity": spacing_irregularity,
        "font_layout_baseline_drift": baseline_drift,
        "font_layout_font_mismatch": float(unique_fonts > 3 and font_diversity > 0.4),
    }
