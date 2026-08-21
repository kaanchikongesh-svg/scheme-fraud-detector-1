from __future__ import annotations

from typing import Any

from .ela_features import extract_ela_features
from .font_layout_features import extract_font_layout_features
from .hash_features import extract_hash_features
from .metadata_features import extract_metadata_features
from .noise_features import extract_noise_features
from .ocr_consistency import extract_ocr_consistency_features


def extract_features(document: dict[str, Any], reference_hash=None) -> dict[str, float]:
    feature_groups = (
        extract_metadata_features(document),
        extract_ela_features(document),
        extract_noise_features(document),
        extract_font_layout_features(document),
        extract_ocr_consistency_features(document),
        extract_hash_features(document, reference_hash),
    )
    return {key: float(value) for group in feature_groups for key, value in group.items() if isinstance(value, (int, float, bool))}


def explain_features(features: dict[str, float]) -> list[str]:
    reasons: list[str] = []
    if features.get("metadata_large_date_gap", 0):
        reasons.append(f"PDF modification date is {features['metadata_modification_gap_days']:.0f} days after creation date")
    if features.get("metadata_font_mismatch", 0) or features.get("font_layout_font_mismatch", 0):
        reasons.append("Font inconsistency detected across document text objects")
    if features.get("ela_high_fraction", 0) > 0.08 or features.get("ela_mean", 0) > 8:
        reasons.append("ELA shows concentrated JPEG error-level differences")
    if features.get("noise_local_variance", 0) > 500:
        reasons.append("Noise pattern is inconsistent with a single capture or render process")
    if features.get("font_layout_spacing_irregularity", 0) > 1.2:
        reasons.append("Text spacing irregularity detected in extracted layout")
    if features.get("ocr_copy_paste_artifact", 0):
        reasons.append("OCR detected possible copy-paste or compositing artifacts")
    if features.get("hash_mismatch", 0):
        reasons.append("Perceptual hash differs substantially from the supplied known-original reference")
    return reasons or ["No strong tampering signal was detected by the configured checks"]
