#!/usr/bin/env node
import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs';
import path from 'node:path';

const projectDirectory = path.resolve(process.argv[2] ?? '.');
const publicDirectory = path.join(projectDirectory, 'public');
const projectPath = path.join(publicDirectory, 'project.json');
const manifestPath = path.join(publicDirectory, 'asset-manifest.json');
const briefPath = path.join(projectDirectory, 'creative-brief.json');
const researchPath = path.join(projectDirectory, 'book-research.json');
const narrationPath = path.join(projectDirectory, 'narration.txt');
const errors = [];

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

const project = readJson(projectPath);
const manifest = readJson(manifestPath);
const brief = readJson(briefPath, false);
const research = readJson(researchPath, false);
const positiveInteger = (value) => Number.isInteger(value) && value > 0;
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const realText = (value) => typeof value === 'string' && value.trim() && !/^<.*>$/.test(value.trim());
const requireText = (value, label) => {
  if (!realText(value)) errors.push(`${label} must contain real text.`);
};
const validHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.hostname.endsWith('.invalid');
  } catch {
    return false;
  }
};
const normalizedText = (value) => typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
const valuesMatch = (left, right) => normalizedText(left) === normalizedText(right);
const publicRealPath = existsSync(publicDirectory) ? realpathSync(publicDirectory) : publicDirectory;
const checkPublicFile = (relative, label) => {
  if (typeof relative !== 'string' || !relative.trim()) {
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
  return candidate;
};

const contentMode = project?.contentMode ?? 'explainer';
const assetStrategy = project?.assetStrategy ?? 'layered';

if (project) {
  if (!['explainer', 'book-review'].includes(contentMode)) errors.push(`Unsupported project.contentMode: ${contentMode}.`);
  if (!['layered', 'scene-illustrations'].includes(assetStrategy)) errors.push(`Unsupported project.assetStrategy: ${assetStrategy}.`);
  if (contentMode === 'explainer' && assetStrategy !== 'layered') errors.push('explainer mode requires assetStrategy=layered in this release.');
  if (contentMode === 'book-review' && assetStrategy !== 'scene-illustrations') errors.push('book-review mode requires assetStrategy=scene-illustrations in this release.');

  const stylePreset = project.stylePreset ?? 'paper-cut';
  if (stylePreset !== 'paper-cut') errors.push(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
  for (const field of ['width', 'height', 'fps', 'durationInFrames']) {
    if (!positiveInteger(project[field])) errors.push(`project.${field} must be a positive integer.`);
  }
  if (project.captionSafeBottom != null && (!nonNegativeInteger(project.captionSafeBottom) || project.captionSafeBottom >= project.height / 2)) {
    errors.push('project.captionSafeBottom must be a non-negative integer below half the composition height.');
  }

  if (!project.audio || typeof project.audio !== 'object' || Array.isArray(project.audio)) {
    errors.push('project.audio must be an object.');
  } else {
    if (!project.audio.voice && project.audio.intentionalSilence !== true) {
      errors.push('project.audio.voice is required unless intentionalSilence is true.');
    }
    if (contentMode === 'book-review' && !project.audio.voice) {
      errors.push('book-review mode requires final narration audio; duration must be driven by that audio.');
    }
    if (project.audio.voice) checkPublicFile(project.audio.voice, 'Narration audio');
    if (project.audio.music) checkPublicFile(project.audio.music, 'Music audio');
  }

  if (contentMode === 'book-review') {
    requireText(project.book?.title, 'project.book.title');
    requireText(project.book?.author, 'project.book.author');
    requireText(project.book?.angle, 'project.book.angle');
    if (project.book?.originalTitle != null && project.book.originalTitle !== '') {
      requireText(project.book.originalTitle, 'project.book.originalTitle');
    }
    if (!['none', 'low', 'full'].includes(project.book?.spoilerLevel)) {
      errors.push('project.book.spoilerLevel must be none, low, or full.');
    }
    if (!brief) errors.push('book-review mode requires creative-brief.json with sources and editorial decisions.');
    if (!research) errors.push('book-review mode requires book-research.json with evidence and rights guardrails.');
    if (brief && brief.project?.contentMode !== 'book-review') errors.push('creative-brief project.contentMode must match book-review.');
    if (brief && brief.visualSystem?.assetStrategy !== 'scene-illustrations') errors.push('creative-brief visualSystem.assetStrategy must match scene-illustrations.');
    if (brief) {
      for (const field of ['title', 'author', 'angle']) {
        requireText(brief.project?.book?.[field], `creative-brief project.book.${field}`);
        if (realText(brief.project?.book?.[field]) && realText(project.book?.[field]) && !valuesMatch(brief.project.book[field], project.book[field])) {
          errors.push(`creative-brief project.book.${field} does not match public/project.json.`);
        }
      }
      const briefOriginalTitle = brief.project?.book?.originalTitle;
      const projectOriginalTitle = project.book?.originalTitle;
      if (briefOriginalTitle != null && briefOriginalTitle !== '') {
        requireText(briefOriginalTitle, 'creative-brief project.book.originalTitle');
      }
      if (realText(briefOriginalTitle) || realText(projectOriginalTitle)) {
        requireText(briefOriginalTitle, 'creative-brief project.book.originalTitle');
        requireText(projectOriginalTitle, 'project.book.originalTitle');
        if (realText(briefOriginalTitle) && realText(projectOriginalTitle) && !valuesMatch(briefOriginalTitle, projectOriginalTitle)) {
          errors.push('creative-brief project.book.originalTitle does not match public/project.json.');
        }
      }
      if (brief.project?.book?.spoilerLevel !== project.book?.spoilerLevel) {
        errors.push('creative-brief spoilerLevel does not match public/project.json.');
      }
      requireText(brief.visualSystem?.seriesAnchor, 'creative-brief visualSystem.seriesAnchor');
    }
    if (research) {
      if (research.schemaVersion !== 1) errors.push('book-research schemaVersion must be 1.');
      if (research.contentMode !== 'book-review') errors.push('book-research contentMode must be book-review.');
      const researchMappings = [
        ['book.title', research.book?.title, project.book?.title],
        ['book.author', research.book?.author, project.book?.author],
        ['editorial.angle', research.editorial?.angle, project.book?.angle],
      ];
      for (const [label, researchValue, projectValue] of researchMappings) {
        requireText(researchValue, `book-research ${label}`);
        if (realText(researchValue) && realText(projectValue) && !valuesMatch(researchValue, projectValue)) {
          errors.push(`book-research ${label} does not match public/project.json.`);
        }
      }
      const researchOriginalTitle = research.book?.originalTitle;
      const projectOriginalTitle = project.book?.originalTitle;
      if (researchOriginalTitle != null && researchOriginalTitle !== '') {
        requireText(researchOriginalTitle, 'book-research book.originalTitle');
      }
      if (realText(researchOriginalTitle) || realText(projectOriginalTitle)) {
        requireText(researchOriginalTitle, 'book-research book.originalTitle');
        requireText(projectOriginalTitle, 'project.book.originalTitle');
        if (realText(researchOriginalTitle) && realText(projectOriginalTitle) && !valuesMatch(researchOriginalTitle, projectOriginalTitle)) {
          errors.push('book-research book.originalTitle does not match public/project.json.');
        }
      }
      if (research.editorial?.spoilerLevel !== project.book?.spoilerLevel) {
        errors.push('book-research editorial.spoilerLevel does not match public/project.json.');
      }
      if (research.guardrails?.quotePolicy !== 'original-commentary-only') {
        errors.push('book-research guardrails.quotePolicy must be original-commentary-only in this release.');
      }
      for (const flag of ['noCoverReplication', 'noAdaptationFramesOrLikenesses', 'noGeneratedTypography', 'noEditionStyleImitation']) {
        if (research.guardrails?.visualPolicy?.[flag] !== true) {
          errors.push(`book-research guardrails.visualPolicy.${flag} must be true.`);
        }
      }
      const visualExclusions = Array.isArray(research.guardrails?.visualExclusions) ? research.guardrails.visualExclusions : [];
      if (visualExclusions.length < 3 || visualExclusions.some((entry) => !realText(entry))) {
        errors.push('book-research guardrails.visualExclusions must record at least three real project-specific or rights-aware exclusions.');
      }
      const researchSources = Array.isArray(research.sources) ? research.sources : [];
      if (!researchSources.length) errors.push('book-research must record at least one source.');
      const researchSourceIds = new Set();
      for (const [index, source] of researchSources.entries()) {
        requireText(source?.id, `book-research sources[${index}].id`);
        requireText(source?.title, `book-research sources[${index}].title`);
        requireText(source?.url, `book-research sources[${index}].url`);
        if (realText(source?.id) && researchSourceIds.has(source.id)) errors.push(`Duplicate book-research source id: ${source.id}`);
        if (realText(source?.id)) researchSourceIds.add(source.id);
        if (realText(source?.url) && !validHttpUrl(source.url)) errors.push(`book-research sources[${index}].url must be an http(s) URL.`);
      }
      const facts = Array.isArray(research.facts) ? research.facts : [];
      if (!facts.length) errors.push('book-research must record at least one verified or explicitly uncertain fact.');
      for (const [index, fact] of facts.entries()) {
        requireText(fact?.id, `book-research facts[${index}].id`);
        requireText(fact?.claim, `book-research facts[${index}].claim`);
        if (!['verified', 'uncertain', 'excluded'].includes(fact?.status)) {
          errors.push(`book-research facts[${index}].status must be verified, uncertain, or excluded.`);
        }
        const sourceIds = Array.isArray(fact?.sourceIds) ? fact.sourceIds : [];
        if (fact?.status === 'verified' && !sourceIds.length) {
          errors.push(`book-research facts[${index}] is verified but has no sourceIds.`);
        }
        for (const sourceId of sourceIds) {
          if (!researchSourceIds.has(sourceId)) errors.push(`book-research facts[${index}] references unknown source id: ${sourceId}`);
        }
      }
    }
    const sources = Array.isArray(brief?.evidence?.sources) ? brief.evidence.sources : [];
    if (!sources.length) errors.push('book-review creative brief must record at least one evidence source.');
    const briefSourceIds = new Set();
    for (const [index, source] of sources.entries()) {
      requireText(source?.id, `creative-brief evidence.sources[${index}].id`);
      requireText(source?.title, `creative-brief evidence.sources[${index}].title`);
      requireText(source?.url, `creative-brief evidence.sources[${index}].url`);
      if (realText(source?.id) && briefSourceIds.has(source.id)) errors.push(`Duplicate creative-brief source id: ${source.id}`);
      if (realText(source?.id)) briefSourceIds.add(source.id);
      if (realText(source?.url) && !validHttpUrl(source.url)) errors.push(`creative-brief evidence.sources[${index}].url must be an http(s) URL.`);
    }
    const claims = Array.isArray(brief?.evidence?.claims) ? brief.evidence.claims : [];
    for (const [index, claim] of claims.entries()) {
      const sourceIds = Array.isArray(claim?.sourceIds) ? claim.sourceIds : [];
      if (claim?.kind !== 'commentary' && !sourceIds.length) {
        errors.push(`creative-brief evidence.claims[${index}] is not commentary and requires sourceIds.`);
      }
      for (const sourceId of sourceIds) {
        if (!briefSourceIds.has(sourceId)) errors.push(`creative-brief evidence.claims[${index}] references unknown source id: ${sourceId}`);
      }
    }
    if (!existsSync(narrationPath)) {
      errors.push('book-review mode requires narration.txt as the approved text authority.');
    } else {
      requireText(readFileSync(narrationPath, 'utf8'), 'narration.txt');
    }
  }

  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  if (!scenes.length) errors.push('project.json must contain at least one scene.');
  if (contentMode === 'book-review' && scenes.length < 3) errors.push('book-review mode requires at least three semantic illustration scenes.');
  const sceneIds = new Set();
  let validTimeline = scenes.length > 0 && positiveInteger(project.durationInFrames);
  for (const scene of scenes) {
    const sceneId = scene.id ?? '?';
    if (!scene.id) errors.push('Every scene must have an id.');
    else if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    else sceneIds.add(scene.id);

    if (!nonNegativeInteger(scene.from)) {
      errors.push(`Scene ${sceneId} from must be a non-negative integer.`);
      validTimeline = false;
    }
    if (!positiveInteger(scene.duration)) {
      errors.push(`Scene ${sceneId} duration must be a positive integer.`);
      validTimeline = false;
    }
    if (nonNegativeInteger(scene.from) && positiveInteger(scene.duration) && positiveInteger(project.durationInFrames) && scene.from + scene.duration > project.durationInFrames) {
      errors.push(`Scene ${sceneId} extends past durationInFrames.`);
    }

    checkPublicFile(scene.background, `Background for scene ${sceneId}`);
    if (scene.transitionSfx) checkPublicFile(scene.transitionSfx, `Transition sound for scene ${sceneId}`);
    if (!Array.isArray(scene.layers)) errors.push(`Scene ${sceneId} must declare layers as an array.`);
    const layers = Array.isArray(scene.layers) ? scene.layers : [];
    if (assetStrategy === 'layered' && !layers.length) errors.push(`Scene ${sceneId} must contain at least one independent layer.`);
    if (assetStrategy === 'scene-illustrations' && layers.length) errors.push(`Scene ${sceneId} must use layers: [] with scene-illustrations.`);
    const layerIds = new Set();
    for (const layer of layers) {
      if (!layer.id) errors.push(`A layer in scene ${sceneId} has no id.`);
      else if (layerIds.has(layer.id)) errors.push(`Duplicate layer id in scene ${sceneId}: ${layer.id}`);
      else layerIds.add(layer.id);
      if (!['primary', 'secondary', 'tertiary', 'foreground'].includes(layer.role)) errors.push(`Layer ${layer.id ?? '?'} has unsupported role: ${layer.role}`);
      checkPublicFile(layer.src, `Layer file ${layer.id ?? '?'} in scene ${sceneId}`);
      if (layer.sfx) checkPublicFile(layer.sfx, `Layer sound ${layer.id ?? '?'} in scene ${sceneId}`);
    }
  }

  if (contentMode === 'book-review' && !scenes.some((scene) => scene.showBookMeta === true)) {
    errors.push('book-review mode must render title and author in code on at least one scene (showBookMeta: true).');
  }

  if (validTimeline) {
    const ordered = [...scenes].sort((a, b) => a.from - b.from);
    let cursor = 0;
    for (const scene of ordered) {
      if (scene.from > cursor) errors.push(`Timeline gap before scene ${scene.id}: frames ${cursor}-${scene.from - 1}.`);
      if (scene.from < cursor) errors.push(`Timeline overlap at scene ${scene.id}: starts ${scene.from}, previous end ${cursor}.`);
      cursor = Math.max(cursor, scene.from + scene.duration);
    }
    if (cursor !== project.durationInFrames) errors.push(`Timeline ends at frame ${cursor}, expected ${project.durationInFrames}.`);
  }

  const captions = Array.isArray(project.captions) ? project.captions : [];
  if (contentMode === 'book-review' && !captions.length) errors.push('book-review mode requires approved global caption cues.');
  const captionIds = new Set();
  let previousCaptionEnd = 0;
  const orderedCaptions = [...captions].sort((a, b) => a.from - b.from);
  if (captions.some((cue, index) => cue !== orderedCaptions[index])) {
    errors.push('Caption cues must be stored in chronological from order.');
  }
  for (const cue of orderedCaptions) {
    if (!realText(cue.id)) errors.push('Every caption cue must have an id.');
    else if (captionIds.has(cue.id)) errors.push(`Duplicate caption cue id: ${cue.id}`);
    else captionIds.add(cue.id);
    requireText(cue.text, `Caption ${cue.id ?? '?'} text`);
    if (!nonNegativeInteger(cue.from)) errors.push(`Caption ${cue.id ?? '?'} from must be a non-negative integer.`);
    if (!positiveInteger(cue.duration)) errors.push(`Caption ${cue.id ?? '?'} duration must be a positive integer.`);
    if (nonNegativeInteger(cue.from) && cue.from < previousCaptionEnd) errors.push(`Caption ${cue.id ?? '?'} overlaps the previous cue.`);
    if (nonNegativeInteger(cue.from) && positiveInteger(cue.duration)) {
      previousCaptionEnd = Math.max(previousCaptionEnd, cue.from + cue.duration);
      if (positiveInteger(project.durationInFrames) && cue.from + cue.duration > project.durationInFrames) {
        errors.push(`Caption ${cue.id ?? '?'} extends past durationInFrames.`);
      }
    }
  }

  if (contentMode === 'book-review' && existsSync(narrationPath) && captions.length) {
    const normalize = (text) => text.replace(/\s+/gu, '');
    const narration = normalize(readFileSync(narrationPath, 'utf8').trim());
    const captionText = normalize(orderedCaptions.map((cue) => cue.text).join(''));
    if (narration && !/^<.*>$/.test(narration) && narration !== captionText) {
      errors.push('Approved caption text must concatenate exactly to narration.txt; ASR text may not replace the approved script.');
    }
  }
}

if (manifest) {
  const imageProviders = new Set(['codex-native', 'openai-api', 'mcp', 'file']);
  const voiceProviders = new Set(['edge-tts', 'openai', 'file']);
  if (!imageProviders.has(manifest.imageProvider)) errors.push(`Unsupported manifest imageProvider: ${manifest.imageProvider ?? '<none>'}.`);
  if (!voiceProviders.has(manifest.voiceProvider)) errors.push(`Unsupported manifest voiceProvider: ${manifest.voiceProvider ?? '<none>'}.`);
  if (manifest.contentMode && manifest.contentMode !== contentMode) errors.push(`Manifest contentMode ${manifest.contentMode} does not match project ${contentMode}.`);
  if (manifest.assetStrategy && manifest.assetStrategy !== assetStrategy) errors.push(`Manifest assetStrategy ${manifest.assetStrategy} does not match project ${assetStrategy}.`);

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (!assets.length) errors.push('asset-manifest.json must contain assets.');
  const assetIds = new Set();
  for (const asset of assets) {
    if (!asset.id || !asset.type || !asset.path) errors.push(`Manifest asset is missing id, type, or path: ${JSON.stringify(asset)}`);
    if (asset.id && assetIds.has(asset.id)) errors.push(`Duplicate manifest asset id: ${asset.id}`);
    if (asset.id) assetIds.add(asset.id);
    const supportedTypes = assetStrategy === 'scene-illustrations'
      ? ['illustration']
      : ['background', 'layer', 'foreground'];
    if (!supportedTypes.includes(asset.type)) errors.push(`Manifest asset ${asset.id ?? '?'} has unsupported type for ${assetStrategy}: ${asset.type}`);
    if (asset.path) checkPublicFile(asset.path, `Manifest path for ${asset.id ?? '?'}`);
    if (['layer', 'foreground'].includes(asset.type) && asset.alpha !== true) errors.push(`Independent layer ${asset.id} must declare alpha: true.`);
    if (asset.type === 'illustration' && asset.textFree !== true) errors.push(`Scene illustration ${asset.id} must declare textFree: true after visual inspection.`);
    if (asset.type === 'illustration' && asset.visuallyInspected !== true) errors.push(`Scene illustration ${asset.id} must declare visuallyInspected: true after checking text artifacts and research visual exclusions.`);
  }

  if (assetStrategy === 'layered') {
    const backgrounds = assets.filter((asset) => asset.type === 'background');
    const layers = assets.filter((asset) => ['layer', 'foreground'].includes(asset.type));
    if (backgrounds.length === 0) errors.push('Manifest has no background assets.');
    if (layers.length === 0) errors.push('Manifest has no independent layer assets.');
  } else {
    const illustrations = assets.filter((asset) => asset.type === 'illustration');
    const illustrationPaths = new Set(illustrations.map((asset) => asset.path));
    if (illustrationPaths.size < 3) errors.push('Manifest requires at least three unique scene illustration paths.');
    const knownPaths = new Set(illustrations.map((asset) => asset.path));
    for (const scene of project?.scenes ?? []) {
      if (!knownPaths.has(scene.background)) errors.push(`Scene ${scene.id ?? '?'} background is not declared as a manifest illustration: ${scene.background}`);
    }
  }
}

console.log(JSON.stringify({ok: errors.length === 0, projectDirectory, contentMode, assetStrategy, errors}, null, 2));
if (errors.length) process.exit(1);
