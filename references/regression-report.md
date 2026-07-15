# Regression report

These are workflow tests, not reusable topic instructions. Their facts, palettes, objects, and coordinates must never be copied into a new project's stable prompt.

## Results

| Project | Runtime | Beats | Independent layers per hero | Structural result | Media QA |
|---|---:|---:|---:|---:|---|
| Original ginseng prototype | 31.4 s | 5 | 1–3, average 2.2 | Too shallow and repetitive | Decodes, but not a publish candidate |
| Mugwort at the Duanwu doorway | 25.558 s | 5 | 6 | Layered baseline passes | 1080×1920, 30 fps, H.264/AAC, full decode |
| Why aged citrus peel is called “chenpi” | 28.459 s | 5 | 6 | Layered baseline passes | 1080×1920, 30 fps, H.264/AAC, full decode |
| First complete-plate book trial | narration-driven | 7 | 0 | Fails: camera-only scene illustrations | Decodes, but reads as a slide deck |
| v1.2 layered book acceptance: *Love in the Time of Cholera* | 78.230 s container; 2,345 frames at 30 fps | 5 | 3–4, average 3.8 | Passes with 3 backgrounds and 7 validated alpha assets; manifest/audit 100/100 | 1080×1920, H.264/AAC, full decode; no black frames or long silence |

The automated number checks declared structure and file properties. It does not prove factual illustration accuracy, tasteful composition, correct pronunciation, or audience fit. Contact-sheet and listening review remain mandatory.

The named book above is concrete regression data only. Its title, story facts, palette, imagery, narration, and timing must not become reusable Skill rules or defaults.

## v1.2 actual book acceptance

The v1.2 release candidate was exercised with a real `book + layered` project for *Love in the Time of Cholera*. The rendered container is 78.230 seconds and contains a 2,345-frame, 30 fps program timeline. All five approved beats render with an average of 3.8 independently animated layers. The asset set contains three subject-free backgrounds and seven alpha layers. Manifest validation and project audit both scored 100/100.

The shared project regression also covers the optional code-rendered brand overlay. A decodable raster logo inside `public/` passes as a logo-only brand; missing logo files and an enabled brand with neither handle nor logo are rejected. Branding remains disabled in the template unless a user explicitly requests it.

FFmpeg media QA reported 1080×1920 H.264 video with AAC audio, full-stream decode, no black-frame finding, and no long-silence finding. These results establish a concrete release regression; they do not turn this book into a template for other projects.

All 10 final raster assets have a `clear` watermark report bound to the final file's SHA-256 digest. The local checker used edge/corner heuristics plus explicit visual confirmation and reported zero network, API, or online-model calls. The visual confirmation remains essential: a heuristic non-finding alone is not treated as proof that an image is clear.

## Contract regression matrix

This compares behavior, not exact generated pixels or wording:

