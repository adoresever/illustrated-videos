#!/usr/bin/env bash
set -euo pipefail

duration="${1:-}"
output="${2:-}"
if [[ -z "$duration" || -z "$output" ]]; then
  echo "Usage: generate-audio-bed.sh <duration-seconds> <output.wav>" >&2
  exit 1
fi
mkdir -p "$(dirname "$output")"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "aevalsrc=0.016*sin(2*PI*110*t)+0.011*sin(2*PI*165*t)+0.008*sin(2*PI*220*t)+0.006*sin(2*PI*330*t):s=48000:d=${duration}" \
  -af "lowpass=f=1200,afade=t=in:st=0:d=1.5,afade=t=out:st=$(awk -v d="$duration" 'BEGIN{v=d-2; if(v<0)v=0; print v}'):d=2,volume=0.8" \
  "$output"
printf '%s\n' "$output"
