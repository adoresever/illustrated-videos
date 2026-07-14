#!/usr/bin/env bash
set -euo pipefail

video="${1:-}"
output="${2:-contact-sheet.jpg}"
count="${3:-12}"
if [[ -z "$video" || ! -f "$video" ]]; then
  echo "Usage: make-contact-sheet.sh <video.mp4> [output.jpg] [frame-count]" >&2
  exit 1
fi
if ! [[ "$count" =~ ^[1-9][0-9]*$ ]] || [[ "$count" -gt 40 ]]; then
  echo "frame-count must be an integer from 1 to 40" >&2
  exit 1
fi

duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$video")"
interval="$(awk -v duration="$duration" -v count="$count" 'BEGIN {value=duration/count; if(value<0.04)value=0.04; printf "%.6f", value}')"
columns=4
if [[ "$count" -lt "$columns" ]]; then columns="$count"; fi
rows="$(( (count + columns - 1) / columns ))"

ffmpeg -y -hide_banner -loglevel error -i "$video" \
  -vf "fps=1/${interval},scale=270:-1,tile=${columns}x${rows}:padding=8:margin=8:color=0x20251E" \
  -frames:v 1 "$output"
echo "$output"
