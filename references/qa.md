# Video QA

Run the same layered production checks for `explainer` and `book`. Content-specific fact, spoiler, and rights review differs; asset separation and motion requirements do not.

## Evidence and story QA

- Every material narration claim maps to a source or is clearly marked as commentary, interpretation, uncertainty, or custom.
- Every storyboard beat states what changes, who or what carries the change, and one observable visual verb.
- Book metadata, character and plot facts, spoiler level, quotations, and adaptation exclusions are checked for `book`.
- `durationPlan` records whether the planning budget came from the user or the mode fallback. The narration completes the chosen idea within a reasonable planning tolerance; decoded final speech plus explicit handles controls exact timing.
- A short bridge may intentionally have minimal action, but a missing action is not silently promoted to a hero scene.

## Asset QA

- `assetStrategy` is `layered`.
- Every environment plate contains no featured subject, recurring protagonist, or movable core prop.
- Every protagonist or core narrative object exists as a separate alpha layer.
- Props that move, change state, or cross depth planes exist as independent layers.
- Declared alpha assets have transparent corners, meaningful opaque coverage, complete intended silhouettes, and no visible chroma fringe at playback size.
- No full composite illustration is accepted as a production scene.
- Character anchor, paper outline, palette, texture, and light direction remain consistent across poses and scenes.
- Generated assets contain no final typography, copied cover/edition imagery, protected character design, film frame, or actor likeness.
- Every final raster asset has a local watermark report bound to its SHA-256. Local heuristics may detect text-like or edge marks, but an automatic non-match still requires visual confirmation before `clear`.

Three to seven independent visual layers is a common planning range, not a checklist target. Review why every layer needs to be separate. A smaller scene can pass when its action is complete; a larger scene can pass when added layers have distinct story or depth responsibilities. Decorative duplication never compensates for a baked-in protagonist.

## Layout QA

- The protagonist or core object is visually dominant at the moment it carries the beat.
- Important hands, faces, roots, controls, labels, and props are not cropped or hidden at their semantic moment.
- `zIndex` follows the intended physical relationship: background → rear context → support → primary → foreground → typography.
- Baselines, scale, overlap, shadows, and light direction make the cutouts feel present in one space.
- At least one planned foreground/rear occlusion is correct when the scene depends on depth.
- Captions and code-rendered metadata stay inside safe margins and do not cover important details.
- Shot scale and layout vary with the story; scenes do not repeat one centered specimen composition mechanically.

## Motion QA

- `enterFrom` and `delay` establish hierarchy; they are not counted as the whole action.
- Each primary action-bearing layer has a meaningful `motion.action` and at least two differing, strictly ordered `motion.keyframes` within `0..1`.
- Keyframes perform the beat's observable verb and align with the relevant narration anchor.
- The primary sequence reads as `enter → action → settle`, with a late exit, occlusion, transformation, or handoff when useful.
- `motion.loop` is restrained support only. Repeated bob, sway, or pulse does not substitute for a semantic action.
- Camera, primary subject, and prop or depth movement use independent transforms and timing in scenes that need sustained action.
- Background movement stays subtle; foreground movement is stronger only when it expresses depth.
- No hero scene relies exclusively on pan, zoom, crop, or transition motion.
- No flash, one-frame gap, accidental jump, incorrect overlap, or visibility pop occurs at scene boundaries.

### Motion-density inspection

A static contact sheet cannot prove independent animation. For every hero scene:

1. Sample frames near the early, middle, and late portions of the scene.
2. Compare non-background layer position, rotation, scale, opacity, and state.
3. Confirm that at least the primary plus one other narrative or depth element change independently when the beat calls for multiple tracks.
4. Confirm that a long hold contains a purposeful micro-event near a narration change rather than only an idle loop.
5. Watch the scene at speed to ensure events feel motivated instead of scheduled by a fixed interval.

Useful audit signals include the number of independently transformed layers, meaningful keyframe differences, time since the last non-camera change, narration-anchor coverage, and depth-appropriate displacement. Treat thresholds as diagnostic flags, not a substitute for visual review.

Default flags may include: no primary semantic action, camera-only change, fewer than two independently timed non-background tracks in a long hero scene, an inert hold covering more than roughly half of a long scene, identical motion curves on every layer, or a declared occlusion with no relative crossing. The first two are hard failures; the others require beat-specific review rather than automatic rejection.

## Character-continuity QA

- Recurring poses preserve the approved silhouette, face/hair abstraction, clothing shapes, color blocks, outline, texture, and light system.
- Age or state variants retain documented identity cues.
- Character assets are reviewed together as a sequence, not approved one at a time in isolation.
- Pose crossfades use separate layers with compatible placement and opacity keyframes.
- No scene relies on an existing actor or adaptation design to maintain recognizability.

## Audio and caption QA

- Voice is intelligible and louder than optional music.
- Captions reproduce the approved narration exactly.
- Caption timing comes from final audio while caption wording remains editorially controlled.
- For both `explainer` and `book`, decoded narration duration plus the declared `audio.tailSeconds` matches the composition within frame tolerance. Book captions additionally must neither flash too briefly for their text nor end materially before the narration.
- Scene and motion anchors follow real speech timing rather than equal divisions.
- Audio begins and ends cleanly.
- AI voice disclosure is included when required.

## Technical QA

- Dimensions and aspect ratio match the target.
- Duration and frame rate are positive and match the final audio plan.
- H.264 video and AAC audio are present unless `intentionalSilence` is explicitly declared where allowed.
- Full decode completes without errors.
- Review at least one frame per scene plus early/middle/late motion samples for every hero scene.
- Review transition-adjacent frames and listen through every audio boundary.

Use `scripts/verify-video.sh --allow-no-audio <video.mp4>` only for an intentionally silent permitted project. The default command requires an audio stream.

See [quality-rubric.md](quality-rubric.md) for scoring and [storyboard-schema.md](storyboard-schema.md) for the keyframe contract inspected here.
