from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import (classification_report, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split

from src.model.train import build_feature_table


def evaluate(manifest_path: Path | None = None, features_path: Path | None = None) -> dict:
    from src.utils.config import FEATURE_COLUMNS_PATH, MODEL_PATH, PROCESSED_DIR
    if features_path and features_path.exists():
        table = pd.read_csv(features_path).fillna(0)
    elif manifest_path and manifest_path.exists():
        table = build_feature_table(manifest_path)
    else:
        default_features = PROCESSED_DIR / "casia_features.csv"
        if default_features.exists():
            table = pd.read_csv(default_features).fillna(0)
        else:
            table = build_feature_table(manifest_path or Path("data/processed/manifest.csv"))

    feature_columns = json.loads(FEATURE_COLUMNS_PATH.read_text(encoding="utf-8")) if FEATURE_COLUMNS_PATH.exists() else [c for c in table.columns if c not in {"label", "provenance", "tamper_type", "filename", "path"}]
    _, x_test, _, y_test = train_test_split(table[feature_columns], table["label"], test_size=0.25, random_state=42, stratify=table["label"])
    
    import xgboost as xgb
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
    probabilities = model.predict_proba(x_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    
    from sklearn.metrics import accuracy_score
    return {
        "model_version": "casia-document-forensics-v1",
        "test_samples": int(len(y_test)),
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probabilities)) if len(set(y_test)) > 1 else 0.0, 4),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
        "classification_report": classification_report(y_test, predictions, zero_division=0, output_dict=True),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--features", type=Path, default=None)
    args = parser.parse_args()
    print(json.dumps(evaluate(args.manifest, args.features), indent=2, default=float))


if __name__ == "__main__":
    main()

