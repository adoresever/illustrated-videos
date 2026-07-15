# Style presets

`illustrated-videos` is the umbrella Skill name. `explainer` and `book` are editorial content modes. Every publishable output uses separated backgrounds, protagonists or core objects, props, and depth layers; style choice never permits a composite illustration to replace the layer contract.

A preset is more than a word in an image prompt. It needs:

- a layered asset contract
- prompt rules and character-continuity rules
- medium-specific alpha-edge, texture, shadow, and compositing behavior
- an animation grammar for `enter → action → settle/exit`
- examples across unrelated topics
- structural, visual, motion, audio, and media regression checks

| Preset | 中文 | Status | Required layered renderer behavior |
|---|---|---|---|
| `paper-cut` | 剪纸 / 纸片拼贴 | Verified | Alpha cutouts, visible paper edges, depth-aware shadows and parallax, code typography, semantic keyframe actions, and paper-aware transitions |
| `crayon` | 儿童蜡笔 | Roadmap | Separated crayon subjects and backgrounds, edge-compatible texture, partial draw-on reveal, restrained hand-drawn jitter |
| `doodle` | 极简涂鸦 | Roadmap | Separated line assets, stroke reveal, icon-like staging, and minimal fills without flattening the whole scene |
| `pencil-sketch` | 铅笔速写 | Roadmap | Separated graphite subjects and environments, stroke build-up, texture continuity, and eraser or page transitions |
| `watercolor` | 淡彩水彩 | Roadmap | Separated subjects with tested soft-edge alpha, wash masks, pigment spread, and depth treatment that avoids hard sticker edges |
| `ink-wash` | 水墨 | Roadmap | Separated ink subjects and backgrounds, diffusion masks, dry-brush texture, and intentional negative space |
| `pixel-art` | 像素画 | Roadmap | Separated sprites and tile backgrounds, nearest-neighbor scaling, sprite timing, palette discipline, and pixel-safe motion |

Only `paper-cut` may be selected by default in the current release. Changing only `visualSystem.medium` does not implement another preset; it produces an unverified variation without the required renderer and QA contract.

## Preset-independent rules

- Layer count follows the current beat. Three to seven independent visual layers is common, but never a fixed per-scene quota.
- The environment excludes the featured subject and movable core props.
- The protagonist or core object remains independently addressable.
- Recurring characters use an approved identity anchor across poses and state variants.
- `enterFrom` and `delay` provide entrance staging; semantic action uses differing `motion.keyframes`; loops only support the hold.
- Camera movement cannot be the only motion.
- Typography and captions remain code-rendered.
- Reference images contribute high-level qualities only; do not copy frames, adaptations, protected characters, or artist-specific work.

## Promoting a roadmap preset

To mark a preset implemented:

1. Define medium-specific rules for backgrounds, isolated subjects, movable props, state variants, and occluders.
2. Define a character anchor and continuity review method suitable for the medium.
3. Add prompts that remain independent of a particular topic or book.
4. Implement alpha, compositing, shadows, transitions, loops, and semantic keyframe behavior behind `project.stylePreset` without changing verified `paper-cut` output.
5. Add at least two cross-topic examples, including one recurring-character or multi-state case.
6. Add hard-failure checks for composite scenes, missing independent primaries, camera-only motion, invalid alpha, and identity drift.
7. Run structural, media, visual, listening, and motion-density QA and document residual risks.

Every preset inherits [layer-contract.md](layer-contract.md); preset-specific behavior supplements rather than replaces it.
