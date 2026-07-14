# Prompt standard

This is a mixed `Agent system + creative generation` prompt system. Keep stable workflow rules separate from per-project creative inputs.

## Stable system rules

Apply these to every project:

1. Generate environment plates and featured subjects as separate assets.
2. Generate only one distinct final asset per image call.
3. Keep captions, labels, arrows, numbers, and brand text out of raster assets.
4. For an environment plate, exclude every featured subject listed by the brief.
5. For an isolated subject, show the complete silhouette with padding and a removable flat background.
6. Preserve one visual-system description across all assets in a project.
7. Reject outputs that violate the asset contract; do not repair a wrong composition with extra prompt prohibitions indefinitely.
8. Put deterministic filenames, ordering, IDs, key removal, alpha checks, and manifest validation in scripts rather than model instructions.

## Project variables

Collect these in `creative-brief.json`:

- `project`: topic, audience, objective, duration, aspect ratio, language
- `visualSystem`: medium, line treatment, palette, texture, depth, lighting, reference qualities, exclusions
- `brand`: handle, visibility, placement
- `assets`: ID, type, narrative purpose, subject/environment, composition, role, key color, exclusions
- `shots`: beat purpose, duration, asset IDs, hierarchy, transition, caption
- `providers`: image and voice choices
- `evidence`: claims, sources, uncertainty, disclaimer

If a critical variable is absent, either choose a clearly documented default or mark the brief incomplete. Never borrow a value from a previous example silently.

## Compiled image prompt shape

Use only relevant fields:

```text
Use case: <taxonomy>
Asset type: <background plate | isolated layer | foreground layer>
Purpose: <how the asset functions in the shot>
Primary request: <environment or one complete subject>
Scene/backdrop: <environment or flat chroma key>
Style/medium: <project visual system>
Composition/framing: <aspect ratio, viewpoint, padding, negative space>
Lighting/mood: <project variable>
Color palette: <project variable>
Materials/textures: <project variable>
Constraints: <stable contract plus asset-specific invariants>
Avoid: <project and asset exclusions>
```

Do not include API-only parameters such as model, quality, or output path inside a built-in image prompt. Keep those in provider configuration.

## Missing, conflicting, or uncertain inputs

- Missing visual style: propose one style system and record it in the brief before generation.
- Conflicting palette and chroma key: choose a different key color; do not delete a required subject color.
- Reference image without permission to copy: extract high-level qualities only.
- Uncertain scientific detail: verify it or remove it from narration and visuals.
- Image tool unavailable: stop with an actionable provider requirement.
- Chroma failure: retry one targeted constraint, then use a different key/segmentation path; do not stack unlimited negative phrases.

## Creative acceptance tests

Score outputs rather than expecting exact pixels:

- asset purpose is obvious at thumbnail size
- background contains no featured subject
- isolated subject contains no scene, floor, cast shadow, crop, or generated text
- style, outline, texture, and palette match the project visual system
- composition leaves the planned negative space
- alpha edges have no visible key fringe
- at least two different topics can use the same prompt rules by changing only the brief

## Regression set

Maintain at least:

| Case | Expected behavior |
|---|---|
| Normal opaque subject | Flat-key source converts to clean alpha |
| Green subject | Compiler selects a non-green key |
| No image provider | Preflight stops with a provider message |
| Existing user assets | Workflow skips generation and validates files |
| Reference method | Structure is extracted without copying frames |
| Medical folklore | Narration separates custom from evidence |

Concrete topics belong in the regression set, not in stable prompt rules.
