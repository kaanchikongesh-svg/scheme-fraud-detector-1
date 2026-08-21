from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from src.features.pipeline import extract_features
from src.ingestion.document_loader import load_document
from src.utils.config import FEATURE_COLUMNS_PATH, MODEL_PATH, PROCESSED_DIR


def build_feature_table(manifest_path: Path) -> pd.DataFrame:
    manifest = pd.read_csv(manifest_path)
    rows = []
    for record in manifest.to_dict("records"):
        document = load_document(record["path"])
        rows.append({**extract_features(document), "label": int(record["label"] == "TAMPERED"), "provenance": record["provenance"], "tamper_type": record["tamper_type"]})
    table = pd.DataFrame(rows).fillna(0)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    table.to_csv(PROCESSED_DIR / "features.csv", index=False)
    return table


def train(manifest_path: Path | None = None, features_path: Path | None = None) -> dict[str, Any]:
    if features_path and features_path.exists():
        table = pd.read_csv(features_path).fillna(0)
    elif manifest_path and manifest_path.exists():
        table = build_feature_table(manifest_path)
    else:
        # Fallback to default locations
        default_features = PROCESSED_DIR / "casia_features.csv"
        if default_features.exists():
            table = pd.read_csv(default_features).fillna(0)
        else:
            table = build_feature_table(manifest_path or Path("data/processed/manifest.csv"))

    feature_columns = [column for column in table.columns if column not in {"label", "provenance", "tamper_type", "filename", "path"}]
    if table["label"].nunique() < 2:
        raise ValueError("Dataset must contain both ORIGINAL and TAMPERED examples")
    
    x_train, x_test, y_train, y_test = train_test_split(
        table[feature_columns], table["label"], test_size=0.25, random_state=42, stratify=table["label"]
    )
    model = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(x_train, y_train)
    PROCESSED_DIR.joinpath("model").mkdir(parents=True, exist_ok=True)
    model.save_model(MODEL_PATH)
    FEATURE_COLUMNS_PATH.write_text(json.dumps(feature_columns, indent=2), encoding="utf-8")
    
    train_acc = float(model.score(x_train, y_train))
    test_acc = float(model.score(x_test, y_test))

    return {
        "status": "SUCCESS",
        "model_version": "casia-document-forensics-v1",
        "model_path": str(MODEL_PATH),
        "total_rows": int(len(table)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "feature_count": len(feature_columns),
        "train_accuracy": round(train_acc, 4),
        "test_accuracy": round(test_acc, 4),
        "test_positive_rate": round(float(y_test.mean()), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--features", type=Path, default=None)
    args = parser.parse_args()
    print(json.dumps(train(args.manifest, args.features), indent=2))


if __name__ == "__main__":
    main()

