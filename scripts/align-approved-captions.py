#!/usr/bin/env python3
"""Align approved caption copy to final narration without trusting ASR text.

The approved JSON is the text authority. faster-whisper (or --timing-json in
offline tests) supplies only speech timing anchors. Caption boundaries are
allocated by cumulative character weight across those anchors.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, NoReturn


@dataclass(frozen=True)
class TimingUnit:
    start: float
    end: float
    weight: float


def fail(message: str) -> NoReturn:
    raise ValueError(message)


def read_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise ValueError(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc


def text_weight(text: str) -> float:
    """Return a stable reading-length weight while keeping text untouched."""
    weight = 0.0
    for character in text:
        if character.isspace():
            continue
        category = unicodedata.category(character)
        if category.startswith(("L", "N")):
            weight += 1.0
        elif category.startswith("P"):
            weight += 0.35
        elif category.startswith("S"):
            weight += 0.65
        else:
            weight += 0.5
    return weight


def load_approved(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    data = read_json(path)
    metadata: dict[str, Any] = {}
    if isinstance(data, list):
        raw_cues = data
    elif isinstance(data, dict) and isinstance(data.get("cues"), list):
        raw_cues = data["cues"]
        metadata = {key: value for key, value in data.items() if key != "cues"}
    else:
        fail('Approved JSON must be an array or an object with a "cues" array.')

    if not raw_cues:
        fail("Approved captions contain no cues.")

    cues: list[dict[str, Any]] = []
    identifiers: set[str] = set()
    for index, cue in enumerate(raw_cues, start=1):
        if not isinstance(cue, dict):
            fail(f"Approved cue {index} must be an object.")
        text = cue.get("text")
        if not isinstance(text, str) or not text.strip():
            fail(f"Approved cue {index} has empty text.")
        identifier = cue.get("id", f"cue-{index:03d}")
        if not isinstance(identifier, (str, int)) or not str(identifier).strip():
            fail(f"Approved cue {index} has an invalid id.")
        identifier = str(identifier)
        if identifier in identifiers:
            fail(f"Approved cue id is duplicated: {identifier}")
        identifiers.add(identifier)
        approved_cue = {"id": identifier, "text": text, "weight": text_weight(text)}
        if isinstance(cue.get("sceneId"), str) and cue["sceneId"].strip():
            approved_cue["sceneId"] = cue["sceneId"]
        if cue.get("style") in {"strip", "card", "minimal"}:
            approved_cue["style"] = cue["style"]
        cues.append(approved_cue)

    if any(cue["weight"] <= 0 for cue in cues):
        fail("Every approved cue must contain at least one readable character.")
    return cues, metadata


def probe_duration(audio: Path) -> float:
    if not audio.is_file():
        fail(f"Audio file not found: {audio}")
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        fail("ffprobe is required to validate the final audio duration.")
    command = [
        ffprobe,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(audio),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        fail(f"ffprobe could not read {audio}: {result.stderr.strip()}")
    try:
        duration = float(result.stdout.strip())
    except ValueError as exc:
        raise ValueError(f"ffprobe returned an invalid duration for {audio}.") from exc
    if not math.isfinite(duration) or duration <= 0:
        fail(f"Audio duration must be positive: {duration}")
    return duration


def resolve_device(requested: str) -> str:
    if requested != "auto":
        return requested
    try:
        import ctranslate2  # type: ignore

        return "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
    except (ImportError, RuntimeError):
        return "cpu"


def resolve_compute_type(requested: str, device: str) -> str:
    if requested != "auto":
        return requested
    return "float16" if device == "cuda" else "int8"


def transcribe_timing(
    audio: Path,
    model_name: str,
    device: str,
    compute_type: str,
    language: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError as exc:
        raise ValueError(
            "faster_whisper is not installed. Install it or use --timing-json for an offline timing source."
        ) from exc

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        str(audio),
        language=language,
        vad_filter=True,
        word_timestamps=True,
    )
    materialized = []
    discarded_word_anchors = 0
    for segment in segments:
        words = []
        for word in segment.words or []:
            if (
                word.start is None
                or word.end is None
                or not word.word.strip()
                or word.end <= word.start
            ):
                discarded_word_anchors += 1
                continue
            words.append(
                {
                    "start": word.start,
                    "end": word.end,
                    "text": word.word,
                }
            )
        materialized.append(
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
                "words": words,
            }
        )
    metadata = {
        "language": getattr(info, "language", language),
        "languageProbability": getattr(info, "language_probability", None),
        "model": model_name,
        "device": device,
        "computeType": compute_type,
        "discardedWordAnchors": discarded_word_anchors,
    }
    return materialized, metadata


def parse_time(value: Any, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        fail(f"{label} must be a number.")
    number = float(value)
    if not math.isfinite(number):
        fail(f"{label} must be finite.")
    return number


def timing_units(segments: Iterable[Any], audio_duration: float) -> list[TimingUnit]:
    units: list[TimingUnit] = []
    tolerance = 0.025
    previous_end = -math.inf
    previous_segment_end = -math.inf

    for segment_index, segment in enumerate(segments, start=1):
        if not isinstance(segment, dict):
            fail(f"Timing segment {segment_index} must be an object.")
        segment_start = parse_time(
            segment.get("start"), f"segment {segment_index} start"
        )
        segment_end = parse_time(segment.get("end"), f"segment {segment_index} end")
        if segment_start < -tolerance or segment_end <= segment_start:
            fail(f"Timing segment {segment_index} has an invalid range.")
        if segment_start < previous_segment_end - tolerance:
            fail(f"Timing segments overlap at segment {segment_index}.")
        if segment_end > audio_duration + tolerance:
            fail(
                f"Timing segment {segment_index} ends outside the audio "
                f"({segment_end:.3f}s > {audio_duration:.3f}s)."
            )
        previous_segment_end = segment_end

        words = segment.get("words")
        if isinstance(words, list) and words:
            candidates = words
        else:
            candidates = [
                {
                    "start": segment_start,
                    "end": segment_end,
                    "text": segment.get("text", "speech"),
                }
            ]

        for word_index, word in enumerate(candidates, start=1):
            if not isinstance(word, dict):
                fail(f"Timing word {segment_index}.{word_index} must be an object.")
            start = parse_time(
                word.get("start"), f"word {segment_index}.{word_index} start"
            )
            end = parse_time(word.get("end"), f"word {segment_index}.{word_index} end")
            if start < -tolerance or end <= start:
                fail(f"Timing word {segment_index}.{word_index} has an invalid range.")
            if start < segment_start - tolerance or end > segment_end + tolerance:
                fail(
                    f"Timing word {segment_index}.{word_index} lies outside its segment."
                )
            if end > audio_duration + tolerance:
                fail(
                    f"Timing word {segment_index}.{word_index} lies outside the audio."
                )
            if start < previous_end - tolerance:
                fail(f"Timing units overlap at word {segment_index}.{word_index}.")
            previous_end = max(previous_end, end)
            recognized = word.get("text", word.get("word", ""))
            if not isinstance(recognized, str) or not recognized.strip():
                fail(f"Timing word {segment_index}.{word_index} has empty text.")
            units.append(
                TimingUnit(
                    start=max(0.0, start),
                    end=min(audio_duration, end),
                    weight=max(text_weight(recognized), 0.25),
                )
            )

    if not units:
        fail("The timing source contains no speech anchors.")
    return units


def boundary_at(units: list[TimingUnit], target_weight: float) -> float:
    total = sum(unit.weight for unit in units)
    if target_weight <= 0:
        return units[0].start
    if target_weight >= total:
        return units[-1].end

    cumulative = 0.0
    for index, unit in enumerate(units):
        next_cumulative = cumulative + unit.weight
        if math.isclose(target_weight, next_cumulative, abs_tol=1e-9):
            if index + 1 < len(units):
                return (unit.end + units[index + 1].start) / 2.0
            return unit.end
        if target_weight < next_cumulative:
            progress = (target_weight - cumulative) / unit.weight
            return unit.start + progress * (unit.end - unit.start)
        cumulative = next_cumulative
    return units[-1].end


def align_cues(
    approved: list[dict[str, Any]], units: list[TimingUnit], audio_duration: float
) -> list[dict[str, Any]]:
    approved_total = sum(cue["weight"] for cue in approved)
    timing_total = sum(unit.weight for unit in units)
    cumulative_approved = 0.0
    boundaries = [units[0].start]
    for cue in approved[:-1]:
        cumulative_approved += cue["weight"]
        boundaries.append(
            boundary_at(units, timing_total * cumulative_approved / approved_total)
        )
    boundaries.append(units[-1].end)

    output = []
    previous_end = -math.inf
    for index, cue in enumerate(approved):
        start = boundaries[index]
        end = boundaries[index + 1]
        if start < -1e-6 or end > audio_duration + 1e-6:
            fail(f"Aligned cue {cue['id']} lies outside the audio.")
        if start < previous_end - 1e-6:
            fail(f"Aligned cue {cue['id']} overlaps the previous cue.")
        if end <= start:
            fail(f"Aligned cue {cue['id']} has zero or negative duration.")
        rounded_start = round(max(0.0, start), 3)
        rounded_end = round(min(audio_duration, end), 3)
        if rounded_end <= rounded_start:
            fail(f"Aligned cue {cue['id']} is too short after millisecond rounding.")
        aligned_cue = {
            "id": cue["id"],
            "text": cue["text"],
            "start": rounded_start,
            "end": rounded_end,
        }
        if "sceneId" in cue:
            aligned_cue["sceneId"] = cue["sceneId"]
        if "style" in cue:
            aligned_cue["style"] = cue["style"]
        output.append(aligned_cue)
        previous_end = end
    return output


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Use faster-whisper timings to align approved captions while preserving "
            "the approved text exactly."
        )
    )
    parser.add_argument(
        "--audio", required=True, type=Path, help="Final narration audio file."
    )
    parser.add_argument(
        "--approved",
        required=True,
        type=Path,
        help='JSON array of cues, or {"cues": [{"id": ..., "text": ...}]}.',
    )
    parser.add_argument(
        "--out", required=True, type=Path, help="Output aligned JSON path."
    )
    parser.add_argument(
        "--model", default="small", help="faster-whisper model name or local path."
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=("auto", "cpu", "cuda"),
        help="Inference device.",
    )
    parser.add_argument(
        "--compute-type",
        default="auto",
        help="CTranslate2 compute type; auto selects float16 on CUDA and int8 on CPU.",
    )
    parser.add_argument(
        "--language", default="zh", help="ASR language code (default: zh)."
    )
    parser.add_argument(
        "--timing-json",
        type=Path,
        help="Offline/test timing source with faster-whisper-like segments; skips model inference.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        duration = probe_duration(args.audio)
        approved, approved_metadata = load_approved(args.approved)
        device = resolve_device(args.device)
        compute_type = resolve_compute_type(args.compute_type, device)

        if args.timing_json:
            timing_data = read_json(args.timing_json)
            if isinstance(timing_data, dict):
                segments = timing_data.get("segments")
                timing_metadata = {
                    "source": "timing-json",
                    "model": timing_data.get("model"),
                    "device": None,
                    "computeType": None,
                    "language": timing_data.get("language", args.language),
                }
            else:
                segments = timing_data
                timing_metadata = {
                    "source": "timing-json",
                    "model": None,
                    "device": None,
                    "computeType": None,
                    "language": args.language,
                }
            if not isinstance(segments, list):
                fail(
                    'Timing JSON must be an array or an object with a "segments" array.'
                )
        else:
            segments, timing_metadata = transcribe_timing(
                args.audio, args.model, device, compute_type, args.language
            )
            timing_metadata["source"] = "faster-whisper"

        units = timing_units(segments, duration)
        aligned = align_cues(approved, units, duration)
        output = {
            **approved_metadata,
            "audio": str(args.audio.resolve()),
            "audioDuration": round(duration, 3),
            "speechStart": aligned[0]["start"],
            "speechEnd": aligned[-1]["end"],
            "alignment": {
                **timing_metadata,
                "method": "approved-character-weight-over-asr-timing",
                "textAuthority": "approved",
            },
            "cues": aligned,
        }
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("w", encoding="utf-8") as handle:
            json.dump(output, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        print(args.out.resolve())
        return 0
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
