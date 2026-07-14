#!/usr/bin/env bash
set -euo pipefail

video="${1:-}"
output="${2:-contact-sheet.jpg}"
if [[ -z "$video" || ! -f "$video" ]]; then
  echo "Usage: make-contact-sheet.sh <video.mp4> [output.jpg]" >&2
  exit 1
fi

ffmpeg -y -hide_banner -loglevel error -i "$video" \
  -vf "fps=1/5,scale=270:-1,tile=3x2" -frames:v 1 "$output"
echo "$output"
