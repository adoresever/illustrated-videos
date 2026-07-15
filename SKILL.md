---
name: illustrated-videos
description: Build layered illustrated videos from a topic, script, article, book, or reference method. Use for illustrated explainers, illustrated book videos, book reviews, character stories, paper-cutout animation, 纸片分层动画、插画科普、插画讲书、图书号、书评短视频、插画读书、背景角色分开生成、Remotion 视频合成、or 参考视频制作方法复刻. Every publishable video uses character-free background plates plus independently generated alpha subjects, props, and depth elements, with evidence-backed narration, configurable image and voice providers, semantic motion, captions, rendering, and FFmpeg QA.
---

# Illustrated Videos

Build illustrated videos as editable layered scenes. Treat research, narrative design, prompt compilation, image generation, alpha processing, composition, audio, rendering, and QA as separate stages.

Do not copy a reference video's protected frames, characters, or exact visual identity. Extract transferable narrative structure, layer discipline, pacing, and motion grammar.

## Choose the editorial workflow

Set `contentMode` before research:

- `explainer`: 插画科普。Explain a claim, mechanism, history, process, person, or object.
- `book`: 插画讲书。Build a sourced, spoiler-aware story or argument around a book.

Accept legacy `book-review` input as an alias for `book`, then write new projects with `contentMode: "book"`. These are editorial workflows inside one `illustrated-videos` Skill, not separate products or visual modes.

Every publishable project uses `assetStrategy: "layered"`. Never approve a final scene whose featured character, core object, movable prop, and environment are baked into one image. A complete scene illustration may be used as a visual reference or animatic only; it is not a finished layered scene.

Resolve an approximate duration preference before research. If the user did not provide one, ask once how many seconds they roughly want. If they do not answer, the host cannot pause, or they ask you to proceed directly, use a planning fallback: about 40 seconds for `explainer`, or 60–120 seconds for `book`. A user-specified duration has priority. These values are editorial budgets, never hard cutoffs: approve the complete narration, generate or obtain final speech, then derive exact scene, caption, and composition timing from the decoded audio plus explicit handles. Shorten or expand the text before re-synthesizing when it materially misses the preference; do not pad with silence, truncate a complete idea, or hide the mismatch with extreme speech-rate changes. Record the decision in `project.durationPlan`. Read [references/book-workflow.md](references/book-workflow.md) and [references/book-research-schema.md](references/book-research-schema.md) for `book`.

Resolve the optional voice preference in the same opening exchange: provider or supplied audio, language or accent, perceived gender if requested, delivery style, rate, and pitch. Do not assume the user knows provider voice IDs. When the provider exposes a catalog, show three to five short semantic option cards first: an easy Chinese label, what the voice feels like, suitable uses, provider-declared gender and locale, the real voice ID, and why its provider metadata matches the content mode. For `edge-tts`, run `scripts/suggest-voices.mjs`; it enumerates the installed provider at runtime and maps `ContentCategories` and `VoicePersonalities` through the extensible `assets/voice-presets.json`. Offer a short same-text preview when practical. A user choice has priority; if they do not choose, use the first real recommendation. If a provider cannot be enumerated, use only an actual voice from its configured catalog or project configuration and never invent an available ID. Record the resolved voice configuration and authorization; changing the final voice, rate, pitch, or approved narration invalidates old timings, so remeasure the new audio and regenerate scene and caption timing.

## Keep rules reusable

Use this Skill as a decision framework, not a fixed shot list:

- Keep stable rules in the Skill: evidence, rights, layer separation, alpha integrity, no generated text, provider boundaries, semantic motion, and QA.
- Keep project variables in `creative-brief.json`: topic or book, audience, angle, resolved `durationPlan`, aspect ratio, palette, medium, era, characters, props, beats, exclusions, and attribution.
- Decide scene count, layer count, poses, motion, and transitions from the actual narration and visual action. Do not force every topic into the same number of scenes or assets.
- Keep concrete books, herbs, palettes, locations, poses, coordinates, and filenames as tests or project data, never reusable prompt rules.

## Preset scope

Use `paper-cut` unless the user explicitly selects another implemented preset. It is currently the verified preset: independent alpha cutouts, visible paper edges, role-aware shadows, overlap, occlusion, and parallax.

`crayon`, `doodle`, `pencil-sketch`, `watercolor`, `ink-wash`, and `pixel-art` are extension targets, not implemented presets. Do not claim they work until each has a tested asset contract, renderer behavior, prompt rules, examples, and regression checks. Read [references/style-presets.md](references/style-presets.md).

## Preflight

Read [README.md](README.md) for installation scenarios and [references/providers.md](references/providers.md) for provider configuration.

Run:

