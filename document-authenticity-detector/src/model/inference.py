from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from src.features.pipeline import explain_features, extract_features
from src.ingestion.document_loader import load_document
from src.utils.config import FEATURE_COLUMNS_PATH, MODEL_PATH


def _heuristic_score(features: dict[str, float]) -> float:
    signals = [
        min(features.get("metadata_large_date_gap", 0), 1) * 0.22,
        min(features.get("metadata_font_mismatch", 0) + features.get("font_layout_font_mismatch", 0), 1) * 0.20,
        min(features.get("ela_high_fraction", 0) / 0.15, 1) * 0.24,
        min(features.get("noise_local_variance", 0) / 1200, 1) * 0.16,
        min(features.get("font_layout_spacing_irregularity", 0) / 2, 1) * 0.10,
        min(features.get("ocr_copy_paste_artifact", 0), 1) * 0.08,
    ]
    return float(min(0.99, max(0.01, sum(signals))))


def predict(source: str | Path | bytes, filename: str | None = None, reference_hash=None, model_path: Path = MODEL_PATH) -> dict[str, Any]:
    document = load_document(source, filename)
    features = extract_features(document, reference_hash)
    model_used = False
    score = _heuristic_score(features)
    if model_path.exists() and FEATURE_COLUMNS_PATH.exists():
        try:
            import xgboost as xgb
            columns = json.loads(FEATURE_COLUMNS_PATH.read_text(encoding="utf-8"))
            model = xgb.XGBClassifier()
            model.load_model(model_path)
            score = float(model.predict_proba(np.asarray([[features.get(column, 0.0) for column in columns]], dtype=float))[0, 1])
            model_used = True
        except (OSError, ValueError, ImportError, RuntimeError):
            model_used = False
    is_tampered = bool(score >= 0.5)
    authenticity_verdict = "SUSPICIOUS" if is_tampered else "AUTHENTIC"
    label = "TAMPERED/FORGED" if is_tampered else "ORIGINAL"
    confidence = round(score if is_tampered else 1.0 - score, 4)
    reasons = explain_features(features)
    if not is_tampered and reasons != ["No strong tampering signal was detected by the configured checks"]:
        reasons = ["Signals remain below the configured tampering threshold"] + reasons

    return {
        "document_authenticity": authenticity_verdict,
        "tampering_detected": is_tampered,
        "confidence": confidence,
        "model_version": "casia-document-forensics-v1",
        "label": label,
        "tampering_probability": round(score, 4),
        "reasons": reasons,
        "features": features,
        "model_used": model_used,
        "source_name": document.get("source_name"),
    }

