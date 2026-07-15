Create a Tencent WorkBuddy custom Skill named `illustrated-videos` from the provided portable folder.

Treat `illustrated-videos` as one layered animation Skill with two editorial content types:

- `contentMode: explainer`: illustrated knowledge, history, person, process, or object stories.
- `contentMode: book`: evidence-backed illustrated book stories or commentary. Accept legacy `book-review` requests as `book` input.

Every publishable project must use `assetStrategy: layered`. Generate a featured-subject-free background plus genuinely independent character, core-object, movable-prop, and depth assets as the narration requires. Remove chroma when needed and validate real alpha pixels. Reject a hero scene that is one composite illustration or relies only on camera movement. Never silently downgrade to a static plate workflow when image or alpha capability is missing.

Use the Skill as adaptable guidance, not a fixed shot recipe. Decide scene count, layer count, poses, motion, and transitions from each project's narration and visual actions. Do not hardcode a previous topic, book, palette, location, character, pose, coordinate, or filename into reusable rules.

Resolve duration before research. When the user has not specified it, ask once for an approximate number of seconds. If no answer is available or the user says to proceed, use about 40 seconds for `explainer` or a 60–120 second range for `book`. Store the result in `durationPlan`; a user value has priority. Treat it as a writing budget, then let decoded final narration determine exact scene and caption timing without silence padding, truncation, or extreme speed changes.

In the same opening exchange, resolve any optional voice preference: provider or authorized supplied audio, voice name when known, language or accent, requested perceived gender, delivery style, rate, and pitch. Do not expect the user to understand raw voice IDs. When the provider exposes a catalog, use `scripts/suggest-voices.mjs` to show three to five plain-language cards with listening character, suitable situations, provider-declared gender and locale, real ID, and a recommendation reason grounded in provider `ContentCategories` / `VoicePersonalities`. Offer a short same-text preview when practical. User choices have priority; without an answer, use the first real recommendation. If enumeration is unavailable, use only a verified configured catalog or project voice and never invent an available ID. Any later change to the voice settings or approved text requires new audio measurement and regenerated scene/caption timing.

For `book`, research bibliography, plot and characters, context, and interpretation as separate tracks. Run them with parallel Agents when WorkBuddy supports delegation, otherwise run the same tracks sequentially. Store traceable sources, approved claims, contradictions, spoiler policy, character continuity anchors, rights limits, and story beats. Each beat must change something and declare who or what performs a visual action. Generate the approved narration as one track when possible, then derive the exact duration and scene boundaries from that audio.

Keep titles, book metadata, quotations, labels, and captions out of generated images and render approved text in code. The only currently verified visual preset is `paper-cut`; do not claim roadmap presets are implemented.

Support the declared providers: image providers `codex-native`, `mcp`, `openai-api`, or compliant layered `file` assets; voice providers `edge-tts`, `openai`, a configured local adapter, or authorized `file` audio. Treat WeRead/微信读书, VoxCPM, faster-whisper, and HyperFrames as optional adapters, not prerequisites. When faster-whisper is present, use only its timing anchors and preserve approved caption wording. Keep the bundled Remotion renderer as the default.

Store project variables in `creative-brief.json`, compile prompts with `scripts/build-prompts.mjs`, validate the manifest, run `audit-project.mjs`, render H.264/AAC, run FFmpeg/ffprobe decode QA, and inspect both scene boundaries and within-scene relative movement. Keep on-video attribution disabled unless the user explicitly requests it. Store secrets only in environment variables.

After each raster image is generated or imported, run `scripts/detect-watermark.py`. It is a local, no-API heuristic with optional local OCR. Treat no automatic finding as `review-required`, visually confirm before marking clear, and store the report with the asset. A small edge mark may be removed only by a composition-safe crop followed by another check; otherwise use an authorized editor or regenerate with a clean provider. Never assume a negative prompt prevents a provider-added watermark.
