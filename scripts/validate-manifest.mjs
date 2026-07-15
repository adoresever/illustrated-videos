#!/usr/bin/env node
import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
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

const projectDirectory = parseProjectDirectory(process.argv.slice(2));
const publicDirectory = path.join(projectDirectory, 'public');
const errors = [];
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const alphaCheckScript = path.join(scriptDirectory, 'check-alpha.py');
const rasterCheckScript = path.join(scriptDirectory, 'check-raster.py');

const readJson = (file, required = true) => {
  if (!existsSync(file)) {
    if (required) errors.push(`Missing file: ${file}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON ${file}: ${error.message}`);
    return null;
  }
};

const projectPath = path.join(publicDirectory, 'project.json');
const manifestPath = path.join(publicDirectory, 'asset-manifest.json');
const briefPath = path.join(projectDirectory, 'creative-brief.json');
const researchPath = path.join(projectDirectory, 'book-research.json');
const narrationPath = path.join(projectDirectory, 'narration.txt');
const project = readJson(projectPath);
const manifest = readJson(manifestPath);
const brief = readJson(briefPath, false);
const research = readJson(researchPath, false);

const normalizeContentMode = (mode) => mode === 'book-review' ? 'book' : (mode ?? 'explainer');
const contentMode = normalizeContentMode(project?.contentMode);
const assetStrategy = project?.assetStrategy ?? 'layered';
const positiveInteger = (value) => Number.isInteger(value) && value > 0;
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const positiveNumber = (value) => finiteNumber(value) && value > 0;
const nonNegativeNumber = (value) => finiteNumber(value) && value >= 0;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const realText = (value) => typeof value === 'string' && Boolean(value.trim()) && !/^<.*>$/.test(value.trim());
const validCssColor = (value) => realText(value) && (
  /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/iu.test(value.trim())
  || /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([^()]+\)$/iu.test(value.trim())
  || ['transparent', 'black', 'white', 'ivory', 'beige', 'navy', 'teal', 'maroon', 'olive', 'gray', 'grey', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gold'].includes(value.trim().toLowerCase())
);
const requireText = (value, label) => {
  if (!realText(value)) errors.push(`${label} must contain real text.`);
};
const validateOptionalText = (value, label) => {
  if (value != null && typeof value !== 'string') errors.push(`${label} must be a string when provided.`);
};
const validateOptionalBoolean = (value, label) => {
  if (value != null && typeof value !== 'boolean') errors.push(`${label} must be boolean when provided.`);
};
const validateOptionalNumber = (value, label, predicate = finiteNumber, expectation = 'a finite number') => {
  if (value != null && !predicate(value)) errors.push(`${label} must be ${expectation} when provided.`);
};
const validateOptionalEnum = (value, allowed, label) => {
  if (value != null && !allowed.includes(value)) errors.push(`${label} must be one of: ${allowed.join(', ')}.`);
};
const normalizeText = (value) => typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
const valuesMatch = (left, right) => normalizeText(left) === normalizeText(right);
const sameStringSet = (left, right) => {
  const leftSet = new Set(Array.isArray(left) ? left : []);
  const rightSet = new Set(Array.isArray(right) ? right : []);
  return leftSet.size === rightSet.size && [...leftSet].every((value) => rightSet.has(value));
};
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
const visualActionText = (beat) => typeof beat?.visualAction === 'string' ? beat.visualAction : beat?.visualAction?.action;
const validNarrativeChange = (beat) => {
  const change = beat?.narrativeChange;
  return change && realText(change.before) && realText(change.turn) && realText(change.after);
};
const validateDurationPlan = (plan, label) => {
  if (!isRecord(plan)) {
    errors.push(`${label} must be an object.`);
    return false;
  }
  if (!['user', 'fallback'].includes(plan.source)) errors.push(`${label}.source must be user or fallback.`);
  if (plan.requestedSeconds != null && !positiveNumber(plan.requestedSeconds)) errors.push(`${label}.requestedSeconds must be null or a positive number.`);
  if (plan.planningTargetSeconds != null && !positiveNumber(plan.planningTargetSeconds)) errors.push(`${label}.planningTargetSeconds must be null or a positive number.`);
  const range = plan.planningRangeSeconds;
  if (range != null && (!Array.isArray(range) || range.length !== 2 || !range.every(positiveNumber) || range[0] > range[1])) {
    errors.push(`${label}.planningRangeSeconds must be null or [positive-min, positive-max].`);
  }
  if (plan.finalAudioDeterminesRuntime !== true) errors.push(`${label}.finalAudioDeterminesRuntime must be true.`);
  if (plan.source === 'user' && (!positiveNumber(plan.requestedSeconds) || plan.planningTargetSeconds !== plan.requestedSeconds)) {
    errors.push(`${label} with source=user must preserve the requested seconds as planningTargetSeconds.`);
  }
  if (plan.source === 'fallback' && plan.requestedSeconds != null) errors.push(`${label} with source=fallback must use requestedSeconds=null.`);
  if (!positiveNumber(plan.planningTargetSeconds) && !Array.isArray(range)) errors.push(`${label} requires a planning target or range.`);
  return true;
};
const durationPlansMatch = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const publicRealPath = existsSync(publicDirectory) ? realpathSync(publicDirectory) : publicDirectory;
const checkPublicFile = (relative, label) => {
  if (!realText(relative)) {
    errors.push(`${label} is missing.`);
    return null;
  }
  const candidate = path.resolve(publicDirectory, relative);
  const fromPublic = path.relative(publicDirectory, candidate);
  if (fromPublic.startsWith('..') || path.isAbsolute(fromPublic)) {
    errors.push(`${label} escapes the public directory: ${relative}`);
    return null;
  }
  if (!existsSync(candidate)) {
    errors.push(`${label} does not exist: ${relative}`);
    return null;
  }
  const realCandidate = realpathSync(candidate);
  const realRelative = path.relative(publicRealPath, realCandidate);
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    errors.push(`${label} resolves outside the public directory: ${relative}`);
    return null;
  }
  if (!statSync(realCandidate).isFile()) {
    errors.push(`${label} must resolve to a regular file: ${relative}`);
    return null;
  }
  return realCandidate;
};
const sha256File = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const validateWatermarkCheck = (asset, assetFile) => {
  const label = `Watermark check for ${asset.id ?? '?'}`;
  const check = asset.watermarkCheck;
  if (!isRecord(check)) {
    errors.push(`${label} is required.`);
    return;
  }
  if (check.status !== 'clear') errors.push(`${label} must declare status=clear after local screening and visual confirmation.`);
  const reportFile = checkPublicFile(check.report, `${label} report`);
  if (!reportFile || !assetFile) return;
  let report;
  try {
    report = JSON.parse(readFileSync(reportFile, 'utf8'));
  } catch (error) {
    errors.push(`${label} report is invalid JSON: ${error.message}`);
    return;
  }
  const actualSha256 = sha256File(assetFile);
  if (report.status !== 'clear' || report.publishReady !== true) errors.push(`${label} report is not publish-ready clear.`);
  if (report.image?.sha256 !== actualSha256) errors.push(`${label} report SHA-256 does not match the final raster asset.`);
  if (report.visualConfirmation?.provided !== true || report.visualConfirmation?.confirmedSha256 !== actualSha256) {
    errors.push(`${label} report lacks a visual confirmation bound to the final raster SHA-256.`);
  }
  if (report.detector?.networkCalls !== 0 || report.detector?.apiOrModelCalls !== 0) {
    errors.push(`${label} report must come from a zero-network, zero-API/model local screen.`);
  }
};

