# Book research schema

Use this schema for `contentMode: "book"` before writing narration or generating assets for an 插画讲书 / illustrated book video. The research packet is the evidence and story contract; it does not replace `creative-brief.json` or `public/project.json`.

`book-review` is a legacy input alias only. Normalize it to `book` when loading old data, and emit `book` in every new or updated artifact.

## Contents

- [Contract overview](#contract-overview)
- [Research execution](#research-execution)
- [Sources](#sources)
- [Claims](#claims)
- [Contradictions](#contradictions)
- [Character bible](#character-bible)
- [Story spine and beats](#story-spine-and-beats)
- [Layer contract](#layer-contract)
- [Rights and editorial rules](#rights-and-editorial-rules)
- [Legacy migration](#legacy-migration)
- [Validation](#validation)

## Contract overview

Start from [the reusable template](../assets/book-research-template.json). Replace every placeholder and remove unused optional fields. Do not hardcode a previous book, location, plot, palette, character, or source into the reusable schema.

The packet has five evidence-bearing result sets:

1. `sources`: the pages, editions, archives, and studies actually inspected
2. `claims`: one checkable statement per record
3. `contradictions`: conflicts and their explicit resolution or exclusion
4. `characterBible.characters`: sourced narrative and visual continuity for each character and time variant
5. `storySpine.beats`: narrative changes grounded in claims and sources

`book`, `editorial`, `researchExecution`, `layerContract`, and `guardrails` control those result sets. Empty arrays are acceptable only while research is in progress. They are not acceptable in an approved production packet.

## Research execution

Research the same independent tracks whether work is parallel or sequential:

| Track | Mission | Typical source classes |
|---|---|---|
| `canon` | Verify work, edition, plot, characters, relationships, props, and explicit appearance | authorized text excerpt, exact-edition page, author or estate archive |
| `context` | Verify period, place, material culture, transport, architecture, and social context | national library, museum, university, government or archival collection |
| `critical` | Find attributable interpretations, common oversimplifications, and conflicting accounts | scholarly source, prize body, institutional reading guide, reputable criticism |

When sub-agents are available, assign one bounded track to each and run them in parallel. Require every agent to return source and claim records, not prose alone. When sub-agents are unavailable, run the same tracks sequentially; do not collapse them into an unsourced summary.

After collection, one verifier must:

1. reopen every source used by an included claim
2. replace search-result URLs with direct canonical page URLs
3. merge duplicate sources without merging different editions
4. split compound statements into one claim each
5. create contradiction records before choosing between competing statements
6. mark unsupported appearance or plot details `excluded`
7. approve only claims allowed by the spoiler policy

Search snippets are discovery aids, not final evidence. A sub-agent summary is not a source.

## Sources

Each `sources` entry uses this shape:

```json
{
  "id": "source-01",
  "title": "<source-title>",
  "creator": "<author-editor-or-remove>",
  "publisherOrInstitution": "<publisher-library-museum-or-university>",
  "url": "<direct-page-url>",
  "accessedAt": "YYYY-MM-DD",
  "sourceClass": "primary-text",
  "editionScope": "<edition-work-or-context-scope>",
  "authoritativeFor": ["explicit character description"],
  "rightsUse": "fact-check-only",
  "notes": "<uncertainty-access-or-license-note>"
}
```

Allowed `sourceClass` values should be explicit, for example:

- `primary-text`
- `author-or-estate`
- `publisher`
- `library-or-archive`
- `museum-or-government`
- `scholarly`
- `institutional-guide`
- `criticism`
- `reception-only`

Prefer sources in this order when they are authoritative for the claim being made:

1. the work or authorized excerpt and the exact edition used
2. the author, estate, or archival interview
3. publisher and library catalog records
4. national library, museum, university, government, or prize body
5. reputable scholarship and criticism
6. reviews and reader responses for reception only

Authority is claim-specific. A prize page may verify an award but not a character's clothes. A historical photograph may support period context but not prove that a fictional character wore the pictured outfit.

Use `rightsUse` to distinguish `fact-check-only`, `visual-reference-only`, `licensed-asset`, and `public-domain-asset`. Do not package or reproduce a visual source unless its asset rights are separately confirmed.

## Claims

Store one checkable statement per claim:

```json
{
  "id": "claim-01",
  "statement": "<one-checkable-statement>",
  "claimType": "character",
  "attribution": "fact",
  "sourceIds": ["source-01"],
  "evidence": [
    {
      "sourceId": "source-01",
      "locator": "<chapter-page-heading-or-passage-location>",
      "supportType": "direct"
    }
  ],
  "status": "verified",
  "confidence": "high",
  "spoilerLevel": "low",
  "depictionStatus": "canon-explicit",
  "notes": "<edition-inference-or-limitation-note>"
}
```

Recommended `claimType` values include `bibliographic`, `plot`, `character`, `relationship`, `appearance`, `prop`, `setting`, `context`, `theme`, `interpretation`, `reception`, and `rights`.

Use these rules:

- `status`: `proposed`, `verified`, `conflicted`, or `excluded`
- `attribution`: `fact`, `creator-interpretation`, or the named critic/institution
- `confidence`: `high`, `medium`, or `low`
- `spoilerLevel`: `none`, `low`, or `full`
- `depictionStatus`: `canon-explicit`, `authoritative-context`, `creative-direction`, or `unverified`

A precise textual fact may be verified by one inspected primary source. Context, interpretation, and disputed plot claims should use independent corroboration when available. If material evidence is thin, narrow the wording and lower confidence instead of inventing certainty.

Keep creator commentary as `claimType: "interpretation"` with `attribution: "creator-interpretation"`. Link it to factual basis claims in `notes` or a project-specific `basisClaimIds` array. Do not disguise an interpretation as plot fact.

## Contradictions

Create a contradiction whenever sources or claims cannot both be true at the chosen level of precision:

```json
{
  "id": "contradiction-01",
  "topic": "<conflicted-topic>",
  "claimIds": ["claim-01", "claim-02"],
  "sourceIds": ["source-01", "source-02"],
  "positions": [
    {
      "claimId": "claim-01",
      "summary": "<first-position>"
    },
    {
      "claimId": "claim-02",
      "summary": "<second-position>"
    }
  ],
  "resolution": "narrow-wording",
  "resolvedStatement": "<safe-statement-or-null>",
  "status": "resolved",
  "storyImpact": "<what-must-change-or-be-omitted>"
}
```

Allowed resolutions include `prefer-primary`, `prefer-domain-authority`, `edition-specific`, `narrow-wording`, and `exclude`. If no defensible resolution exists, set `status: "unresolved"`, mark the involved claims `conflicted`, and prohibit their use by characters or story beats.

Do not resolve a conflict by counting search results. Compare source scope, edition, proximity to the original text, and authority for that exact claim.

## Character bible

The character bible prevents a main character from becoming an inconsistent decorative figure. It also separates canon from visual invention.

Each character should use this shape:

```json
{
  "id": "character-01",
  "canonicalName": "<confirmed-name>",
  "aliases": [],
  "narrativeRole": "<role-in-this-story-spine>",
  "goal": "<what-the-character-wants>",
  "tension": "<what-complicates-that-goal>",
  "agency": "<decisions-the-character-makes>",
  "relationships": [
    {
      "characterId": "character-02",
      "relationship": "<relationship>",
      "claimIds": ["claim-02"]
    }
  ],
  "timelineVariants": [
    {
      "id": "character-01-young",
      "label": "<time-or-age-band>",
      "claimIds": ["claim-03"],
      "spoilerLevel": "low"
    }
  ],
  "visualIdentity": {
    "canonExplicit": [
      {
        "trait": "<explicit-trait>",
        "claimIds": ["claim-04"]
      }
    ],
    "contextSupported": [],
    "creativeDirection": [],
    "exclusions": []
  },
  "props": [
    {
      "id": "prop-01",
      "label": "<prop-name>",
      "separateLayer": true,
      "visualAction": "<what-the-prop-can-do>",
      "claimIds": ["claim-05"],
      "sourceIds": ["source-01"]
    }
  ],
  "layerPlan": {
    "assetKind": "alpha-subject",
    "background": "transparent",
    "separableParts": []
  },
  "claimIds": ["claim-02", "claim-03", "claim-04"],
  "sourceIds": ["source-01"],
  "spoilerLevel": "low"
}
```

Create separate timeline variants when age, status, clothing, or silhouette materially changes. Keep stable identity anchors across variants, but do not invent exact facial traits merely to force continuity. Treat an adaptation actor, book cover, and illustrated edition as excluded references unless the user holds the necessary rights and explicitly requests their use.

An important prop must be its own layer when it moves, changes hands, reveals information, crosses another layer, or drives the beat. Static clothing and inseparable accessories may remain part of the character cutout.

## Story spine and beats

`storySpine` turns verified research into a small story organized by one central question. It is not a chapter-by-chapter summary.

Required spine fields:

- `centralQuestion`: the tension that gives the video a reason to continue
- `narrativePromise`: what the viewer will understand by the end
- `endingCondition`: what must be resolved or deliberately left open
- `narrationTiming`: ask once when duration is missing; record a user value or the 60–120 second fallback as a planning budget, and keep final audio as exact runtime authority
- `beats`: the ordered narrative changes

Each beat should use this shape:

```json
{
  "id": "beat-01",
  "order": 1,
  "narrativePurpose": "<why-this-beat-exists>",
  "narrativeChange": {
    "before": "<state-before>",
    "turn": "<event-decision-discovery-or-reframing>",
    "after": "<state-after>"
  },
  "narrationIntent": "<what-the-narration-must-convey-not-final-copy>",
  "characters": [
    {
      "characterId": "character-01",
      "variantId": "character-01-young",
      "dramaticFunction": "primary"
    }
  ],
  "visualAction": {
    "subjectLayerId": "character-01-young",
    "action": "<visible-action-or-state-change>",
    "targetLayerId": "prop-01",
    "result": "<visible-result>"
  },
  "layerPlan": {
    "background": {
      "assetId": "background-01",
      "featuredSubjects": []
    },
    "subjects": ["character-01-young"],
    "props": ["prop-01"],
    "foreground": []
  },
  "claimIds": ["claim-02", "claim-05"],
  "sourceIds": ["source-01"],
  "spoilerLevel": "low",
  "spoilerNotes": "<why-this-stays-within-policy>",
  "transitionOut": "<transition-motivated-by-the-change>"
}
```

Every beat must:

- change knowledge, intention, relationship, time, place, risk, or emotional state
- name the participating character and timeline variant
- contain a visible action or transformation, not merely “show the character”
- cite at least one approved claim and its inspected source
- stay within the packet's spoiler policy
- define a subject-free background and independent subject/prop layers

Do not assign equal durations during research. Write and approve the complete narration after the spine is sound, generate the final narration audio, then derive beat boundaries from the waveform and approved text.

## Layer contract

For each hero beat:

1. generate an environment plate with no featured characters, hero objects, labels, captions, or generated book text
2. generate each featured character as an independent transparent or removable-chroma subject
3. generate a prop separately when it must move, transfer, reveal, or occlude
4. add independent foreground or atmosphere layers when they create real depth
5. connect `visualAction` to those addressable layers in project data

Reject a beat that depends on one composite illustration with only a pan or zoom. Camera motion may support the action, but it cannot substitute for independent character or prop motion.

## Rights and editorial rules

- Default to original commentary; do not build narration from copied passages.
- Use a direct quotation only when requested, verified against the relevant edition, legally permitted, brief, and necessary.
- Keep titles, author names, quotations, captions, and labels out of generated raster images; render approved text in code.
- Do not reproduce a book cover, film frame, actor likeness, or identifiable illustrated-edition composition without explicit rights.
- Use reception sources only for attributed reception claims.
- Record common oversimplifications in `guardrails.commonOversimplifications` and test the spine against them.
- Treat historical or archival images as reference-only unless asset reuse rights are confirmed separately.

## Legacy migration

When importing an older packet:

1. accept `contentMode: "book-review"` only as a compatibility alias
2. immediately normalize it to `contentMode: "book"`
3. convert old `facts` entries into atomic `claims` with `attribution: "fact"`
4. convert old `interpretations` into attributed `claims` with `claimType: "interpretation"`
5. build explicit `sources`, `contradictions`, `characterBible`, and `storySpine.beats`
6. do not emit `book-review` in the migrated result

An empty contradiction list after migration means “audited and no conflicts found,” not “conflicts were never checked.” Record that audit in project notes when necessary.

## Validation

Reject or revise the packet when any of the following is true:

- `contentMode` is not `book` after normalization
- a used source lacks a direct URL, retrieval date, scope, or authority statement
- a verified claim has no inspected evidence locator
- a compound claim cannot be checked as one statement
- an unresolved contradiction is cited by a character or beat
- a character's canon appearance has no supporting claim
- a creative visual trait is labeled as canon
- a timeline change reuses one undifferentiated character asset
- a beat lacks `narrativeChange`, characters, `visualAction`, claim IDs, source IDs, or spoiler metadata
- a background plate includes a featured character or hero prop
- a moving or occluding prop is baked into a composite scene
- the story spine becomes a static list of themes or a full plot summary
- timing is forced to a preset duration before the narration is complete
- a source image, adaptation, cover, quotation, or voice is used beyond its documented rights

After approval, transfer the necessary claims, characters, layers, beats, source IDs, spoiler rules, and exclusions into the creative brief. Preserve the full research packet as a deliverable for traceability.
