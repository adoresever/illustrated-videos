#!/usr/bin/env python3
"""Synthetic offline smoke tests for scripts/detect-watermark.py."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DETECTOR = ROOT / "scripts" / "detect-watermark.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_detector(*arguments: str) -> tuple[subprocess.CompletedProcess[str], dict]:
    result = subprocess.run(
        [sys.executable, str(DETECTOR), *arguments],
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise AssertionError(
            f"Detector did not emit valid JSON. stdout={result.stdout!r} stderr={result.stderr!r}"
        ) from error
    return result, report


def scalable_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def tesseract_english_available() -> bool:
    executable = shutil.which("tesseract")
    if not executable:
        return False
    result = subprocess.run(
        [executable, "--list-langs"],
        capture_output=True,
        text=True,
        check=False,
    )
    languages = {line.strip() for line in result.stdout.splitlines()[1:]}
    return result.returncode == 0 and "eng" in languages


def main() -> None:
    assert DETECTOR.is_file(), f"Missing detector: {DETECTOR}"
    with tempfile.TemporaryDirectory(prefix="watermark-detector-smoke-") as temporary:
        work = Path(temporary)

        clear_image = work / "clear.png"
        Image.new("RGB", (1200, 800), (148, 176, 201)).save(clear_image)
        clear_hash = sha256(clear_image)

        # A heuristic no-hit must never silently become a publish pass.
        result, report = run_detector(str(clear_image), "--no-ocr")
        assert result.returncode == 2, (result.returncode, report)
        assert report["status"] == "review-required"
        assert report["publishReady"] is False
        assert report["image"]["sha256"] == clear_hash
        assert report["detector"]["networkCalls"] == 0
        assert report["detector"]["apiOrModelCalls"] == 0
        assert not any(hit["signal"] == "ocr-text" for hit in report["hits"])

        # A visual decision is bound to the exact bytes that were inspected.
        result, report = run_detector(
            str(clear_image),
            "--no-ocr",
            "--visual-confirmation",
            "human",
            "--expected-sha256",
            clear_hash,
        )
        assert result.returncode == 0, (result.returncode, report)
        assert report["status"] == "clear"
        assert report["publishReady"] is True
        assert report["visualConfirmation"]["reviewerType"] == "human"
        assert report["visualConfirmation"]["confirmedSha256"] == clear_hash
        assert report["visualConfirmation"]["expectedSha256Verified"] is True
        assert report["hashVerification"]["matched"] is True

        result, report = run_detector(
            str(clear_image),
            "--no-ocr",
            "--visual-confirmation",
            "agent",
            "--expected-sha256",
            clear_hash,
            "--report",
            str(work / "clear.watermark.json"),
        )
        assert result.returncode == 0, (result.returncode, report)
        assert report["status"] == "clear"
        assert report["visualConfirmation"]["reviewerType"] == "agent"
        assert report["visualConfirmation"]["confirmedSha256"] == clear_hash
        assert json.loads((work / "clear.watermark.json").read_text(encoding="utf-8")) == report

        # A stale or wrong review hash cannot clear a different file.
        wrong_hash = "0" * 64 if clear_hash != "0" * 64 else "1" * 64
        result, report = run_detector(
            str(clear_image),
            "--no-ocr",
            "--visual-confirmation",
            "agent",
            "--expected-sha256",
            wrong_hash,
        )
        assert result.returncode == 4, (result.returncode, report)
        assert report["status"] == "error"
        assert report["publishReady"] is False
        assert report["error"]["code"] == "sha256-mismatch"
        assert report["image"]["sha256"] == clear_hash

        ocr_case = "SKIP (Tesseract with English data unavailable)"
        if tesseract_english_available():
            marked_image = work / "corner-text.png"
            image = Image.new("RGB", (1600, 1000), (238, 234, 222))
            draw = ImageDraw.Draw(image)
            text = "SAMPLE MARK 2026"
            font = scalable_font(78)
            text_box = draw.textbbox((0, 0), text, font=font, stroke_width=1)
            text_width = text_box[2] - text_box[0]
            text_height = text_box[3] - text_box[1]
            position = (image.width - text_width - 55, image.height - text_height - 55)
            draw.text(
                position,
                text,
                font=font,
                fill=(20, 20, 20),
                stroke_width=1,
                stroke_fill=(255, 255, 255),
            )
            image.save(marked_image)

            result, report = run_detector(str(marked_image), "--ocr-language", "eng")
            assert result.returncode == 3, (result.returncode, report)
            assert report["status"] == "detected"
            assert report["publishReady"] is False
            assert report["ocr"]["available"] is True
            assert report["ocr"]["performed"] is True
            ocr_hits = [hit for hit in report["hits"] if hit["signal"] == "ocr-text"]
            assert ocr_hits, report
            assert any(hit["region"] in {"bottom-right", "bottom-edge"} for hit in ocr_hits)
            assert any(hit["strength"] == "strong" for hit in ocr_hits)
            ocr_case = "PASS"

    print(f"watermark detector smoke test: PASS; OCR case: {ocr_case}")


if __name__ == "__main__":
    main()