const pythonCommand = ['python3', 'python'].find((command) => {
  const result = spawnSync(command, ['--version'], {encoding: 'utf8'});
  return !result.error && result.status === 0;
}) ?? null;
const ffprobeCommand = ['ffprobe'].find((command) => {
  const result = spawnSync(command, ['-version'], {encoding: 'utf8'});
  return !result.error && result.status === 0;
}) ?? null;
const rasterChecks = new Map();
const alphaChecks = new Map();
const audioChecks = new Map();
let narrationAudioMetadata = null;
const commandFailureDetail = (result, fallback) => result.stderr?.trim() || result.stdout?.trim() || result.error?.message || fallback;
const checkRasterFile = (file, label) => {
  if (!file) return null;
  if (!pythonCommand) {
    errors.push(`${label} cannot be decoded because Python is unavailable.`);
    return null;
  }
  let result = rasterChecks.get(file);
  if (!result) {
    result = spawnSync(pythonCommand, [rasterCheckScript, file], {encoding: 'utf8'});
    rasterChecks.set(file, result);
  }
  if (result.error || result.status !== 0) {
    errors.push(`${label} is not a decodable raster image: ${commandFailureDetail(result, 'unknown raster validation failure')}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    errors.push(`${label} returned invalid raster metadata: ${error.message}`);
    return null;
  }
};
const checkAlphaFile = (file, label) => {
  if (!file) return;
  if (!pythonCommand) {
    errors.push(`${label} cannot be alpha-validated because Python is unavailable.`);
    return;
  }
  let result = alphaChecks.get(file);
  if (!result) {
    result = spawnSync(pythonCommand, [alphaCheckScript, file], {encoding: 'utf8'});
    alphaChecks.set(file, result);
  }
  if (result.error || result.status !== 0) {
    let detail = result.stderr?.trim() || result.stdout?.trim() || result.error?.message || 'unknown alpha validation failure';
    try {
      const parsed = JSON.parse(result.stdout);
      if (Array.isArray(parsed.errors) && parsed.errors.length) detail = parsed.errors.join('; ');
    } catch {
      // Keep raw command output.
    }
    errors.push(`${label} failed real alpha validation: ${detail}`);
  }
};
const checkAudioFile = (file, label) => {
  if (!file) return;
  if (!ffprobeCommand) {
    errors.push(`${label} cannot be decoded because ffprobe is unavailable.`);
    return;
  }
  let result = audioChecks.get(file);
  if (!result) {
    result = spawnSync(ffprobeCommand, [
      '-v', 'error', '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_type,duration:format=duration', '-of', 'json', file,
    ], {encoding: 'utf8'});
    audioChecks.set(file, result);
  }
  if (result.error || result.status !== 0) {
    errors.push(`${label} is not decodable audio: ${commandFailureDetail(result, 'unknown ffprobe failure')}`);
    return;
  }
  try {
    const report = JSON.parse(result.stdout);
    const audioStream = Array.isArray(report.streams) ? report.streams.find((stream) => stream.codec_type === 'audio') : null;
    if (!audioStream) {
      errors.push(`${label} contains no audio stream.`);
      return null;
    }
    const duration = Number.parseFloat(report.format?.duration ?? audioStream.duration);
    if (!positiveNumber(duration)) errors.push(`${label} has no positive decodable duration.`);
    return {duration: positiveNumber(duration) ? duration : null};
  } catch (error) {
    errors.push(`${label} returned invalid ffprobe metadata: ${error.message}`);
    return null;
  }
};

const validateMotion = (layer, sceneId) => {
  const label = `Layer ${layer.id ?? '?'} in scene ${sceneId}`;
  if (layer.motion == null) return false;
  if (typeof layer.motion !== 'object' || Array.isArray(layer.motion)) {
    errors.push(`${label} motion must be an object.`);
    return false;
  }
  requireText(layer.motion.action, `${label} motion.action`);
  if (layer.motion.loop != null && !['none', 'bob', 'sway', 'pulse'].includes(layer.motion.loop)) {
    errors.push(`${label} motion.loop must be none, bob, sway, or pulse.`);
  }
  const keyframes = layer.motion.keyframes;
  if (!Array.isArray(keyframes) || keyframes.length < 2) {
    errors.push(`${label} motion.keyframes must contain at least two keyframes.`);
    return false;
  }
  let previousAt = -1;
  for (const [index, keyframe] of keyframes.entries()) {
    if (!Number.isFinite(keyframe?.at) || keyframe.at < 0 || keyframe.at > 1 || keyframe.at <= previousAt) {
      errors.push(`${label} motion.keyframes[${index}].at must be strictly increasing within 0..1.`);
    }
    if (Number.isFinite(keyframe?.at)) previousAt = keyframe.at;
    for (const field of ['x', 'y', 'rotation', 'scale', 'opacity']) {
      if (keyframe?.[field] != null && !Number.isFinite(keyframe[field])) errors.push(`${label} motion.keyframes[${index}].${field} must be finite.`);
    }
    if (keyframe?.scale != null && keyframe.scale < 0) errors.push(`${label} keyframe scale must be non-negative.`);
    if (keyframe?.opacity != null && (keyframe.opacity < 0 || keyframe.opacity > 1)) errors.push(`${label} keyframe opacity must be within 0..1.`);
  }
  const defaults = {x: 0, y: 0, rotation: 0, scale: 1, opacity: layer.opacity ?? 1};
  return realText(layer.motion.action) && Object.entries(defaults).some(([field, fallback]) => (
    new Set(keyframes.map((keyframe) => keyframe?.[field] ?? fallback)).size > 1
  ));
};
const layerCanAppearOnCanvas = (layer, raster, scene, projectValue) => {
  if (!positiveNumber(layer.width) || !positiveInteger(projectValue?.width) || !positiveInteger(projectValue?.height)) return false;
  const intrinsicRatio = positiveNumber(raster?.width) && positiveNumber(raster?.height) ? raster.height / raster.width : 1;
  const baseHeight = positiveNumber(layer.height) ? layer.height : layer.width * intrinsicRatio;
  const keyframes = Array.isArray(layer.motion?.keyframes) && layer.motion.keyframes.length >= 2 ? layer.motion.keyframes : [];
  const baseOpacity = layer.opacity ?? 1;
  const baseScale = layer.scale ?? 1;
  const valueAt = (field, fallback, progress) => {
    if (!keyframes.length) return fallback;
    if (progress <= keyframes[0].at) return keyframes[0][field] ?? fallback;
    if (progress >= keyframes.at(-1).at) return keyframes.at(-1)[field] ?? fallback;
    const rightIndex = keyframes.findIndex((keyframe) => keyframe.at >= progress);
    const left = keyframes[rightIndex - 1];
    const right = keyframes[rightIndex];
    const range = right.at - left.at;
    const local = range > 0 ? (progress - left.at) / range : 0;
    const leftValue = left[field] ?? fallback;
    const rightValue = right[field] ?? fallback;
    return leftValue + (rightValue - leftValue) * local;
  };
  const delay = layer.delay ?? 0;
  const minimumVisibleFrames = Math.max(3, Math.ceil((projectValue.fps ?? 30) * 0.15));
  const visibleStates = [];
  for (let frame = Math.max(0, delay + 1); frame < scene.duration; frame += 1) {
    const progress = frame / Math.max(1, scene.duration - 1);
    const opacity = valueAt('opacity', baseOpacity, progress);
    const semanticScale = valueAt('scale', 1, progress);
    const scale = baseScale * semanticScale;
    if (!finiteNumber(opacity) || opacity <= 0 || !positiveNumber(scale)) continue;
    const xOffset = valueAt('x', 0, progress);
    const yOffset = valueAt('y', 0, progress);
    const rotation = valueAt('rotation', 0, progress);
    const x = layer.x + xOffset;
    const y = layer.y + yOffset;
    const width = layer.width * scale;
    const height = baseHeight * scale;
    if (x < projectValue.width && x + width > 0 && y < projectValue.height && y + height > 0) {
      visibleStates.push([xOffset, yOffset, rotation, semanticScale, opacity]);
    }
  }
  if (visibleStates.length < minimumVisibleFrames) return false;
  const first = visibleStates[0];
  return visibleStates.some((state) => state.some((value, index) => Math.abs(value - first[index]) > 1e-4));
};

let bookCharacters = [];
let bookBeats = [];
let protagonistIds = [];
let bookCharacterIds = new Set();
let bookBeatIds = new Set();
let briefSourceIds = new Set();
let briefClaimIds = new Set();
let briefSourceById = new Map();
let briefClaimById = new Map();
let briefAssets = [];
let briefAssetById = new Map();
let researchBeatById = new Map();

if (project) {
  if (!isRecord(project)) errors.push('project.json must contain a JSON object.');
  requireText(project.title, 'project.title');
  if (project.contentMode === 'book-review') errors.push('project.contentMode must be normalized to canonical book before validation.');
  if (!['explainer', 'book'].includes(contentMode)) errors.push(`Unsupported project.contentMode: ${contentMode}.`);
  if (assetStrategy !== 'layered') errors.push('Every publishable project requires project.assetStrategy=layered.');
  if ((project.stylePreset ?? 'paper-cut') !== 'paper-cut') errors.push('The verified stylePreset is paper-cut.');
  validateDurationPlan(project.durationPlan, 'project.durationPlan');
  for (const field of ['width', 'height', 'fps', 'durationInFrames']) {
    if (!positiveInteger(project[field])) errors.push(`project.${field} must be a positive integer.`);
  }
  if (project.captionSafeBottom != null && (!nonNegativeInteger(project.captionSafeBottom) || project.captionSafeBottom >= project.height / 2)) {
    errors.push('project.captionSafeBottom must be a non-negative integer below half the composition height.');
  }
  if (!isRecord(project.palette)) {
    errors.push('project.palette must be an object with paper, ink, accent, and gold colors.');
  } else {
    for (const field of ['paper', 'ink', 'accent', 'gold']) {
      if (!validCssColor(project.palette[field])) errors.push(`project.palette.${field} must use a supported CSS color (hex, functional color, or common named color).`);
    }
  }
  if (project.brand != null) {
    if (!isRecord(project.brand)) {
      errors.push('project.brand must be an object when provided.');
    } else {
      validateOptionalBoolean(project.brand.show, 'project.brand.show');
      validateOptionalText(project.brand.handle, 'project.brand.handle');
      validateOptionalText(project.brand.logo, 'project.brand.logo');
      validateOptionalEnum(project.brand.placement, ['top-left', 'top-right', 'bottom-left', 'bottom-right'], 'project.brand.placement');
      validateOptionalNumber(
        project.brand.logoWidth,
        'project.brand.logoWidth',
        (value) => positiveNumber(value) && value <= project.width / 2,
        'a positive number no greater than half the composition width',
      );
      validateOptionalNumber(
        project.brand.opacity,
        'project.brand.opacity',
        (value) => positiveNumber(value) && value <= 1,
        'greater than 0 and no greater than 1',
      );
      if (project.brand.show === true && !realText(project.brand.handle) && !realText(project.brand.logo)) {
        errors.push('project.brand.show requires project.brand.handle, project.brand.logo, or both.');
      }
      if (realText(project.brand.logo)) {
        checkRasterFile(checkPublicFile(project.brand.logo, 'Brand logo'), 'Brand logo');
      }
    }
  }
  if (!project.audio || typeof project.audio !== 'object' || Array.isArray(project.audio)) {
    errors.push('project.audio must be an object.');
  } else {
    validateOptionalText(project.audio.voice, 'project.audio.voice');
    validateOptionalText(project.audio.music, 'project.audio.music');
    validateOptionalBoolean(project.audio.intentionalSilence, 'project.audio.intentionalSilence');
    validateOptionalNumber(project.audio.musicVolume, 'project.audio.musicVolume', nonNegativeNumber, 'a non-negative finite number');
    validateOptionalNumber(project.audio.tailSeconds, 'project.audio.tailSeconds', (value) => nonNegativeNumber(value) && value <= 10, 'between 0 and 10 seconds');
    if (!project.audio.voice && project.audio.intentionalSilence !== true) errors.push('project.audio.voice is required unless intentionalSilence is true.');
    if (contentMode === 'book' && !project.audio.voice) errors.push('book content requires final narration audio.');
    if (project.audio.voice) narrationAudioMetadata = checkAudioFile(checkPublicFile(project.audio.voice, 'Narration audio'), 'Narration audio');
    if (project.audio.music) checkAudioFile(checkPublicFile(project.audio.music, 'Music audio'), 'Music audio');
  }
}

if (brief) {
  if (brief.project?.contentMode === 'book-review') errors.push('creative-brief project.contentMode must be canonical book, not the legacy input alias.');
  if (normalizeContentMode(brief.project?.contentMode) !== contentMode) errors.push('creative-brief project.contentMode does not match project.json.');
  if (brief.visualSystem?.assetStrategy !== 'layered') errors.push('creative-brief visualSystem.assetStrategy must be layered.');
  validateDurationPlan(brief.project?.durationPlan, 'creative-brief project.durationPlan');
  if (!durationPlansMatch(brief.project?.durationPlan, project?.durationPlan)) errors.push('creative-brief durationPlan must match project.json.');
}

if (contentMode === 'book' && project) {
  for (const field of ['title', 'author', 'angle']) {
    requireText(project.book?.[field], `project.book.${field}`);
    requireText(brief?.project?.book?.[field], `creative-brief project.book.${field}`);
    if (realText(project.book?.[field]) && realText(brief?.project?.book?.[field]) && !valuesMatch(project.book[field], brief.project.book[field])) {
      errors.push(`creative-brief project.book.${field} does not match project.json.`);
    }
  }
  if (!['none', 'low', 'full'].includes(project.book?.spoilerLevel)) errors.push('project.book.spoilerLevel must be none, low, or full.');
  validateOptionalText(project.book?.label, 'project.book.label');
  if (brief?.project?.book?.spoilerLevel !== project.book?.spoilerLevel) errors.push('creative-brief spoilerLevel does not match project.json.');
  const originalTitles = [project.book?.originalTitle, brief?.project?.book?.originalTitle].filter((value) => value != null && value !== '');
  if (originalTitles.length && (originalTitles.length !== 2 || originalTitles.some((value) => !realText(value)) || !valuesMatch(originalTitles[0], originalTitles[1]))) {
    errors.push('Book originalTitle must be real and match in creative brief and project, or be omitted in both.');
  }
  requireText(brief?.visualSystem?.seriesAnchor, 'creative-brief visualSystem.seriesAnchor');

  const sources = Array.isArray(brief?.evidence?.sources) ? brief.evidence.sources : [];
  const claims = Array.isArray(brief?.evidence?.claims) ? brief.evidence.claims : [];
  if (!sources.length) errors.push('book creative brief requires evidence.sources.');
  if (!claims.length) errors.push('book creative brief requires evidence.claims.');
  for (const [index, source] of sources.entries()) {
    requireText(source.id, `creative-brief evidence.sources[${index}].id`);
    requireText(source.title, `creative-brief evidence.sources[${index}].title`);
    if (!validHttpUrl(source.url)) errors.push(`creative-brief evidence.sources[${index}].url must be a direct http(s) URL.`);
    if (realText(source.id) && briefSourceIds.has(source.id)) errors.push(`Duplicate creative-brief source id: ${source.id}.`);
    if (realText(source.id)) {
      briefSourceIds.add(source.id);
      briefSourceById.set(source.id, source);
    }
  }
  for (const [index, claim] of claims.entries()) {
    requireText(claim.id, `creative-brief evidence.claims[${index}].id`);
    requireText(claim.statement ?? claim.text, `creative-brief evidence.claims[${index}].statement`);
    if (realText(claim.id) && briefClaimIds.has(claim.id)) errors.push(`Duplicate creative-brief claim id: ${claim.id}.`);
    if (realText(claim.id)) {
      briefClaimIds.add(claim.id);
      briefClaimById.set(claim.id, claim);
    }
    const sourceIds = Array.isArray(claim.sourceIds) ? claim.sourceIds : [];
    const commentary = claim.kind === 'commentary' || claim.attribution === 'creator-interpretation';
    if (!commentary && !sourceIds.length) errors.push(`creative-brief claim ${claim.id ?? index} requires sourceIds.`);
    for (const sourceId of sourceIds) if (!briefSourceIds.has(sourceId)) errors.push(`creative-brief claim ${claim.id ?? index} references unknown source ${sourceId}.`);
  }

  bookCharacters = Array.isArray(brief?.story?.characters) ? brief.story.characters : [];
  bookBeats = Array.isArray(brief?.story?.beats) ? brief.story.beats : [];
  protagonistIds = Array.isArray(brief?.story?.protagonistIds) ? brief.story.protagonistIds : [];
  if (!bookCharacters.length) errors.push('book creative brief requires story.characters.');
  if (!bookBeats.length) errors.push('book creative brief requires story.beats.');
  if (!protagonistIds.length) errors.push('book creative brief requires story.protagonistIds.');
  for (const [index, character] of bookCharacters.entries()) {
    const label = `creative-brief story.characters[${index}]`;
    requireText(character.id, `${label}.id`);
    requireText(character.name, `${label}.name`);
    requireText(character.narrativeRole, `${label}.narrativeRole`);
    requireText(character.continuityAnchor, `${label}.continuityAnchor`);
    if (realText(character.id) && bookCharacterIds.has(character.id)) errors.push(`Duplicate story character id: ${character.id}.`);
    if (realText(character.id)) bookCharacterIds.add(character.id);
    const sourceIds = Array.isArray(character.sourceIds) ? character.sourceIds : [];
    if (!sourceIds.length) errors.push(`${label}.sourceIds must cite character research.`);
    for (const sourceId of sourceIds) if (!briefSourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
  }
  for (const protagonistId of protagonistIds) if (!bookCharacterIds.has(protagonistId)) errors.push(`Unknown protagonist id: ${protagonistId}.`);
  for (const [index, beat] of bookBeats.entries()) {
    const label = `creative-brief story.beats[${index}]`;
    requireText(beat.id, `${label}.id`);
    requireText(beat.narrativePurpose, `${label}.narrativePurpose`);
    if (!validNarrativeChange(beat)) errors.push(`${label}.narrativeChange must contain real before, turn, and after text.`);
    requireText(visualActionText(beat), `${label}.visualAction.action`);
    if (realText(beat.id) && bookBeatIds.has(beat.id)) errors.push(`Duplicate story beat id: ${beat.id}.`);
    if (realText(beat.id)) bookBeatIds.add(beat.id);
    const characterIds = beatCharacterIds(beat);
    if (!characterIds.length) errors.push(`${label} must reference at least one character.`);
    for (const characterId of characterIds) if (!bookCharacterIds.has(characterId)) errors.push(`${label} references unknown character ${characterId}.`);
    const claimIds = Array.isArray(beat.claimIds) ? beat.claimIds : [];
    const sourceIds = Array.isArray(beat.sourceIds) ? beat.sourceIds : [];
    if (!claimIds.length || !sourceIds.length) errors.push(`${label} must reference claims and sources.`);
    for (const claimId of claimIds) if (!briefClaimIds.has(claimId)) errors.push(`${label} references unknown claim ${claimId}.`);
    for (const sourceId of sourceIds) if (!briefSourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
  }
  for (const protagonistId of protagonistIds) {
    if (!bookBeats.some((beat) => beatCharacterIds(beat).includes(protagonistId))) errors.push(`Protagonist ${protagonistId} is not connected to any story beat.`);
  }

  briefAssets = Array.isArray(brief?.assets) ? brief.assets : [];
  if (!briefAssets.length) errors.push('book creative brief requires assets linking every beat to backgrounds and independent layers.');
  for (const [index, asset] of briefAssets.entries()) {
    const label = `creative-brief assets[${index}]`;
    requireText(asset.id, `${label}.id`);
    if (!['background', 'layer', 'foreground'].includes(asset.type)) errors.push(`${label}.type must be background, layer, or foreground.`);
    if (realText(asset.id) && briefAssetById.has(asset.id)) errors.push(`Duplicate creative-brief asset id: ${asset.id}.`);
    if (realText(asset.id)) briefAssetById.set(asset.id, asset);
    const assetBeatIds = Array.isArray(asset.beatIds) ? asset.beatIds : [];
    if (!assetBeatIds.length) errors.push(`${label}.beatIds must link the asset to at least one story beat.`);
    for (const beatId of assetBeatIds) if (!bookBeatIds.has(beatId)) errors.push(`${label} references unknown story beat ${beatId}.`);
    if (asset.characterId && !bookCharacterIds.has(asset.characterId)) errors.push(`${label} references unknown character ${asset.characterId}.`);
    if (asset.type === 'background') {
      const excluded = Array.isArray(asset.excludedSubjectIds) ? asset.excludedSubjectIds : [];
      const requiredExcluded = new Set(bookBeats.filter((beat) => assetBeatIds.includes(beat.id)).flatMap(beatCharacterIds));
      for (const characterId of requiredExcluded) if (!excluded.includes(characterId)) errors.push(`${label} must exclude featured character ${characterId}.`);
    }
  }
  for (const beat of bookBeats) {
    const linkedAssets = briefAssets.filter((asset) => Array.isArray(asset.beatIds) && asset.beatIds.includes(beat.id));
    if (!linkedAssets.some((asset) => asset.type === 'background')) errors.push(`Story beat ${beat.id} has no creative-brief background asset.`);
    if (!linkedAssets.some((asset) => ['layer', 'foreground'].includes(asset.type))) errors.push(`Story beat ${beat.id} has no creative-brief independent layer.`);
    const subjectLayerId = beat.visualAction?.subjectLayerId;
    requireText(subjectLayerId, `Story beat ${beat.id} visualAction.subjectLayerId`);
    if (realText(subjectLayerId) && !linkedAssets.some((asset) => asset.id === subjectLayerId && asset.type !== 'background')) {
      errors.push(`Story beat ${beat.id} visualAction.subjectLayerId must reference an independent asset linked to the beat.`);
    }
    const targetLayerId = beat.visualAction?.targetLayerId;
    if (targetLayerId != null && targetLayerId !== '' && !linkedAssets.some((asset) => asset.id === targetLayerId && asset.type !== 'background')) {
      errors.push(`Story beat ${beat.id} visualAction.targetLayerId must reference an independent asset linked to the beat.`);
    }
    for (const characterId of beatCharacterIds(beat)) {
      if (!linkedAssets.some((asset) => asset.characterId === characterId && asset.type !== 'background')) {
        errors.push(`Story beat ${beat.id} has no creative-brief independent cutout for character ${characterId}.`);
      }
    }
  }
}

if (positiveNumber(narrationAudioMetadata?.duration) && positiveInteger(project?.fps) && positiveInteger(project?.durationInFrames)) {
  const declaredTail = project.audio?.tailSeconds ?? 0;
  const timelineSeconds = project.durationInFrames / project.fps;
  const expectedTimelineSeconds = narrationAudioMetadata.duration + declaredTail;
  const frameToleranceSeconds = Math.max(0.08, 2 / project.fps);
  if (Math.abs(timelineSeconds - expectedTimelineSeconds) > frameToleranceSeconds) {
    errors.push(`Timeline must equal final narration duration plus project.audio.tailSeconds (timeline ${timelineSeconds.toFixed(3)}s, audio ${narrationAudioMetadata.duration.toFixed(3)}s, tail ${declaredTail.toFixed(3)}s).`);
  }
}
if (contentMode === 'book') {
  if (!research) {
    errors.push('book content requires book-research.json.');
  } else {
    if (research.schemaVersion !== 2) errors.push('book-research schemaVersion must be 2.');
    if (research.contentMode !== 'book') errors.push('book-research contentMode must be canonical book.');
    const mappings = [
      ['book.title', research.book?.title, project?.book?.title],
      ['book.author', research.book?.author, project?.book?.author],
      ['editorial.angle', research.editorial?.angle, project?.book?.angle],
    ];
    for (const [label, researchValue, projectValue] of mappings) {
      requireText(researchValue, `book-research ${label}`);
      if (realText(researchValue) && realText(projectValue) && !valuesMatch(researchValue, projectValue)) errors.push(`book-research ${label} does not match project.json.`);
    }
    if (research.editorial?.spoilerPolicy?.level !== project?.book?.spoilerLevel) errors.push('book-research spoilerPolicy.level does not match project.json.');
    if (!realText(research.editorial?.quotePolicy)) errors.push('book-research editorial.quotePolicy is required.');
    const narrationTiming = research.storySpine?.narrationTiming;
    const durationPlan = brief?.project?.durationPlan;
    if (!isRecord(narrationTiming)) {
      errors.push('book-research storySpine.narrationTiming is required.');
    } else {
      if (narrationTiming.durationRule !== 'ask-user-then-fit-approved-narration') errors.push('book-research narrationTiming.durationRule is unsupported.');
      if (narrationTiming.finalAudioDeterminesRuntime !== true) errors.push('book-research narrationTiming.finalAudioDeterminesRuntime must be true.');
      for (const field of ['preferenceSource', 'requestedSeconds', 'planningTargetSeconds', 'planningRangeSeconds']) {
        const planField = field === 'preferenceSource' ? 'source' : field;
        if (JSON.stringify(narrationTiming[field] ?? null) !== JSON.stringify(durationPlan?.[planField] ?? null)) {
          errors.push(`book-research narrationTiming.${field} must match creative-brief durationPlan.${planField}.`);
        }
      }
    }
    const sources = Array.isArray(research.sources) ? research.sources : [];
    const claims = Array.isArray(research.claims) ? research.claims : [];
    const sourceIds = new Set();
    const claimIds = new Set();
    const claimById = new Map();
    const sourceClasses = ['primary-text', 'author-or-estate', 'publisher', 'library-or-archive', 'museum-or-government', 'scholarly', 'institutional-guide', 'criticism', 'reception-only'];
    const rightsUses = ['fact-check-only', 'visual-reference-only', 'licensed-asset', 'public-domain-asset'];
    const spoilerRank = {none: 0, low: 1, full: 2};
    if (!sources.length) errors.push('book-research requires inspected sources.');
    if (!claims.length) errors.push('book-research requires atomic claims.');
    for (const [index, source] of sources.entries()) {
      requireText(source.id, `book-research sources[${index}].id`);
      requireText(source.title, `book-research sources[${index}].title`);
      requireText(source.accessedAt, `book-research sources[${index}].accessedAt`);
      if (!validHttpUrl(source.url)) errors.push(`book-research sources[${index}].url must be a direct http(s) URL.`);
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(source.accessedAt ?? '') || Number.isNaN(Date.parse(`${source.accessedAt}T00:00:00Z`))) errors.push(`book-research sources[${index}].accessedAt must be a real YYYY-MM-DD date.`);
      if (!sourceClasses.includes(source.sourceClass)) errors.push(`book-research sources[${index}].sourceClass is unsupported.`);
      requireText(source.editionScope, `book-research sources[${index}].editionScope`);
      if (!Array.isArray(source.authoritativeFor) || !source.authoritativeFor.length || source.authoritativeFor.some((entry) => !realText(entry))) errors.push(`book-research sources[${index}].authoritativeFor requires at least one real authority scope.`);
      if (!rightsUses.includes(source.rightsUse)) errors.push(`book-research sources[${index}].rightsUse is unsupported.`);
      if (realText(source.id) && sourceIds.has(source.id)) errors.push(`Duplicate book-research source id: ${source.id}.`);
      if (realText(source.id)) sourceIds.add(source.id);
      const briefSource = briefSourceById.get(source.id);
      if (briefSource) {
        if (!valuesMatch(source.title, briefSource.title)) errors.push(`book-research source ${source.id} title does not match the creative brief.`);
        if (source.url !== briefSource.url) errors.push(`book-research source ${source.id} URL does not match the creative brief.`);
      }
    }
    for (const [index, claim] of claims.entries()) {
      requireText(claim.id, `book-research claims[${index}].id`);
      requireText(claim.statement, `book-research claims[${index}].statement`);
      requireText(claim.claimType, `book-research claims[${index}].claimType`);
      requireText(claim.attribution, `book-research claims[${index}].attribution`);
      if (!['proposed', 'verified', 'conflicted', 'excluded'].includes(claim.status)) errors.push(`book-research claim ${claim.id ?? index} has unsupported status.`);
      if (!['high', 'medium', 'low'].includes(claim.confidence)) errors.push(`book-research claim ${claim.id ?? index} has unsupported confidence.`);
      if (!['none', 'low', 'full'].includes(claim.spoilerLevel)) errors.push(`book-research claim ${claim.id ?? index} has unsupported spoilerLevel.`);
      if (!['canon-explicit', 'authoritative-context', 'creative-direction', 'unverified'].includes(claim.depictionStatus)) errors.push(`book-research claim ${claim.id ?? index} has unsupported depictionStatus.`);
      if (realText(claim.id) && claimIds.has(claim.id)) errors.push(`Duplicate book-research claim id: ${claim.id}.`);
      if (realText(claim.id)) {
        claimIds.add(claim.id);
        claimById.set(claim.id, claim);
      }
      const linkedSources = Array.isArray(claim.sourceIds) ? claim.sourceIds : [];
      if (claim.status === 'verified' && !linkedSources.length) errors.push(`Verified book-research claim ${claim.id ?? index} requires sourceIds.`);
      for (const sourceId of linkedSources) if (!sourceIds.has(sourceId)) errors.push(`book-research claim ${claim.id ?? index} references unknown source ${sourceId}.`);
      const briefClaim = briefClaimById.get(claim.id);
      if (briefClaim) {
        if (!valuesMatch(claim.statement, briefClaim.statement ?? briefClaim.text)) errors.push(`book-research claim ${claim.id} statement does not match the creative brief.`);
        if (!sameStringSet(claim.sourceIds, briefClaim.sourceIds)) errors.push(`book-research claim ${claim.id} sourceIds do not match the creative brief.`);
        if (!valuesMatch(claim.attribution, briefClaim.attribution)) errors.push(`book-research claim ${claim.id} attribution does not match the creative brief.`);
      }
      if (claim.status === 'verified') {
        const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
        if (!evidence.length) errors.push(`Verified book-research claim ${claim.id ?? index} requires inspected evidence locators.`);
        for (const [evidenceIndex, entry] of evidence.entries()) {
          if (!linkedSources.includes(entry?.sourceId)) errors.push(`book-research claim ${claim.id ?? index} evidence[${evidenceIndex}] must reference one of its sourceIds.`);
          requireText(entry?.locator, `book-research claim ${claim.id ?? index} evidence[${evidenceIndex}].locator`);
          requireText(entry?.supportType, `book-research claim ${claim.id ?? index} evidence[${evidenceIndex}].supportType`);
        }
      }
    }
    for (const sourceId of briefSourceIds) if (!sourceIds.has(sourceId)) errors.push(`Creative-brief source ${sourceId} is missing from book-research.`);
    for (const claimId of briefClaimIds) if (!claimIds.has(claimId)) errors.push(`Creative-brief claim ${claimId} is missing from book-research.`);
    const contradictions = Array.isArray(research.contradictions) ? research.contradictions : [];
    const unresolvedClaimIds = new Set();
    for (const [index, contradiction] of contradictions.entries()) {
      requireText(contradiction.id, `book-research contradictions[${index}].id`);
      if (!['resolved', 'unresolved'].includes(contradiction.status)) errors.push(`book-research contradiction ${contradiction.id ?? index} has unsupported status.`);
      for (const claimId of contradiction.claimIds ?? []) {
        if (!claimIds.has(claimId)) errors.push(`book-research contradiction ${contradiction.id ?? index} references unknown claim ${claimId}.`);
        if (contradiction.status === 'unresolved') unresolvedClaimIds.add(claimId);
      }
    }
    const characters = Array.isArray(research.characterBible?.characters) ? research.characterBible.characters : [];
    const beats = Array.isArray(research.storySpine?.beats) ? research.storySpine.beats : [];
    const researchCharacterIds = new Set();
    const researchBeatIds = new Set();
    if (!characters.length) errors.push('book-research requires characterBible.characters.');
    if (!beats.length) errors.push('book-research requires storySpine.beats.');
    for (const [index, character] of characters.entries()) {
      requireText(character.id, `book-research characterBible.characters[${index}].id`);
      requireText(character.canonicalName, `book-research characterBible.characters[${index}].canonicalName`);
      requireText(character.narrativeRole, `book-research characterBible.characters[${index}].narrativeRole`);
      requireText(character.goal, `book-research characterBible.characters[${index}].goal`);
      requireText(character.tension, `book-research characterBible.characters[${index}].tension`);
      requireText(character.agency, `book-research characterBible.characters[${index}].agency`);
      if (realText(character.id)) researchCharacterIds.add(character.id);
      for (const claimId of character.claimIds ?? []) {
        if (!claimIds.has(claimId)) errors.push(`book-research character ${character.id ?? index} references unknown claim ${claimId}.`);
        if (unresolvedClaimIds.has(claimId)) errors.push(`book-research character ${character.id ?? index} uses unresolved claim ${claimId}.`);
        const claim = claimById.get(claimId);
        if (claim && claim.status !== 'verified') errors.push(`book-research character ${character.id ?? index} uses claim ${claimId} with non-publishable status ${claim.status}.`);
      }
      for (const sourceId of character.sourceIds ?? []) if (!sourceIds.has(sourceId)) errors.push(`book-research character ${character.id ?? index} references unknown source ${sourceId}.`);
      const briefCharacter = bookCharacters.find((entry) => entry.id === character.id);
      if (briefCharacter) {
        if (!valuesMatch(character.canonicalName, briefCharacter.name)) errors.push(`book-research character ${character.id} name does not match the creative brief.`);
        if (!valuesMatch(character.narrativeRole, briefCharacter.narrativeRole)) errors.push(`book-research character ${character.id} narrativeRole does not match the creative brief.`);
        if (!sameStringSet(character.sourceIds, briefCharacter.sourceIds)) errors.push(`book-research character ${character.id} sourceIds do not match the creative brief.`);
        const creativeDirections = Array.isArray(character.visualIdentity?.creativeDirection) ? character.visualIdentity.creativeDirection : [];
        const directionTexts = creativeDirections.map((entry) => typeof entry === 'string' ? entry : entry?.trait).filter(realText);
        if (realText(briefCharacter.continuityAnchor) && !directionTexts.some((entry) => valuesMatch(entry, briefCharacter.continuityAnchor))) {
          errors.push(`book-research character ${character.id} creativeDirection must preserve the creative-brief continuityAnchor.`);
        }
      }
    }
    for (const [index, beat] of beats.entries()) {
      const label = `book-research storySpine.beats[${index}]`;
      requireText(beat.id, `${label}.id`);
      requireText(beat.narrativePurpose, `${label}.narrativePurpose`);
      if (!validNarrativeChange(beat)) errors.push(`${label}.narrativeChange must contain before, turn, and after.`);
      requireText(visualActionText(beat), `${label}.visualAction.action`);
      if (realText(beat.id) && researchBeatIds.has(beat.id)) errors.push(`Duplicate book-research story beat id: ${beat.id}.`);
      if (realText(beat.id)) {
        researchBeatIds.add(beat.id);
        researchBeatById.set(beat.id, beat);
      }
      const beatCharacterReferences = beatCharacterIds(beat);
      const beatClaimIds = Array.isArray(beat.claimIds) ? beat.claimIds : [];
      const beatSourceIds = Array.isArray(beat.sourceIds) ? beat.sourceIds : [];
      if (!beatCharacterReferences.length || !beatClaimIds.length || !beatSourceIds.length) errors.push(`${label} must connect characters, claims, and sources.`);
      if (!['none', 'low', 'full'].includes(beat.spoilerLevel)) errors.push(`${label}.spoilerLevel is required.`);
      requireText(beat.spoilerNotes, `${label}.spoilerNotes`);
      if (spoilerRank[beat.spoilerLevel] > spoilerRank[project?.book?.spoilerLevel]) errors.push(`${label} exceeds the project's spoiler policy.`);
      for (const characterId of beatCharacterReferences) if (!researchCharacterIds.has(characterId)) errors.push(`${label} references unknown character ${characterId}.`);
      for (const claimId of beatClaimIds) {
        if (!claimIds.has(claimId)) errors.push(`${label} references unknown claim ${claimId}.`);
        if (unresolvedClaimIds.has(claimId)) errors.push(`${label} uses unresolved claim ${claimId}.`);
        const claim = claimById.get(claimId);
        if (claim && claim.status !== 'verified') errors.push(`${label} uses claim ${claimId} with non-publishable status ${claim.status}.`);
        if (claim && spoilerRank[claim.spoilerLevel] > spoilerRank[project?.book?.spoilerLevel]) errors.push(`${label} uses claim ${claimId} beyond the project's spoiler policy.`);
      }
      for (const sourceId of beatSourceIds) if (!sourceIds.has(sourceId)) errors.push(`${label} references unknown source ${sourceId}.`);
      for (const claimId of beatClaimIds) {
        const claim = claimById.get(claimId);
        for (const sourceId of claim?.sourceIds ?? []) if (!beatSourceIds.includes(sourceId)) errors.push(`${label}.sourceIds omits source ${sourceId} used by claim ${claimId}.`);
      }

      const briefBeat = bookBeats.find((entry) => entry.id === beat.id);
      if (briefBeat) {
        if (!valuesMatch(beat.narrativePurpose, briefBeat.narrativePurpose)) errors.push(`${label}.narrativePurpose does not match the creative brief.`);
        if (!valuesMatch(beat.narrationIntent, briefBeat.narrationIntent)) errors.push(`${label}.narrationIntent does not match the creative brief.`);
        for (const field of ['before', 'turn', 'after']) {
          if (!valuesMatch(beat.narrativeChange?.[field], briefBeat.narrativeChange?.[field])) errors.push(`${label}.narrativeChange.${field} does not match the creative brief.`);
        }
        for (const field of ['subjectLayerId', 'action', 'targetLayerId', 'result']) {
          if (!valuesMatch(beat.visualAction?.[field], briefBeat.visualAction?.[field])) errors.push(`${label}.visualAction.${field} does not match the creative brief.`);
        }
        if (!sameStringSet(beatCharacterIds(beat), beatCharacterIds(briefBeat))) errors.push(`${label}.characters do not match the creative brief.`);
        if (!sameStringSet(beat.claimIds, briefBeat.claimIds)) errors.push(`${label}.claimIds do not match the creative brief.`);
        if (!sameStringSet(beat.sourceIds, briefBeat.sourceIds)) errors.push(`${label}.sourceIds do not match the creative brief.`);
        if (beat.spoilerLevel !== briefBeat.spoilerLevel) errors.push(`${label}.spoilerLevel does not match the creative brief.`);
      }
      const plan = beat.layerPlan;
      const backgroundId = plan?.background?.assetId;
      requireText(backgroundId, `${label}.layerPlan.background.assetId`);
      if (!Array.isArray(plan?.background?.featuredSubjects) || plan.background.featuredSubjects.length !== 0) {
        errors.push(`${label}.layerPlan.background.featuredSubjects must be an empty array.`);
      }
      const backgroundAsset = briefAssetById.get(backgroundId);
      if (realText(backgroundId) && (!backgroundAsset || backgroundAsset.type !== 'background' || !(backgroundAsset.beatIds ?? []).includes(beat.id))) {
        errors.push(`${label}.layerPlan.background.assetId must reference a creative-brief background linked to the beat.`);
      }
      const plannedIndependentIds = [];
      for (const group of ['subjects', 'props', 'foreground']) {
        const ids = plan?.[group];
        if (!Array.isArray(ids)) {
          errors.push(`${label}.layerPlan.${group} must be an array.`);
          continue;
        }
        for (const assetId of ids) {
          plannedIndependentIds.push(assetId);
          const plannedAsset = briefAssetById.get(assetId);
          if (!plannedAsset || plannedAsset.type === 'background' || !(plannedAsset.beatIds ?? []).includes(beat.id)) {
            errors.push(`${label}.layerPlan.${group} references an unknown or unlinked independent asset ${assetId}.`);
          }
          if (group === 'foreground' && plannedAsset && plannedAsset.type !== 'foreground') errors.push(`${label}.layerPlan.foreground asset ${assetId} must use type foreground.`);
        }
      }
      if (new Set(plannedIndependentIds).size !== plannedIndependentIds.length) errors.push(`${label}.layerPlan repeats an independent asset id.`);
      if (realText(beat.visualAction?.subjectLayerId) && !plannedIndependentIds.includes(beat.visualAction.subjectLayerId)) errors.push(`${label}.visualAction.subjectLayerId is missing from layerPlan.`);
      if (realText(beat.visualAction?.targetLayerId) && !plannedIndependentIds.includes(beat.visualAction.targetLayerId)) errors.push(`${label}.visualAction.targetLayerId is missing from layerPlan.`);
    }
    for (const characterId of bookCharacterIds) if (!researchCharacterIds.has(characterId)) errors.push(`Creative-brief character ${characterId} is missing from the research character bible.`);
    for (const beatId of bookBeatIds) if (!researchBeatIds.has(beatId)) errors.push(`Creative-brief beat ${beatId} is missing from the research story spine.`);
    for (const flag of ['backgroundPlatesExcludeFeaturedSubjects', 'charactersUseIndependentAlphaAssets', 'movingOrOccludingPropsUseIndependentLayers', 'foregroundDepthElementsUseIndependentLayers']) {
      if (research.layerContract?.[flag] !== true) errors.push(`book-research layerContract.${flag} must be true.`);
    }
    if (research.layerContract?.generatedTextInRasterAssets !== false) errors.push('book-research layerContract.generatedTextInRasterAssets must be false.');
    const exclusions = Array.isArray(research.guardrails?.visualExclusions) ? research.guardrails.visualExclusions : [];
    if (exclusions.length < 3 || exclusions.some((entry) => !realText(entry))) errors.push('book-research guardrails.visualExclusions requires at least three real entries.');
  }
}

