#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$script_dir/.." && pwd)"
output="${1:-$root/dist/illustrated-videos.zip}"

if [[ "$output" != /* ]]; then
  output="$(pwd)/$output"
fi

mkdir -p "$(dirname "$output")"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/illustrated-videos"
for item in SKILL.md README.md LICENSE NOTICE agents assets references scripts; do
  cp -a "$root/$item" "$stage/illustrated-videos/$item"
done

find "$stage/illustrated-videos" -type d \( -name node_modules -o -name __pycache__ -o -name out -o -name .cache -o -name .remotion -o -name .pytest_cache -o -name .ruff_cache -o -name .mypy_cache \) -prune -exec rm -rf {} +
find "$stage/illustrated-videos" -type f \( -name '.env' -o \( -name '.env.*' ! -name '.env.example' \) -o -name '*.pyc' -o -name '*.log' -o -name '.DS_Store' \) -delete

media_file="$(find "$stage/illustrated-videos" -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.webm' -o -iname '*.mkv' -o -iname '*.avi' -o -iname '*.mp3' -o -iname '*.wav' -o -iname '*.m4a' -o -iname '*.aac' -o -iname '*.flac' -o -iname '*.ogg' \) -print -quit)"
if [[ -n "$media_file" ]]; then
  echo "Refusing to package generated video or audio media: $media_file" >&2
  exit 1
fi
find "$stage/illustrated-videos" -type d -exec chmod 0755 {} +
find "$stage/illustrated-videos" -type f -exec chmod 0644 {} +
find "$stage/illustrated-videos/scripts" -type f -exec chmod 0755 {} +

rm -f "$output" "$output.sha256"
(
  cd "$stage"
  zip -qr "$output" illustrated-videos
)
(
  cd "$(dirname "$output")"
  sha256sum "$(basename "$output")" > "$(basename "$output").sha256"
)

printf '%s\n' "$output"
printf '%s\n' "$output.sha256"
