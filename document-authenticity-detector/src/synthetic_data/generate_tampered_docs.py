from __future__ import annotations

import argparse
import csv
import io
import random
from pathlib import Path

import cv2
try:
    import pymupdf as fitz
except ImportError:
    import fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

TAMPER_TYPES = ("recompress", "text_splice", "copy_move", "screenshot", "metadata_edit")


def _font(size: int = 28):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _first_page_image(path: Path) -> Image.Image:
    if path.suffix.lower() == ".pdf":
        doc = fitz.open(path)
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        doc.close()
        return image
    return Image.open(path).convert("RGB")


def _recompress(image: Image.Image) -> Image.Image:
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=random.choice((35, 50, 65)))
    return Image.open(io.BytesIO(buffer.getvalue())).convert("RGB")


def _text_splice(image: Image.Image) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result)
    x = int(result.width * 0.12)
    y = int(result.height * 0.42)
    draw.rectangle((x, y, min(result.width - 10, x + int(result.width * 0.55)), y + 42), fill="white")
    draw.text((x + 5, y + 7), "ALTERED ENTRY", fill=(35, 35, 35), font=_font(max(14, result.width // 90)))
    return result


def _copy_move(image: Image.Image) -> Image.Image:
    result = image.copy()
    w, h = result.size
    box = (max(0, w // 8), max(0, h // 8), min(w, w // 8 + w // 4), min(h, h // 8 + h // 8))
    patch = result.crop(box)
    result.paste(patch, (max(0, w - patch.width - 20), max(0, h - patch.height - 20)))
    return result


def _screenshot(image: Image.Image) -> Image.Image:
    reduced = image.resize((max(1, image.width // 2), max(1, image.height // 2)), Image.Resampling.BILINEAR)
    return reduced.resize(image.size, Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(0.35))


def _save_variant(image: Image.Image, destination: Path, source_suffix: str, tamper_type: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source_suffix == ".pdf" and tamper_type == "metadata_edit":
        pdf = fitz.open()
        page = pdf.new_page(width=image.width, height=image.height)
        page.insert_image(page.rect, stream=_png_bytes(image))
        pdf.set_metadata({"title": "Scanned document", "creationDate": "D:20200101000000", "modDate": "D:20250801000000", "producer": "SyntheticTamperGenerator"})
        pdf.save(destination)
        pdf.close()
    else:
        image.save(destination, format="JPEG", quality=88)


def _png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def generate(input_dir: Path, output_dir: Path, manifest_path: Path, seed: int = 7) -> int:
    random.seed(seed)
    sources = [p for p in input_dir.iterdir() if p.suffix.lower() in {".pdf", ".jpg", ".jpeg", ".png"}]
    output_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for source in sources:
        clean_rel = source.name
        rows.append({"path": str(source), "label": "ORIGINAL", "provenance": "REAL_SAMPLE", "tamper_type": "none"})
        base = _first_page_image(source)
        for tamper_type in TAMPER_TYPES:
            variant = {"recompress": _recompress, "text_splice": _text_splice, "copy_move": _copy_move, "screenshot": _screenshot, "metadata_edit": lambda x: x}[tamper_type](base)
            suffix = ".pdf" if source.suffix.lower() == ".pdf" and tamper_type == "metadata_edit" else ".jpg"
            destination = output_dir / f"{source.stem}__{tamper_type}{suffix}"
            _save_variant(variant, destination, source.suffix.lower(), tamper_type)
            rows.append({"path": str(destination), "label": "TAMPERED", "provenance": "SYNTHETIC", "tamper_type": tamper_type})
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "label", "provenance", "tamper_type"])
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate labeled synthetic tampered document variants.")
    parser.add_argument("--input-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--output-dir", type=Path, default=Path("data/synthetic_tampered"))
    parser.add_argument("--manifest", type=Path, default=Path("data/processed/manifest.csv"))
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    print(f"Wrote {generate(args.input_dir, args.output_dir, args.manifest, args.seed)} manifest rows")


if __name__ == "__main__":
    main()