if (project?.scenes != null && !Array.isArray(project.scenes)) errors.push('project.scenes must be an array.');
const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
if (!scenes.length) errors.push('project.json must contain at least one scene.');
const sceneIds = new Set();
let validTimeline = scenes.length > 0 && positiveInteger(project?.durationInFrames);
for (const scene of scenes) {
  const sceneId = scene.id ?? '?';
  if (!realText(scene.id)) errors.push('Every scene must have an id.');
  else if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}.`);
  else sceneIds.add(scene.id);
  if (!nonNegativeInteger(scene.from)) { errors.push(`Scene ${sceneId} from must be a non-negative integer.`); validTimeline = false; }
  if (!positiveInteger(scene.duration)) { errors.push(`Scene ${sceneId} duration must be a positive integer.`); validTimeline = false; }
  if (nonNegativeInteger(scene.from) && positiveInteger(scene.duration) && positiveInteger(project?.durationInFrames) && scene.from + scene.duration > project.durationInFrames) errors.push(`Scene ${sceneId} extends past durationInFrames.`);
  checkRasterFile(checkPublicFile(scene.background, `Background for scene ${sceneId}`), `Background for scene ${sceneId}`);
  validateOptionalBoolean(scene.hero, `Scene ${sceneId} hero`);
  validateOptionalBoolean(scene.decorations, `Scene ${sceneId} decorations`);
  validateOptionalBoolean(scene.showBookMeta, `Scene ${sceneId} showBookMeta`);
  for (const field of ['title', 'eyebrow', 'caption', 'note', 'tint', 'backgroundPosition']) {
    validateOptionalText(scene[field], `Scene ${sceneId} ${field}`);
  }
  validateOptionalEnum(scene.captionStyle, ['strip', 'card', 'minimal'], `Scene ${sceneId} captionStyle`);
  validateOptionalEnum(scene.transition, ['fade', 'paper-wipe', 'cut'], `Scene ${sceneId} transition`);
  validateOptionalEnum(scene.titleAlign, ['left', 'center', 'right'], `Scene ${sceneId} titleAlign`);
  for (const field of ['titleX', 'titleY']) validateOptionalNumber(scene[field], `Scene ${sceneId} ${field}`);
  for (const field of ['titleWidth', 'titleSize']) validateOptionalNumber(scene[field], `Scene ${sceneId} ${field}`, positiveNumber, 'a positive finite number');
  validateOptionalNumber(scene.transitionSfxVolume, `Scene ${sceneId} transitionSfxVolume`, nonNegativeNumber, 'a non-negative finite number');
  if (scene.camera != null) {
    if (!isRecord(scene.camera)) {
      errors.push(`Scene ${sceneId} camera must be an object when provided.`);
    } else {
      for (const field of ['scaleFrom', 'scaleTo']) validateOptionalNumber(scene.camera[field], `Scene ${sceneId} camera.${field}`, positiveNumber, 'a positive finite number');
      for (const field of ['xFrom', 'xTo', 'yFrom', 'yTo']) validateOptionalNumber(scene.camera[field], `Scene ${sceneId} camera.${field}`);
    }
  }
  if (scene.transitionSfx) checkAudioFile(checkPublicFile(scene.transitionSfx, `Transition sound for scene ${sceneId}`), `Transition sound for scene ${sceneId}`);
  if (!Array.isArray(scene.layers)) errors.push(`Scene ${sceneId} must declare layers as an array.`);
  const layers = Array.isArray(scene.layers) ? scene.layers : [];
  if (scene.hero !== false && !layers.length) errors.push(`Hero scene ${sceneId} must contain independent alpha layers.`);
  if (contentMode === 'book') {
    if (!realText(scene.storyBeatId)) errors.push(`Book scene ${sceneId} must declare storyBeatId.`);
    else if (!bookBeatIds.has(scene.storyBeatId)) errors.push(`Book scene ${sceneId} references unknown storyBeatId ${scene.storyBeatId}.`);
  }
  const layerIds = new Set();
  let semanticPrimary = false;
  let visiblePrimary = false;
  for (const layer of layers) {
    if (!realText(layer.id)) errors.push(`A layer in scene ${sceneId} has no id.`);
    else if (layerIds.has(layer.id)) errors.push(`Duplicate layer id in scene ${sceneId}: ${layer.id}.`);
    else layerIds.add(layer.id);
    if (!['primary', 'secondary', 'tertiary', 'foreground'].includes(layer.role)) errors.push(`Layer ${layer.id ?? '?'} has unsupported role ${layer.role}.`);
    for (const field of ['x', 'y']) validateOptionalNumber(layer[field], `Layer ${layer.id ?? '?'} in scene ${sceneId} ${field}`);
    if (!finiteNumber(layer.x)) errors.push(`Layer ${layer.id ?? '?'} in scene ${sceneId} x is required and must be finite.`);
    if (!finiteNumber(layer.y)) errors.push(`Layer ${layer.id ?? '?'} in scene ${sceneId} y is required and must be finite.`);
    if (!positiveNumber(layer.width)) errors.push(`Layer ${layer.id ?? '?'} in scene ${sceneId} width is required and must be positive.`);
    validateOptionalNumber(layer.height, `Layer ${layer.id ?? '?'} in scene ${sceneId} height`, positiveNumber, 'a positive finite number');
    validateOptionalNumber(layer.delay, `Layer ${layer.id ?? '?'} in scene ${sceneId} delay`, nonNegativeInteger, 'a non-negative integer');
    if (nonNegativeInteger(layer.delay) && positiveInteger(scene.duration) && layer.delay >= scene.duration) errors.push(`Layer ${layer.id ?? '?'} in scene ${sceneId} delay must occur before the scene ends.`);
    validateOptionalNumber(layer.zIndex, `Layer ${layer.id ?? '?'} in scene ${sceneId} zIndex`);
    validateOptionalNumber(layer.rotation, `Layer ${layer.id ?? '?'} in scene ${sceneId} rotation`);
    validateOptionalNumber(layer.scale, `Layer ${layer.id ?? '?'} in scene ${sceneId} scale`, positiveNumber, 'a positive finite number');
    validateOptionalNumber(layer.opacity, `Layer ${layer.id ?? '?'} in scene ${sceneId} opacity`, (value) => finiteNumber(value) && value >= 0 && value <= 1, 'within 0..1');
    validateOptionalNumber(layer.bob, `Layer ${layer.id ?? '?'} in scene ${sceneId} bob`);
    validateOptionalNumber(layer.sfxVolume, `Layer ${layer.id ?? '?'} in scene ${sceneId} sfxVolume`, nonNegativeNumber, 'a non-negative finite number');
    validateOptionalBoolean(layer.flipX, `Layer ${layer.id ?? '?'} in scene ${sceneId} flipX`);
    validateOptionalText(layer.label, `Layer ${layer.id ?? '?'} in scene ${sceneId} label`);
    validateOptionalText(layer.assetId, `Layer ${layer.id ?? '?'} in scene ${sceneId} assetId`);
    validateOptionalEnum(layer.enterFrom, ['left', 'right', 'up', 'down', 'scale'], `Layer ${layer.id ?? '?'} in scene ${sceneId} enterFrom`);
    validateOptionalEnum(layer.shadow, ['strong', 'soft', 'none'], `Layer ${layer.id ?? '?'} in scene ${sceneId} shadow`);
    const layerRaster = checkRasterFile(checkPublicFile(layer.src, `Layer file ${layer.id ?? '?'} in scene ${sceneId}`), `Layer file ${layer.id ?? '?'} in scene ${sceneId}`);
    if (layer.sfx) checkAudioFile(checkPublicFile(layer.sfx, `Layer sound ${layer.id ?? '?'} in scene ${sceneId}`), `Layer sound ${layer.id ?? '?'} in scene ${sceneId}`);
    const semantic = validateMotion(layer, sceneId);
    if (layer.role === 'primary' && semantic) semanticPrimary = true;
    if (layer.role === 'primary' && layerCanAppearOnCanvas(layer, layerRaster, scene, project)) visiblePrimary = true;
  }
  if (scene.hero !== false && !layers.some((layer) => layer.role === 'primary')) errors.push(`Hero scene ${sceneId} requires an independent primary subject or core object.`);
  if (scene.hero !== false && !semanticPrimary) errors.push(`Hero scene ${sceneId} requires meaningful semantic keyframes on a primary layer; camera or idle loops are insufficient.`);
  if (scene.hero !== false && !visiblePrimary) errors.push(`Hero scene ${sceneId} requires a primary layer that becomes visible on canvas for enough frames to communicate its action.`);
}
if (validTimeline) {
  const ordered = [...scenes].sort((left, right) => left.from - right.from);
  let cursor = 0;
  for (const scene of ordered) {
    if (scene.from > cursor) errors.push(`Timeline gap before scene ${scene.id}: frames ${cursor}-${scene.from - 1}.`);
    if (scene.from < cursor) errors.push(`Timeline overlap at scene ${scene.id}: starts ${scene.from}, previous end ${cursor}.`);
    cursor = Math.max(cursor, scene.from + scene.duration);
  }
  if (cursor !== project.durationInFrames) errors.push(`Timeline ends at frame ${cursor}, expected ${project.durationInFrames}.`);
}

if (project?.captions != null && !Array.isArray(project.captions)) errors.push('project.captions must be an array when provided.');
const captions = Array.isArray(project?.captions) ? project.captions : [];
if (contentMode === 'book' && !captions.length) errors.push('book content requires approved global captions.');
const orderedCaptions = [...captions].sort((left, right) => left.from - right.from);
if (captions.some((cue, index) => cue !== orderedCaptions[index])) errors.push('Caption cues must be stored in chronological order.');
const captionIds = new Set();
let captionCursor = 0;
for (const cue of orderedCaptions) {
  requireText(cue.id, 'Caption id');
  requireText(cue.text, `Caption ${cue.id ?? '?'} text`);
  if (realText(cue.id) && captionIds.has(cue.id)) errors.push(`Duplicate caption id: ${cue.id}.`);
  if (realText(cue.id)) captionIds.add(cue.id);
  if (!nonNegativeInteger(cue.from)) errors.push(`Caption ${cue.id ?? '?'} from must be non-negative.`);
  if (!positiveInteger(cue.duration)) errors.push(`Caption ${cue.id ?? '?'} duration must be positive.`);
  validateOptionalEnum(cue.style, ['strip', 'card', 'minimal'], `Caption ${cue.id ?? '?'} style`);
  if (contentMode === 'book' && positiveInteger(project?.fps) && positiveInteger(cue.duration) && realText(cue.text)) {
    const readableUnits = Array.from(cue.text.replace(/[\s\p{P}\p{S}]/gu, '')).length;
    const minimumReadableSeconds = Math.max(0.2, readableUnits / 20);
    if (cue.duration / project.fps + 1 / project.fps < minimumReadableSeconds) errors.push(`Caption ${cue.id ?? '?'} is too brief for its approved text to remain readable.`);
  }
  if (nonNegativeInteger(cue.from) && cue.from < captionCursor) errors.push(`Caption ${cue.id ?? '?'} overlaps the previous cue.`);
  if (nonNegativeInteger(cue.from) && positiveInteger(cue.duration)) {
    captionCursor = Math.max(captionCursor, cue.from + cue.duration);
    if (positiveInteger(project?.durationInFrames) && cue.from + cue.duration > project.durationInFrames) errors.push(`Caption ${cue.id ?? '?'} extends past durationInFrames.`);
  }
}
if (contentMode === 'book') {
  if (!existsSync(narrationPath)) errors.push('book content requires narration.txt.');
  else if (captions.length) {
    const normalize = (text) => text.replace(/\s+/gu, '');
    const narration = normalize(readFileSync(narrationPath, 'utf8').trim());
    const captionText = normalize(orderedCaptions.map((cue) => cue.text).join(''));
    if (!narration || /^<.*>$/.test(narration) || narration !== captionText) errors.push('Approved captions must concatenate exactly to narration.txt.');
  }
  if (!scenes.some((scene) => scene.showBookMeta === true)) errors.push('book content must render title and author in code on at least one scene.');
  for (const beatId of bookBeatIds) if (!scenes.some((scene) => scene.storyBeatId === beatId)) errors.push(`Story beat ${beatId} is not represented by a project scene.`);
  if (positiveNumber(narrationAudioMetadata?.duration) && positiveInteger(project?.fps) && positiveInteger(project?.durationInFrames)) {
    const frameToleranceSeconds = Math.max(0.08, 2 / project.fps);
    if (orderedCaptions.length) {
      const captionEndSeconds = Math.max(...orderedCaptions.map((cue) => (cue.from + cue.duration) / project.fps));
      if (captionEndSeconds > narrationAudioMetadata.duration + frameToleranceSeconds) errors.push('Book captions extend beyond the final narration audio.');
      const maximumUndocumentedSpeechTail = Math.max(0.75, Math.min(1.5, narrationAudioMetadata.duration * 0.05));
      if (narrationAudioMetadata.duration - captionEndSeconds > maximumUndocumentedSpeechTail) errors.push('Book captions end materially before the final narration audio; regenerate alignment or document the silence as project.audio.tailSeconds outside the narration file.');
    }
  }
}

if (manifest) {
  if (!['codex-native', 'openai-api', 'mcp', 'file'].includes(manifest.imageProvider)) errors.push(`Unsupported manifest imageProvider: ${manifest.imageProvider ?? '<none>'}.`);
  if (!['edge-tts', 'openai', 'file'].includes(manifest.voiceProvider)) errors.push(`Unsupported manifest voiceProvider: ${manifest.voiceProvider ?? '<none>'}.`);
  if (manifest.contentMode === 'book-review') errors.push('Manifest contentMode must be canonical book, not the legacy input alias.');
  if (normalizeContentMode(manifest.contentMode) !== contentMode) errors.push('Manifest contentMode does not match project.json.');
  if ((manifest.assetStrategy ?? 'layered') !== 'layered' || manifest.assetStrategy !== assetStrategy) errors.push('Manifest assetStrategy must match project and be layered.');
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (!assets.length) errors.push('asset-manifest.json must contain assets.');
  const assetIds = new Set();
  const assetPaths = new Set();
  const manifestAssetById = new Map();
  for (const asset of assets) {
    if (!realText(asset.id) || !['background', 'layer', 'foreground'].includes(asset.type) || !realText(asset.path)) errors.push(`Manifest asset has invalid id, type, or path: ${JSON.stringify(asset)}`);
    if (realText(asset.id) && assetIds.has(asset.id)) errors.push(`Duplicate manifest asset id: ${asset.id}.`);
    if (realText(asset.id)) {
      assetIds.add(asset.id);
      manifestAssetById.set(asset.id, asset);
    }
    if (realText(asset.path) && assetPaths.has(asset.path)) errors.push(`Manifest asset paths must be unique; repeated path: ${asset.path}.`);
    if (realText(asset.path)) assetPaths.add(asset.path);
    const assetFile = realText(asset.path) ? checkPublicFile(asset.path, `Manifest path for ${asset.id ?? '?'}`) : null;
    validateWatermarkCheck(asset, assetFile);
    if (asset.type === 'background') {
      checkRasterFile(assetFile, `Background ${asset.id ?? '?'}`);
      if (asset.subjectFree !== true) errors.push(`Background ${asset.id ?? '?'} must declare subjectFree: true after inspection.`);
      if (asset.visuallyInspected !== true) errors.push(`Background ${asset.id ?? '?'} must declare visuallyInspected: true.`);
    }
    if (['layer', 'foreground'].includes(asset.type)) {
      checkRasterFile(assetFile, `Independent layer ${asset.id ?? '?'}`);
      if (asset.alpha !== true) errors.push(`Independent layer ${asset.id ?? '?'} must declare alpha: true.`);
      if (asset.alphaValidated !== true) errors.push(`Independent layer ${asset.id ?? '?'} must declare alphaValidated: true.`);
      if (asset.visuallyInspected !== true) errors.push(`Independent layer ${asset.id ?? '?'} must declare visuallyInspected: true.`);
      checkAlphaFile(assetFile, `Independent layer ${asset.id ?? '?'}`);
    }
    if (contentMode === 'book') {
      const beatIds = Array.isArray(asset.beatIds) ? asset.beatIds : [];
      if (!beatIds.length) errors.push(`Book manifest asset ${asset.id ?? '?'} must declare beatIds.`);
      for (const beatId of beatIds) if (!bookBeatIds.has(beatId)) errors.push(`Book manifest asset ${asset.id ?? '?'} references unknown beat ${beatId}.`);
      if (asset.characterId && !bookCharacterIds.has(asset.characterId)) errors.push(`Book manifest asset ${asset.id ?? '?'} references unknown character ${asset.characterId}.`);
      const briefAsset = briefAssetById.get(asset.id);
      if (!briefAsset) {
        errors.push(`Book manifest asset ${asset.id ?? '?'} is missing from creative-brief assets.`);
      } else {
        if (briefAsset.type !== asset.type) errors.push(`Book manifest asset ${asset.id} type does not match the creative brief.`);
        if (!sameStringSet(briefAsset.beatIds, asset.beatIds)) errors.push(`Book manifest asset ${asset.id} beatIds do not match the creative brief.`);
        if ((briefAsset.characterId ?? null) !== (asset.characterId ?? null)) errors.push(`Book manifest asset ${asset.id} characterId does not match the creative brief.`);
      }
    }
  }
  if (contentMode === 'book') {
    for (const asset of briefAssets) if (realText(asset.id) && !manifestAssetById.has(asset.id)) errors.push(`Creative-brief asset ${asset.id} is missing from the final manifest.`);
  }
  const backgrounds = assets.filter((asset) => asset.type === 'background');
  const layers = assets.filter((asset) => ['layer', 'foreground'].includes(asset.type));
  if (!backgrounds.length) errors.push('Manifest has no character-free background assets.');
  if (!layers.length) errors.push('Manifest has no independent alpha layer assets.');
  const backgroundByPath = new Map(backgrounds.map((asset) => [asset.path, asset]));
  const layerByPath = new Map(layers.map((asset) => [asset.path, asset]));
  const runtimeLayersByBeat = new Map();
  const runtimeBackgroundsByBeat = new Map();
  const runtimeLayerInstancesByBeat = new Map();
  for (const scene of scenes) {
    const backgroundAsset = backgroundByPath.get(scene.background);
    if (!backgroundAsset) errors.push(`Scene ${scene.id ?? '?'} background is not declared as a manifest background.`);
    const sceneLayerAssets = [];
    const sceneLayerRecords = [];
    for (const layer of scene.layers ?? []) {
      const layerAsset = layerByPath.get(layer.src);
      if (!layerAsset) errors.push(`Scene ${scene.id ?? '?'} layer ${layer.id ?? '?'} is not declared as a manifest layer.`);
      else {
        sceneLayerAssets.push(layerAsset);
        sceneLayerRecords.push({layer, asset: layerAsset, scene});
        const resolvedAssetId = layer.assetId ?? layer.id;
        if (resolvedAssetId !== layerAsset.id) errors.push(`Scene ${scene.id ?? '?'} layer ${layer.id ?? '?'} assetId must resolve to manifest asset ${layerAsset.id}.`);
      }
    }
    if (contentMode === 'book' && realText(scene.storyBeatId)) {
      if (backgroundAsset && !(backgroundAsset.beatIds ?? []).includes(scene.storyBeatId)) errors.push(`Scene ${scene.id} background is not linked to beat ${scene.storyBeatId}.`);
      for (const layerAsset of sceneLayerAssets) if (!(layerAsset.beatIds ?? []).includes(scene.storyBeatId)) errors.push(`Scene ${scene.id} layer ${layerAsset.id} is not linked to beat ${scene.storyBeatId}.`);
      const beat = bookBeats.find((entry) => entry.id === scene.storyBeatId);
      for (const characterId of beatCharacterIds(beat)) {
        if (!sceneLayerAssets.some((asset) => asset.characterId === characterId)) errors.push(`Scene ${scene.id} lacks an independent cutout for character ${characterId}.`);
      }
      if (!runtimeLayersByBeat.has(scene.storyBeatId)) runtimeLayersByBeat.set(scene.storyBeatId, new Set());
      if (!runtimeBackgroundsByBeat.has(scene.storyBeatId)) runtimeBackgroundsByBeat.set(scene.storyBeatId, new Set());
      if (!runtimeLayerInstancesByBeat.has(scene.storyBeatId)) runtimeLayerInstancesByBeat.set(scene.storyBeatId, []);
      if (backgroundAsset) runtimeBackgroundsByBeat.get(scene.storyBeatId).add(backgroundAsset.id);
      for (const record of sceneLayerRecords) {
        runtimeLayersByBeat.get(scene.storyBeatId).add(record.asset.id);
        runtimeLayerInstancesByBeat.get(scene.storyBeatId).push(record);
      }
    }
  }
  if (contentMode === 'book') {
    for (const protagonistId of protagonistIds) if (!layers.some((asset) => asset.characterId === protagonistId)) errors.push(`Book protagonist ${protagonistId} has no independent manifest layer.`);
    for (const beat of bookBeats) {
      const researchBeat = researchBeatById.get(beat.id);
      if (!researchBeat) continue;
      const plan = researchBeat.layerPlan ?? {};
      const plannedBackgroundId = plan.background?.assetId;
      const plannedLayerIds = [...(plan.subjects ?? []), ...(plan.props ?? []), ...(plan.foreground ?? [])];
      const runtimeBackgroundIds = runtimeBackgroundsByBeat.get(beat.id) ?? new Set();
      const runtimeLayerIds = runtimeLayersByBeat.get(beat.id) ?? new Set();
      if (!sameStringSet([...runtimeBackgroundIds], realText(plannedBackgroundId) ? [plannedBackgroundId] : [])) errors.push(`Story beat ${beat.id} runtime backgrounds do not match its research layerPlan.`);
      if (!sameStringSet([...runtimeLayerIds], plannedLayerIds)) errors.push(`Story beat ${beat.id} runtime layers do not match its research layerPlan.`);
      const action = researchBeat.visualAction ?? {};
      const instances = runtimeLayerInstancesByBeat.get(beat.id) ?? [];
      const subjectInstances = instances.filter(({asset}) => asset.id === action.subjectLayerId);
      if (!subjectInstances.length) {
        errors.push(`Story beat ${beat.id} visualAction.subjectLayerId is not present in the runtime scene graph.`);
      } else if (!subjectInstances.some(({layer}) => layer.role === 'primary' && valuesMatch(layer.motion?.action, action.action) && validateMotion(layer, beat.id))) {
        errors.push(`Story beat ${beat.id} visual action must be implemented by a primary runtime layer with matching semantic motion.`);
      }
      if (realText(action.targetLayerId) && !instances.some(({asset}) => asset.id === action.targetLayerId)) errors.push(`Story beat ${beat.id} visualAction.targetLayerId is not present in the runtime scene graph.`);
    }
  }
}

console.log(JSON.stringify({ok: errors.length === 0, projectDirectory, contentMode, assetStrategy, errors}, null, 2));
if (errors.length) process.exit(1);