| Case | Expected behavior | v1.1 result | Current result | Decision |
|---|---|---|---|---|
| Layered explainer with separated assets | Accept after alpha, motion, and media checks | Accepted | Accepted with semantic-motion checks | No regression |
| Book project with character-free backgrounds and independent character/prop layers | Accept after research, story, timing, and layer checks | Rejected because book forced complete plates | Accepted | Fixed |
| Book project made from complete scene illustrations and camera motion only | Reject as a publishable layered video | Accepted | Rejected by scaffold, prompt compiler, validator, and audit | Fixed |
| Hero scene with layers but no narration-specific subject action | Reject; entrance or idle drift is insufficient | Accepted | Rejected unless a primary has meaningful semantic keyframes | Fixed |
| Missing image provider or compliant separated assets | Stop with an actionable capability requirement | Stopped | Stopped; no silent plate fallback | No regression |
| Unresolved research contradiction used by a book beat | Reject until narrowed, resolved, or excluded | Not represented in the old contract | Rejected | Added coverage |
| Research IDs preserved while source, claim, character, or beat content drifts | Reject; approval transfer is content-level, not ID-only | Not represented | Rejected | Added coverage |
| Existing image path supplied as narration audio | Reject even though the file exists | Not represented | Rejected by ffprobe stream inspection | Added coverage |
| Hero primary is fully off-canvas, permanently transparent, or appears after its action window | Reject; declared keyframes are not enough when no action is visible | Not represented | Rejected by frame-window visibility sampling | Added coverage |
| Narration, declared tail, timeline, and approved captions materially disagree | Reject and regenerate timing | Weak warning only | Rejected | Fixed |
| Minimal layered explainer with real background/alpha fixtures and semantic action | Accept; reject its composite and camera-only mutations | Shallow scaffold check only | Positive and negative paths pass | Added full-mode coverage |
| No requested duration for an explainer | Ask once; if unanswered, use approximately 40 seconds as an editorial planning target | Fixed template duration | `durationPlan` records the fallback target; final runtime follows approved narration | Fixed |
| No requested duration for a book video | Ask once; if unanswered, plan within 60–120 seconds | No distinct book fallback | `durationPlan` records the fallback range; final runtime follows approved narration | Added coverage |
| User supplies an approximate duration | Preserve the user's value as the planning target instead of replacing it with a mode default | Not represented | Explicit user value has priority in both modes | Added coverage |
| Decoded narration duration plus declared tail disagrees with the project timeline | Reject in both explainer and book modes | Book-only/weak coverage | Rejected in both modes; no silent padding, truncation, or extreme speed-up is permitted | Fixed |
| Final raster asset has no clear watermark report or its report is not bound to the file SHA-256 | Reject before publish QA | Not represented | Rejected by manifest validation and audit | Added coverage |
| Watermark report declares any network, API, or online-model call | Reject the report as non-compliant with the local zero-consumption policy | Not represented | Rejected when `networkCalls` is non-zero | Added coverage |

The automated smoke fixture uses synthetic names, facts, colors, and coordinates only as test data. None of them belongs in stable Skill or prompt rules.

`durationPlan` is an editorial budget, not a command to synthesize silence or cut speech to a fixed clock. User input always has priority; otherwise the explainer fallback is approximately 40 seconds and the book fallback is 60–120 seconds. In both modes, the publishable timeline is gated against decoded final narration duration plus the explicitly declared tail.

## Baseline failures found

- The ginseng prototype had too few independently meaningful elements for its intended collage depth; the average was 2.2 layers.
- Several frames read as centered cards instead of active collage compositions.
- Title, note, and caption were stacked too often.
- There was no music bed, entry cue, or transition sound.
- Repeated backgrounds and similar object scales weakened the visual change between beats.
- The complete-plate book trial baked characters, props, and environments into one image. Its seven scenes had zero independent layers, so Remotion could only move the camera and the result behaved like a narrated slide deck.

## Changes verified across topics and modes

- A project brief can change topic, palette, research, voice, and assets without editing the generic prompt rules.
- Background plates contain no featured subject; the successful examples use six subject/foreground assets per hero scene.
- Chroma removal produces validated alpha layers.
- Five beats use different primary positions, staggered entrances, foreground occlusion, role-specific shadow and parallax, code-rendered typography, and audio cues.
- The same Remotion components render a green plant/folk-custom topic and an orange archival/material topic.
- Six layers are an observed successful baseline, not a universal quota. New projects must decompose each beat by narrative action, continuity, interaction, and depth; a simple scene may need fewer layers and a complex story may need more.
- The layered book acceptance uses fewer independent elements where the story needs them while still passing visibility, semantic-motion, alpha, timing, and media checks; neither its layer count nor its book-specific content is a reusable quota.
- Duration fallbacks vary by content mode without hardcoding a finished runtime, and an explicit user duration overrides both fallbacks.
- Watermark screening is local and deterministic at the policy boundary: every publish asset needs a SHA-bound report with zero network/API/online-model calls plus human or agent visual confirmation.

## Residual risks to review

- Chroma key is unsuitable for translucent glass, smoke, fine hair, or colors close to the key; use native transparency or segmentation for those cases.
- Image models can invent botanical or historical details. Verify content visually against authoritative references.
- Voice preference is subjective. Treat provider, voice, rate, pitch, and instructions as project configuration.
- Edge/corner heuristics and optional local OCR can miss subtle, central, patterned, or adversarial watermarks. Never promote a heuristic-only non-finding to `clear`; retain visual confirmation and the SHA binding.
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
