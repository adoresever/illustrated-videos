# Workflow map

```mermaid
flowchart TD
    A[Topic, article, book, or reference video] --> MODE{Content mode}
    MODE -->|explainer| C[Verify factual claims]
    MODE -->|book-review| BR[Book research packet: facts, angle, spoilers, rights]
    BR --> C
    C --> D[Write complete narration]
    D --> V[Generate or supply final voice]
    V --> T[Measure duration and align approved captions]
    T --> CB[Creative brief and audio-derived scene beats]
    CB --> PC[Compile asset prompts]
    PC --> E[Preflight providers and runtime]

    E --> F{Image source available?}
    F -->|Codex native imagegen| G[Generate or import assets]
    F -->|Configured API or MCP| G
    F -->|Authorized compliant files| G
    F -->|No| X[Stop and request an image model, MCP, or compliant assets]

    G --> STRAT{Asset strategy}
    STRAT -->|layered| H1[Background plates: environment only]
    STRAT -->|layered| H2[Subjects: one asset each on flat chroma]
    H2 --> I[Remove chroma locally]
    I --> J{Alpha validation passes?}
    J -->|No| G
    J -->|Yes| K[Asset manifest]
    H1 --> K
    STRAT -->|scene-illustrations| SI[Complete text-free illustration per semantic section]
    SI --> K

    CB --> N[public/project.json]
    K --> O[Remotion composition]
    V --> O
    N --> O
    O --> P[Contract-appropriate motion + code text + captions]
    P --> A1[Deterministic project audit]
    A1 -->|Fail quality floor| N
    A1 -->|Pass| Q[Render H.264 + AAC MP4]
    Q --> R[ffprobe, full decode, contact sheet, visual review]
    R -->|Fail| N
    R -->|Pass| S[Deliver MP4, poster, sources, manifests, prompts]
```

## Responsibility split

| Stage | Capability | Required? |
|---|---|---|
| Script, evidence, and creative brief | General reasoning plus source research; book research packet for `book-review` | Yes |
| Visual assets | Raster image-generation model, MCP, or authorized strategy-compliant files | Yes |
| Chroma removal | Python plus Pillow | Only for chroma-based `layered` assets |
| Voice | Edge TTS, OpenAI Speech API, or authorized audio file | Yes for `book-review`; otherwise unless intentionally silent |
| Animation and compositing | Remotion | Yes in this Skill |
| Encoding and QA | FFmpeg and ffprobe | Yes |

The Skill orchestrates these capabilities. It is not itself a book database, image model, speech model, or renderer. Topic or book, palette, style preset, visual medium, subjects or scene illustrations, and shot layout live in the creative brief rather than stable prompt rules. The verified visual preset is `paper-cut`; other illustrated styles require their own tested asset and renderer contracts. WeRead, VoxCPM, faster-whisper, and HyperFrames are optional adapters, not required stages.
