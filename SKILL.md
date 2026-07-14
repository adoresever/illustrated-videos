---
name: illustrated-videos
description: Build illustrated videos from a topic, script, article, book, or reference method. Use for layered explainers with separately generated alpha subjects, or illustrated book-review and book-channel videos with unified text-free scene illustrations, evidence-backed low-spoiler narration, narration-driven duration, code-rendered book metadata, configurable image and voice providers, Remotion composition, caption alignment, rendering, and FFmpeg QA. The verified visual preset is paper-cut. Also use for 纸片分层动画、插画科普短视频、图书号、书评短视频、插画读书、book review video、Remotion 视频批量生产、or 参考视频制作方法复刻.
---

# Illustrated Videos

Build a reusable illustrated-video pipeline. Treat research, narrative design, prompt compilation, image generation, composition, audio, rendering, and QA as separate stages. Add alpha processing only when the selected asset strategy requires independent cutouts.

Do not copy a reference video's protected frames, characters, or exact visual identity. Extract transferable structure, layer discipline, pacing, and motion grammar.

## Content modes

Choose the content contract before research or asset generation:

- Use `contentMode: "explainer"` with `assetStrategy: "layered"` for the existing paper-cut knowledge-video workflow. Generate environment plates and featured subjects separately, then animate the alpha layers independently.
- Use `contentMode: "book-review"` with `assetStrategy: "scene-illustrations"` for 图书号、书评短视频、插画读书, or a `book review video`. Generate one unified, text-free illustration plate for each narrative section and create motion with camera moves, transitions, code-native overlays, and optional decorative elements. Do not require alpha subjects for this mode.

Do not impose a 30-second target on `book-review`. Finish the chosen argument at a natural pace, generate the complete narration as one audio track, then derive the composition duration and scene boundaries from that final audio. Read [references/book-review-workflow.md](references/book-review-workflow.md) and [references/book-research-schema.md](references/book-research-schema.md) before building this mode.

## Preset scope

Use `paper-cut` unless the user explicitly selects another implemented preset. It is the only verified preset. Both asset strategies share paper texture, collage direction, and paper-aware transitions; `layered` additionally uses chroma-separated cutouts, role-based shadows, and parallax, while `scene-illustrations` uses consistent complete plates and restrained plate motion.

The package name is an umbrella for illustrated-video workflows. `crayon`, `doodle`, `pencil-sketch`, `watercolor`, `ink-wash`, and `pixel-art` are extension targets, not implemented presets. Do not claim that they work until their asset contract, renderer behavior, prompt rules, examples, and regression checks exist. Read [references/style-presets.md](references/style-presets.md).

## Preflight

Read [README.md](README.md) for human-facing installation scenarios and [references/providers.md](references/providers.md) for provider configuration.

Run:

```bash
node <skill-root>/scripts/preflight.mjs --config <project-config.json>
```

Require Node.js, npm, FFmpeg, and ffprobe. Install Remotion as a project dependency with `npm install`; do not require a global Remotion installation. Require Python 3 and Pillow when using chroma removal or alpha validation in `layered`. Caption alignment may use an installed speech-to-text engine such as faster-whisper, but the workflow must preserve the approved narration text even when recognition differs.

Resolve image capability in this order:

1. Use native Codex image generation when callable.
2. Use `openai-api` only when explicitly configured and `OPENAI_API_KEY` exists.
3. Use a compatible image MCP after inspecting its schema.
4. Use `file` only when the user supplies authorized assets that satisfy the selected asset strategy: genuinely separated backgrounds and subjects for `layered`, or original/licensed text-free scene illustrations for `scene-illustrations`.
5. Otherwise stop and tell the user that a raster image model, image MCP, or compliant source assets are required. Never replace missing image generation with colored boxes or generic SVG stand-ins. A single composite illustration remains invalid for a layered explainer, but scene illustrations are the intended contract for `book-review`.

