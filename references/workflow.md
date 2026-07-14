# Workflow map

```mermaid
flowchart TD
    A[Topic, article, or reference video] --> B[Extract narrative structure]
    B --> C[Verify factual claims]
    C --> D[Write narration and scene beats]
    D --> CB[Creative brief: variables, visual system, quality target]
    CB --> PC[Compile asset prompts]
    PC --> E[Preflight providers and runtime]

    E --> F{Image source available?}
    F -->|Codex native imagegen| G[Generate or import separated assets]
    F -->|Configured API or MCP| G
    F -->|Authorized separated files| G
    F -->|No| X[Stop and request an image model, MCP, or separated assets]

    G --> H1[Background plates: environment only]
    G --> H2[Subjects: one asset each on flat chroma]
    H2 --> I[Remove chroma locally]
    I --> J{Alpha validation passes?}
    J -->|No| G
    J -->|Yes| K[Asset manifest]
    H1 --> K

    E --> L{Voice provider}
    L -->|edge-tts| M[Generate narration audio]
    L -->|OpenAI Speech API| M
    L -->|Authorized local recording| M

    CB --> N[public/project.json]
    K --> O[Remotion composition]
    M --> O
    N --> O
    O --> P[Independent layer motion + camera + captions]
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
| Script, evidence, and creative brief | General reasoning plus source research | Yes |
| Background and subjects | Raster image-generation model, MCP, or authorized separated files | Yes |
| Chroma removal | Python plus Pillow | Yes for chroma workflow |
| Voice | Edge TTS, OpenAI Speech API, or authorized audio file | Yes unless intentionally silent |
| Animation and compositing | Remotion | Yes in this Skill |
| Encoding and QA | FFmpeg and ffprobe | Yes |

The Skill orchestrates these capabilities. It is not itself an image model, speech model, or renderer. Topic, palette, style preset, visual medium, subject list, and shot layout live in the creative brief rather than stable prompt rules. The verified v1 preset is `paper-cut`; other illustrated styles require their own tested asset and renderer contracts.
