from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile

from src.model.inference import predict
from src.utils.config import MAX_UPLOAD_BYTES, TESSERACT_CMD

if TESSERACT_CMD:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

app = FastAPI(title="Document Originality / Forgery Detection API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
async def predict_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required")
    suffix = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if suffix not in {"pdf", "jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"}:
        raise HTTPException(status_code=415, detail="Supported files: PDF, JPG, PNG, TIFF, BMP, WEBP")
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_BYTES} byte limit")
    try:
        return predict(raw, filename=file.filename)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=422, detail=f"Could not analyze document: {exc}") from exc
