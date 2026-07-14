#!/usr/bin/env bash
set -euo pipefail

allow_no_audio=false
if [[ "${1:-}" == "--allow-no-audio" ]]; then
  allow_no_audio=true
  shift
fi

video="${1:-}"
if [[ -z "$video" || ! -f "$video" ]]; then
  echo "Usage: verify-video.sh [--allow-no-audio] <video.mp4>" >&2
  exit 1
fi

ffprobe -v error \
  -show_entries 'format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels' \
  -of json "$video"

video_streams="$(ffprobe -v error -select_streams v -show_entries stream=index -of csv=p=0 "$video" | wc -l)"
audio_streams="$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$video" | wc -l)"
if [[ "$video_streams" -lt 1 ]]; then
  echo "No video stream found" >&2
  exit 1
fi
if [[ "$audio_streams" -lt 1 && "$allow_no_audio" != true ]]; then
  echo "No audio stream found" >&2
  exit 1
fi

ffmpeg -v error -i "$video" -f null -
echo "decode_ok=true"
