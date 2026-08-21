from fastapi.testclient import TestClient
from PIL import Image
from io import BytesIO

from src.api.main import app


def test_health():
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_predict_image():
    output = BytesIO()
    Image.new("RGB", (160, 100), "white").save(output, format="PNG")
    response = TestClient(app).post("/predict", files={"file": ("sample.png", output.getvalue(), "image/png")})
    assert response.status_code == 200
    body = response.json()
    assert body["label"] in {"ORIGINAL", "TAMPERED/FORGED"}
    assert isinstance(body["reasons"], list)
