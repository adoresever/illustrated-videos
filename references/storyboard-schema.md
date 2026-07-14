# Storyboard schema

The Remotion template reads `public/project.json`. Values below demonstrate structure only; replace them from the current creative brief.

```json
{
  "title": "<project-title>",
  "contentMode": "explainer",
  "assetStrategy": "layered",
  "stylePreset": "paper-cut",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationInFrames": 900,
  "captionSafeBottom": 182,
  "palette": {
    "paper": "<paper-color>",
    "ink": "<ink-color>",
    "accent": "<accent-color>",
    "gold": "<secondary-accent>"
  },
  "brand": {
    "handle": "",
    "show": false,
    "placement": "top-right"
  },
  "audio": {
    "voice": "assets/audio/voice.mp3",
    "music": "assets/audio/music.wav",
    "musicVolume": 0.1,
    "intentionalSilence": false
  },
  "scenes": [
    {
      "id": "<beat-id>",
      "from": 0,
      "duration": 150,
      "hero": true,
      "background": "assets/plates/<plate>.png",
      "title": "<short-title>",
      "eyebrow": "<section-label>",
      "caption": "<narration-aligned-caption>",
      "captionStyle": "strip",
      "transition": "paper-wipe",
      "transitionSfx": "assets/audio/sfx/whoosh.wav",
      "camera": {"scaleFrom": 1.01, "scaleTo": 1.04, "xFrom": 0, "xTo": -16},
      "layers": [
        {
          "id": "<primary-id>",
          "src": "assets/layers/<primary>.png",
          "role": "primary",
          "x": 220,
          "y": 560,
          "width": 580,
          "delay": 5,
          "zIndex": 6,
          "enterFrom": "left",
          "rotation": -3,
          "sfx": "assets/audio/sfx/impact.wav",
          "sfxVolume": 0.22
        }
      ]
    }
  ]
}
```

## Rules

- `contentMode` supports `explainer` and `book-review`.
- `assetStrategy` is `layered` for `explainer` and `scene-illustrations` for `book-review`.
- `stylePreset` defaults to `paper-cut`; it is the only preset verified in v1.
- `from`, `duration`, and `delay` are frames.
- Scene ranges should cover the composition without accidental gaps or overlaps.
- Set `hero: false` only for deliberately minimal transition or end-card beats.
- A layer `src` points to an alpha image under `public/`.
- Supported roles: `primary`, `secondary`, `tertiary`, `foreground`.
- Supported `enterFrom`: `left`, `right`, `up`, `down`, `scale`.
- Supported `captionStyle`: `strip`, `card`, `minimal`.
- Supported `transition`: `fade`, `paper-wipe`, `cut`.
- Use coordinates in composition pixels.
- Store topic-specific positions in JSON, not React.
- Use `camera` in addition to independent layer motion, not instead of it.
- Optional layer fields include `label`, `opacity`, `flipX`, `bob`, `rotation`, `sfx`, and `sfxVolume`.

For `book-review`, also provide `book`, global audio-aligned `captions`, and at least one scene with `showBookMeta: true`. Every scene uses one complete illustration as `background` and declares `layers: []`:

```json
{
  "contentMode": "book-review",
  "assetStrategy": "scene-illustrations",
  "book": {
    "title": "<confirmed-title>",
    "originalTitle": "<optional-original-title>",
    "author": "<confirmed-author>",
    "angle": "<one-editorial-angle>",
    "spoilerLevel": "low",
    "label": "插画读书"
  },
  "captions": [
    {"id": "caption-01", "from": 0, "duration": 120, "text": "<approved-narration-clause>"}
  ],
  "scenes": [
    {
      "id": "<semantic-beat>",
      "from": 0,
      "duration": 180,
      "background": "assets/plates/<illustration>.png",
      "showBookMeta": true,
      "camera": {"scaleFrom": 1.01, "scaleTo": 1.05, "xFrom": 0, "xTo": -12},
      "layers": []
    }
  ]
}
```

Use the final narration audio to calculate `durationInFrames`, scene `from`/`duration`, and caption cues. Do not copy recognizer text into captions; preserve the approved narration.

## Asset manifest

`public/asset-manifest.json` records provider provenance and verifies separation:

```json
{
  "imageProvider": "<codex-native|openai-api|mcp|file>",
  "voiceProvider": "<edge-tts|openai|file>",
  "contentMode": "explainer",
  "assetStrategy": "layered",
  "assets": [
    {
      "id": "<plate-id>",
      "type": "background",
      "path": "assets/plates/<plate>.png",
      "source": "assets/source/<plate>.png",
      "promptFile": "prompts/<plate-id>.txt"
    },
    {
      "id": "<layer-id>",
      "type": "layer",
      "path": "assets/layers/<layer>.png",
      "source": "assets/source/<layer>-chroma.png",
      "alpha": true,
      "promptFile": "prompts/<layer-id>.txt"
    }
  ]
}
```

For `book-review`, set manifest mode fields accordingly and use `type: "illustration"` for every complete scene plate. Every illustration must declare both `textFree: true` and `visuallyInspected: true` only after a person or vision-capable agent checks it against the research packet's visual exclusions. Illustration assets do not declare alpha and are not passed through chroma removal. Set `captionSafeBottom` in pixels for the target platform; the book scaffold defaults to 9.5% of composition height.

Keep original provider outputs under `assets/source/`; never overwrite them during key removal. Keep literal prompts in `public/prompts/` and reference them from the manifest instead of duplicating long prompt strings.
