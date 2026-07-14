#!/usr/bin/env node
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

const projectDirectory = path.resolve(process.argv[2] ?? '.');
const publicDirectory = path.join(projectDirectory, 'public');
const projectPath = path.join(publicDirectory, 'project.json');
const manifestPath = path.join(publicDirectory, 'asset-manifest.json');
const errors = [];

const readJson = (file) => {
  if (!existsSync(file)) {
    errors.push(`Missing file: ${file}`);
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
const positiveInteger = (value) => Number.isInteger(value) && value > 0;
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const checkPublicFile = (relative, label) => {
  if (typeof relative !== 'string' || !relative.trim()) {
    errors.push(`${label} is missing.`);
    return;
  }
  const candidate = path.resolve(publicDirectory, relative);
  const fromPublic = path.relative(publicDirectory, candidate);
  if (fromPublic.startsWith('..') || path.isAbsolute(fromPublic)) {
    errors.push(`${label} escapes the public directory: ${relative}`);
    return;
  }
  if (!existsSync(candidate)) errors.push(`${label} does not exist: ${relative}`);
};

if (project) {
  const stylePreset = project.stylePreset ?? 'paper-cut';
  if (stylePreset !== 'paper-cut') errors.push(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
  for (const field of ['width', 'height', 'fps', 'durationInFrames']) {
    if (!positiveInteger(project[field])) errors.push(`project.${field} must be a positive integer.`);
  }

  if (!project.audio || typeof project.audio !== 'object' || Array.isArray(project.audio)) {
    errors.push('project.audio must be an object.');
  } else {
    if (!project.audio.voice && project.audio.intentionalSilence !== true) {
      errors.push('project.audio.voice is required unless intentionalSilence is true.');
    }
    if (project.audio.voice) checkPublicFile(project.audio.voice, 'Narration audio');
    if (project.audio.music) checkPublicFile(project.audio.music, 'Music audio');
  }

  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  if (!scenes.length) errors.push('project.json must contain at least one scene.');
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
    const layers = Array.isArray(scene.layers) ? scene.layers : [];
    if (!layers.length) errors.push(`Scene ${sceneId} must contain at least one independent layer.`);
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
}

if (manifest) {
  const imageProviders = new Set(['codex-native', 'openai-api', 'mcp', 'file']);
  const voiceProviders = new Set(['edge-tts', 'openai', 'file']);
  if (!imageProviders.has(manifest.imageProvider)) errors.push(`Unsupported manifest imageProvider: ${manifest.imageProvider ?? '<none>'}.`);
  if (!voiceProviders.has(manifest.voiceProvider)) errors.push(`Unsupported manifest voiceProvider: ${manifest.voiceProvider ?? '<none>'}.`);

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (!assets.length) errors.push('asset-manifest.json must contain assets.');
  const assetIds = new Set();
  for (const asset of assets) {
    if (!asset.id || !asset.type || !asset.path) errors.push(`Manifest asset is missing id, type, or path: ${JSON.stringify(asset)}`);
    if (asset.id && assetIds.has(asset.id)) errors.push(`Duplicate manifest asset id: ${asset.id}`);
    if (asset.id) assetIds.add(asset.id);
    if (!['background', 'layer', 'foreground'].includes(asset.type)) errors.push(`Manifest asset ${asset.id ?? '?'} has unsupported type: ${asset.type}`);
    if (asset.path) checkPublicFile(asset.path, `Manifest path for ${asset.id ?? '?'}`);
    if (['layer', 'foreground'].includes(asset.type) && asset.alpha !== true) errors.push(`Independent layer ${asset.id} must declare alpha: true.`);
  }
  const backgrounds = assets.filter((asset) => asset.type === 'background');
  const layers = assets.filter((asset) => ['layer', 'foreground'].includes(asset.type));
  if (backgrounds.length === 0) errors.push('Manifest has no background assets.');
  if (layers.length === 0) errors.push('Manifest has no independent layer assets.');
}

console.log(JSON.stringify({ok: errors.length === 0, projectDirectory, errors}, null, 2));
if (errors.length) process.exit(1);
