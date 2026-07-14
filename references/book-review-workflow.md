# Book-review workflow

Use this workflow when `contentMode` is `book-review` and `assetStrategy` is `scene-illustrations`. It is intended for 图书号、书评短视频、插画读书, and other illustrated book videos. It does not impose a 30-second limit.

## Core contract

- Let the selected argument determine the narration length.
- Let the final narration audio determine the exact composition duration.
- Use original commentary grounded in traceable sources.
- Record the spoiler policy before writing.
- Generate complete, text-free scene illustrations in one consistent visual system.
- Render book title, author, captions, labels, and optional quotations in code.
- Preserve the approved narration text when deriving timestamps from speech recognition.
- Treat book covers, illustrated editions, film stills, actor likenesses, quotations, music, and voice references as separate rights questions.

## Provider-neutral capability map

| Stage | Default path in this repository | Optional adapter | Required outcome |
|---|---|---|---|
| Research | Authoritative web/library/publisher sources | WeRead/微信读书 Skill or another licensed catalog | Traceable research packet; no unsupported bibliographic facts |
| Images | Codex-native image generation or configured image provider | Compatible API, MCP, or authorized local illustrations | Original text-free scene plates with a consistent visual system |
| Voice | Existing `edge-tts`, OpenAI, or authorized-file adapter | VoxCPM or another local/provider adapter | One intelligible final narration track with recorded provenance |
| Alignment | Final audio plus approved narration | faster-whisper or another timestamp-capable recognizer | Timings from audio; words from the approved script |
| Composition | Bundled Remotion template | HyperFrames only through a feature-equivalent adapter | Editable data-driven typography, motion, audio, and export |
| Audio/QA | FFmpeg and ffprobe | Equivalent media tooling | Audible voice, optional legal BGM ducking, full decode, visual review |

Optional tools are capabilities, not prerequisites. Do not block a book video because WeRead, VoxCPM, faster-whisper, or HyperFrames is absent when the default path can satisfy the contract. Do not claim an optional adapter works until it has been installed and forward-tested in the current environment.

## 1. Define the editorial promise

Record:

- book title, original title when relevant, author, and edition or translation when the distinction matters
- intended audience
- one review angle or question
- spoiler level: `none`, `low`, or `full`
- desired format and aspect ratio
- voice and visual tone
- exclusions and rights constraints

Default to `low` spoilers when the user does not choose. Do not attempt to summarize an entire book. Pick one useful, defensible angle and give it enough time to resolve.

## 2. Build the research packet

Use [book-research-schema.md](book-research-schema.md). Verify bibliographic facts with author, publisher, library, prize, university, or other authoritative sources. Use reviews and reader responses to identify interpretations or reception, not as proof of story facts.

Separate:

- verified facts
- the creator's interpretation
- other attributed interpretations
- uncertain or edition-dependent details
- common oversimplifications to avoid

Keep exact source URLs and retrieval dates. If the relevant book text is unavailable, do not invent scene details. If a plot claim cannot be verified without exceeding the chosen spoiler level, remove it or label it appropriately.

## 3. Write the complete narration

Write natural spoken language around the selected angle. Start with a question, tension, image, or specific observation; avoid generic phrases such as “这本书告诉我们” when they add no information.

Requirements:

- one clear idea per narrative section
- original phrasing rather than pasted book copy
- no invented quotations
- no forced 30-second compression
- no padding to reach a target length
- an ending that resolves or deliberately opens the chosen question

Estimate duration for planning only. Do not freeze frames or scene times until final audio exists.

## 4. Generate one final voice track

Generate or supply the complete approved narration as one track. Record provider, model or voice, rate, pitch, instructions, and authorization. Avoid stitching many separately synthesized sentences unless the provider cannot handle the full text; if splitting is unavoidable, check timbre, loudness, emotion, and silence at every join.

Measure the real audio duration. Set video duration from the audio plus only the deliberate head/tail handles needed by the composition. A 24-second, 53-second, or multi-minute result is valid when the argument is complete and the pacing holds.

## 5. Align captions and scene boundaries

Run timestamp extraction against the final voice track. A recognizer such as faster-whisper is useful but optional.

Use this rule:

- timing source: final audio recognition or measured waveform
- text source: approved narration

