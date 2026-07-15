#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const usage = `Usage: node ${path.basename(process.argv[1])} [--project-dir <dir> | <project-directory>]`;
const parseProjectDirectory = (args) => {
  let projectDirectory;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (argument === '--project-dir') {
      const candidate = args[index + 1];
      if (!candidate || candidate.startsWith('-')) {
        console.error(`Missing value for --project-dir.\n${usage}`);
        process.exit(2);
      }
      if (projectDirectory != null) {
        console.error(`Project directory was provided more than once.\n${usage}`);
        process.exit(2);
      }
      projectDirectory = candidate;
      index += 1;
      continue;
    }
    if (argument.startsWith('-')) {
      console.error(`Unknown option: ${argument}\n${usage}`);
      process.exit(2);
    }
    if (projectDirectory != null) {
      console.error(`Project directory was provided more than once.\n${usage}`);
      process.exit(2);
    }
    projectDirectory = argument;
  }
  return path.resolve(projectDirectory ?? '.');
};

const root = parseProjectDirectory(process.argv.slice(2));
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const readJson = (relative, required = true) => {
  const file = path.join(root, relative);
  if (!existsSync(file)) {
    if (required) throw new Error(`Missing ${relative}`);
    return null;
  }
  return JSON.parse(readFileSync(file, 'utf8'));
};

let project;
let manifest;
let brief;
let research;
try {
  project = readJson('public/project.json');
  manifest = readJson('public/asset-manifest.json');
  brief = readJson('creative-brief.json', false) ?? {};
  research = readJson('book-research.json', false);
} catch (error) {
  console.error(JSON.stringify({ok: false, hardFailures: [error.message]}, null, 2));
  process.exit(1);
}
if (!isRecord(project) || !isRecord(manifest) || !isRecord(brief)) {
  console.error(JSON.stringify({
    ok: false,
    hardFailures: ['public/project.json, public/asset-manifest.json, and creative-brief.json must each contain a JSON object.'],
  }, null, 2));
  process.exit(1);
}

const hardFailures = [];
const warnings = [];
const details = {};
const validatorPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'validate-manifest.mjs');
const validator = spawnSync(process.execPath, [validatorPath, root], {encoding: 'utf8'});
if (validator.error || validator.status !== 0) {
  let validationErrors = [];
  try {
    const report = JSON.parse(validator.stdout);
    validationErrors = Array.isArray(report.errors) ? report.errors : [];
  } catch {
    // Preserve the process failure below when the validator could not emit JSON.
  }
  if (validationErrors.length) {
    hardFailures.push(...validationErrors.map((error) => `Manifest validation: ${error}`));
  } else {
    hardFailures.push(`Manifest validation could not complete: ${validator.stderr?.trim() || validator.stdout?.trim() || validator.error?.message || 'unknown failure'}`);
  }
}
const normalizeContentMode = (mode) => mode === 'book-review' ? 'book' : (mode ?? 'explainer');
const contentMode = normalizeContentMode(project.contentMode);
const assetStrategy = project.assetStrategy ?? 'layered';
const stylePreset = project.stylePreset ?? 'paper-cut';
const fps = Number.isFinite(project.fps) && project.fps > 0 ? project.fps : 30;
const scenes = Array.isArray(project.scenes) ? project.scenes : [];
const heroScenes = scenes.filter((scene) => scene.hero !== false);
const manifestAssets = Array.isArray(manifest.assets) ? manifest.assets : [];
const backgroundAssets = manifestAssets.filter((asset) => asset.type === 'background');
const layerAssets = manifestAssets.filter((asset) => ['layer', 'foreground'].includes(asset.type));
const backgroundByPath = new Map(backgroundAssets.map((asset) => [asset.path, asset]));
const layerByPath = new Map(layerAssets.map((asset) => [asset.path, asset]));
const layersOf = (scene) => Array.isArray(scene.layers) ? scene.layers : [];
const realText = (value) => typeof value === 'string' && Boolean(value.trim()) && !/^<.*>$/.test(value.trim());
const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const positiveNumber = (value) => finiteNumber(value) && value > 0;
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const normalizeText = (value) => typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
const comparable = (left, right) => normalizeText(left) === normalizeText(right);
const validHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.hostname.endsWith('.invalid');
  } catch {
    return false;
  }
};
const beatCharacterIds = (beat) => {
  if (Array.isArray(beat?.characters)) return beat.characters.map((entry) => entry?.characterId).filter(Boolean);
  return Array.isArray(beat?.characterIds) ? beat.characterIds : [];
};
const visualActionText = (beat) => typeof beat?.visualAction === 'string'
  ? beat.visualAction
  : beat?.visualAction?.action;
