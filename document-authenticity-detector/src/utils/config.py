from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
SYNTHETIC_DIR = DATA_DIR / "synthetic_tampered"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = PROCESSED_DIR / "model"
MODEL_PATH = MODEL_DIR / "document_authenticity_xgb.json"
FEATURE_COLUMNS_PATH = MODEL_DIR / "feature_columns.json"

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
OCR_ENABLED = os.getenv("OCR_ENABLED", "true").lower() not in {"0", "false", "no"}
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
