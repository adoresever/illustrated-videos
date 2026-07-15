#!/usr/bin/env python3
"""Offline, heuristic watermark screening for generated raster images.

The detector deliberately acts as a release gate, not as proof that an image is
watermark-free.  Pillow checks edge/corner pixels on every run.  A local
Tesseract executable is used for edge OCR when available; no network service,
API, or model call is made.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps, ImageStat


DETECTOR_VERSION = "1.0.0"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def emit(report: dict[str, Any], pretty: bool, report_path: Path | None = None) -> None:
    payload = json.dumps(
        report,
        ensure_ascii=False,
        indent=2 if pretty else None,
        separators=None if pretty else (",", ":"),
    )
    if report_path is not None:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(f"{payload}\n", encoding="utf-8")
    print(payload)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def flatten_to_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(background, rgba).convert("RGB")


def region_boxes(width: int, height: int) -> list[tuple[str, tuple[int, int, int, int]]]:
    def box(left: float, top: float, right: float, bottom: float) -> tuple[int, int, int, int]:
        x0 = max(0, min(width - 1, round(width * left)))
        y0 = max(0, min(height - 1, round(height * top)))
        x1 = max(x0 + 1, min(width, round(width * right)))
        y1 = max(y0 + 1, min(height, round(height * bottom)))
        return (x0, y0, x1, y1)

    return [
        ("top-left", box(0.00, 0.00, 0.36, 0.30)),
        ("top-right", box(0.64, 0.00, 1.00, 0.30)),
        ("bottom-left", box(0.00, 0.70, 0.36, 1.00)),
        ("bottom-right", box(0.64, 0.70, 1.00, 1.00)),
        ("top-edge", box(0.30, 0.00, 0.70, 0.20)),
        ("bottom-edge", box(0.30, 0.80, 0.70, 1.00)),
        ("left-edge", box(0.00, 0.25, 0.20, 0.75)),
        ("right-edge", box(0.80, 0.25, 1.00, 0.75)),
    ]


def analyze_regions(image: Image.Image) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rgba = image.convert("RGBA")
    rgb = flatten_to_rgb(image)
    region_reports: list[dict[str, Any]] = []
    hits: list[dict[str, Any]] = []

    for name, coordinates in region_boxes(image.width, image.height):
        rgb_crop = rgb.crop(coordinates)
        rgba_crop = rgba.crop(coordinates)

        # A bounded thumbnail keeps the local operation cheap on very large assets.
        sample = ImageOps.grayscale(rgb_crop)
        sample.thumbnail((360, 360), Image.Resampling.LANCZOS)
        local_max = sample.filter(ImageFilter.MaxFilter(5))
        local_min = sample.filter(ImageFilter.MinFilter(5))
        local_contrast = ImageChops.subtract(local_max, local_min)
        histogram = local_contrast.histogram()
        pixel_count = max(1, sample.width * sample.height)
        strong_ratio = sum(histogram[96:]) / pixel_count
        extreme_ratio = sum(histogram[160:]) / pixel_count
        mean_local_contrast = ImageStat.Stat(local_contrast).mean[0]

        alpha = rgba_crop.getchannel("A")
        alpha_histogram = alpha.histogram()
        alpha_pixels = max(1, rgba_crop.width * rgba_crop.height)
        partial_alpha_ratio = sum(alpha_histogram[9:247]) / alpha_pixels

        signals: list[str] = []
        # These thresholds intentionally produce review clues, never an automatic
        # "detected" verdict. Natural illustration detail can look similar.
        if (
            0.006 <= extreme_ratio <= 0.22
            and strong_ratio >= 0.015
            and mean_local_contrast >= 8.0
        ):
            signals.append("high-contrast-mark-like-detail")
            hits.append(
                {
                    "signal": "high-contrast-mark-like-detail",
                    "strength": "review",
                    "region": name,
                    "box": list(coordinates),
                    "reason": (
                        "Localized edge pixels contain a mark-like concentration of "
                        "high local contrast; illustration detail can cause false positives."
                    ),
                    "metrics": {
                        "strongContrastRatio": round(strong_ratio, 6),
                        "extremeContrastRatio": round(extreme_ratio, 6),
                        "meanLocalContrast": round(mean_local_contrast, 3),
                    },
                }
            )

        if 0.001 <= partial_alpha_ratio <= 0.45:
            signals.append("partial-alpha-overlay-like-detail")
            hits.append(
                {
                    "signal": "partial-alpha-overlay-like-detail",
                    "strength": "review",
                    "region": name,
                    "box": list(coordinates),
                    "reason": (
                        "Partially transparent edge pixels could belong to an overlay, "
                        "but soft artwork and cutout edges can produce the same signal."
                    ),
                    "metrics": {"partialAlphaRatio": round(partial_alpha_ratio, 6)},
                }
            )

        region_reports.append(
            {
                "name": name,
                "box": list(coordinates),
                "metrics": {
                    "strongContrastRatio": round(strong_ratio, 6),
                    "extremeContrastRatio": round(extreme_ratio, 6),
                    "meanLocalContrast": round(mean_local_contrast, 3),
                    "partialAlphaRatio": round(partial_alpha_ratio, 6),
                },
                "signals": signals,
            }
        )

    return region_reports, hits


def region_for_point(x: float, y: float, width: int, height: int) -> str | None:
    horizontal = x / max(1, width)
    vertical = y / max(1, height)
    if vertical <= 0.30 and horizontal <= 0.36:
        return "top-left"
    if vertical <= 0.30 and horizontal >= 0.64:
        return "top-right"
    if vertical >= 0.70 and horizontal <= 0.36:
        return "bottom-left"
    if vertical >= 0.70 and horizontal >= 0.64:
        return "bottom-right"
    if vertical <= 0.22:
        return "top-edge"
    if vertical >= 0.78:
        return "bottom-edge"
    if horizontal <= 0.22:
        return "left-edge"
    if horizontal >= 0.78:
        return "right-edge"
    return None


def parse_tesseract_tsv(
    tsv: str,
    scale: float,
    original_size: tuple[int, int],
    minimum_confidence: float,
) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    reader = csv.DictReader(io.StringIO(tsv), delimiter="\t")
    required_columns = {"block_num", "par_num", "line_num", "left", "top", "width", "height", "conf", "text"}
    if not reader.fieldnames or not required_columns.issubset(reader.fieldnames):
        return []

    for row in reader:
        text = (row.get("text") or "").strip()
        if not text:
            continue
        try:
            confidence = float(row["conf"])
            left = int(row["left"])
            top = int(row["top"])
            width = int(row["width"])
            height = int(row["height"])
        except (TypeError, ValueError):
            continue
        if confidence < 0:
            continue
        key = (
            row.get("block_num", ""),
            row.get("par_num", ""),
            row.get("line_num", ""),
            row.get("page_num", ""),
        )
        item = grouped.setdefault(
            key,
            {
                "words": [],
                "weightedConfidence": 0.0,
                "weight": 0,
                "left": left,
                "top": top,
                "right": left + width,
                "bottom": top + height,
            },
        )
        weight = max(1, sum(character.isalnum() for character in text))
        item["words"].append(text)
        item["weightedConfidence"] += confidence * weight
        item["weight"] += weight
        item["left"] = min(item["left"], left)
        item["top"] = min(item["top"], top)
        item["right"] = max(item["right"], left + width)
        item["bottom"] = max(item["bottom"], top + height)

    findings: list[dict[str, Any]] = []
    original_width, original_height = original_size
    for item in grouped.values():
        text = " ".join(item["words"])[:160]
        alphanumeric_count = sum(character.isalnum() for character in text)
        confidence = item["weightedConfidence"] / max(1, item["weight"])
        if alphanumeric_count < 3 or confidence < minimum_confidence:
            continue
        left = round(item["left"] / scale)
        top = round(item["top"] / scale)
        right = round(item["right"] / scale)
        bottom = round(item["bottom"] / scale)
        center_x = (left + right) / 2
        center_y = (top + bottom) / 2
        region = region_for_point(center_x, center_y, original_width, original_height)
        if region is None:
            continue
        findings.append(
            {
                "signal": "ocr-text",
                "strength": "strong" if confidence >= 55.0 else "review",
                "region": region,
                "box": [left, top, right, bottom],
                "reason": (
                    "Local OCR found text along an image edge. Generated source art is "
                    "expected to contain no embedded text, so this may be a watermark or label."
                ),
                "text": text,
                "confidence": round(confidence, 2),
            }
        )
    return findings


def run_tesseract(
    image: Image.Image,
    executable: str,
    language: str | None,
    minimum_confidence: float,
) -> tuple[dict[str, Any], list[dict[str, Any]], list[str]]:
    try:
        version_result = subprocess.run(
            [executable, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        version = (version_result.stdout or version_result.stderr).splitlines()[0].strip()
    except (OSError, subprocess.SubprocessError):
        version = "unknown"

    canvas = flatten_to_rgb(image)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle(
        (
            round(canvas.width * 0.23),
            round(canvas.height * 0.23),
            round(canvas.width * 0.77),
            round(canvas.height * 0.77),
        ),
        fill=(255, 255, 255),
    )
    canvas = ImageOps.autocontrast(ImageOps.grayscale(canvas))

    longest_side = max(canvas.size)
    scale = min(2200 / longest_side, max(1.0, 1000 / longest_side))
    if abs(scale - 1.0) > 0.01:
        canvas = canvas.resize(
            (max(1, round(canvas.width * scale)), max(1, round(canvas.height * scale))),
            Image.Resampling.LANCZOS,
        )
    else:
        scale = 1.0

    encoded = io.BytesIO()
    canvas.save(encoded, format="PNG")
    command = [executable, "stdin", "stdout", "--psm", "11"]
    if language:
        command.extend(["-l", language])
    command.append("tsv")

    try:
        result = subprocess.run(
            command,
            input=encoded.getvalue(),
            capture_output=True,
            timeout=30,
            check=False,
        )
    except subprocess.TimeoutExpired:
        message = "Local Tesseract OCR timed out; edge text was not screened."
        return (
            {"enabled": True, "available": True, "performed": False, "engine": "tesseract", "version": version, "error": message},
            [],
            [message],
        )
    except OSError as error:
        message = f"Local Tesseract OCR could not start: {error}"
        return (
            {"enabled": True, "available": True, "performed": False, "engine": "tesseract", "version": version, "error": message},
            [],
            [message],
        )

    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip().splitlines()
        suffix = detail[-1] if detail else f"exit code {result.returncode}"
        message = f"Local Tesseract OCR failed; edge text was not screened: {suffix}"
        return (
            {"enabled": True, "available": True, "performed": False, "engine": "tesseract", "version": version, "error": message},
            [],
            [message],
        )

    tsv = result.stdout.decode("utf-8", errors="replace")
    findings = parse_tesseract_tsv(tsv, scale, image.size, minimum_confidence)
    report = {
        "enabled": True,
        "available": True,
        "performed": True,
        "engine": "tesseract",
        "version": version,
        "language": language or "engine-default",
        "minimumConfidence": minimum_confidence,
        "edgeTextFindings": len(findings),
    }
    return report, findings, []


def error_report(path: Path, code: str, message: str, sha256: str | None = None) -> dict[str, Any]:
    return {
        "detector": {"name": "offline-watermark-screen", "version": DETECTOR_VERSION},
        "status": "error",
        "publishReady": False,
        "image": {"path": str(path.resolve()), "sha256": sha256},
        "error": {"code": code, "message": message},
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Screen image edges for possible watermarks using only Pillow and optional local "
            "Tesseract. Unconfirmed no-hit results remain review-required."
        )
    )
    parser.add_argument("image", help="Raster image to screen")
    parser.add_argument(
        "--visual-confirmation",
        choices=("human", "agent"),
        help="Record visual review of this exact file and permit a clear result",
    )
    parser.add_argument(
        "--expected-sha256",
        help="Fail if the source bytes do not match this SHA-256 (recommended with confirmation)",
    )
    parser.add_argument("--no-ocr", action="store_true", help="Skip optional local Tesseract OCR")
    parser.add_argument(
        "--ocr-language",
        help="Tesseract language code(s), for example eng or chi_sim+eng; uses engine default if omitted",
    )
    parser.add_argument(
        "--ocr-min-confidence",
        type=float,
        default=45.0,
        help="Minimum Tesseract line confidence to report (default: 45)",
    )
    parser.add_argument("--report", help="Also write the JSON report to this path")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()
    report_path = Path(args.report) if args.report else None

    path = Path(args.image)
    if not path.is_file():
        emit(error_report(path, "file-not-found", "Input image does not exist or is not a file."), args.pretty, report_path)
        raise SystemExit(4)

    try:
        sha256 = file_sha256(path)
    except OSError as error:
        emit(error_report(path, "file-read-failed", str(error)), args.pretty, report_path)
        raise SystemExit(4)

    expected_sha256 = args.expected_sha256.lower().strip() if args.expected_sha256 else None
    if expected_sha256 and not SHA256_RE.fullmatch(expected_sha256):
        emit(error_report(path, "invalid-expected-sha256", "Expected SHA-256 must be exactly 64 hexadecimal characters.", sha256), args.pretty, report_path)
        raise SystemExit(4)
    if expected_sha256 and expected_sha256 != sha256:
        emit(
            error_report(
                path,
                "sha256-mismatch",
                "Source image bytes do not match --expected-sha256; visual confirmation was not applied.",
                sha256,
            ),
            args.pretty,
            report_path,
        )
        raise SystemExit(4)

    try:
        with Image.open(path) as opened:
            image_format = opened.format
            image = ImageOps.exif_transpose(opened).copy()
        image.load()
    except Exception as error:  # Pillow exposes format-specific exception classes.
        emit(error_report(path, "image-decode-failed", f"Pillow could not decode the image: {error}", sha256), args.pretty, report_path)
        raise SystemExit(4)

    if image.width <= 0 or image.height <= 0:
        emit(error_report(path, "invalid-dimensions", "Image dimensions must be positive.", sha256), args.pretty, report_path)
        raise SystemExit(4)

    regions, hits = analyze_regions(image)
    warnings: list[str] = []
    tesseract = shutil.which("tesseract")
    if args.no_ocr:
        ocr_report = {
            "enabled": False,
            "available": bool(tesseract),
            "performed": False,
            "engine": "tesseract" if tesseract else None,
            "reason": "disabled-by-command-line",
        }
    elif tesseract:
        ocr_report, ocr_hits, ocr_warnings = run_tesseract(
            image,
            tesseract,
            args.ocr_language,
            args.ocr_min_confidence,
        )
        hits.extend(ocr_hits)
        warnings.extend(ocr_warnings)
    else:
        warning = "Tesseract is not installed; OCR text screening was skipped."
        ocr_report = {
            "enabled": True,
            "available": False,
            "performed": False,
            "engine": "tesseract",
            "reason": "executable-not-found",
        }
        warnings.append(warning)

    strong_ocr = any(hit["signal"] == "ocr-text" and hit["strength"] == "strong" for hit in hits)
    heuristic_status = "detected" if strong_ocr else "review-required"
    if args.visual_confirmation:
        status = "clear"
        decision_reason = (
            "A human or Agent visually reviewed the exact source bytes. Heuristic signals are "
            "retained in the report but the explicit visual decision is authoritative."
        )
    elif strong_ocr:
        status = "detected"
        decision_reason = "Strong edge OCR text requires replacement, cleanup, or visual adjudication."
    else:
        status = "review-required"
        decision_reason = (
            "No conclusive watermark was detected, but heuristic non-detection cannot authorize publishing. "
            "Inspect the image visually, then rerun with --visual-confirmation human|agent."
        )

    report = {
        "detector": {
            "name": "offline-watermark-screen",
            "version": DETECTOR_VERSION,
            "networkCalls": 0,
            "apiOrModelCalls": 0,
        },
        "status": status,
        "publishReady": status == "clear",
        "heuristicStatusBeforeConfirmation": heuristic_status,
        "decisionReason": decision_reason,
        "image": {
            "path": str(path.resolve()),
            "sha256": sha256,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "format": image_format,
        },
        "hashVerification": {
            "expectedProvided": expected_sha256 is not None,
            "matched": expected_sha256 == sha256 if expected_sha256 else None,
        },
        "visualConfirmation": {
            "provided": args.visual_confirmation is not None,
            "reviewerType": args.visual_confirmation,
            "confirmedSha256": sha256 if args.visual_confirmation else None,
            "expectedSha256Verified": bool(expected_sha256 and expected_sha256 == sha256),
            "overrodeHeuristicStatus": bool(
                args.visual_confirmation and heuristic_status != "clear"
            ),
        },
        "ocr": ocr_report,
        "regions": regions,
        "hits": hits,
        "warnings": warnings,
        "limitations": [
            "This is a heuristic first-pass screen, not proof that an image has no watermark.",
            "Stylized, low-contrast, non-text, central, repeated-pattern, and flattened translucent graphic watermarks can be missed.",
            "OCR quality depends on the locally installed Tesseract languages and can produce both misses and false positives.",
            "A no-hit result stays review-required until a human or Agent visually confirms the exact SHA-256-bound image.",
        ],
    }
    emit(report, args.pretty, report_path)
    if status == "clear":
        raise SystemExit(0)
    if status == "detected":
        raise SystemExit(3)
    raise SystemExit(2)


if __name__ == "__main__":
    main()
