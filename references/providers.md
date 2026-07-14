# Provider configuration

## Configuration example

```json
{
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
  }
}
```

## Image providers

### `codex-native`

Use the current Codex image-generation tool. It does not require `OPENAI_API_KEY`. Current Codex documentation identifies built-in image generation as `gpt-image-2`; keep the provider value `codex-native` because the built-in tool, not this Skill, controls model parameters and usage accounting.

Generate every distinct plate or subject in a separate call. Copy chosen outputs into the project before rendering.

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

GPT Image 2 does not provide native transparent output through this workflow. Generate flat chroma-key subjects and remove the key locally.

### `mcp`

Inspect the current MCP tool schema before invoking it. Map the shared prompt, output location, model, size, and quality to that provider. If no compatible image tool is connected, stop and tell the user what is missing.

### `file`

Use only when the user supplies authorized background plates and independently separated subject or foreground assets. Copy the inputs into `public/assets/source/`, derive or copy final plates and alpha layers into their manifest paths, record `imageProvider: "file"`, and run the same alpha and manifest validation. A single composite illustration does not satisfy this provider contract.

## Voice providers

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
