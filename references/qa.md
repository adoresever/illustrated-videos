# Video QA

## Asset QA

- For `layered`, the background plate contains no featured subject, every declared subject exists as a separate alpha layer, transparent corners and non-empty opaque coverage are present, and no chroma fringe is visible at 100% playback size.
- For `scene-illustrations`, every semantic beat has the intended complete plate, plates contain no generated text or copied cover/film imagery, and the series visual system remains consistent.
- Character style, paper outline, palette, and light direction are consistent.

## Layout QA

- Primary subject is visually dominant.
- Important roots, leaves, hands, faces, and props are not cropped.
- For `layered`, `zIndex` follows background → tertiary → secondary → primary → foreground → typography.
- For `scene-illustrations`, camera crop and text-safe negative space remain intentional; title and author are code-rendered.
- Captions stay inside safe margins and do not cover semantic details.

## Motion QA

- In `layered`, primary, secondary, and tertiary layers do not arrive simultaneously.
- In `scene-illustrations`, plate movement remains restrained and scene changes follow semantic/audio boundaries rather than equal intervals.
- Background movement stays subtle.
- Subject motion has a clear start and settles before the next scene.
- No flash, one-frame gap, accidental jump, or incorrect scene overlap.

## Audio QA

- Voice is intelligible and louder than music.
- Captions match the actual narration.
- Caption timing comes from the final audio while caption wording remains the approved narration.
- Audio begins and ends cleanly.
- AI voice disclosure is included when required.

## Technical QA

- Correct dimensions and aspect ratio.
- Correct duration and frame rate.
- H.264 video stream and AAC audio stream, unless `intentionalSilence` is explicitly declared.
- Full decode completes without errors.
- Inspect a contact sheet containing at least one frame per scene.

Use `scripts/verify-video.sh --allow-no-audio <video.mp4>` only for an intentionally silent project. The default command requires an audio stream.
