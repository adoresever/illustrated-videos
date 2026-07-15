# Storyboard schema

The Remotion template reads `public/project.json`. Values below demonstrate structure only; compile them from the current research, narration, beat map, and approved assets.

`explainer` and `book` are the canonical `contentMode` values. Every publishable composition uses `assetStrategy: "layered"`. The legacy `book-review` value is migration-only: normalize it to `book` when loading old projects and never emit it in a new project.

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
    "logo": null,
    "show": false,
    "placement": "top-right",
    "logoWidth": 96,
    "opacity": 0.94
  },
  "audio": {
    "voice": "assets/audio/voice.mp3",
    "music": "assets/audio/music.wav",
    "musicVolume": 0.1,
    "tailSeconds": 0.35,
    "intentionalSilence": false
  },
  "scenes": [
    {
      "id": "<beat-id>",
      "layerPlanRationale": "<why-these-elements-need-independent-control>",
      "from": 0,
      "duration": 150,
      "hero": true,
      "background": "assets/backgrounds/<environment>.png",
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
          "motion": {
            "action": "<observable visual verb tied to this beat>",
            "keyframes": [
              {"at": 0.18, "x": 0, "y": 0, "rotation": 0, "scale": 1, "opacity": 1},
              {"at": 0.55, "x": 84, "y": -24, "rotation": 5, "scale": 1.03, "opacity": 1},
              {"at": 0.82, "x": 58, "y": 0, "rotation": 1, "scale": 1, "opacity": 1}
            ],
            "loop": "sway"
          },
          "sfx": "assets/audio/sfx/impact.wav",
          "sfxVolume": 0.22
        }
      ]
    }
  ]
}
```

`brand` is off by default. When the user requests attribution, set `show: true` and provide `handle`, `logo`, or both. `logo` must be a decodable raster file inside the project's `public/` directory, for example `assets/brand/logo.png`; a transparent PNG is recommended. The validator rejects an enabled but empty brand, a missing logo file, invalid opacity, or an oversized `logoWidth`. The renderer adds this overlay in code instead of baking it into generated scene art.

## Scene rules

- `contentMode` is `explainer` or `book`.
- `assetStrategy` is always `layered` for a publishable project.
- `stylePreset` defaults to `paper-cut`; it is the only preset currently verified.
- `from`, `duration`, and `delay` are frames.
- Scene ranges cover the composition without accidental gaps or overlaps.
- Set `hero: false` only for a deliberately minimal bridge or end card.
- Use optional `layerPlanRationale` to explain a deliberately simple or unusually complex decomposition, especially outside the common planning range.
- `audio.tailSeconds` records the deliberate tail handle after the final narration. For `book`, total runtime must equal decoded narration duration plus this declared tail within frame tolerance.
- `background` points to an environment plate with no featured subject or movable core prop.
- Every narrative scene includes at least one independent primary protagonist or core object in `layers`.
- A layer `src` points to an alpha image under `public/`.
- Supported roles are `primary`, `secondary`, `tertiary`, and `foreground`.
- Supported `enterFrom` values are `left`, `right`, `up`, `down`, and `scale`.
- Supported `captionStyle` values are `strip`, `card`, and `minimal`.
- Supported `transition` values are `fade`, `paper-wipe`, and `cut`.
- Coordinates are composition pixels; store subject-specific layout in JSON, not React.
- Use `camera` in addition to independent layer motion, never instead of it.
- Optional legacy layer fields include `label`, `opacity`, `flipX`, `bob`, `rotation`, `sfx`, and `sfxVolume`.

Three to seven independent visual layers is a common planning range, not a schema requirement. Choose the number after identifying the narrative subject, movable evidence, depth planes, and occlusion. A scene outside that range is acceptable when the beat explains why; a full composite scene, missing independent primary, or camera-only motion is not.

## Semantic layer motion

`delay` and `enterFrom` control the initial entrance. `motion.keyframes` control the narration-driven action after or during that entrance. `motion.loop` is only a restrained supporting hold; it cannot replace an action.

```ts
type LayerMotion = {
  action?: string;
  keyframes?: Array<{
    at: number;       // normalized scene-local progress, 0..1
    x?: number;       // offset relative to layer.x
    y?: number;       // offset relative to layer.y
    rotation?: number;// delta relative to layer.rotation
    scale?: number;   // multiplier relative to layer.scale
    opacity?: number;
  }>;
  loop?: "none" | "bob" | "sway" | "pulse";
};
```

Rules:

- `at` values are within `0..1` and strictly increase.
- At least two keyframes with a meaningful difference are required before motion counts as a semantic action.
- `action` describes an observable verb and its narrative purpose, not a generic mood such as “dynamic.”
- `x` and `y` are offsets from the layer's base coordinates; `scale` multiplies the layer's base scale.
- The renderer interpolates keyframes in scene-local time and composes them with the existing entrance transform.
- `loop: "none"` is valid when the action resolves into a still hold.
- `bob`, `sway`, and `pulse` are secondary motion only. Do not make every layer float.
- Phase design remains `enter → action → settle`, with an optional exit or handoff represented by late keyframes.
- Map important keyframes to narration anchors rather than distributing them evenly.

For a pose or state change, use separate alpha layers and crossfade them with opacity keyframes. Do not bake multiple states into one plate:

```json
[
  {
    "id": "<subject-state-a>",
    "src": "assets/layers/<state-a>.png",
    "role": "primary",
    "x": 240,
    "y": 600,
    "width": 520,
    "motion": {
      "action": "yield visual attention to the changed state",
      "keyframes": [
        {"at": 0.35, "opacity": 1},
        {"at": 0.58, "opacity": 0}
      ],
      "loop": "none"
    }
  },
  {
    "id": "<subject-state-b>",
    "src": "assets/layers/<state-b>.png",
    "role": "primary",
    "x": 240,
    "y": 600,
    "width": 520,
    "opacity": 0,
    "motion": {
      "action": "reveal the changed state",
      "keyframes": [
        {"at": 0.35, "opacity": 0},
        {"at": 0.58, "opacity": 1}
      ],
      "loop": "none"
    }
  }
]
```

## Book additions

For `book`, keep the same layered scene contract and add confirmed book metadata plus global audio-aligned captions:

```json
{
  "contentMode": "book",
  "assetStrategy": "layered",
  "book": {
    "title": "<confirmed-title>",
    "originalTitle": "<optional-original-title>",
    "author": "<confirmed-author>",
    "angle": "<one-editorial-angle>",
    "spoilerLevel": "low",
    "label": "<code-rendered-series-label>"
  },
  "captions": [
    {"id": "caption-01", "from": 0, "duration": 120, "text": "<approved-narration-clause>"}
  ],
  "scenes": [
    {
      "id": "<semantic-beat>",
      "from": 0,
      "duration": 180,
      "background": "assets/backgrounds/<character-free-environment>.png",
      "showBookMeta": true,
      "camera": {"scaleFrom": 1.01, "scaleTo": 1.04, "xFrom": 0, "xTo": -12},
      "layers": [
        {
          "id": "<recurring-character-or-core-object>",
          "src": "assets/layers/<independent-subject>.png",
          "role": "primary",
          "x": 260,
          "y": 650,
          "width": 500,
          "enterFrom": "right",
          "motion": {
            "action": "<visual verb derived from the beat>",
            "keyframes": [
              {"at": 0.2, "x": 0, "opacity": 1},
              {"at": 0.7, "x": -72, "opacity": 1}
            ],
            "loop": "none"
          }
        }
      ]
    }
  ]
}
```

Use final narration audio to calculate `durationInFrames`, scene ranges, and caption cues. Timing tools provide anchors only; preserve the approved narration text instead of copying recognizer output. Recurring protagonists use the character anchor recorded in the creative brief, and each pose remains an independent alpha asset.

## Asset manifest

`public/asset-manifest.json` records provider provenance and proves separation for both content modes:

```json
{
  "imageProvider": "<codex-native|openai-api|mcp|file>",
  "voiceProvider": "<edge-tts|openai|file>",
  "contentMode": "explainer",
  "assetStrategy": "layered",
  "assets": [
    {
      "id": "<background-id>",
      "type": "background",
      "path": "assets/backgrounds/<background>.png",
      "source": "assets/source/<background>.png",
      "promptFile": "prompts/<background-id>.txt",
      "subjectFree": true,
      "visuallyInspected": true,
      "watermarkCheck": {
        "status": "clear",
        "report": "assets/qa/<background-id>.watermark.json"
      }
    },
    {
      "id": "<layer-id>",
      "type": "layer",
      "path": "assets/layers/<layer>.png",
      "source": "assets/source/<layer>-chroma.png",
      "alpha": true,
      "alphaValidated": true,
      "visuallyInspected": true,
      "watermarkCheck": {
        "status": "clear",
        "report": "assets/qa/<layer-id>.watermark.json"
      },
      "characterId": "<optional-continuity-anchor-id>",
      "promptFile": "prompts/<layer-id>.txt"
    }
  ]
}
```

Set manifest `contentMode` to the actual mode, but keep `assetStrategy: "layered"`. Both modes use `background` and alpha `layer` assets; a complete `illustration` is not a valid production asset type. Run `scripts/detect-watermark.py` on the final raster bytes and save its JSON under `public/assets/qa/`. Mark inspection claims only after a person or vision-capable agent verifies separation, text exclusion, rights constraints, character continuity, and watermark status. Validation binds the `clear` report to the final asset SHA-256 and rejects reports that used network, API, or model calls.

Keep original provider outputs under `assets/source/`; never overwrite them during key removal. Keep literal prompts under `public/prompts/` and reference them from the manifest rather than duplicating long prompt strings.

See [layer-contract.md](layer-contract.md) for asset planning, [book-workflow.md](book-workflow.md) for book-specific research and story preparation, and [qa.md](qa.md) for motion inspection.
