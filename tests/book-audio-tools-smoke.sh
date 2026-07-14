#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for command in ffmpeg ffprobe python3; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing test dependency: $command" >&2
    exit 1
  }
done

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i 'aevalsrc=0.20*sin(2*PI*190*t)*(0.55+0.45*sin(2*PI*3*t)):s=48000:d=3.2' \
  "$work/voice.wav"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i 'aevalsrc=0.08*sin(2*PI*110*t)+0.04*sin(2*PI*165*t):s=48000:d=1.1' \
  "$work/bgm.wav"

"$root/scripts/mix-book-audio.sh" \
  --voice "$work/voice.wav" \
  --out "$work/voice-processed.wav"
"$root/scripts/mix-book-audio.sh" \
  --voice "$work/voice.wav" \
  --bgm "$work/bgm.wav" \
  --bgm-start 0.2 \
  --out "$work/master.wav"

for audio in "$work/voice-processed.wav" "$work/master.wav"; do
  sample_rate="$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$audio")"
  [[ "$sample_rate" == "48000" ]] || { echo "Unexpected sample rate: $audio ($sample_rate)" >&2; exit 1; }
  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$audio")"
  awk -v value="$duration" 'BEGIN { exit !(value >= 3.15 && value <= 3.35) }' || {
    echo "Unexpected output duration: $audio ($duration)" >&2
    exit 1
  }
done

cat >"$work/approved.json" <<'JSON'
{
  "project": "offline-smoke",
  "cues": [
    {"id": "hook", "text": "爱情，也会发烧吗？"},
    {"id": "time", "text": "时间让答案慢慢显形。"},
    {"id": "close", "text": "我们只问，不替你回答。"}
  ]
}
JSON

cat >"$work/timing.json" <<'JSON'
{
  "language": "zh",
  "model": "offline-fixture",
  "segments": [
    {
      "start": 0.12,
      "end": 1.46,
      "text": "mock one",
      "words": [
        {"start": 0.12, "end": 0.48, "text": "mock"},
        {"start": 0.62, "end": 1.00, "text": "timing"},
        {"start": 1.12, "end": 1.46, "text": "only"}
      ]
    },
    {
      "start": 1.70,
      "end": 3.04,
      "text": "mock two",
      "words": [
        {"start": 1.70, "end": 2.05, "text": "never"},
        {"start": 2.18, "end": 2.54, "text": "trust"},
        {"start": 2.68, "end": 3.04, "text": "copy"}
      ]
    }
  ]
}
JSON

python3 "$root/scripts/align-approved-captions.py" \
  --audio "$work/master.wav" \
  --approved "$work/approved.json" \
  --timing-json "$work/timing.json" \
  --out "$work/aligned.json"

python3 - "$work/approved.json" "$work/aligned.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    approved = json.load(handle)
with open(sys.argv[2], encoding="utf-8") as handle:
    aligned = json.load(handle)

assert aligned["project"] == "offline-smoke"
assert [cue["text"] for cue in aligned["cues"]] == [cue["text"] for cue in approved["cues"]]
assert aligned["alignment"]["textAuthority"] == "approved"
assert aligned["alignment"]["source"] == "timing-json"
assert aligned["cues"][0]["start"] == 0.12
assert aligned["cues"][-1]["end"] == 3.04

previous_end = -1.0
for cue in aligned["cues"]:
    assert 0 <= cue["start"] < cue["end"] <= aligned["audioDuration"]
    assert cue["start"] >= previous_end
    previous_end = cue["end"]
PY

cat >"$work/empty-approved.json" <<'JSON'
{"cues": [{"id": "bad", "text": "   "}]}
JSON
if python3 "$root/scripts/align-approved-captions.py" \
  --audio "$work/master.wav" \
  --approved "$work/empty-approved.json" \
  --timing-json "$work/timing.json" \
  --out "$work/should-not-exist.json" >/dev/null 2>&1; then
  echo "Empty approved text was not rejected." >&2
  exit 1
fi

cat >"$work/overlap-timing.json" <<'JSON'
{"segments": [
  {"start": 0.1, "end": 1.0, "text": "one"},
  {"start": 0.8, "end": 1.5, "text": "two"}
]}
JSON
if python3 "$root/scripts/align-approved-captions.py" \
  --audio "$work/master.wav" \
  --approved "$work/approved.json" \
  --timing-json "$work/overlap-timing.json" \
  --out "$work/should-not-exist.json" >/dev/null 2>&1; then
  echo "Overlapping timing units were not rejected." >&2
  exit 1
fi

cat >"$work/out-of-bounds-timing.json" <<'JSON'
{"segments": [{"start": 0.1, "end": 99, "text": "outside"}]}
JSON
if python3 "$root/scripts/align-approved-captions.py" \
  --audio "$work/master.wav" \
  --approved "$work/approved.json" \
  --timing-json "$work/out-of-bounds-timing.json" \
  --out "$work/should-not-exist.json" >/dev/null 2>&1; then
  echo "Out-of-bounds timing was not rejected." >&2
  exit 1
fi

echo "book audio tools smoke test: PASS"
