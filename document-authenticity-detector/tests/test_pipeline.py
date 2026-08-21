from __future__ import annotations

from io import BytesIO

from PIL import Image

from src.features.pipeline import extract_features, explain_features
from src.ingestion.document_loader import load_document


def test_image_loader_converges_to_feature_schema():
    output = BytesIO()
    Image.new("RGB", (120, 80), "white").save(output, format="PNG")
    document = load_document(output.getvalue(), "sample.png")
    features = extract_features(document)
    assert document["kind"] == "image"
    assert "ela_mean" in features
    assert "noise_std" in features
    assert explain_features(features)
