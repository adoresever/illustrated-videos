# 插画讲书 / Illustrated book video workflow

Use this workflow when `contentMode` is `book`. Use `assetStrategy: "layered"` so featured characters, actionable props, foreground elements, and character-free backgrounds remain independently addressable.

`book-review` is a legacy input and CLI alias only. Normalize it to `book` immediately. Do not emit the legacy term in new research packets, briefs, manifests, or project data. The human-facing name is 插画讲书 / illustrated book video.

## Contents

- [Core contract](#core-contract)
- [Capability map](#capability-map)
- [1. Define the editorial promise](#1-define-the-editorial-promise)
- [2. Run evidence research](#2-run-evidence-research)
- [3. Merge and verify research](#3-merge-and-verify-research)
- [4. Build the story spine](#4-build-the-story-spine)
- [5. Build the character bible](#5-build-the-character-bible)
- [6. Write the complete narration](#6-write-the-complete-narration)
- [7. Generate final voice and timing](#7-generate-final-voice-and-timing)
- [8. Plan layered visual action](#8-plan-layered-visual-action)
- [9. Generate and validate assets](#9-generate-and-validate-assets)
- [10. Compose motion and sound](#10-compose-motion-and-sound)
- [11. Validate and deliver](#11-validate-and-deliver)
- [Legacy migration](#legacy-migration)

## Core contract

- Research before narration; narration before asset prompts; final audio before frame timing.
- Ask once for an approximate duration when the user omitted it. Use the user value when supplied; otherwise plan within 60–120 seconds. Treat the result as a writing budget, never a forced cutoff.
- Ground every story beat in inspected sources and atomic claims.
- Record contradictions instead of silently choosing the most convenient version.
- Give each beat a narrative change and a visible action.
- Generate featured characters independently from their backgrounds.
- Generate a prop separately when it moves, changes hands, reveals information, or creates occlusion.
- Keep generated raster assets text-free. Render title, author, captions, and approved quotations in code.
- Use original commentary. Treat exact text, covers, adaptations, illustrated editions, music, and voices as separate rights questions.

A valid result is not a slideshow with narration. Camera movement may support a beat, but each hero beat must animate at least one genuinely independent character, prop, or foreground layer whose action expresses the narrative change.

## Capability map

| Stage | Default capability | Required outcome |
|---|---|---|
| Research | web, publisher/library/archive pages, general reasoning | inspected direct sources, atomic claims, contradictions, character evidence |
| Story | structured synthesis from the approved research packet | central question and ordered beats with narrative change |
| Images | Codex-native image generation or a configured raster provider | subject-free backgrounds and independent alpha-capable subjects/props |
| Voice | configured speech provider or authorized audio | one intelligible final narration track with provenance |
| Alignment | final audio plus approved narration | timings from audio while preserving approved words |
| Composition | bundled Remotion project | independent layer motion, typography, captions, audio, and export |
| QA | project validators, FFmpeg/ffprobe, visual review | traceable research, full decode, audible speech, dynamic layered picture |

Optional providers do not weaken the contract. If a provider cannot create separable visual assets, choose another provider or stop; do not replace the layer contract with a composite illustration.

## 1. Define the editorial promise

Record:

- confirmed title, author, original title when relevant, and exact edition or translation when it affects claims
- intended audience
- one defensible angle and central question
- what the viewer should understand at the end
- spoiler policy: `none`, `low`, or `full`
- spoken and visual tone
- aspect ratio and publishing constraints
- quote, adaptation, likeness, cover, and illustrated-edition exclusions

Default to `low` spoilers when the user does not choose. Define what that means for this book under `editorial.spoilerPolicy.allowedRange` and `blockedDetails`.

Resolve the duration preference before research. If it was omitted, ask once; if no answer is available, store the 60–120 second fallback. Scope the question tightly enough to remain coherent inside that budget. After approval, final narration audio still determines the exact runtime.

## 2. Run evidence research

Create `book-research.json` from [book-research-schema.md](book-research-schema.md). Research three independent tracks:

1. `canon`: edition, plot premise, character decisions, relationships, explicit appearance, and canonical props
2. `context`: era, place, material culture, architecture, transport, and other visual context
3. `critical`: attributable interpretations, reception boundaries, common oversimplifications, and conflicting accounts

When sub-agents are available, run the tracks in parallel. Give each agent the title, edition if known, spoiler limit, source-quality rules, and a strict output request for proposed `sources`, `claims`, and `contradictions`. Do not ask for a free-form book summary.

When sub-agents are unavailable, perform the same tracks sequentially. Preserve their separate missions and output shapes so the result is equivalent; parallelism is an optimization, not a dependency.

Source rules:

- prefer the authorized text or excerpt for exact plot, dialogue, appearance, and props
- prefer the exact-edition publisher or library page for edition metadata
- prefer archives, museums, universities, and public institutions for historical visual context
- use scholarship and institutional reading guides for attributed interpretation
- use reviews and reader comments only for explicitly attributed reception
- use search results to discover pages, then cite and inspect the direct pages
- do not treat adaptation imagery or an actor as evidence of a book character's appearance

Keep quotations out of the working narration by default. An internal evidence locator may identify a passage without copying it at length.

## 3. Merge and verify research

One verifier owns the merged packet even when multiple agents researched it. The verifier must reopen every source ultimately cited by a character or beat.

Merge in this order:

1. canonicalize direct URLs and preserve distinct editions
2. deduplicate exact sources
3. split compound statements into one checkable claim each
4. connect each claim to evidence locators and spoiler metadata
5. compare claims on the same topic
6. create and resolve contradiction records
7. exclude unsupported or adaptation-only details
8. approve only claims allowed by the chosen spoiler policy

Resolve contradictions according to source scope and authority for the exact claim. Prefer primary text for explicit fictional details, edition-specific sources for translation or pagination, and domain archives for historical context. When a conflict remains, narrow the wording or exclude it. Never let an unresolved contradiction feed the story spine or character bible.

The approved packet must contain usable `sources`, `claims`, an audited `contradictions` list, `characterBible`, and `storySpine`. “No contradictions” is a verification result, not an assumption.

## 4. Build the story spine

Build a small story around `storySpine.centralQuestion`; do not summarize every chapter.

Use enough beats to fulfill the narrative promise. Every beat must contain:

- `narrativePurpose`
- `narrativeChange.before`, `turn`, and `after`
- participating character and timeline variant
- `visualAction` with a visible result
- background, subject, prop, and foreground layer declarations
- approved `claimIds` and `sourceIds`
- `spoilerLevel` and a policy note
- a transition motivated by the change

A beat advances when something is learned, chosen, lost, attempted, reframed, remembered, contrasted, or transformed. A theme label, character portrait, quotation card, or repeated establishing shot is not a narrative change.

Use interpretive claims openly. A creator's reading may organize the story, but its factual basis must remain traceable and its wording must not imply that the author explicitly stated it.

Reject the spine when:

- the same state persists across adjacent beats
- a beat exists only to display text or fill time
- a character is treated as a prize or prop despite evidence of agency
- a convenient simplification contradicts the research packet
- the conclusion depends on a blocked spoiler
- the planned visual action cannot be performed by independent layers

## 5. Build the character bible

Create one character record for every recurring or narratively important person before generating prompts.

Record:

- canonical name and aliases
- role in this story, goal, tension, agency, and sourced relationships
- separate timeline variants when age, status, costume, or silhouette materially changes
- explicit canonical traits with claim IDs
- context-supported traits labeled as context, not canon
- project-specific creative direction labeled as invention
- canonical props and whether each prop must be a separate layer
- excluded actor, cover, adaptation, and illustrated-edition references
- source, claim, and spoiler IDs

Generate each timeline variant as an independent subject asset. Preserve stable, non-celebrity identity anchors across variants while allowing verified aging and status changes. If the text does not specify a face, design an original face and label that choice `creative-direction`; do not invent canonical certainty.

Keep agency visible. Character records should identify decisions and actions, not only physical traits.

## 6. Write the complete narration

Write natural spoken language from the approved story spine. Use one clear idea per beat and original phrasing.

Requirements:

- open with the central tension, consequential image, decision, or question
- carry the viewer through the beat changes in order
- preserve distinctions between fact and interpretation
- use names and edition-dependent terms consistently
- avoid invented dialogue and quotations
- avoid padding, generic praise, and chapter-by-chapter enumeration
- resolve or deliberately open the central question only after the promise is fulfilled

Write until the selected story is complete while respecting the recorded planning budget. If the first draft materially misses the user target or fallback range, edit the narration before speech synthesis instead of truncating it or padding it. Runtime becomes exact only after final speech is decoded.

Approve the full narration as the text authority before generating final speech.

## 7. Generate final voice and timing

Generate or supply the approved narration as one continuous track when the provider permits. Record provider, model or voice, rate, pitch, instructions, and authorization. If the track must be split, inspect every join for timbre, loudness, emotion, pronunciation, and unintended silence.

Measure the final audio duration. Set composition duration from that track plus only deliberate head and tail handles.

For caption and beat alignment:

- timing authority: final audio recognition or inspected waveform
- wording authority: approved narration
- beat boundaries: semantic clauses mapped onto final audio
- scene mapping: every approved cue carries a valid `sceneId` whenever `project.scenes` already exists; all scene IDs must be covered

Do not replace names or approved wording with speech-recognition guesses. With the bundled tools:

`approved-captions.json` must preserve approved wording and map cues to scenes, for example `{"id":"cue-01","sceneId":"scene-01","text":"…"}`. `align-approved-captions.py` carries `sceneId` into the aligned result; `apply-caption-timings.mjs` rejects a non-empty scene timeline when those mappings are absent, because changing only the total duration would leave stale scene boundaries.

```bash
python <skill-root>/scripts/align-approved-captions.py \
  --audio public/assets/audio/narration-final.wav \
  --approved approved-captions.json \
  --out aligned-captions.json \
  --model small --device auto --compute-type auto --language zh

node <skill-root>/scripts/apply-caption-timings.mjs \
  --aligned aligned-captions.json \
  --project public/project.json \
  --tail-seconds 0.35
```

The apply step records the deliberate handle as `project.audio.tailSeconds`. Validation then requires `durationInFrames / fps` to equal decoded narration duration plus that tail within frame tolerance; do not hide an unexplained long hold inside the timeline.

When no recognizer exists, allocate provisional timings by spoken-length weight and verify them manually against playback.

## 8. Plan layered visual action

Turn each approved beat into independently addressable visual assets:

1. one environment plate with no featured character, hero prop, generated label, title, author, quotation, or caption
2. one alpha subject for each participating character variant
3. one independent prop for every object that moves, transfers, opens, reveals, crosses, or occludes
4. independent foreground or atmosphere layers when they create meaningful depth
5. code-native title, author, caption, diagram, and label layers

Map `visualAction` to named layer IDs. Examples of valid action classes include entering, turning, exchanging, unfolding, reaching, revealing, separating, aging through a variant transition, or being occluded by a moving foreground element. Choose the action from the actual story beat; do not hardcode a prior example into prompts.

Plan restrained background drift, subject entrance and settle, gesture or prop motion, parallax, and transition cues. Do not rely on a slow push across one complete illustration. Do not claim that a subject baked into a background moves independently.

## 9. Generate and validate assets

Use one image-generation call per distinct asset. Keep selected provider outputs under `public/assets/source/` and final alpha assets under `public/assets/layers/`.

For background prompts require:

- the verified era and place cues needed by the beat
- no featured characters or hero props
- no text, cover treatment, logo, or watermark
- composition space for separately placed subjects and code-rendered captions

For character and prop prompts require:

- only one declared subject or prop
- the exact character variant or object identity
- readable silhouette and pose suited to `visualAction`
- flat key color absent from the subject, or true transparency when supported
- no scenery, cast shadows tied to a scene, text, actor likeness, or adaptation styling

Remove chroma locally when required, validate real transparent pixels, and inspect edge spill. Complex hair, veils, smoke, glass, or translucent fabric may require true transparency or a stronger segmentation path.

Before accepting an asset, compare it with the research packet and character bible. Reject unsupported canonical details, character drift, embedded typography, recognizable cover or adaptation imagery, and backgrounds containing featured subjects.

## 10. Compose motion and sound

Store beats, layers, positions, scale, role, delay, `zIndex`, action, and timing in project data rather than React components.

Establish the static composition first. Then animate by role:

- `primary`: strongest entrance and clearest narrative action
- `secondary`: delayed supporting motion or reaction
- `tertiary`: contextual motion with lower contrast
- `foreground`: faster parallax and deliberate occlusion
- `prop`: action-specific motion synchronized to the narration turn

Use asymmetry, overlap, scale hierarchy, and foreground framing. Preserve caption and book-metadata safe areas. Render approved title, author, and captions in code without imitating a cover.

Keep narration intelligible above music and effects. Use only licensed, original, or authorized audio, record provenance, and reduce music under speech. Sound effects should reinforce actual actions and transitions rather than decorate every cut.

## 11. Validate and deliver

Run deterministic project validation, render, full decode, and contact-sheet review. Then inspect the complete result with sound and once muted.

Research checks:

- canonical `contentMode: "book"`
- direct inspected URLs with retrieval dates and authority scope
- one statement per claim
- no unresolved contradiction used by a character or beat
- sourced character identity, agency, timeline variants, and props
- every beat has narrative change, character, visual action, claims, sources, and spoiler metadata

Visual checks:

- featured characters do not appear in background plates
- character and actionable prop assets have real alpha
- recurring identities remain consistent across beats and intentional across age variants
- visual actions are visible without relying on captions
- no beat degenerates into a static composite illustration with only pan or zoom
- no cover replica, film still, actor likeness, generated text, or identifiable illustrated-edition imitation

Timing and audio checks:

- narration completes the story spine without fixed-duration compression or padding
- project duration follows final narration audio
- approved caption words remain unchanged
- every beat boundary and proper name is spot-checked
- narration remains intelligible through the full mix

Deliver:

- final and preview video when requested
- research packet with sources, claims, contradictions, character bible, and story spine
- approved narration and caption-alignment record
- creative brief, project data, asset manifest, and compiled prompts
- source backgrounds, character/prop sources, final alpha layers, audio, and provenance
- representative still, contact sheet, audit result, and rights notes

## Legacy migration

When an older project uses `contentMode: "book-review"`, accept it only at the input boundary and normalize it to `book`. Convert old facts and interpretations into claims, audit contradictions, and create the missing character bible and story spine.

An old `scene-illustrations` project does not satisfy the new layered contract. Its complete illustrations may be retained as reference-only artifacts, but rebuild production assets as character-free backgrounds plus independent character, prop, and foreground layers. Do not relabel a composite plate as layered.
