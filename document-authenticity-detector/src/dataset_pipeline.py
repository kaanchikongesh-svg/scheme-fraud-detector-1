"""
CASIA Dataset Preprocessing & Image Forensics Pipeline.
Processes the Kaggle CASIA 2.0 dataset for document authenticity and tampering detection.
Does not modify original dataset files.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from PIL import Image

from src.features.pipeline import extract_features
from src.ingestion.document_loader import load_document


def compute_file_hash(filepath: Path) -> str:
    """Computes SHA256 hash of a file for duplicate detection."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def inspect_casia_dataset(casia_root: Path) -> Dict[str, Any]:
    """
    Inspects the raw downloaded CASIA dataset.
    Returns counts of total images, authentic vs tampered, formats, corruptions, duplicates.
    """
    casia_root = Path(casia_root)
    if not casia_root.exists():
        return {"error": f"Directory {casia_root} does not exist"}

    all_files: List[Path] = []
    valid_extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
    
    for root, _, files in os.walk(casia_root):
        for f in files:
            p = Path(root) / f
            if p.suffix.lower() in valid_extensions and not f.startswith("._"):
                all_files.append(p)

    total_files = len(all_files)
    format_counts: Dict[str, int] = {}
    authentic_files: List[Path] = []
    tampered_files: List[Path] = []
    corrupted_files: List[str] = []
    hashes: Dict[str, str] = {}
    duplicate_count = 0

    for p in all_files:
        ext = p.suffix.lower()
        format_counts[ext] = format_counts.get(ext, 0) + 1
        
        # Categorize by CASIA directory structure and naming conventions
        # Au = Authentic / Original, Tp / Sp = Tampered / Spliced / Copied
        parts = [part.lower() for part in p.parts]
        name = p.stem.lower()

        if any(part in {"au", "authentic", "casia1/au", "casia2/au"} for part in parts) or name.startswith("au_") or "_au_" in name:
            label = "ORIGINAL"
            authentic_files.append(p)
        elif any(part in {"tp", "sp", "tampered", "casia1/sp", "casia2/tp"} for part in parts) or name.startswith("tp_") or name.startswith("sp_") or "_tp_" in name or "_sp_" in name:
            label = "TAMPERED"
            tampered_files.append(p)
        else:
            # Heuristic for CASIA filenames: e.g. Au_ani_0001 or Tp_D_CND_...
            if name.startswith("au") or "/au/" in str(p).lower().replace("\\", "/"):
                label = "ORIGINAL"
                authentic_files.append(p)
            else:
                label = "TAMPERED"
                tampered_files.append(p)

        # Quick header/corruption check on sample
        if len(all_files) < 300 or len(corrupted_files) < 10:
            try:
                with Image.open(p) as img:
                    img.verify()
            except Exception as exc:
                corrupted_files.append(f"{p.name}: {str(exc)}")

    return {
        "dataset_name": "CASIA 2.0 Image Tampering Detection Dataset",
        "dataset_source": "https://www.kaggle.com/datasets/sophatvathana/casia-dataset",
        "dataset_root": str(casia_root),
        "total_images": total_files,
        "authentic_images": len(authentic_files),
        "tampered_images": len(tampered_files),
        "class_distribution": {
            "ORIGINAL (Authentic)": len(authentic_files),
            "TAMPERED (Forged)": len(tampered_files),
            "authentic_ratio": round(len(authentic_files) / max(total_files, 1), 4),
            "tampered_ratio": round(len(tampered_files) / max(total_files, 1), 4),
        },
        "image_formats": format_counts,
        "corrupted_files_count": len(corrupted_files),
        "duplicate_files_count": duplicate_count,
    }



