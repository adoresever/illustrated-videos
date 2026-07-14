---
name: illustrated-videos
description: Build layered illustrated explainer videos from a topic, script, article, or reference method. Use when Codex needs to create or improve 9:16 or 16:9 knowledge videos with character-free background plates, independently generated alpha subjects and foreground elements, configurable image and voice providers, data-driven prompts and storyboards, Remotion animation, captions, optional attribution, sound design, rendering, and measurable FFmpeg QA. The verified v1 preset is paper-cut. Also use for 纸片分层动画、插画科普短视频、背景角色分开生成、Remotion 视频批量生产、or 参考视频制作方法复刻.
---

# Illustrated Videos

Build a reusable layered-video pipeline. Treat research, narrative design, prompt compilation, image generation, alpha processing, composition, audio, rendering, and QA as separate stages.

Do not copy a reference video's protected frames, characters, or exact visual identity. Extract transferable structure, layer discipline, pacing, and motion grammar.

## Preset scope

Use `paper-cut` unless the user explicitly selects another implemented preset. It is the only preset verified in v1 and includes chroma-separated cutout subjects, paper texture, collage decoration, role-based shadows, parallax, and `paper-wipe` transitions.

The package name is an umbrella for illustrated-video workflows. `crayon`, `doodle`, `pencil-sketch`, `watercolor`, `ink-wash`, and `pixel-art` are extension targets, not implemented presets. Do not claim that they work until their asset contract, renderer behavior, prompt rules, examples, and regression checks exist. Read [references/style-presets.md](references/style-presets.md).

## Preflight

Read [README.md](README.md) for human-facing installation scenarios and [references/providers.md](references/providers.md) for provider configuration.

Run:

```bash
node <skill-root>/scripts/preflight.mjs --config <project-config.json>
```

Require Node.js, npm, Python 3, Pillow, FFmpeg, and ffprobe. Install Remotion as a project dependency with `npm install`; do not require a global Remotion installation.

Resolve image capability in this order:

1. Use native Codex image generation when callable.
2. Use `openai-api` only when explicitly configured and `OPENAI_API_KEY` exists.
3. Use a compatible image MCP after inspecting its schema.
4. Use `file` only when the user supplies authorized, genuinely separated background and subject assets that satisfy the layer contract.
5. Otherwise stop and tell the user that a raster image model, image MCP, or separated source assets are required. Never replace missing image generation with colored boxes, generic SVG stand-ins, or one composite illustration.

Resolve voice independently with `edge-tts`, OpenAI Speech API, or an authorized audio file. Never clone a person's voice without explicit authorization.

## Build the creative brief

Create `creative-brief.json` before prompts or code. Copy the schema from `assets/remotion-template/creative-brief.json` and replace every placeholder with project-specific evidence or creative direction.

Separate stable rules from project variables:

- stable rules: layer separation, chroma requirements, readable silhouette, no generated text, provider boundaries, QA
- project variables: topic, audience, lesson objective, aspect ratio, style preset, palette, medium, era references, texture, subject list, shot list, exclusions, brand visibility
- test cases: concrete herbs, historical subjects, or business topics used only to evaluate the workflow

Read [references/prompt-standard.md](references/prompt-standard.md). Do not embed a previous topic, palette, location, pose, or asset filename into the reusable prompt rules.

Compile prompts:

```bash
node <skill-root>/scripts/build-prompts.mjs \
  --brief creative-brief.json \
  --out public/prompts
```

## Research and narration

Write one claim per beat. For medicine, health, science, history, finance, or law, verify claims with primary or authoritative sources. Distinguish folklore from established evidence. Avoid treatment recommendations unless the user explicitly requests them and adequate evidence and disclaimers exist.

Make narration timing drive the storyboard. Generate or supply the final voice before freezing scene durations.

## Layer contract

For each hero shot in the verified `paper-cut` preset:

1. Generate one environment plate without featured subjects, generated labels, or captions.
2. Generate each primary, secondary, tertiary, and foreground subject separately.
3. Use flat chroma-key sources for opaque cutout subjects.
4. Remove chroma locally and validate real transparent pixels.
5. Compose all subjects in Remotion with explicit position, scale, role, delay, `zIndex`, and motion.

Reject a scene that depends on one full-scene illustration. Read [references/layer-contract.md](references/layer-contract.md).

## Visual quality floor

Match the reference method's depth, not its exact artwork. For a standard 20–35 second creator video:

