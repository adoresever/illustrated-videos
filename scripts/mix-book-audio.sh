#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
printf '%s\n' 'mix-book-audio.sh is a compatibility alias; use mix-audio.sh.' >&2
exec "$script_dir/mix-audio.sh" "$@"
