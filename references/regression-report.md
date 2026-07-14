# Regression report

These are workflow tests, not reusable topic instructions. Their facts, palettes, objects, and coordinates must never be copied into a new project's stable prompt.

## Results

| Project | Runtime | Beats | Independent layers per hero | Automated structural score | Media QA |
|---|---:|---:|---:|---:|---|
| Original ginseng prototype | 31.4 s | 5 | 1–3, average 2.2 | 67/100 | Decodes, but not a publish candidate |
| Mugwort at the Duanwu doorway | 25.558 s | 5 | 6 | 100/100 | 1080×1920, 30 fps, H.264/AAC, full decode |
| Why aged citrus peel is called “chenpi” | 28.459 s | 5 | 6 | 100/100 | 1080×1920, 30 fps, H.264/AAC, full decode |

The automated number checks declared structure and file properties. It does not prove factual illustration accuracy, tasteful composition, correct pronunciation, or audience fit. Contact-sheet and listening review remain mandatory.

## Baseline failures found

- Every ginseng hero shot was below the five-layer depth floor.
- The average was 2.2 independently addressable layers.
- Several frames read as centered cards instead of active collage compositions.
- Title, note, and caption were stacked too often.
- There was no music bed, entry cue, or transition sound.
- Repeated backgrounds and similar object scales weakened the visual change between beats.

## Changes verified by the two new topics

- A project brief can change topic, palette, research, voice, and assets without editing the generic prompt rules.
- Background plates contain no featured subject; six subject/foreground assets are generated separately.
- Chroma removal produces validated alpha layers.
- Five beats use different primary positions, staggered entrances, foreground occlusion, role-specific shadow and parallax, code-rendered typography, and audio cues.
- The same Remotion components render a green plant/folk-custom topic and an orange archival/material topic.

## Residual risks to review

- Chroma key is unsuitable for translucent glass, smoke, fine hair, or colors close to the key; use native transparency or segmentation for those cases.
- Image models can invent botanical or historical details. Verify content visually against authoritative references.
- Voice preference is subjective. Treat provider, voice, rate, pitch, and instructions as project configuration.
- A 100 structural score is not a guarantee that a creator should publish without watching the full video.

## Reproduction checks

Run for each project:

```bash
node <skill-root>/scripts/validate-manifest.mjs .
node <skill-root>/scripts/audit-project.mjs .
npm run render
<skill-root>/scripts/verify-video.sh out/final.mp4
<skill-root>/scripts/make-contact-sheet.sh out/final.mp4 out/final-contact-sheet.jpg
```
