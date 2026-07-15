# Prompt standard

This is a mixed `Agent system + creative generation` prompt system. Keep stable workflow rules separate from project-specific research, story decisions, character anchors, and asset requests.

## Stable system rules

Apply these to every publishable project:

1. Treat `explainer` and `book` as content modes. Both use `assetStrategy: "layered"`.
2. Analyze each story beat before deciding how many layers it needs. Three to seven independently addressable visual layers is a useful planning range, not a fixed target.
3. Generate only one distinct final asset per image call.
4. Generate environment plates without the featured subject, recurring character, or any core prop that must move or change state.
5. Generate each protagonist, core object, movable prop, and required occluder as an independent asset.
6. Show the complete intended silhouette with padding and a removable flat background for isolated raster subjects.
7. Keep captions, labels, arrows, numbers, book metadata, and brand text out of raster assets.
8. Preserve one visual-system description and approved character anchor across all related assets in a project.
9. Compile an explicit semantic action for the primary subject: `enter → action → settle`, plus `exit` when the transition needs it. Do not substitute camera motion or generic bobbing for the action.
10. Reject contract violations instead of disguising a composite illustration as a background or piling on contradictory prompt prohibitions.
11. Put deterministic filenames, ordering, IDs, key removal, alpha checks, manifests, and schema validation in scripts rather than model prose.

## Project variables

Collect these in `creative-brief.json`:

- `project`: content mode, topic or book metadata, audience, objective or editorial angle, spoiler level, resolved `durationPlan`, aspect ratio, language. Ask once when duration is missing; if no answer is available use about 40 seconds for `explainer` or 60–120 seconds for `book`. A user value has priority, while decoded final speech remains the exact timing authority.
- `evidence`: claims, source IDs, fact/commentary boundary, uncertainty, spoiler risk, quotation and visual-rights exclusions
- `storyBeats`: narration purpose, what changes, narrative subject, semantic visual verb, required evidence, source IDs, and transition intent
- `visualSystem`: medium, line treatment, palette, texture, depth, lighting, series anchor, reference qualities, and exclusions
- `characters`: identity anchor, approved reference, recurring states or ages, continuity constraints, prohibited likenesses
- `assets`: ID, type, beat purpose, environment or isolated subject, hierarchy, key color, composition, occlusion relationship, and exclusions
- `shots`: narration anchors, asset IDs, depth order, `enter/action/settle/exit` plan, camera, transition, and caption intent
- `brand`: optional handle, user-supplied raster logo path, visibility, placement, logo width, and opacity
- `providers`: image, voice, timing, and renderer choices

If a critical variable is absent, choose a documented default only when it does not change the editorial meaning. Otherwise mark the brief incomplete. Never borrow a topic, character, palette, or motion answer from a previous example silently.

## Story-beat prompt shape

Before compiling image prompts, each beat should answer:

```text
Narration purpose: <why this beat exists>
Story change: <what becomes different by the end>
Narrative subject: <who or what carries the change>
Visual verb: <one observable action>
Movable evidence: <props or state layers needed for the action>
Depth/occlusion: <what passes behind or in front of what>
Source IDs: <claims supporting the beat>
Spoiler/rights risk: <restrictions to preserve>
```

If the beat has no visible change, revise the beat or intentionally classify it as a short bridge. Do not turn a weak beat into a full scene by adding arbitrary decoration.

## Compiled image prompt shape

Use only relevant fields:

```text
Use case: <taxonomy>
Asset type: <character-free background plate | isolated subject | isolated prop | foreground occluder>
Purpose: <how this one asset functions in the beat>
Primary request: <one environment or one complete isolated asset>
Character anchor: <only when this is a recurring character>
Scene/backdrop: <character-free environment or removable flat key>
Style/medium: <project visual system>
Composition/framing: <aspect ratio, viewpoint, padding, negative space, intended placement>
Lighting/mood: <project variable>
Color palette: <project variable>
Materials/textures: <project variable>
Constraints: <stable layer contract plus asset-specific invariants>
Avoid: <project and asset exclusions>
```

Do not include API-only parameters such as model, quality, or output path inside a built-in image prompt. Keep them in provider configuration.

## Character-anchor prompt shape

Create and approve a character anchor before requesting multiple poses:

```text
Narrative identity: <original role description, not an actor or adaptation likeness>
Stable silhouette: <proportions, hair, clothing shapes>
Stable palette: <recurring color blocks>
Stable material: <outline, paper edge, texture, lighting>
Permitted variants: <pose, expression, age or state changes>
Continuity test: <features that must remain recognizable>
```

Repeat the stable parts verbatim across that character's asset prompts. A later pose may change gesture, camera angle, or story state, but must not silently redesign the person.

## Missing, conflicting, or uncertain inputs

- Missing visual style: propose one style system and record it before generation.
- Missing story action: revise the beat before making assets; do not use a generic pan as the answer.
- Conflicting palette and chroma key: choose another key color rather than deleting a required subject color.
- Reference image without permission to copy: extract high-level qualities only.
- Uncertain scientific, bibliographic, historical, or plot detail: verify it, qualify it, or remove it from narration and visuals.
- Image tool unavailable: stop with an actionable provider or compliant-asset requirement.
- Chroma failure: retry one targeted constraint, then use a different key or segmentation path; do not stack unlimited negative phrases.
- Character drift: compare against the approved anchor and regenerate the mismatched pose; do not describe different designs as intentional continuity.

## Creative acceptance tests

Score outputs rather than expecting exact pixels:

- asset purpose is obvious at thumbnail size
- background contains no featured subject or movable core prop
- isolated asset contains no environment, floor, cast shadow, crop, generated text, or unrelated object
- every primary story subject is independently addressable
- recurring characters match their approved anchors
- style, outline, texture, palette, and light direction match the project visual system
- the planned placement and occlusion are feasible with the supplied silhouette
- alpha edges have no visible key fringe
- prompt rules work for at least two unrelated topics by changing only the brief

A full composite scene fails the production contract even when it is attractive. It may be retained as a non-production style reference, but it cannot replace separated assets.

## Regression set

Maintain at least:

| Case | Expected behavior |
|---|---|
| Normal opaque subject | Flat-key source converts to clean alpha |
| Subject contains the default key color | Compiler selects a non-conflicting key |
| No image provider | Preflight stops with a provider message |
| Existing user assets | Workflow skips generation and validates separation and alpha |
| Reference method | Structure is extracted without copying frames or protected character designs |
| Evidence-sensitive explainer | Narration separates established facts, uncertainty, and custom |
| Book content | Research, spoiler policy, character continuity, audio-driven duration, separated characters/backgrounds/props, and code-rendered metadata remain distinct |
| Composite-only artwork | Validation rejects it as the scene's production asset |
| Camera-only animation | Motion audit rejects it even when the video technically renders |

Concrete subject matter belongs in the regression fixtures, not in stable prompt rules.

See [layer-contract.md](layer-contract.md) for separation rules and [storyboard-schema.md](storyboard-schema.md) for the motion data emitted by the compiler.