```bash
node <skill-root>/scripts/preflight.mjs --config <project-config.json>
```

Require Node.js, npm, Python 3, Pillow, FFmpeg, and ffprobe. Install Remotion inside the generated project with `npm install`; do not require a global Remotion installation.

Resolve image capability in this order:

1. Use native Codex image generation when callable.
2. Use `openai-api` only when explicitly configured and `OPENAI_API_KEY` exists.
3. Use a compatible image MCP after inspecting its schema.
4. Use `file` only when the user supplies authorized, genuinely separated backgrounds and subjects.
5. Otherwise stop and explain that a raster image model, image MCP, or compliant layered assets are required.

Never replace missing image generation with colored boxes, generic SVG stand-ins, or one composite illustration. Never silently downgrade to a static-plate workflow.

Resolve voice independently with `edge-tts`, OpenAI Speech API, a configured local model, or an authorized audio file. Voice, accent, delivery, rate, and pitch are project variables rather than Skill constants. Never clone a person's voice without explicit authorization.

## Research and story

Write one verifiable claim or narrative change per beat. For medicine, health, science, history, finance, or law, use primary or authoritative sources and distinguish tradition, observation, interpretation, and established evidence.

For `book`:

1. Research bibliography, plot and characters, context, and critical interpretation in separate tracks. Run them with parallel Agents when available, or sequentially under the same evidence contract.
2. Record sources, claims, contradictions, spoiler level, character evidence, rights limits, and visual exclusions before writing narration.
3. Choose one angle and compress it into a small story. Each beat must change something, involve a character or core object, cite approved claims, and declare a visual action.
4. Build a continuity anchor for each recurring character. Mark unsupported appearance details as original creative direction rather than canon.
5. Prefer original commentary. Do not reproduce cover art, film stills, actor likenesses, long protected passages, or a specific illustrated edition without the necessary rights.

The narration is the spine. Approve the complete text before final image generation and voice synthesis. Use speech-to-text only for timing evidence; keep approved wording as caption text.

## Build the creative brief

Copy `assets/remotion-template/creative-brief.json` to the project and replace every placeholder with evidence or explicit creative direction. Set:

```json
{
  "project": {"contentMode": "explainer"},
  "visualSystem": {"assetStrategy": "layered", "preset": "paper-cut"}
}
```

For a book project use `contentMode: "book"` and complete `book-research.json` first.

Read [references/prompt-standard.md](references/prompt-standard.md), then compile prompts:

```bash
node <skill-root>/scripts/build-prompts.mjs \
  --brief creative-brief.json \
  --out public/prompts
```

## Decompose every scene

Read [references/layer-contract.md](references/layer-contract.md). For each narrative beat:

1. Identify the featured character or core object and the action that communicates the beat.
2. Generate one environment plate without featured characters, movable core objects, generated labels, or captions.
3. Generate recurring characters separately with the same continuity anchor; create additional pose assets only when the story action needs them.
4. Generate movable props, secondary subjects, and foreground occluders separately when independent timing or depth improves the idea.
5. Use flat chroma-key sources for opaque cutouts, remove chroma locally, and validate real transparent pixels.
6. Record every asset and its provenance in `public/asset-manifest.json`.

Do not mechanically require the same layer count in every shot. A simple diagram and a crowd scene need different decompositions. The minimum meaningful scene still needs a subject or core object that moves independently of its background; hero scenes usually also need a support or depth layer. Add a layer only when it carries narrative action, continuity, depth, or transition value.

## Plan semantic motion

Map each beat to `enter → action → settle/exit`:

- `enter`: reveal hierarchy and establish the subject.
- `action`: show the narration-specific change, such as passing, opening, turning, growing, crossing, comparing, or swapping pose.
- `settle/exit`: hold the idea long enough to read, then hand off to the next beat.

Use camera movement as support, never as the only motion. Give foreground, subject, prop, and background different timing or trajectories when the scene calls for depth. Prefer meaningful movement over constant bobbing. Preserve character identity across scenes and use occlusion, crossing, pose changes, or parallax when they clarify the story.

Store all shot data in `public/project.json`; never hardcode topic-specific copy, coordinates, or filenames in React components. Read [references/storyboard-schema.md](references/storyboard-schema.md).

## Create and validate assets

Create a project:

```bash
node <skill-root>/scripts/create-project.mjs <output-directory>
node <skill-root>/scripts/create-project.mjs <output-directory> --mode book
```

Use one image-generation call per distinct asset. Keep provider outputs in `public/assets/source/`. Choose a key color absent from each opaque subject.