const validNarrativeChange = (beat) => {
  const change = beat?.narrativeChange;
  return change && realText(change.before) && realText(change.turn) && realText(change.after);
};
const validSemanticMotion = (layer) => {
  const keyframes = layer?.motion?.keyframes;
  if (!realText(layer?.motion?.action) || !Array.isArray(keyframes) || keyframes.length < 2) return false;
  let previousAt = -1;
  for (const keyframe of keyframes) {
    if (!Number.isFinite(keyframe?.at) || keyframe.at < 0 || keyframe.at > 1 || keyframe.at <= previousAt) return false;
    previousAt = keyframe.at;
  }
  const defaults = {x: 0, y: 0, rotation: 0, scale: 1, opacity: layer.opacity ?? 1};
  return Object.entries(defaults).some(([field, fallback]) => (
    new Set(keyframes.map((keyframe) => keyframe?.[field] ?? fallback)).size > 1
  ));
};
const bounded = (value, max) => Math.max(0, Math.min(max, value));

if (!['explainer', 'book'].includes(contentMode)) hardFailures.push(`Unsupported contentMode: ${contentMode}.`);
if (assetStrategy !== 'layered') hardFailures.push('Every publishable illustrated-videos project requires assetStrategy=layered.');
if (stylePreset !== 'paper-cut') hardFailures.push(`Unsupported stylePreset: ${stylePreset}. The verified preset is paper-cut.`);
if (!realText(project.title)) hardFailures.push('project.title must contain real text.');
if (!isRecord(project.palette)) {
  hardFailures.push('project.palette must contain paper, ink, accent, and gold colors.');
} else {
  for (const field of ['paper', 'ink', 'accent', 'gold']) {
    if (!realText(project.palette[field])) hardFailures.push(`project.palette.${field} must contain a real CSS color value.`);
  }
}
if (normalizeContentMode(manifest.contentMode) !== contentMode) hardFailures.push('Manifest contentMode does not match public/project.json.');
if (manifest.assetStrategy !== 'layered' || manifest.assetStrategy !== assetStrategy) hardFailures.push('Manifest assetStrategy must match the project and be layered.');
if (normalizeContentMode(brief.project?.contentMode) !== contentMode) {
  hardFailures.push('Creative brief contentMode does not match public/project.json.');
}
if (brief.visualSystem?.assetStrategy !== 'layered') {
  hardFailures.push('Creative brief must use visualSystem.assetStrategy=layered.');
}
if (project.brand != null) {
  if (!isRecord(project.brand)) {
    hardFailures.push('project.brand must be an object when provided.');
  } else {
    if (project.brand.show != null && typeof project.brand.show !== 'boolean') hardFailures.push('project.brand.show must be boolean.');
    if (project.brand.handle != null && typeof project.brand.handle !== 'string') hardFailures.push('project.brand.handle must be a string.');
    if (project.brand.logo != null && typeof project.brand.logo !== 'string') hardFailures.push('project.brand.logo must be a string.');
    if (project.brand.placement != null && !['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(project.brand.placement)) {
      hardFailures.push('project.brand.placement is unsupported.');
    }
    if (project.brand.logoWidth != null && (!positiveNumber(project.brand.logoWidth) || project.brand.logoWidth > project.width / 2)) {
      hardFailures.push('project.brand.logoWidth must be positive and no greater than half the composition width.');
    }
    if (project.brand.opacity != null && (!positiveNumber(project.brand.opacity) || project.brand.opacity > 1)) {
      hardFailures.push('project.brand.opacity must be greater than 0 and no greater than 1.');
    }
  }
}
if (!project.audio || typeof project.audio !== 'object' || Array.isArray(project.audio)) {
  hardFailures.push('project.audio must be an object.');
} else if (!project.audio.voice && project.audio.intentionalSilence !== true) {
  hardFailures.push('Narration audio is missing and intentionalSilence is not declared.');
}
if (project.captions != null && !Array.isArray(project.captions)) hardFailures.push('project.captions must be an array when provided.');
if (!Array.isArray(project.scenes)) hardFailures.push('project.scenes must be an array.');
if (!scenes.length) hardFailures.push('No scenes are defined.');

let narrative = 20;
const validTimeline = scenes.length > 0 && scenes.every((scene) => (
  Number.isInteger(scene.from) && scene.from >= 0 && Number.isInteger(scene.duration) && scene.duration > 0
));
if (!validTimeline && scenes.length) hardFailures.push('Every scene must use a non-negative integer from and a positive integer duration.');
if (validTimeline) {
  const ordered = [...scenes].sort((left, right) => left.from - right.from);
  let cursor = 0;
  for (const scene of ordered) {
    if (scene.from > cursor) hardFailures.push(`Timeline gap before ${scene.id}: frames ${cursor}-${scene.from - 1}.`);
    if (scene.from < cursor) hardFailures.push(`Timeline overlap at ${scene.id}: starts ${scene.from}, previous end ${cursor}.`);
    cursor = Math.max(cursor, scene.from + scene.duration);
  }
  if (cursor !== project.durationInFrames) hardFailures.push(`Timeline ends at frame ${cursor}, expected ${project.durationInFrames}.`);
}

for (const scene of scenes) {
  const label = `Scene ${scene.id ?? '<unknown>'}`;
  if (!realText(scene.id)) hardFailures.push('Every scene must have a real id.');
  if (!realText(scene.background)) hardFailures.push(`${label} must reference a background.`);
  if (!Array.isArray(scene.layers)) hardFailures.push(`${label} layers must be an array.`);
  if (scene.camera != null) {
    if (!isRecord(scene.camera)) {
      hardFailures.push(`${label} camera must be an object.`);
    } else {
      for (const field of ['scaleFrom', 'scaleTo']) {
        if (scene.camera[field] != null && !positiveNumber(scene.camera[field])) hardFailures.push(`${label} camera.${field} must be positive and finite.`);
      }
      for (const field of ['xFrom', 'xTo', 'yFrom', 'yTo']) {
        if (scene.camera[field] != null && !finiteNumber(scene.camera[field])) hardFailures.push(`${label} camera.${field} must be finite.`);
      }
    }
  }
  if (scene.transition != null && !['fade', 'paper-wipe', 'cut'].includes(scene.transition)) hardFailures.push(`${label} transition is unsupported.`);
  if (scene.captionStyle != null && !['strip', 'card', 'minimal'].includes(scene.captionStyle)) hardFailures.push(`${label} captionStyle is unsupported.`);
  for (const layer of layersOf(scene)) {
    const layerLabel = `${label} layer ${layer.id ?? '<unknown>'}`;
    if (!realText(layer.id) || !realText(layer.src)) hardFailures.push(`${layerLabel} must have real id and src values.`);
    if (!['primary', 'secondary', 'tertiary', 'foreground'].includes(layer.role)) hardFailures.push(`${layerLabel} has an unsupported role.`);
    if (!finiteNumber(layer.x) || !finiteNumber(layer.y) || !positiveNumber(layer.width)) {
      hardFailures.push(`${layerLabel} requires finite x/y and a positive finite width.`);
    }
    if (layer.height != null && !positiveNumber(layer.height)) hardFailures.push(`${layerLabel} height must be positive and finite.`);
    if (layer.delay != null && !nonNegativeInteger(layer.delay)) hardFailures.push(`${layerLabel} delay must be a non-negative integer.`);
    if (nonNegativeInteger(layer.delay) && Number.isInteger(scene.duration) && layer.delay >= scene.duration) hardFailures.push(`${layerLabel} delay occurs after the scene ends.`);
    for (const field of ['zIndex', 'rotation', 'bob']) {
      if (layer[field] != null && !finiteNumber(layer[field])) hardFailures.push(`${layerLabel} ${field} must be finite.`);
    }
    if (layer.scale != null && !positiveNumber(layer.scale)) hardFailures.push(`${layerLabel} scale must be positive and finite.`);
    if (layer.opacity != null && (!finiteNumber(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) hardFailures.push(`${layerLabel} opacity must be within 0..1.`);
    if (layer.enterFrom != null && !['left', 'right', 'up', 'down', 'scale'].includes(layer.enterFrom)) hardFailures.push(`${layerLabel} enterFrom is unsupported.`);
    if (layer.motion != null) {
      if (!isRecord(layer.motion) || !realText(layer.motion.action) || !Array.isArray(layer.motion.keyframes) || layer.motion.keyframes.length < 2) {
        hardFailures.push(`${layerLabel} motion requires an action and at least two keyframes.`);
      } else {
        let previousAt = -1;
        for (const [index, keyframe] of layer.motion.keyframes.entries()) {
          if (!isRecord(keyframe) || !finiteNumber(keyframe.at) || keyframe.at < 0 || keyframe.at > 1 || keyframe.at <= previousAt) {
            hardFailures.push(`${layerLabel} motion keyframe ${index} must be an object with a strictly increasing at value in 0..1.`);
          }
          if (finiteNumber(keyframe?.at)) previousAt = keyframe.at;
          for (const field of ['x', 'y', 'rotation', 'scale', 'opacity']) {
            if (keyframe?.[field] != null && !finiteNumber(keyframe[field])) hardFailures.push(`${layerLabel} motion keyframe ${index} ${field} must be finite.`);
          }
        }
      }
    }
  }
}

let layerPlan = 20;
if (!backgroundAssets.length) hardFailures.push('Asset manifest has no character-free background assets.');
if (!layerAssets.length) hardFailures.push('Asset manifest has no independent alpha layers.');
const uninspectedBackgrounds = backgroundAssets.filter((asset) => asset.subjectFree !== true || asset.visuallyInspected !== true);
if (uninspectedBackgrounds.length) {
  hardFailures.push(`Backgrounds missing subjectFree/visuallyInspected confirmation: ${uninspectedBackgrounds.map((asset) => asset.id).join(', ')}`);
}
const unvalidatedLayers = layerAssets.filter((asset) => asset.alpha !== true || asset.alphaValidated !== true || asset.visuallyInspected !== true);
if (unvalidatedLayers.length) {
  hardFailures.push(`Layers missing alpha/alphaValidated/visuallyInspected confirmation: ${unvalidatedLayers.map((asset) => asset.id).join(', ')}`);
}
const unclearedWatermarks = manifestAssets.filter((asset) => (
  asset.watermarkCheck?.status !== 'clear' || !realText(asset.watermarkCheck?.report)
));
if (unclearedWatermarks.length) {
  hardFailures.push(`Assets missing a clear SHA-bound local watermark report: ${unclearedWatermarks.map((asset) => asset.id).join(', ')}`);
}
for (const scene of scenes) {
  if (!backgroundByPath.has(scene.background)) hardFailures.push(`Scene ${scene.id} background is not a declared background asset.`);
  for (const layer of layersOf(scene)) {
    if (!layerByPath.has(layer.src)) hardFailures.push(`Scene ${scene.id} layer ${layer.id} is not a declared independent layer asset.`);
  }
}
const missingPrimary = heroScenes.filter((scene) => !layersOf(scene).some((layer) => layer.role === 'primary'));
if (missingPrimary.length) {
  layerPlan -= 10;
  hardFailures.push(`Hero scenes without an independent primary subject or core object: ${missingPrimary.map((scene) => scene.id).join(', ')}`);
}
const missingDepth = heroScenes.filter((scene) => !layersOf(scene).some((layer) => ['secondary', 'tertiary', 'foreground'].includes(layer.role)));
if (missingDepth.length) {
  layerPlan -= Math.min(5, missingDepth.length);
  warnings.push(`Hero scenes without a supporting or depth layer; confirm the beat is intentionally simple: ${missingDepth.map((scene) => scene.id).join(', ')}`);
}
const configuredRange = brief.quality?.recommendedHeroLayerRange;
const recommendedRange = Array.isArray(configuredRange) && configuredRange.length === 2
  && configuredRange.every((value) => Number.isInteger(value) && value > 0)
  ? configuredRange
  : [3, 7];
const outsideRange = heroScenes.filter((scene) => {
  const count = layersOf(scene).length;
  return (count < recommendedRange[0] || count > recommendedRange[1]) && !realText(scene.layerPlanRationale);
});
if (outsideRange.length) {
  warnings.push(`Hero scenes outside the planning range ${recommendedRange.join('–')} need a beat-specific layerPlanRationale: ${outsideRange.map((scene) => scene.id).join(', ')}`);
}

let motion = 20;
const cameraOnly = heroScenes.filter((scene) => !layersOf(scene).some((layer) => layer.role === 'primary' && validSemanticMotion(layer)));
if (cameraOnly.length) {
  motion -= Math.min(14, cameraOnly.length * 4);
  hardFailures.push(`Hero scenes without semantic primary motion; entrance, loop, or camera movement alone is insufficient: ${cameraOnly.map((scene) => scene.id).join(', ')}`);
}
const longSingleTrack = heroScenes.filter((scene) => (
  scene.duration / fps > 4 && layersOf(scene).filter(validSemanticMotion).length < 2
));
if (longSingleTrack.length) {
  motion -= Math.min(4, longSingleTrack.length);
  warnings.push(`Long hero scenes with fewer than two independently timed semantic tracks: ${longSingleTrack.map((scene) => scene.id).join(', ')}`);
}
const simultaneous = heroScenes.filter((scene) => {
  const layers = layersOf(scene);
  return layers.length > 1 && new Set(layers.map((layer) => layer.delay ?? 0)).size === 1;
});
if (simultaneous.length) warnings.push(`Scenes where every layer enters simultaneously: ${simultaneous.map((scene) => scene.id).join(', ')}`);
const motionSignatures = heroScenes.flatMap((scene) => layersOf(scene).filter(validSemanticMotion).map((layer) => (
  JSON.stringify({role: layer.role, keyframes: layer.motion.keyframes, loop: layer.motion.loop ?? 'none'})
)));
if (motionSignatures.length > 2 && new Set(motionSignatures).size === 1) {
  motion -= 3;
  warnings.push('Every semantic layer reuses the same motion curve; derive action from each beat.');
}

let composition = 15;
const compositionSignatures = new Set(scenes.map((scene) => {
  const primary = layersOf(scene).find((layer) => layer.role === 'primary');
  return [scene.background, Math.round((primary?.x ?? 0) / Math.max(1, project.width) * 4), Math.round((primary?.width ?? 0) / Math.max(1, project.width) * 4)].join('|');
}));
if (scenes.length > 1 && compositionSignatures.size < 2) {
  composition -= 5;
  warnings.push('Fewer than two visibly different composition signatures.');
}
const weakPrimary = heroScenes.filter((scene) => {
  const primary = layersOf(scene).find((layer) => layer.role === 'primary');
  return primary && primary.width / Math.max(1, project.width) < 0.28;
});
if (weakPrimary.length) warnings.push(`Primary may be too small for mobile viewing: ${weakPrimary.map((scene) => scene.id).join(', ')}`);

let typography = 10;
if (project.brand?.show === true && !realText(project.brand.handle) && !realText(project.brand.logo)) {
  typography -= 2;
  hardFailures.push('brand.show is true but neither brand.handle nor brand.logo is configured.');
}
const captions = Array.isArray(project.captions) ? project.captions : [];
if (!captions.length && !scenes.some((scene) => realText(scene.caption))) {
  typography -= 4;
  warnings.push('No captions are configured.');
}

let audio = 10;
let voiceDurationSeconds = null;
if (project.audio?.voice) {
  const voicePath = path.resolve(root, 'public', project.audio.voice);
  if (existsSync(voicePath)) {
    const probe = spawnSync('ffprobe', [
      '-v', 'error', '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_type,duration:format=duration', '-of', 'json', voicePath,
    ], {encoding: 'utf8'});
    let metadata = null;
    try {
      metadata = JSON.parse(probe.stdout);
    } catch {
      // The hard failure below includes ffprobe output.
    }
    const audioStream = metadata?.streams?.find((stream) => stream.codec_type === 'audio');
    const duration = Number.parseFloat(metadata?.format?.duration ?? audioStream?.duration);
    if (!probe.error && probe.status === 0 && audioStream && Number.isFinite(duration) && duration > 0) {
      voiceDurationSeconds = duration;
      const timelineSeconds = project.durationInFrames / fps;
      const declaredTail = project.audio.tailSeconds ?? 0;
      const tolerance = Math.max(0.08, 2 / fps);
      if (Math.abs(timelineSeconds - duration - declaredTail) > tolerance) {
        hardFailures.push(`Timeline must equal narration plus declared tail (timeline ${timelineSeconds.toFixed(3)}s, narration ${duration.toFixed(3)}s, tail ${declaredTail.toFixed(3)}s).`);
      }
    } else {
      audio -= 2;
      hardFailures.push(`Narration path does not contain positive decodable audio: ${probe.stderr?.trim() || 'ffprobe returned no audio stream or duration'}.`);
    }
  } else {
    hardFailures.push(`Narration audio file does not exist: ${project.audio.voice}.`);
  }
}

if (contentMode === 'book') {
  if (!project.audio?.voice) hardFailures.push('book content requires final narration audio.');
  for (const field of ['title', 'author', 'angle']) {
    if (!realText(project.book?.[field])) hardFailures.push(`project.book.${field} is required.`);
    if (!realText(brief.project?.book?.[field]) || !comparable(brief.project.book[field], project.book?.[field])) {
      hardFailures.push(`Creative brief project.book.${field} must contain real text matching public/project.json.`);
    }
  }
  if (!['none', 'low', 'full'].includes(project.book?.spoilerLevel)) hardFailures.push('project.book.spoilerLevel must be none, low, or full.');
  if (project.book?.originalTitle != null && typeof project.book.originalTitle !== 'string') hardFailures.push('project.book.originalTitle must be a string when provided.');
  if (project.book?.label != null && typeof project.book.label !== 'string') hardFailures.push('project.book.label must be a string when provided.');
  if (!scenes.some((scene) => scene.showBookMeta === true)) hardFailures.push('Book metadata is not enabled as a code-rendered overlay.');

  const storyCharacters = Array.isArray(brief.story?.characters) ? brief.story.characters : [];
  const storyBeats = Array.isArray(brief.story?.beats) ? brief.story.beats : [];
  const protagonistIds = Array.isArray(brief.story?.protagonistIds) ? brief.story.protagonistIds : [];
  const characterIds = new Set(storyCharacters.map((character) => character.id));
  const beatIds = new Set(storyBeats.map((beat) => beat.id));
  if (!storyCharacters.length || !storyBeats.length || !protagonistIds.length) {
    narrative -= 8;
    hardFailures.push('Book creative brief requires story.characters, story.beats, and story.protagonistIds.');
  }
  for (const protagonistId of protagonistIds) {
    if (!characterIds.has(protagonistId)) hardFailures.push(`Unknown protagonist id: ${protagonistId}.`);
    if (!storyBeats.some((beat) => beatCharacterIds(beat).includes(protagonistId))) hardFailures.push(`Protagonist ${protagonistId} is not connected to a story beat.`);
    if (!layerAssets.some((asset) => asset.characterId === protagonistId)) hardFailures.push(`Protagonist ${protagonistId} has no independent manifest layer.`);
  }
  for (const beat of storyBeats) {
    if (!realText(beat.id) || !realText(beat.narrativePurpose) || !validNarrativeChange(beat) || !realText(visualActionText(beat))) {
      hardFailures.push(`Story beat ${beat.id ?? '<unknown>'} lacks narrative purpose, before/turn/after change, or visual action.`);
    }
    if (!beatCharacterIds(beat).length || !(beat.claimIds ?? []).length || !(beat.sourceIds ?? []).length) {
      hardFailures.push(`Story beat ${beat.id ?? '<unknown>'} must connect characters, claims, and sources.`);
    }
  }
  for (const scene of scenes) {
    if (!realText(scene.storyBeatId) || !beatIds.has(scene.storyBeatId)) hardFailures.push(`Book scene ${scene.id} must reference a known storyBeatId.`);
  }
  for (const beatId of beatIds) {
    if (!scenes.some((scene) => scene.storyBeatId === beatId)) hardFailures.push(`Story beat ${beatId} is not represented by a scene.`);
  }

  if (!research) {
    narrative = Math.max(0, narrative - 8);
    hardFailures.push('book-research.json is required.');
  } else {
    if (research.schemaVersion !== 2) hardFailures.push('book-research schemaVersion must be 2.');
    if (normalizeContentMode(research.contentMode) !== 'book') hardFailures.push('book-research contentMode must normalize to book.');
    if (!realText(research.book?.title) || !comparable(research.book.title, project.book?.title)) hardFailures.push('book-research book.title must match public/project.json.');
    if (!realText(research.book?.author) || !comparable(research.book.author, project.book?.author)) hardFailures.push('book-research book.author must match public/project.json.');
    if (!realText(research.editorial?.angle) || !comparable(research.editorial.angle, project.book?.angle)) hardFailures.push('book-research editorial.angle must match public/project.json.');
    if (research.editorial?.spoilerPolicy?.level !== project.book?.spoilerLevel) hardFailures.push('book-research spoilerPolicy.level must match public/project.json.');
    if (!realText(research.editorial?.quotePolicy)) {
      hardFailures.push('book-research editorial.quotePolicy is required.');
    } else if (research.editorial.quotePolicy !== 'original-commentary-only') {
      const rightsNotes = Array.isArray(research.guardrails?.rightsNotes) ? research.guardrails.rightsNotes : [];
      if (!rightsNotes.length || rightsNotes.some((entry) => !realText(typeof entry === 'string' ? entry : entry?.note))) {
        hardFailures.push('A non-default quotePolicy requires concrete guardrails.rightsNotes documenting edition, permission or legal basis, scope, and attribution.');
      } else {
        warnings.push(`Non-default quotePolicy requires project-specific editorial review: ${research.editorial.quotePolicy}.`);
      }
    }
    const researchSources = Array.isArray(research.sources) ? research.sources : [];
    const researchClaims = Array.isArray(research.claims) ? research.claims : [];
    const researchCharacters = Array.isArray(research.characterBible?.characters) ? research.characterBible.characters : [];
    const researchBeats = Array.isArray(research.storySpine?.beats) ? research.storySpine.beats : [];
    if (!researchSources.length) hardFailures.push('book-research must contain inspected sources.');
    if (!researchClaims.length) hardFailures.push('book-research must contain atomic claims.');
    if (!researchCharacters.length) hardFailures.push('book-research must contain a character bible.');
    if (!researchBeats.length) hardFailures.push('book-research must contain a story spine.');
    for (const [index, source] of researchSources.entries()) {
      if (!realText(source.id) || !realText(source.title) || !validHttpUrl(source.url) || !realText(source.accessedAt)) {
        hardFailures.push(`book-research sources[${index}] must have id, title, direct URL, and accessedAt.`);
      }
    }
    const unresolved = new Set((research.contradictions ?? []).filter((entry) => entry.status === 'unresolved').flatMap((entry) => entry.claimIds ?? []));
    const usedClaimIds = new Set(researchBeats.flatMap((beat) => beat.claimIds ?? []));
    for (const claimId of unresolved) {
      if (usedClaimIds.has(claimId)) hardFailures.push(`Unresolved claim ${claimId} is used by the story spine.`);
    }
    for (const flag of ['backgroundPlatesExcludeFeaturedSubjects', 'charactersUseIndependentAlphaAssets', 'movingOrOccludingPropsUseIndependentLayers', 'foregroundDepthElementsUseIndependentLayers']) {
      if (research.layerContract?.[flag] !== true) hardFailures.push(`book-research layerContract.${flag} must be true.`);
    }
    if (research.layerContract?.generatedTextInRasterAssets !== false) hardFailures.push('book-research layerContract.generatedTextInRasterAssets must be false.');
    const visualExclusions = Array.isArray(research.guardrails?.visualExclusions) ? research.guardrails.visualExclusions : [];
    if (visualExclusions.length < 3 || visualExclusions.some((entry) => !realText(entry))) hardFailures.push('book-research must record at least three visual exclusions.');
  }

  if (!captions.length) hardFailures.push('Book content requires approved global caption cues.');
  const narrationPath = path.join(root, 'narration.txt');
  if (!existsSync(narrationPath)) {
    hardFailures.push('book content requires narration.txt as the approved text authority.');
  } else if (captions.length) {
    const normalize = (value) => value.replace(/\s+/gu, '');
    const narration = normalize(readFileSync(narrationPath, 'utf8').trim());
    const captionText = normalize(captions.map((cue) => cue.text ?? '').join(''));
    if (!narration || /^<.*>$/.test(narration) || narration !== captionText) hardFailures.push('Approved caption text must concatenate exactly to narration.txt.');
  }
}

let technical = 5;
if (![project.width, project.height, project.fps, project.durationInFrames].every((value) => Number.isInteger(value) && value > 0)) {
  technical = 0;
  hardFailures.push('width, height, fps, and durationInFrames must be positive integers.');
}
if (![24, 25, 30, 50, 60].includes(project.fps)) warnings.push(`Unusual frame rate: ${project.fps}.`);

const scores = {
  narrativeEvidencePacing: bounded(narrative, 20),
  layerPlanSeparation: bounded(layerPlan, 20),
  semanticMotionRhythm: bounded(motion, 20),
  compositionContinuity: bounded(composition, 15),
  typographyCaptions: bounded(typography, 10),
  audio: bounded(audio, 10),
  technical: bounded(technical, 5),
};
const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
const targetScore = Number.isFinite(brief.quality?.publishScore) ? brief.quality.publishScore : 88;
details.contentMode = contentMode;
details.assetStrategy = assetStrategy;
details.stylePreset = stylePreset;
details.sceneCount = scenes.length;
details.heroSceneCount = heroScenes.length;
details.backgroundAssets = backgroundAssets.length;
details.independentLayerAssets = layerAssets.length;
details.averageLayersPerHero = heroScenes.length
  ? heroScenes.reduce((sum, scene) => sum + layersOf(scene).length, 0) / heroScenes.length
  : 0;
details.recommendedHeroLayerRange = recommendedRange;
details.semanticPrimaryScenes = heroScenes.filter((scene) => layersOf(scene).some((layer) => layer.role === 'primary' && validSemanticMotion(layer))).length;
details.distinctCompositionSignatures = compositionSignatures.size;
details.durationSeconds = Number.isFinite(project.durationInFrames / fps) ? project.durationInFrames / fps : null;
details.voiceDurationSeconds = voiceDurationSeconds;
details.durationPlan = project.durationPlan ?? null;
details.durationPolicy = 'ask once; use user preference or mode fallback for planning; decoded final narration determines exact runtime';
if (voiceDurationSeconds != null) {
  const range = project.durationPlan?.planningRangeSeconds;
  const target = project.durationPlan?.planningTargetSeconds;
  if (Array.isArray(range) && range.length === 2 && (voiceDurationSeconds < range[0] || voiceDurationSeconds > range[1])) {
    warnings.push(`Narration duration ${voiceDurationSeconds.toFixed(2)}s falls outside the planning range ${range[0]}–${range[1]}s; confirm the approved text intentionally needs this scope.`);
  } else if (Number.isFinite(target) && Math.abs(voiceDurationSeconds - target) > Math.max(3, target * 0.2)) {
    warnings.push(`Narration duration ${voiceDurationSeconds.toFixed(2)}s materially differs from the planning target ${target}s; confirm the approved text intentionally needs this scope.`);
  }
}

const report = {
  ok: hardFailures.length === 0,
  publishCandidate: hardFailures.length === 0 && total >= targetScore,
  score: total,
  targetScore,
  scores,
  details,
  hardFailures,
  warnings,
};
mkdirSync(path.join(root, 'out'), {recursive: true});
writeFileSync(path.join(root, 'out', 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (hardFailures.length) process.exit(1);
