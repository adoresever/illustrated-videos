# Layer contract

## Scene minimum

Each hero scene must contain:

- exactly one background plate without the featured subject
- at least one independent `primary` alpha PNG
- enough `secondary`, `tertiary`, and `foreground` layers to reach five independently addressable visual layers by default
- code-native titles, labels, lines, arrows, and captions

Count code-native torn paper, labels, masks, and decorations only when they materially create depth or rhythm; do not inflate the count with invisible or redundant nodes. Do not rasterize captions into the generated plate. Do not use a full composite illustration as the only moving visual.

## Asset roles

| Role | Purpose | Typical motion | Typical order |
|---|---|---|---|
| background | Environment and paper texture | 1–4% push, slow drift | 0 |
| tertiary | Distant context | 20–40 px, late | 1–2 |
| secondary | Supporting subject | 40–70 px, delayed | 3–4 |
| primary | Main narrative subject | 60–110 px, early, stronger spring | 5–6 |
| foreground | Occluding decoration or close subject | 70–130 px parallax | 7–8 |
| typography | Titles, labels, captions | short fades or slides | 20+ |

## Alpha acceptance

An independent subject must:

- be PNG or WebP with alpha
- have transparent corners
- contain both transparent and opaque pixels
- avoid visible chroma fringe at normal playback size
- keep the complete subject inside the canvas
- exclude cast shadows and floor planes unless supplied as a separate layer

Reject alpha coverage below 2% or above 95% by default. Adjust only for deliberately tiny or full-frame foreground assets.

## Composition acceptance

- Make the primary subject largest and most legible.
- Let the primary occupy roughly 35–55% of frame height in a typical hero shot.
- Use at least two distinct composition signatures across the video.
- Prefer asymmetry, overlap, and foreground framing over permanently centered specimen layouts.
- Keep faces, hands, roots, leaves, labels, and other semantic details unobstructed.
- Anchor feet or roots to a plausible baseline.
- Use occlusion to create depth, not to hide evidence.
- Keep captions inside the safe area and separate from important visual details.
- Avoid stacking title, note, labels, and an opaque caption card in every scene.
