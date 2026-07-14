# Book research schema

Create a project-specific research packet before writing a `book-review` narration. This packet is editorial evidence, not a replacement for `creative-brief.json` or `public/project.json`.

## Minimal JSON shape

```json
{
  "schemaVersion": 1,
  "contentMode": "book-review",
  "book": {
    "title": "<confirmed-title>",
    "originalTitle": "<optional-original-title>",
    "author": "<confirmed-author>",
    "language": "<optional-original-language>",
    "firstPublicationYear": null,
    "edition": "<optional-edition-used>",
    "translator": "<optional-translator-for-this-edition>"
  },
  "editorial": {
    "audience": "<intended-viewer>",
    "angle": "<one-question-or-argument>",
    "promise": "<what-the-viewer-will-understand>",
    "spoilerLevel": "low",
    "tone": "<spoken-and-visual-tone>"
  },
  "facts": [
    {
      "id": "fact-01",
      "claim": "<one-verifiable-claim>",
      "sourceIds": ["source-01"],
      "status": "verified",
      "notes": "<edition-or-uncertainty-note>"
    }
  ],
  "interpretations": [
    {
      "id": "interpretation-01",
      "statement": "<original-or-attributed-reading>",
      "basisFactIds": ["fact-01"],
      "attribution": "creator",
      "confidence": "medium"
    }
  ],
  "guardrails": {
    "quotePolicy": "original-commentary-only",
    "visualPolicy": {
      "noCoverReplication": true,
      "noAdaptationFramesOrLikenesses": true,
      "noGeneratedTypography": true,
      "noEditionStyleImitation": true
    },
    "plotDetailsToAvoid": [],
    "commonOversimplifications": [],
    "visualExclusions": [
      "book-cover replicas",
      "film stills or actor likenesses",
      "generated typography",
      "recognizable illustrated-edition compositions"
    ]
  },
  "sources": [
    {
      "id": "source-01",
      "title": "<source-title>",
      "publisher": "<publisher-or-institution>",
      "url": "https://example.invalid/source",
      "accessed": "YYYY-MM-DD",
      "sourceType": "publisher",
      "authoritativeFor": ["bibliographic facts"]
    }
  ]
}
```

Replace every placeholder and remove unused optional fields. Do not leave `example.invalid` or empty claims in a production packet.

## Field rules

### `book`

- Confirm the author and title from an authoritative source.
- Record the original title and language when they matter to the narration.
- Treat translation and edition as separate metadata. A translator belongs to a specific edition, not automatically to the work in general.
- Use `null` rather than guessing a date.

### `editorial`

- Keep `angle` to one defensible question or argument.
- Set `spoilerLevel` to `none`, `low`, or `full`; default to `low` only when the user has not chosen.
- Let `promise` define what the narration must finish. Do not use a target duration as a substitute for editorial scope.

### `facts`

- Store one checkable claim per item.
- Use `status: "verified"`, `"uncertain"`, or `"excluded"`.
- Attach at least one source to every included fact.
- Identify edition-dependent, translation-dependent, and adaptation-only details in `notes`.

### `interpretations`

- Distinguish the creator's reading from an attributed critic's reading.
- Link the interpretation to its factual basis without presenting interpretation as plot fact.
- Use reader comments or review aggregates to understand reception, not as authoritative evidence for the book's contents.

### `guardrails`

- Default `quotePolicy` to `original-commentary-only`.
- Keep all four `visualPolicy` flags `true`. They form the machine-readable minimum rights boundary; use `visualExclusions` for additional project-specific restrictions in any language.
- Use a direct quotation only when the user requests it, the text and edition are verified, the excerpt is legally permitted, and exact wording is necessary. Keep it short and attribute it in code-rendered text.
- List plot details that would violate the chosen spoiler level.
- List tempting but misleading summaries under `commonOversimplifications`.
- Keep visual exclusions project-specific as well as rights-aware.

### `sources`

Prefer sources in this order when available:

1. author, official estate, or archival interview
2. publisher or the exact edition's catalog page
3. national library, university, prize body, or museum archive
4. reputable scholarly or critical source
5. public reviews and reader responses for reception only

Record direct page URLs rather than search-result URLs. `authoritativeFor` must say what the source actually supports; a prize page may confirm an author's award but not a novel's plot details.

## Editorial validation

Reject or revise the packet when:

- title, author, or edition claims have no source
- an adaptation detail is presented as a book detail
- the narration angle depends on a spoiler excluded by policy
- a reader opinion is phrased as consensus or fact
- a direct quote lacks verified wording, edition context, or a rights rationale
- visual direction depends on copying a cover, film frame, actor, or named illustrator
- facts and interpretation are mixed in the same field

After approval, transfer only the necessary facts, angle, spoiler level, sources, and visual exclusions into the creative brief. Keep the full packet as a deliverable for traceability.
