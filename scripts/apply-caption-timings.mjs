#!/usr/bin/env node
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const alignedPath = value('--aligned');
const projectPath = value('--project');
const tailSeconds = Number.parseFloat(value('--tail-seconds', '0.35'));

if (!alignedPath || !projectPath) {
  console.error('Usage: apply-caption-timings.mjs --aligned aligned-captions.json --project public/project.json [--tail-seconds 0.35]');
  process.exit(1);
}
if (!existsSync(alignedPath) || !existsSync(projectPath)) {
  console.error('Aligned caption JSON and project.json must both exist.');
  process.exit(1);
}
if (!Number.isFinite(tailSeconds) || tailSeconds < 0 || tailSeconds > 10) {
  console.error('--tail-seconds must be between 0 and 10.');
  process.exit(1);
}

const aligned = JSON.parse(readFileSync(alignedPath, 'utf8'));
const project = JSON.parse(readFileSync(projectPath, 'utf8'));
const fps = project.fps;
if (!Number.isInteger(fps) || fps <= 0) {
  console.error('project.fps must be a positive integer.');
  process.exit(1);
}
if (!Number.isFinite(aligned.audioDuration) || aligned.audioDuration <= 0 || !Array.isArray(aligned.cues) || !aligned.cues.length) {
  console.error('Aligned caption JSON requires a positive audioDuration and non-empty cues.');
  process.exit(1);
}

const durationInFrames = Math.ceil((aligned.audioDuration + tailSeconds) * fps);
let captionCursor = 0;
project.captions = aligned.cues.map((cue, index) => {
  if (typeof cue.text !== 'string' || !cue.text.trim() || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.end <= cue.start) {
    throw new Error(`Invalid aligned cue at index ${index}.`);
  }
  const from = Math.max(captionCursor, Math.floor(cue.start * fps));
  const rawEnd = Math.min(durationInFrames, Math.ceil(cue.end * fps));
  const end = Math.max(from + 1, rawEnd);
  captionCursor = end;
  return {
    id: String(cue.id ?? `cue-${index + 1}`),
    from,
    duration: end - from,
    text: cue.text,
    ...(cue.style ? {style: cue.style} : {}),
  };
});
project.durationInFrames = durationInFrames;

const scenes = Array.isArray(project.scenes) ? project.scenes : [];
const allCuesHaveScene = aligned.cues.every((cue) => typeof cue.sceneId === 'string' && cue.sceneId.trim());
let updatedScenes = false;
if (scenes.length && allCuesHaveScene) {
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const cueSceneIds = new Set(aligned.cues.map((cue) => cue.sceneId));
  const everySceneHasCue = scenes.every((scene) => cueSceneIds.has(scene.id));
  const everyCueHasScene = aligned.cues.every((cue) => sceneIds.has(cue.sceneId));
  if (!everySceneHasCue || !everyCueHasScene) {
    console.error('sceneId values in aligned captions must cover every project scene exactly by id before scene timing can be updated.');
    process.exit(1);
  }
  const firstFrameByScene = new Map();
  for (const [index, cue] of aligned.cues.entries()) {
    const frame = project.captions[index].from;
    if (!firstFrameByScene.has(cue.sceneId)) firstFrameByScene.set(cue.sceneId, frame);
  }
  for (let index = 0; index < scenes.length; index += 1) {
    const from = index === 0 ? 0 : firstFrameByScene.get(scenes[index].id);
    const nextFrom = index + 1 < scenes.length ? firstFrameByScene.get(scenes[index + 1].id) : durationInFrames;
    if (!Number.isInteger(from) || !Number.isInteger(nextFrom) || nextFrom <= from) {
      console.error(`Caption scene order does not produce a positive timeline at ${scenes[index].id}.`);
      process.exit(1);
    }
    scenes[index].from = from;
    scenes[index].duration = nextFrom - from;
  }
  updatedScenes = true;
}

writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  project: path.resolve(projectPath),
  fps,
  durationInFrames,
  durationSeconds: durationInFrames / fps,
  captionCount: project.captions.length,
  updatedScenes,
}, null, 2));