Resolve voice independently with `edge-tts`, OpenAI Speech API, or an authorized audio file. Never clone a person's voice without explicit authorization.

## Build the creative brief

Create `creative-brief.json` before prompts or code. Copy the schema from `assets/remotion-template/creative-brief.json`, set `project.contentMode` and `visualSystem.assetStrategy`, and replace every placeholder with project-specific evidence or creative direction.

Separate stable rules from project variables:

- stable rules: selected asset contract, no generated text, provider boundaries, rights checks, QA
- project variables: content mode, asset strategy, topic or book, audience, objective or review angle, spoiler level, aspect ratio, style preset, palette, medium, era references, texture, subject list or scene illustration list, shot list, exclusions, brand visibility
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

For `book-review`, create a research packet before narration. Verify bibliographic facts and the selected interpretive angle against traceable sources, label fact versus interpretation, choose and record a spoiler level, and avoid presenting reader reaction as fact. Prefer original commentary. Do not quote protected book text, reproduce cover art, use film stills, or imitate a specific illustrated edition unless the user supplies the necessary rights. Keep book title, author, quotations, and captions out of generated images; render approved text in code.

Make narration timing drive the storyboard in every mode. For `book-review`, write and approve the complete narration first, generate it as one continuous voice track, then align captions and scene changes to the final waveform. Use speech-to-text timing only as timing evidence; keep the approved narration as the caption text.

## Asset contracts

For each hero shot using `layered` in the verified `paper-cut` preset:

1. Generate one environment plate without featured subjects, generated labels, or captions.
2. Generate each primary, secondary, tertiary, and foreground subject separately.
3. Use flat chroma-key sources for opaque cutout subjects.
4. Remove chroma locally and validate real transparent pixels.
5. Compose all subjects in Remotion with explicit position, scale, role, delay, `zIndex`, and motion.

Reject an `explainer` hero scene that depends on one full-scene illustration. Read [references/layer-contract.md](references/layer-contract.md).

For `book-review`, use `scene-illustrations` instead:

1. Generate a complete, original illustration plate for each narrative section that needs a visual change.
2. Keep one visual system, palette, period treatment, and character design language across all plates.
3. Leave planned negative space for code-rendered title, author, and captions.
4. Exclude generated typography, cover replicas, film likenesses, watermarks, and unlicensed signature imagery.
5. Animate the plates with restrained crop, pan, push, transition, and code-native graphic motion; do not pretend a unified plate contains independently movable subjects.

## Visual quality floor

Match the reference method's depth, not its exact artwork. For an `explainer` with `layered`:

- use 4–7 narrative beats and at least two visibly different compositions
- use at least five independently addressable visual layers in each hero shot, including one primary and one depth-producing secondary, tertiary, or foreground layer
- make the primary occupy roughly 35–55% of frame height unless the shot intentionally establishes scale
- use asymmetry, overlap, occlusion, and foreground framing; avoid permanently centered specimen-card layouts
- keep generated typography out of images; render titles, labels, captions, arrows, and brand marks in code
- use one short title treatment and one caption layer; avoid stacking several opaque text cards
- add restrained background movement, staggered entrances, settle motion, and at least one transition or impact cue per major beat
- include narration plus either a licensed/synthesized music bed or deliberate sound design when the target quality depends on rhythm

