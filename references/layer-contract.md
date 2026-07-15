# Layer contract

This contract applies to every publishable `illustrated-videos` project. `explainer` and `book` are content modes; both use `assetStrategy: "layered"`. A complete illustration with characters, important props, and environment baked together is reference material at most, never a compliant production scene.

## Plan layers from the beat

Analyze the current beat before requesting assets:

1. Identify the narrative subject: the person, object, process, or relationship whose state changes.
2. Identify the semantic action: what visibly happens while this line is spoken.
3. Identify movable evidence or props needed to express that action.
4. Decide which elements must pass behind or in front of another element.
5. Choose depth planes and camera framing only after those relationships are clear.

One hero scene normally resolves into three to seven independently addressable visual layers plus code typography, but this is a planning range, not a quota. A simple close-up may need fewer; a multi-step process may need more. Record the reason when a scene falls outside the range. Never split an image into meaningless fragments merely to raise a count, and never repeat the same fixed layer count across every scene without analyzing the beat.

Every narrative scene must still contain:

- one environment plate without the featured subject or any core movable object
- at least one independent `primary` alpha asset representing the protagonist or core narrative object
- every prop that changes position, state, visibility, or depth as an independent layer
- separate foreground or midground occluders whenever the action passes behind or in front of them
- code-native titles, labels, lines, arrows, captions, and book metadata

These are hard failures:

- a composite illustration is used as the scene while its baked subjects are described as layers
- the protagonist or core narrative object is not independently addressable
- the only visible motion is a pan, zoom, or crop applied to the whole scene

## Asset roles

| Role | Narrative responsibility | Typical motion | Typical order |
|---|---|---|---|
| background | Character-free environment and stable paper texture | Restrained push or drift | 0 |
| tertiary | Distant context or rear occluder | Slow parallax or delayed reveal | 1–2 |
| secondary | Supporting subject, evidence, or movable prop | Narration-triggered action | 3–4 |
| primary | Protagonist or core object that carries the beat | Clear semantic action and settle | 5–6 |
| foreground | Close occluder or object crossing the camera | Stronger parallax or wipe-through | 7–8 |
| typography | Titles, labels, captions, and metadata | Short code-native reveal | 20+ |

Roles express hierarchy, not a required inventory. A scene can use two `secondary` props and no `tertiary` layer, for example, when that is what the story requires.

## Motion contract

The primary subject and any action-bearing prop follow a semantic motion sequence:

1. `enter`: establish where the subject comes from and how it joins the composition.
2. `action`: perform the verb implied by the beat, such as opening, turning, passing, unfolding, separating, pointing, or transforming.
3. `settle`: remain alive with restrained hold motion after the action resolves.
4. `exit`: leave, become occluded, transform, or hand visual attention to the next beat when the transition needs it.

Not every decorative layer needs all four phases. The primary subject does need an `action`; entrance plus idle bobbing is not a semantic action. Tie phase timing to narration anchors rather than equal scene fractions.

For scenes long enough to develop an action, plan independent motion for the camera, subject, and at least one prop or depth layer. They should not share one transform or identical timing. Use a meaningful change or micro-event when a hold becomes visually inert, but derive its frequency from the spoken beat instead of enforcing a universal interval.

Motion should reveal relationships:

- vary speed and displacement by depth
- let foreground elements travel farther than distant ones
- use a real occlusion, crossing, handoff, state change, or path when the story calls for it
- keep camera motion subordinate to subject motion
- avoid perpetual floating when the subject should feel grounded

## Character continuity

For a recurring protagonist, define a character anchor before generating scene poses:

- silhouette and proportions
- face and hair cues at the chosen detail level
- clothing shapes and recurring color blocks
- outline, paper edge, texture, and light direction
- permitted age or state variants

Reuse the anchor in every relevant asset prompt and compare new poses against the approved character reference. Changes required by time or story state must preserve enough anchors to read as the same character. Do not use an actor likeness, an existing adaptation design, or a protected character design as the anchor.

## Alpha acceptance

An independent subject must:

- be PNG or WebP with alpha
- have transparent corners
- contain both transparent and opaque pixels
- avoid visible chroma fringe at normal playback size
- keep the complete intended silhouette inside the canvas
- exclude environments, floor planes, and cast shadows unless they are deliberately separate layers

Reject alpha coverage below 2% or above 95% by default. Adjust only for a documented tiny detail or a full-frame foreground occluder.

## Composition acceptance

- Make the narrative subject legible at mobile size; do not force every subject into the same scale or center position.
- Use asymmetry, scale difference, overlap, and depth when they clarify the action.
- Keep faces, hands, labels, and other semantic details unobstructed at their important moment.
- Anchor feet, chairs, containers, roots, and other grounded subjects to plausible baselines.
- Use occlusion to create depth or reveal information, not to hide evidence.
- Keep captions inside the safe area and separate from important visual details.
- Avoid stacking title, note, labels, and an opaque caption card in every scene.
- Across the video, vary shot scale and composition in response to the story rather than rotating through a mechanical layout template.

See [prompt-standard.md](prompt-standard.md) for prompt compilation, [storyboard-schema.md](storyboard-schema.md) for runtime fields, and [qa.md](qa.md) for acceptance checks.
