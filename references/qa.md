# Video QA

## Asset QA

- Background plate contains no featured subject.
- Every subject exists as a separate alpha layer.
- Transparent corners and non-empty opaque coverage are present.
- No green or magenta fringe is visible at 100% playback size.
- Character style, paper outline, palette, and light direction are consistent.

## Layout QA

- Primary subject is visually dominant.
- Important roots, leaves, hands, faces, and props are not cropped.
- `zIndex` follows background → tertiary → secondary → primary → foreground → typography.
- Captions stay inside safe margins and do not cover semantic details.

## Motion QA

- Primary, secondary, and tertiary layers do not arrive simultaneously.
- Background movement stays subtle.
- Subject motion has a clear start and settles before the next scene.
- No flash, one-frame gap, accidental jump, or incorrect scene overlap.

## Audio QA

- Voice is intelligible and louder than music.
- Captions match the actual narration.
- Audio begins and ends cleanly.
- AI voice disclosure is included when required.

## Technical QA

- Correct dimensions and aspect ratio.
- Correct duration and frame rate.
- H.264 video stream and AAC audio stream, unless `intentionalSilence` is explicitly declared.
- Full decode completes without errors.
- Inspect a contact sheet containing at least one frame per scene.

Use `scripts/verify-video.sh --allow-no-audio <video.mp4>` only for an intentionally silent project. The default command requires an audio stream.
