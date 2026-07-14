# Quality rubric

Use this rubric to compare drafts, diagnose a flat result, and decide whether to render again. A passing technical file can still fail creative quality.

## Hard failures

Reject the project when any of these is true:

- a hero shot is one composite illustration with only camera movement
- a required subject has no real transparent pixels
- featured subjects are baked into the environment plate
- generated image text is used as final production typography
- facts, captions, or audio are materially wrong
- video or audio stream is missing or the file cannot fully decode
- a reference frame or protected character is copied rather than abstracted

## 100-point review

| Area | Points | Passing evidence |
|---|---:|---|
| Narrative and pacing | 15 | Hook in first 2 seconds; one claim per beat; 4–7 beats for 20–35 seconds; no beat overstays its information |
| Layer depth | 25 | Background is separate; hero shots normally have 5+ independently addressable layers; primary, support, and foreground/depth roles are visible |
| Composition | 20 | Primary is dominant; scale differences are obvious; asymmetry, overlap, negative space, and baselines feel intentional; at least two distinct shot layouts |
| Motion | 15 | Staggered entrances; role-specific distance; visible settle; camera motion remains subordinate; transitions have no flash or dead frame |
| Typography and attribution | 10 | One title treatment and one caption system; mobile-safe; no heavy stack of cards; creator attribution is absent by default or unobtrusive when explicitly requested |
| Audio | 10 | Voice is intelligible; captions match; music/effects support rhythm without masking voice; entries or transitions have deliberate cues |
| Technical | 5 | Correct aspect, duration, frame rate, H.264/AAC, full decode, contact-sheet review |

Target at least 78/100 for a shareable draft and 88/100 for a publish candidate. Any hard failure overrides the score.

## Diagnostic patterns

### Looks like a moving poster

Likely causes:

- one background plus one centered subject
- all layers share the same transform
- insufficient scale difference or occlusion

Fix the composition contract: add meaningful midground and foreground assets, vary baselines, and make role motion independent.

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
