# Document Originality / Forgery Detection

A local, open-source document authenticity risk detector for JPG/PNG/TIFF scans and digital PDFs. It returns `ORIGINAL` or `TAMPERED/FORGED`, a confidence score, the numeric feature vector, and human-readable reasons for triggered signals.

This is a heuristic decision-support tool, not legal proof of forgery. Results must be reviewed by a qualified human and corroborated with source records.

## Setup

```powershell
cd document-authenticity-detector
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

For OCR, install the Tesseract executable separately and set `TESSERACT_CMD` if it is not on `PATH`. The service still works without Tesseract; OCR-only signals will be unavailable.

## Run The API

```powershell
uvicorn src.api.main:app --reload --port 8001
```

Then send a document:

```powershell
curl.exe -X POST http://localhost:8001/predict -F "file=@data/raw/sample.png"
curl.exe http://localhost:8001/health
```

Typical single-page images use an in-memory pipeline and do not require internet access or paid APIs.

## Synthetic Training Data

Put clean sample files in `data/raw/`, then generate a balanced training aid:

```powershell
python -m src.synthetic_data.generate_tampered_docs
```

The generator creates recompressed, text-spliced, copy-moved, screenshot-of-screenshot, and metadata-edited variants in `data/synthetic_tampered/`. It writes `data/processed/manifest.csv` with `label`, `provenance`, and `tamper_type`; all generated variants are marked `SYNTHETIC` so they cannot be mistaken for real fraud evidence.

Train and evaluate:

```powershell
python -m src.model.train
python -m src.model.evaluate
```

Training writes `data/processed/features.csv` plus model artifacts under `data/processed/model/`. If no trained model exists, `predict()` uses the same feature vector with a transparent weighted heuristic fallback.

## Feature Signals

- `pdf_loader.py`: text, metadata, page renders, embedded image inventory, and PDF structure hints.
- `image_loader.py`: EXIF, orientation correction, normalized PIL/RGB/BGR/grayscale arrays.
- Metadata: producer/creator, creation-vs-modification gap, XMP presence, font and object-stream hints.
- ELA: JPEG recompression difference statistics.
- Noise: residual noise, local variance, and edge ratio.
- Font/layout: font diversity, spacing irregularity, and baseline drift.
- OCR consistency: OCR availability and copy-paste/compositing token artifacts.
- Hash: perceptual hash distance when a known-original reference is supplied.

## Tests

```powershell
pytest -q
```

The tests exercise image ingestion, shared feature convergence, `/health`, and `/predict` without requiring a trained model or internet access.

## Limitations

- Synthetic tampering is useful for pipeline development but does not represent the full distribution of real forgery techniques.
- ELA is most meaningful for JPEG-like workflows and can produce false positives after ordinary editing or platform recompression.
- Metadata can be removed or rewritten easily and should never be treated as decisive evidence.
- OCR quality depends on scan quality, language support, and a local Tesseract installation.
- A known-original hash reference is optional; without it, hash mismatch features are neutral.
- The returned confidence is model/risk confidence, not a probability of legal guilt or document fraud.
