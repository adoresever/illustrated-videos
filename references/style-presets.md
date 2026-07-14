# Style presets

`illustrated-videos` is the umbrella Skill name. A preset is more than a style word in an image prompt: it needs an asset contract, prompt rules, compositing behavior, animation grammar, examples, and regression checks. The content mode selects the editorial workflow, while the asset strategy selects `layered` or `scene-illustrations`; neither is a new visual preset.

| Preset | 中文 | Status | Required renderer behavior |
|---|---|---|---|
| `paper-cut` | 剪纸 / 纸片拼贴 | Verified in v1 | `layered`: alpha cutouts, role shadows and parallax; `scene-illustrations`: consistent paper collage plates, restrained plate motion and code typography; both keep visible paper edges and paper-aware transitions |
| `crayon` | 儿童蜡笔 | Roadmap | Crayon texture consistency, partial draw-on reveal, restrained childlike motion |
| `doodle` | 极简涂鸦 | Roadmap | Line drawing reveal, icon-like staging, minimal fills |
| `pencil-sketch` | 铅笔速写 | Roadmap | Stroke build-up, graphite texture, eraser or page transitions |
| `watercolor` | 淡彩水彩 | Roadmap | Wash masks, pigment spread, soft edge handling |
| `ink-wash` | 水墨 | Roadmap | Ink diffusion, dry-brush texture, intentional negative space |
| `pixel-art` | 像素画 | Roadmap | Nearest-neighbor scaling, sprite timing, pixel-safe motion |

Only `paper-cut` may be selected by default in the current release. Do not simulate an unfinished preset by changing only `visualSystem.medium`; that would produce a differently drawn paper-cut composition, not a verified animation system for the named medium.

To promote a roadmap entry to implemented status:

1. Define which assets must be separate and which may be composite.
2. Add prompt rules that are independent of a specific topic.
3. Add renderer behavior behind `project.stylePreset` without changing `paper-cut` output.
4. Add at least two cross-topic examples.
5. Run structural, media, visual, and listening QA and document the residual risks.