After every generated or imported raster asset, run the local no-API watermark screening tool before approving it. The detector uses local pixels and optional local OCR, so it incurs no model or API usage. A heuristic non-match is only `review-required`, not proof that an image is clean; inspect the reported image and corners, then record an explicit clear review. If an edge watermark can be removed by a small aspect-preserving crop without damaging the subject or planned composition, crop and recheck. Otherwise use an authorized image editor or regenerate with a provider that does not add the mark. Do not conceal a watermark with blur or paint-over artifacts.

```bash
python <skill-root>/scripts/remove-chroma.py \
  --input public/assets/source/subject.png \
  --output public/assets/layers/subject.png \
  --key auto --despill

python <skill-root>/scripts/check-alpha.py public/assets/layers/subject.png
node <skill-root>/scripts/validate-manifest.mjs <project-directory>
```

Complex hair, fur, glass, smoke, translucent materials, or soft shadows may require true transparency or a segmentation workflow. Do not pretend a simple chroma pass succeeded.

## Voice, captions, and sound

Before synthesis, turn provider IDs into a small understandable choice set:

```bash
node <skill-root>/scripts/suggest-voices.mjs \
  --locale zh-CN \
  --mode book \
  --max 4 \
  --format markdown
```

The output must be grounded in the provider's current catalog. It may describe what a metadata-backed preset is suited to, but it must not claim that a guessed ID exists. Use `--catalog <provider-catalog.json>` for a configured provider catalog that cannot be enumerated directly.

Generate voice with `scripts/generate-voice.mjs` or a configured adapter. Record provider, model, voice, speaking instructions, rate, pitch, and authorization in project configuration. Prefer one continuous narration track when provider limits allow it.

After final voice exists, use `scripts/align-approved-captions.py` for timing anchors and `scripts/apply-caption-timings.mjs` to update frames. Preserve the approved narration text. See [references/book-workflow.md](references/book-workflow.md) for exact book workflow commands.

Keep voice clearly above licensed music and effects. Use `scripts/mix-audio.sh` when an optional processed master and BGM ducking are needed. Disclose AI-generated speech where required.

## Compose in Remotion

Establish the static composition before adding motion. Then map roles:

- `primary`: main character or core object; strongest hierarchy and narrative action.
- `secondary`: supporting character, comparison, evidence, or interacting prop.
- `tertiary`: contextual subject or depth cue.
- `foreground`: faster parallax, framing, transition, or deliberate occlusion.

Use Remotion for independent layer transforms, camera movement, transitions, typography, book metadata, captions, brand overlay, audio, and H.264/AAC rendering. Keep titles, labels, book metadata, quotations, and captions out of generated images and render approved text in code.

Do not show a creator handle, logo, or watermark by default. Enable `brand` only when the user explicitly requests on-video attribution. A requested brand may contain a code-rendered handle, a user-supplied raster logo under `public/`, or both; never ask the image model to bake a logo into scene artwork.

## Audit, render, and verify

Run the deterministic audit before rendering:

```bash
node <skill-root>/scripts/audit-project.mjs <project-directory>
```

Reject composite hero scenes, missing alpha, featured subjects baked into backgrounds, camera-only motion, unknown evidence references, broken character continuity, generated production text, and materially wrong facts, captions, or audio. Read [references/quality-rubric.md](references/quality-rubric.md) and [references/qa.md](references/qa.md).

Render and verify:

```bash
npm install
npm run render
<skill-root>/scripts/verify-video.sh out/final.mp4
<skill-root>/scripts/make-contact-sheet.sh out/final.mp4 out/contact-sheet.jpg
```

Inspect at least one frame per beat and every transition. Also compare frames inside each longer beat to confirm that at least one subject changes relative to the background. Fix chroma fringe, repeated compositions, weak hierarchy, accidental occlusion, caption obstruction, silent transitions, audio imbalance, and one-frame flashes before delivery.

## Deliverables

Return:

- final MP4 and optional preview MP4
- representative still and contact sheet
- creative brief, research packet when applicable, storyboard, project JSON, and asset manifest
- compiled prompts and provider records
- source plates, chroma sources, final alpha layers, narration, captions, and audio
- sources, rights notes, audit output, and render/QA result

Report image and voice providers plus exact output paths. A Skill orchestrates capabilities; it does not supply a missing image model, research service, API key, renderer, browser, speech model, or licensed audio.

## Portability

Read [references/platforms.md](references/platforms.md), [references/providers.md](references/providers.md), and [references/workflow.md](references/workflow.md) before adapting the Skill to Codex, Claude Code, WorkBuddy, or another host. Optional services such as WeRead, VoxCPM, faster-whisper, or HyperFrames must not weaken the same evidence, separation, timing, rights, and QA contract.

Preserve attribution for the reference production method recorded in [references/reference-method.md](references/reference-method.md).