- use 4–7 narrative beats and at least two visibly different compositions
- use at least five independently addressable visual layers in each hero shot, including one primary and one depth-producing secondary, tertiary, or foreground layer
- make the primary occupy roughly 35–55% of frame height unless the shot intentionally establishes scale
- use asymmetry, overlap, occlusion, and foreground framing; avoid permanently centered specimen-card layouts
- keep generated typography out of images; render titles, labels, captions, arrows, and brand marks in code
- use one short title treatment and one caption layer; avoid stacking several opaque text cards
- add restrained background movement, staggered entrances, settle motion, and at least one transition or impact cue per major beat
- include narration plus either a licensed/synthesized music bed or deliberate sound design when the target quality depends on rhythm

Run the deterministic audit before rendering:

```bash
node <skill-root>/scripts/audit-project.mjs <project-directory>
```

Read [references/quality-rubric.md](references/quality-rubric.md) when the audit warns or the result feels flatter than the reference.
Read [references/regression-report.md](references/regression-report.md) for the measured baseline and two cross-topic workflow tests. Treat those topics only as regression cases.

## Create assets

Create a project:

```bash
node <skill-root>/scripts/create-project.mjs <output-directory>
```

Write `public/asset-manifest.json` before generation. For generated assets, use one image-generation call per distinct asset. For the `file` provider, copy only authorized separated inputs. Keep selected provider outputs or input copies in `public/assets/source/`.

For subjects, choose a key color absent from the subject. Use the prompt files generated from the creative brief; do not replace them with a hardcoded example prompt.

Remove chroma and validate:

```bash
python <skill-root>/scripts/remove-chroma.py \
  --input public/assets/source/subject.png \
  --output public/assets/layers/subject.png \
  --key auto --despill

python <skill-root>/scripts/check-alpha.py public/assets/layers/subject.png
node <skill-root>/scripts/validate-manifest.mjs <project-directory>
```

Complex hair, fur, glass, smoke, translucent materials, or soft shadows may need a provider with true transparency or a segmentation workflow. Do not pretend the simple chroma path succeeded.

## Voice and sound

Generate voice with `scripts/generate-voice.mjs`. Keep provider, model, voice, speaking instructions, rate, pitch, and source authorization in project configuration.

Generate optional original utility sound effects locally:

```bash
<skill-root>/scripts/generate-sfx.sh public/assets/audio/sfx
```

Keep voice clearly above music and effects. Disclose AI-generated speech where required.

## Remotion composition

Store shot data in `public/project.json`; do not hardcode topic-specific coordinates or copy inside React components. Use Remotion for independent layer motion, camera movement, transitions, typography, brand overlay, audio placement, and H.264/AAC rendering.

Establish a static composition before motion. Then map roles:

- `primary`: earliest, largest, strongest entrance
- `secondary`: medium movement and delayed arrival
- `tertiary`: smaller, lower-contrast context
- `foreground`: faster parallax and deliberate occlusion

Do not render a creator handle or watermark by default. Keep the optional `brand` object configurable in `project.json`, and enable it only when the user explicitly requests on-video attribution.

## Render and verify

Run:

```bash
npm install
npm run render
<skill-root>/scripts/verify-video.sh out/final.mp4
<skill-root>/scripts/make-contact-sheet.sh out/final.mp4 out/contact-sheet.jpg
```

For a deliberately silent project, declare `audio.intentionalSilence: true` and run `verify-video.sh --allow-no-audio out/final.mp4`.

Inspect at least one frame per beat and at every transition. Fix visible chroma fringe, repeated compositions, weak scale hierarchy, accidental occlusion, caption obstruction, silent transitions, audio imbalance, and one-frame flashes before delivery.

## Deliverables

Return:

- final MP4 and a smaller preview MP4 when useful
- representative still and contact sheet
- `creative-brief.json`, `public/project.json`, and `public/asset-manifest.json`
- compiled prompt files and provider record
- source plates, chroma sources, final alpha layers, narration, and audio
- source list, disclaimers, audit output, and render/QA result

Report the image provider, voice provider, known models or voices, and exact output paths. Current Codex documentation identifies built-in image generation as `gpt-image-2`; still record the provider as `codex-native` because the tool controls execution parameters.

## Portability

The folder follows the Agent Skills structure. A Skill orchestrates capabilities; it does not supply a missing image model, API key, renderer, browser, or licensed audio. Read [references/platforms.md](references/platforms.md) and [references/workflow.md](references/workflow.md) before adapting it to Claude Code, WorkBuddy, or another host.

Preserve attribution for the reference production method described in [references/reference-method.md](references/reference-method.md).
