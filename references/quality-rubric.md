# Quality rubric

Use this rubric for both `explainer` and `book`. They are different editorial content modes, but every publishable output uses `assetStrategy: "layered"`. A technically valid MP4 can still fail the visual or editorial contract.

## Hard failures

Reject the project when any of these is true:

- a full composite illustration is presented as a layered production scene
- a narrative scene has no independently addressable protagonist or core narrative object
- the only visible motion is a pan, zoom, crop, or transition applied to the whole scene
- a required isolated subject has no real transparent pixels
- a featured subject or movable core prop is baked into the environment plate
- generated image text is used as final production typography
- captions, audio, or material factual claims are wrong
- a primary action is declared but remains off-canvas, fully transparent, delayed past its usable action window, or otherwise never becomes visibly readable
- a book timeline does not match decoded narration plus its declared tail, or approved captions are materially unreadable or detached from the narration duration
- a recurring character changes identity without a story reason and documented continuity plan
- a reference frame, protected character design, edition illustration, film still, or actor likeness is copied rather than abstracted
- video or required audio is missing, or the delivered file cannot fully decode

Any hard failure overrides a numeric score.

## 100-point review

| Area | Points | Passing evidence |
|---|---:|---|
| Narrative, evidence, and pacing | 20 | One clear scope; every beat changes or reveals something; claims are sourced appropriately for the content mode; uncertainty, spoiler, and rights boundaries are recorded; final narration completes the chosen scope without forced padding |
| Layer plan and separation | 20 | Character-free backgrounds; independent protagonists/core objects and movable props; depth and occlusion follow the beat; layer count is justified by the action rather than copied from a quota |
| Semantic motion and rhythm | 20 | Primary action follows `enter → action → settle/exit`; subject and props move independently; motion anchors follow narration; camera is subordinate; long holds contain purposeful micro-events rather than idle drift |
| Composition and continuity | 15 | Primary is legible; scale, asymmetry, overlap, negative space, baselines, and shot changes are intentional; recurring character anchors remain recognizable |
| Typography and captions | 10 | Code-rendered title, labels, metadata, and captions; approved text matches narration; mobile-safe hierarchy; no persistent stack of opaque cards |
| Audio | 10 | Voice is intelligible; timing follows final audio; optional music/effects support action without masking narration; entries and transitions have deliberate cues where useful |
| Technical | 5 | Correct aspect, positive duration and frame rate, required streams, full decode, transition review, and motion-aware sampled frames |

For an `explainer`, evidence review emphasizes factual claims, uncertainty, and the difference between evidence and custom. For a `book`, it additionally checks title/author metadata, plot and character facts, editorial commentary boundaries, spoiler policy, quotations, and visual adaptation exclusions.

Target at least 78/100 for a shareable draft and 88/100 for a publish candidate.

## Layer-count interpretation

Three to seven independently addressable visual layers is a common planning range for a hero scene, not a universal pass condition. Score the usefulness of the separation:

- A close-up with a background, one core object, and one action prop can be sufficient when all three have distinct narrative jobs.
- A process or relationship scene may require several characters, state variants, props, and occluders.
- Seven decorative scraps do not compensate for a baked-in protagonist.
- Reusing the same count, layout, and arrival pattern in every scene is evidence of template-driven planning, not quality.

The reviewer should be able to explain why each layer must be independent. Remove layers with no visual or narrative responsibility.

## Motion-density review

Motion density is determined from scene duration and spoken meaning, not a fixed global tempo. For every narrative scene:

1. Mark narration anchors that introduce an object, action, contrast, or consequence.
2. Confirm that the primary subject performs a corresponding action near the relevant anchor.
3. Confirm that motion continues beyond the initial entrance when the scene remains on screen.
4. Confirm that camera, subject, and prop/depth movement are independent rather than one shared transform.
5. Sample early, middle, and late frames and inspect meaningful displacement, state change, or occlusion.

As a diagnostic target, a scene longer than a short bridge normally needs at least three independent motion tracks: camera, narrative subject, and prop or depth layer. A visually meaningful event every few seconds often prevents a hold from becoming inert, but the narration decides the exact timing. Do not add constant motion merely to satisfy a counter.

Possible automated signals include:

- non-background layer bounding-box displacement, rotation, scale, opacity, or state change across sampled frames
- number of independently transformed layers
- presence of a declared `action` phase for each primary layer
- narration anchors mapped to motion events
- foreground displacement exceeding distant-layer displacement when parallax is intended
- excessive time with no non-camera visual change

These signals identify review targets; they do not replace watching the animation.

Recommended default audit behavior:

- hard-fail when no primary layer declares a semantic action with at least two differing valid keyframes
- hard-fail when the only changing transform belongs to the camera or full-scene container
- warn when a scene longer than a short bridge has fewer than two independently timed non-background motion tracks
- warn when a long scene spends more than roughly half its duration with no new non-camera change after the entrance
- warn when every layer reuses the same normalized keyframe times, directions, and loop
- warn when a planned occlusion or parallax relationship produces no measurable relative displacement

The reviewer may resolve a warning with a beat-specific explanation. Do not turn warning defaults into a demand for identical motion density across quiet, comic, reflective, or process-oriented scenes.

## Diagnostic patterns

### Looks like a moving poster or slide deck

Likely causes:

- a complete illustration contains every subject and prop
- scene `layers` are empty or decorative only
- all visible content shares the background transform
- the camera supplies the only movement

Fix the asset plan. Regenerate or isolate the protagonist/core object and movable props, create a character-free environment, then assign a semantic action and genuine depth relationships. More camera movement will not solve this failure.

### Has layers but still feels mechanical

Likely causes:

- every scene uses the same number of layers
- every asset enters from alternating sides on the same delay pattern
- all subjects bob forever regardless of meaning
- the action is unrelated to the spoken beat

Return to the beat map. Choose a visual verb, decide what changes, and let only the necessary assets participate.

### Character continuity breaks

Likely causes:

- prompts describe role and mood but omit stable identity anchors
- age, clothing, hairstyle, or facial abstraction changes between calls
- generated poses were approved independently rather than as a sequence

Approve a character anchor first, compare all poses together, and regenerate the mismatched asset. Do not hide identity drift with a fast transition.

### Motion exists but rhythm feels weak

Likely causes:

- a short entrance is followed by a long static hold
- all layers arrive simultaneously
- nothing changes at narration pivots
- SFX emphasize decoration instead of story actions

Map `enter`, `action`, and `settle/exit` to audio anchors, stagger only when hierarchy benefits, and add a purposeful state change or handoff where the spoken idea turns.

### Cutouts feel pasted on

Likely causes:

- identical drop shadows regardless of depth
- chroma fringe or inconsistent paper edges
- incompatible light direction or texture
- implausible baselines and occlusion

Correct the matte, match the visual system, vary shadows by role, and stage the subject in physical relation to the environment.

## Review loop

1. Review the evidence packet and beat-to-action map before generating assets.
2. Inspect backgrounds and alpha layers separately; reject baked subjects immediately.
3. Review a static storyboard for hierarchy, depth, character continuity, and caption safety.
4. Render short scene previews and inspect the `enter → action → settle/exit` sequence.
5. Sample early, middle, and late frames; a conventional contact sheet alone cannot prove independent motion.
6. Listen once without watching, then watch once muted.
7. Record failures by category, change the relevant system rule or project variable, and rerun.
8. Keep failed subject matter as regression fixtures; do not hardcode its answer into stable prompts.

Use this rubric with the concrete checks in [qa.md](qa.md) and the separation rules in [layer-contract.md](layer-contract.md).
