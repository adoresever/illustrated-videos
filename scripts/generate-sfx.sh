#!/usr/bin/env bash
set -euo pipefail

output="${1:-}"
if [[ -z "$output" ]]; then
  echo "Usage: generate-sfx.sh <output-directory>" >&2
  exit 1
fi
mkdir -p "$output"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "aevalsrc=0.55*sin(2*PI*(95-35*t)*t)*exp(-8*t):s=48000:d=0.7" \
  -af "lowpass=f=1500,afade=t=out:st=0.4:d=0.3" "$output/impact.wav"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.35:duration=0.55:sample_rate=48000" \
  -af "highpass=f=350,lowpass=f=4200,afade=t=in:st=0:d=0.18,afade=t=out:st=0.3:d=0.25,volume=0.55" "$output/whoosh.wav"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=1350:sample_rate=48000:duration=0.14" \
  -af "afade=t=out:st=0.03:d=0.11,volume=0.28" "$output/tick.wav"

printf '%s\n' "$output/impact.wav" "$output/whoosh.wav" "$output/tick.wav"
