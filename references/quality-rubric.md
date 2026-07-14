# Quality rubric

Use this rubric to compare drafts, diagnose a flat result, and decide whether to render again. A passing technical file can still fail creative quality.

## Hard failures

Reject the project when any of these is true:

- a `layered` hero shot is one composite illustration with only camera movement
- a required `layered` subject has no real transparent pixels
- `layered` featured subjects are baked into the environment plate
- a `scene-illustrations` project falsely declares subjects inside a unified plate as independently movable layers
- generated image text is used as final production typography
- facts, captions, or audio are materially wrong
- video or audio stream is missing or the file cannot fully decode
- a reference frame or protected character is copied rather than abstracted

## 100-point review: `explainer` + `layered`

| Area | Points | Passing evidence |
|---|---:|---|
| Narrative and pacing | 15 | Opening earns attention; one claim per beat; final narration completes the chosen scope; no beat overstays its information |
| Layer depth | 25 | Background is separate; hero shots normally have 5+ independently addressable layers; primary, support, and foreground/depth roles are visible |
| Composition | 20 | Primary is dominant; scale differences are obvious; asymmetry, overlap, negative space, and baselines feel intentional; at least two distinct shot layouts |
| Motion | 15 | Staggered entrances; role-specific distance; visible settle; camera motion remains subordinate; transitions have no flash or dead frame |
| Typography and attribution | 10 | One title treatment and one caption system; mobile-safe; no heavy stack of cards; creator attribution is absent by default or unobtrusive when explicitly requested |
| Audio | 10 | Voice is intelligible; captions match; music/effects support rhythm without masking voice; entries or transitions have deliberate cues |
| Technical | 5 | Correct aspect, duration, frame rate, H.264/AAC, full decode, contact-sheet review |

## 100-point review: `book-review` + `scene-illustrations`

| Area | Points | Passing evidence |
|---|---:|---|
| Narrative and pacing | 20 | One coherent editorial angle; final narration completes it without forced compression or padding; semantic scene timing follows the final audio |
| Research and rights | 15 | Title, author, relevant facts, spoiler policy, sources, fact/commentary boundary, and visual/quotation exclusions are recorded |
| Illustration coverage | 20 | At least three distinct text-free plates; every scene maps to a declared plate; series style remains consistent; no false alpha-layer claims |
| Motion | 15 | Several restrained camera trajectories; transitions have no flash or dead frame; long holds contain an intentional visual reason or are split |
| Typography and captions | 15 | Title/author are code-rendered; approved caption text matches narration; cues do not overlap or exceed the composition |
| Audio | 10 | Final narration exists, fits the composition, stays intelligible over optional music/effects, and drives the duration |
| Technical | 5 | Correct aspect, positive frame rate/duration, H.264/AAC export, full decode, contact-sheet and transition review |

Target at least 78/100 for a shareable draft and 88/100 for a publish candidate. Any hard failure overrides the score.

## Diagnostic patterns

### Looks like a moving poster

Likely causes:

- one background plus one centered subject
- all layers share the same transform
- insufficient scale difference or occlusion

Fix the composition contract: add meaningful midground and foreground assets, vary baselines, and make role motion independent.

For `scene-illustrations`, do not invent fake layer separation. Add a materially different plate at the next semantic boundary, strengthen the crop path, or add honest code-native graphic motion.

### Looks like a museum card or slide deck

Likely causes:

- several opaque text boxes
- equal margins and symmetrical objects
- illustrations placed as specimens rather than actions

Use one integrated title, lighter captions, more overlap, and a clear visual action or relationship.

### Style is consistent but dull

Likely causes:

- the palette has similar value everywhere
- the primary is too small
- backgrounds repeat across too many beats

Increase value contrast behind the primary, enlarge it, and change shot composition or plate.

### Motion exists but rhythm feels weak

Likely causes:

- six-second static holds after a one-second entrance
- every layer arrives at once
- no audio cue or micro-event during a long beat

Shorten beats, stagger arrivals, reveal labels or secondary evidence later, and add restrained transition/entry sounds.

### Cutouts feel pasted on

Likely causes:

- identical drop shadows regardless of depth
- chroma fringe
- no shared paper edge treatment

Correct the matte, vary shadow strength by role, and standardize outline/paper texture in the visual system.

## Review loop

1. Render a contact sheet before the full video.
2. Score the static composition without considering motion.
3. Inspect the first second of every beat for entrance order.
4. Listen once without watching, then watch once muted.
5. Record failures by category, change one system rule or project variable, and rerun.
6. Keep concrete failed topics as regression cases; do not hardcode their answers into the prompt.
