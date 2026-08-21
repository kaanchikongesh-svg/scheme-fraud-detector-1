from __future__ import annotations

from datetime import datetime
from typing import Any


def _parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).replace("D:", "").split("+")[0].split("-")[0]
    for fmt in ("%Y%m%d%H%M%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text[:len(datetime.now().strftime(fmt))], fmt)
        except ValueError:
            continue
    return None


def extract_metadata_features(document: dict[str, Any]) -> dict[str, float]:
    metadata = document.get("metadata", {})
    created = _parse_date(metadata.get("creationDate") or metadata.get("CreationDate"))
    modified = _parse_date(metadata.get("modDate") or metadata.get("ModDate"))
    delta_days = max(0.0, (modified - created).total_seconds() / 86400) if created and modified else 0.0
    producer = str(metadata.get("producer", "")).lower()
    creator = str(metadata.get("creator", "")).lower()
    xmp_present = float(bool(document.get("xmp_metadata") or metadata.get("xmp")))
    fonts = document.get("pages", [{}])[0].get("fonts", []) if document.get("pages") else []
    unique_fonts = len(set(fonts))
    font_mismatch = float(unique_fonts > 3 and unique_fonts / max(len(fonts), 1) > 0.45)
    object_anomaly = float(document.get("kind") == "pdf" and not metadata.get("format"))
    return {
        "metadata_has_creator": float(bool(creator)),
        "metadata_has_producer": float(bool(producer)),
        "metadata_modification_gap_days": delta_days,
        "metadata_large_date_gap": float(delta_days >= 365),
        "metadata_xmp_present": xmp_present,
        "metadata_font_count": float(len(fonts)),
        "metadata_unique_font_count": float(unique_fonts),
        "metadata_font_mismatch": font_mismatch,
        "metadata_object_stream_anomaly": object_anomaly,
    }