Do not silently replace book names, author names, translations, or other approved text with recognizer output. Map approved clauses to recognized word/segment intervals, then spot-check the beginning, every scene change, proper names, and the ending. When no recognizer is available, allocate provisional timings by spoken-length weights and verify them manually against playback.

The bundled wrapper calls the faster-whisper Python API; it does not assume a global `faster-whisper` CLI. Put approved clauses in a JSON `cues` array. Add `sceneId` when the tool should also derive scene boundaries:

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

Use `--timing-json` for an inspected offline timing source or tests. The output records its timing source and keeps each approved cue's text unchanged.

## 6. Derive the visual beats

Split at semantic and spoken boundaries, not equal time intervals. Each beat needs:

- a narrative purpose
- audio-derived start and end
- one complete visual proposition
- a planned camera move or transition
- safe areas for code-rendered text

Use at least three semantic scene illustrations, then add as many as the completed narration requires. Add a new plate when the idea, time, setting, emotional temperature, or visual metaphor materially changes. Avoid holding one plate so long that it becomes a moving poster.

## 7. Generate unified scene illustrations

Each image call creates one complete scene plate. Unlike `layered`, a plate may contain characters, objects, and environment together. Define one exact `visualSystem.seriesAnchor` and reuse it unchanged in every image prompt; keep all plates consistent in palette, medium, line treatment, period cues, character abstraction, and lighting logic.

Require:

- no generated book title, author, caption, quotation, logo, or watermark
- no copied cover composition, film frame, actor likeness, or recognizable illustrated-edition style
- planned negative space for typography
- enough crop margin for restrained pan and push motion
- visual facts that are supported by the research packet or clearly metaphorical

After inspection, set both `textFree: true` and `visuallyInspected: true` on each manifest illustration. The second flag confirms that the plate was checked against the machine-readable `visualPolicy` and project-specific `visualExclusions`; it is not inferred from the prompt.

When a recurring character appears, describe stable non-celebrity visual traits in the brief. Do not use a living actor or public figure as the shortcut for consistency.

## 8. Compose with code-native text and motion

Use Remotion by default. Store content and coordinates in project data, not React components. Add:

- title and author overlay where editorially useful
- mobile-safe captions, using `project.captionSafeBottom` when platform chrome needs a larger bottom inset
- restrained crop, pan, push, focus, masks, and transitions
- optional code-native lines, paper shapes, highlights, or particles
- voice plus licensed/original music or sound design when requested

A unified illustration is one visual unit. Do not imply that a character inside it moves independently. If independent motion is needed, create a genuinely separate asset and declare it.

HyperFrames may replace Remotion only through an adapter that preserves project data, preview, code-rendered typography, audio timing, validation, rendering, and QA. Merely installing HyperFrames does not change the book workflow.

## 9. Mix and verify audio

Keep narration intelligible over all other tracks. If BGM is present, use licensed/original audio and reduce it under speech with volume automation or sidechain ducking. Listen to the full mix; numeric loudness checks cannot detect poor delivery, pronunciation, or distracting music.

The bundled FFmpeg helper applies the documented narration chain and optionally performs sidechain ducking:

```bash
<skill-root>/scripts/mix-book-audio.sh \
  --voice public/assets/audio/narration-raw.mp3 \
  --bgm public/assets/audio/licensed-or-original-bgm.wav \
  --bgm-start 0 \
  --bgm-volume -18 \
  --out public/assets/audio/master.wav
```

Omit `--bgm` for a processed voice-only master. Always record the BGM source and license.

## 10. Validate and deliver

Before delivery:

1. Validate the research packet and project data.
2. Confirm title, author, edition-dependent details, and pronunciation.
3. Confirm spoiler level and quote policy.
4. Inspect every generated plate for text artifacts, copied cover/film imagery, character drift, and unsupported details.
5. Watch the complete preview with sound and once muted.
6. Verify caption timing at every scene boundary.
7. Run project audit, render, full decode, and contact-sheet review.

Deliver the final MP4, preview/still/contact sheet when useful, editable project, research packet, source list, approved narration, audio provenance, caption timing record, prompts, manifest, and rights notes. Keep generated sample video outside the Skill repository unless the maintainer explicitly chooses to publish it under a documented media license.