For `book-review`, use at least three semantic illustration scenes, then scale scene count to the argument and final narration rather than a fixed duration. Use enough materially different plates to avoid long repeated holds; change at meaningful sentence or paragraph boundaries, preserve mobile-safe negative space, and let code-rendered book metadata appear without imitating a cover. A long video is acceptable when every section advances the chosen angle. A short video is acceptable when the thought is complete.

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
# For an illustrated book-review project:
node <skill-root>/scripts/create-project.mjs <output-directory> --mode book-review
```

Write `public/asset-manifest.json` before generation. For generated assets, use one image-generation call per distinct asset. For the `file` provider, copy only authorized inputs that match the selected asset strategy. Keep selected provider outputs or input copies in `public/assets/source/`. In book mode, set `textFree: true` and `visuallyInspected: true` only after reviewing each plate against the research packet's rights and visual exclusions.

For `layered` subjects, choose a key color absent from the subject. For `scene-illustrations`, generate text-free full-frame plates and skip chroma removal. Use the prompt files generated from the creative brief; do not replace them with a hardcoded example prompt.

Remove chroma and validate:

```bash
python <skill-root>/scripts/remove-chroma.py \
  --input public/assets/source/subject.png \
  --output public/assets/layers/subject.png \
  --key auto --despill

python <skill-root>/scripts/check-alpha.py public/assets/layers/subject.png
node <skill-root>/scripts/validate-manifest.mjs <project-directory>
```

Run chroma removal and alpha validation only for assets declared as independent layers. Complex hair, fur, glass, smoke, translucent materials, or soft shadows may need a provider with true transparency or a segmentation workflow. Do not pretend the simple chroma path succeeded.

## Voice and sound

Generate voice with `scripts/generate-voice.mjs` or a configured provider adapter. Keep provider, model, voice, speaking instructions, rate, pitch, and source authorization in project configuration. For `book-review`, generate the approved narration in one pass whenever the provider can do so; sentence-by-sentence synthesis often changes timbre, emotion, and pace.

After the final voice exists, use `scripts/align-approved-captions.py` to obtain timing anchors without replacing approved words, then use `scripts/apply-caption-timings.mjs` to convert seconds to frames and update global captions and declared `sceneId` boundaries. Read the exact commands and fallback rules in [references/book-review-workflow.md](references/book-review-workflow.md).

Generate optional original utility sound effects locally:

```bash
<skill-root>/scripts/generate-sfx.sh public/assets/audio/sfx
```

Keep voice clearly above music and effects. Disclose AI-generated speech where required. For an optional processed master and BGM ducking, use `scripts/mix-book-audio.sh`; omit BGM for voice-only output and record every music license.

## Remotion composition

Store shot data in `public/project.json`; do not hardcode topic-specific coordinates or copy inside React components. Use Remotion for layer or plate motion, camera movement, transitions, typography, book metadata, brand overlay, audio placement, and H.264/AAC rendering.

Establish a static composition before motion. Then map roles:

- `primary`: earliest, largest, strongest entrance
- `secondary`: medium movement and delayed arrival
- `tertiary`: smaller, lower-contrast context
- `foreground`: faster parallax and deliberate occlusion

Apply those roles only to `layered`. For `scene-illustrations`, animate the plate as one honest visual unit and add only genuinely separate code-native or supplied decorative elements. Render the book title and author in Remotion rather than rasterizing them into the illustration.

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

For `book-review`, also return the book research packet, selected angle, spoiler level, quote/rights policy, approved narration, final audio duration, and caption-alignment record. Alpha sources and layers are not required when `assetStrategy` is `scene-illustrations`.

Report the image provider, voice provider, known models or voices, and exact output paths. Current Codex documentation identifies built-in image generation as `gpt-image-2`; still record the provider as `codex-native` because the tool controls execution parameters.

## Portability

The folder follows the Agent Skills structure. A Skill orchestrates capabilities; it does not supply a missing book-data service, image model, API key, renderer, browser, speech model, or licensed audio. The default implementation uses the bundled Remotion project and configured voice adapters. A WeRead/微信读书 Skill, VoxCPM, faster-whisper, or HyperFrames may be connected when available, but none is a mandatory dependency and no optional provider may weaken the same evidence, rights, timing, or QA contract. Read [references/platforms.md](references/platforms.md), [references/workflow.md](references/workflow.md), and the book-review references before adapting it to Claude Code, WorkBuddy, or another host.

Preserve attribution for the reference production method described in [references/reference-method.md](references/reference-method.md).
