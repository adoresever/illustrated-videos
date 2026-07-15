#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  mix-audio.sh --voice <narration> --out <output> [options]

Required:
  --voice FILE          Final, full-length narration audio
  --out FILE            Output .wav, .flac, .mp3, .m4a, or .aac

Optional:
  --bgm FILE            Background music; omitted for narration-only output
  --bgm-start SECONDS   Start offset into BGM (default: 0)
  --bgm-volume DB       BGM gain before ducking (default: -18)
  -h, --help            Show this help

The narration is processed at 48 kHz with high/low-pass filtering,
compression, a light echo, and EBU R128 loudness normalization. When BGM is
provided it is looped, sidechain-ducked by the processed narration, mixed only
for the narration duration, and peak-limited.
EOF
}

voice=""
bgm=""
output=""
bgm_start="0"
bgm_volume="-18"

while (($#)); do
  case "$1" in
    --voice)
      [[ $# -ge 2 ]] || { echo "Missing value for --voice" >&2; exit 1; }
      voice="$2"
      shift 2
      ;;
    --bgm)
      [[ $# -ge 2 ]] || { echo "Missing value for --bgm" >&2; exit 1; }
      bgm="$2"
      shift 2
      ;;
    --out)
      [[ $# -ge 2 ]] || { echo "Missing value for --out" >&2; exit 1; }
      output="$2"
      shift 2
      ;;
    --bgm-start)
      [[ $# -ge 2 ]] || { echo "Missing value for --bgm-start" >&2; exit 1; }
      bgm_start="$2"
      shift 2
      ;;
    --bgm-volume)
      [[ $# -ge 2 ]] || { echo "Missing value for --bgm-volume" >&2; exit 1; }
      bgm_volume="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

[[ -n "$voice" ]] || { echo "Missing required --voice." >&2; exit 1; }
[[ -n "$output" ]] || { echo "Missing required --out." >&2; exit 1; }
[[ -f "$voice" ]] || { echo "Voice file not found: $voice" >&2; exit 1; }
if [[ -n "$bgm" && ! -f "$bgm" ]]; then
  echo "BGM file not found: $bgm" >&2
  exit 1
fi
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is required." >&2; exit 1; }

number_pattern='^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$'
[[ "$bgm_start" =~ $number_pattern ]] || { echo "--bgm-start must be numeric." >&2; exit 1; }
[[ "$bgm_volume" =~ $number_pattern ]] || { echo "--bgm-volume must be numeric dB." >&2; exit 1; }
awk -v value="$bgm_start" 'BEGIN { exit !(value >= 0) }' || {
  echo "--bgm-start cannot be negative." >&2
  exit 1
}

mkdir -p "$(dirname "$output")"

case "${output##*.}" in
  wav|WAV)
    codec_args=(-c:a pcm_s16le)
    ;;
  flac|FLAC)
    codec_args=(-c:a flac)
    ;;
  mp3|MP3)
    codec_args=(-c:a libmp3lame -q:a 2)
    ;;
  m4a|M4A|aac|AAC)
    codec_args=(-c:a aac -b:a 192k)
    ;;
  *)
    echo "Unsupported output extension: $output" >&2
    exit 1
    ;;
esac

voice_filter='volume=-2dB,highpass=f=70,lowpass=f=13500,acompressor=threshold=-20dB:ratio=2.2:attack=18:release=180:makeup=1.5,aecho=0.7:0.14:34:0.06,loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000'

if [[ -z "$bgm" ]]; then
  ffmpeg -y -hide_banner -loglevel error \
    -i "$voice" \
    -vn -af "$voice_filter" -ar 48000 "${codec_args[@]}" "$output"
else
  filter_complex="[0:a]${voice_filter},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=2[voice_mix][voice_key];[1:a]aresample=48000,volume=${bgm_volume}dB,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[music];[music][voice_key]sidechaincompress=threshold=0.012:ratio=8:attack=45:release=650:makeup=1.4[ducked];[voice_mix][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95,aresample=48000[mix]"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$voice" \
    -stream_loop -1 -ss "$bgm_start" -i "$bgm" \
    -filter_complex "$filter_complex" \
    -map '[mix]' -vn -ar 48000 "${codec_args[@]}" "$output"
fi

printf '%s\n' "$output"
