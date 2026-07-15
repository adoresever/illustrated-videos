# Provider configuration

## Configuration example

```json
{
  "contentMode": "book",
  "assetStrategy": "layered",
  "image": {
    "provider": "codex-native",
    "model": null,
    "size": "1152x2048",
    "quality": "medium"
  },
  "voice": {
    "provider": "edge-tts",
    "model": null,
    "voice": "zh-CN-XiaoxiaoNeural",
    "rate": "+8%",
    "pitch": "-2Hz",
    "instructions": "用轻松、可信、带一点好奇心的普通话讲述"
  },
  "timing": {
    "provider": "faster-whisper",
    "model": "small"
  },
  "renderer": {
    "provider": "remotion"
  }
}
```

## Image providers

### `codex-native`

Use the current Codex image-generation tool. It does not require `OPENAI_API_KEY`. Current Codex documentation identifies built-in image generation as `gpt-image-2`; keep the provider value `codex-native` because the built-in tool, not this Skill, controls model parameters and usage accounting.

Generate every distinct background, subject, prop, and foreground element in a separate call. Copy chosen outputs into the project before rendering. Do not ask the image model to combine a featured subject with its final environment.

### `openai-api`

Require `OPENAI_API_KEY`. Never ask the user to paste the key into chat. Ask them to set it locally.

```bash
node scripts/generate-openai-image.mjs \
  --prompt-file prompt.txt \
  --out public/assets/source/item.png \
  --model gpt-image-2 \
  --size 1152x2048 \
  --quality medium
```

GPT Image 2 does not provide native transparent output through this workflow. Generate opaque subjects on a flat chroma color absent from the subject, then remove the key locally and validate the resulting alpha channel.

### `mcp`

Inspect the current MCP tool schema before invoking it. Map the shared prompt, output location, model, size, and quality to that provider. If no compatible image tool is connected, stop and tell the user what is missing.

### `file`

Use only when the user supplies authorized assets that satisfy the layered contract: background plates without featured subjects plus independently separated subjects, props, or foreground assets. A single composite illustration does not satisfy the production contract, although it may be retained as a visual reference. Copy inputs into `public/assets/source/`, derive declared outputs, record `imageProvider: "file"`, and validate alpha on every declared layer.

## Voice providers

### Voice discovery and user choice

Do not present a raw provider ID list and expect the user to know how each entry sounds. For a provider with an enumerable catalog, first show three to five semantic cards containing a plain-language label, listening description, best uses, provider-declared gender and locale, the real voice ID, and a metadata-grounded reason for the recommendation.

For Edge TTS, enumerate the current installed provider catalog dynamically:

```bash
node scripts/suggest-voices.mjs \
  --provider edge-tts \
  --locale zh-CN \
  --mode explainer \
  --max 4 \
  --format markdown
```

The matcher reads `ContentCategories` and `VoicePersonalities` returned by `edge-tts --list-voices`, then applies generic mappings from `assets/voice-presets.json`. The mapping is editorial guidance, not a promise of an acoustic property beyond the provider metadata, and it is never tied to a particular title or topic. `--max` accepts 3–5. JSON is the default output; `--format markdown` is intended for showing choices directly to a user.

For another provider, export its real configured catalog and pass `--catalog <file>`. Catalog JSON may be an array or `{\"voices\": [...]}` and may use normalized fields (`voiceId`, `locale`, `gender`, `contentCategories`, `voicePersonalities`) or provider fields (`ShortName` / `Name`, `Locale`, `Gender`, `ContentCategories`, `VoicePersonalities`). If enumeration or catalog parsing fails, the script returns a structured `catalog-required` framework with no recommendations. Never fill that gap with guessed voice IDs.

Offer a same-text preview of the shortlist when practical. The user's selection wins. If they do not answer, use `defaultSelection`, which is always one of the actual catalog entries. Changing voice, rate, pitch, or approved wording requires new synthesis, decoded-duration measurement, and caption/scene alignment.

### `edge-tts`

Require the `edge-tts` executable. Voice, rate, and pitch are configurable.

```bash
node scripts/generate-voice.mjs \
  --provider edge-tts \
  --text-file narration.txt \
  --out public/assets/audio/voice.mp3 \
  --voice zh-CN-XiaoxiaoNeural \
  --rate +8% \
  --pitch -2Hz
```

### `openai`

Require `OPENAI_API_KEY`. The default model is `gpt-4o-mini-tts`; the default voice is `cedar`. Voice and speaking instructions are configurable.

```bash
node scripts/generate-voice.mjs \
  --provider openai \
  --text-file narration.txt \
  --out public/assets/audio/voice.mp3 \
  --model gpt-4o-mini-tts \
  --voice cedar \
  --instructions "Speak Mandarin in a warm documentary style."
```

### `file`

Copy an authorized recording into the project. Do not modify or clone a voice without permission.

## Optional adapters

VoxCPM or another local speech model may be added as a voice adapter when it is installed and tested. A WeRead/微信读书 Skill may supply book metadata, highlights, reviews, or reception evidence. faster-whisper may supply timestamps for final audio. HyperFrames may replace Remotion only through a feature-equivalent renderer adapter. None is bundled or required; keep the same provenance, authorization, approved-text, and QA rules regardless of provider.