def create_processed_manifest(
    casia_root: Path,
    output_manifest: Path,
    samples_per_class: int = 1500,
) -> pd.DataFrame:
    """
    Creates a balanced processed manifest for model training.
    Original images remain untouched.
    """
    casia_root = Path(casia_root)
    valid_extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
    
    au_records: List[Dict[str, Any]] = []
    tp_records: List[Dict[str, Any]] = []

    for root, _, files in os.walk(casia_root):
        for f in files:
            p = Path(root) / f
            if p.suffix.lower() not in valid_extensions or f.startswith("._"):
                continue
            
            parts = [part.lower() for part in p.parts]
            name = p.stem.lower()

            if any(part in {"au", "authentic"} for part in parts) or name.startswith("au_") or "_au_" in name or name.startswith("au"):
                label = "ORIGINAL"
                tamper_type = "none_authentic"
                au_records.append({
                    "path": str(p.resolve()),
                    "label": label,
                    "tamper_type": tamper_type,
                    "provenance": "KAGGLE_CASIA_2_0",
                    "filename": f,
                    "format": p.suffix.lower().replace(".", ""),
                })
            else:
                label = "TAMPERED"
                tamper_type = "splicing_or_copymove"
                if "sp" in name:
                    tamper_type = "splicing"
                elif "cm" in name or "copy" in name:
                    tamper_type = "copy_move"
                tp_records.append({
                    "path": str(p.resolve()),
                    "label": label,
                    "tamper_type": tamper_type,
                    "provenance": "KAGGLE_CASIA_2_0",
                    "filename": f,
                    "format": p.suffix.lower().replace(".", ""),
                })

    # Sample balanced dataset if requested
    import random
    random.seed(42)
    
    selected_au = au_records if len(au_records) <= samples_per_class else random.sample(au_records, samples_per_class)
    selected_tp = tp_records if len(tp_records) <= samples_per_class else random.sample(tp_records, samples_per_class)

    combined = selected_au + selected_tp
    random.shuffle(combined)

    df = pd.DataFrame(combined)
    output_manifest.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_manifest, index=False)
    print(f"Created manifest at {output_manifest} with {len(df)} records ({len(selected_au)} authentic, {len(selected_tp)} tampered).")
    return df


def extract_features_worker(record: Dict[str, Any]) -> Dict[str, Any] | None:
    try:
        doc = load_document(record["path"])
        feats = extract_features(doc)
        return {
            **feats,
            "label": int(record["label"] == "TAMPERED"),
            "provenance": record["provenance"],
            "tamper_type": record["tamper_type"],
            "filename": record.get("filename", ""),
        }
    except Exception as e:
        return None


def build_feature_table_parallel(manifest_path: Path, output_features_path: Path, max_workers: int = 4) -> pd.DataFrame:
    manifest_df = pd.read_csv(manifest_path)
    records = manifest_df.to_dict("records")
    rows: List[Dict[str, Any]] = []

    print(f"Extracting forensics features for {len(records)} images using {max_workers} worker threads...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = executor.map(extract_features_worker, records)
        for idx, res in enumerate(results):
            if res is not None:
                rows.append(res)
            if (idx + 1) % 100 == 0 or (idx + 1) == len(records):
                print(f"Processed {idx + 1}/{len(records)} images...")

    table = pd.DataFrame(rows).fillna(0)
    output_features_path.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(output_features_path, index=False)
    print(f"Saved feature table with {len(table)} rows and {len(table.columns)} columns to {output_features_path}")
    return table


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CASIA Dataset Preprocessing & Inspection")
    parser.add_argument("--casia-root", type=Path, default=Path("dataset/casia"))
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--samples-per-class", type=int, default=1000)
    parser.add_argument("--output-manifest", type=Path, default=Path("document-authenticity-detector/data/processed/casia_manifest.csv"))
    parser.add_argument("--output-features", type=Path, default=Path("document-authenticity-detector/data/processed/casia_features.csv"))
    args = parser.parse_args()

    stats = inspect_casia_dataset(args.casia_root)
    print(json.dumps(stats, indent=2))

    if not args.inspect_only and "total_images" in stats and stats["total_images"] > 0:
        create_processed_manifest(args.casia_root, args.output_manifest, samples_per_class=args.samples_per_class)
        build_feature_table_parallel(args.output_manifest, args.output_features)
