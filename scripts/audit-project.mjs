#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const readJson = (relative) => {
  const file = path.join(root, relative);
  if (!existsSync(file)) throw new Error(`Missing ${relative}`);
  return JSON.parse(readFileSync(file, 'utf8'));
};

let project;
let manifest;
let brief = {};
try {
  project = readJson('public/project.json');
  manifest = readJson('public/asset-manifest.json');
  if (existsSync(path.join(root, 'creative-brief.json'))) brief = readJson('creative-brief.json');
} catch (error) {
  console.error(JSON.stringify({ok: false, hardFailures: [error.message]}, null, 2));
  process.exit(1);
}

const warnings = [];
const hardFailures = [];
const details = {};
const scenes = Array.isArray(project.scenes) ? project.scenes : [];
const layersOf = (scene) => Array.isArray(scene?.layers) ? scene.layers : [];
const manifestAssets = Array.isArray(manifest.assets) ? manifest.assets : [];
const fps = Number.isFinite(project.fps) && project.fps > 0 ? project.fps : 30;
const heroScenes = scenes.filter((scene) => scene.hero !== false);
const minLayers = brief.quality?.minHeroLayers ?? 5;
const targetScore = brief.quality?.publishScore ?? 88;
const stylePreset = project.stylePreset ?? 'paper-cut';

if (!scenes.length) hardFailures.push('No scenes are defined.');
if (stylePreset !== 'paper-cut') hardFailures.push(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
if (brief.visualSystem?.preset && brief.visualSystem.preset !== stylePreset) {
  hardFailures.push(`Creative brief preset ${brief.visualSystem.preset} does not match project preset ${stylePreset}.`);
}
if (!project.audio || typeof project.audio !== 'object' || Array.isArray(project.audio)) hardFailures.push('project.audio must be an object.');
if (!project.audio?.voice && !project.audio?.intentionalSilence) hardFailures.push('No narration audio and intentionalSilence is not declared.');

let narrative = 15;
if (scenes.length < 4) {
  narrative -= 5;
  warnings.push('Use 4–7 beats for a standard 20–35 second explainer.');
}
const validTimeline = scenes.every((scene) => Number.isInteger(scene.from) && scene.from >= 0 && Number.isInteger(scene.duration) && scene.duration > 0);
if (!validTimeline && scenes.length) hardFailures.push('Every scene must use a non-negative integer from and a positive integer duration.');
if (validTimeline && scenes.length) {
  const orderedScenes = [...scenes].sort((a, b) => a.from - b.from);
  let cursor = 0;
  for (const scene of orderedScenes) {
    if (scene.from > cursor) hardFailures.push(`Timeline gap before ${scene.id}: expected frame ${cursor}, got ${scene.from}.`);
    if (scene.from < cursor) hardFailures.push(`Timeline overlap at ${scene.id}: starts ${scene.from}, previous end ${cursor}.`);
    cursor = Math.max(cursor, scene.from + scene.duration);
  }
  if (cursor !== project.durationInFrames) hardFailures.push(`Timeline ends at frame ${cursor}, expected ${project.durationInFrames}.`);
  if ((orderedScenes[0]?.from ?? -1) !== 0) narrative -= 3;
}
const slowScenes = scenes.filter((scene) => scene.duration / fps > 7.2);
if (slowScenes.length) {
  narrative -= Math.min(5, slowScenes.length * 2);
  warnings.push(`Long beats above 7.2 seconds: ${slowScenes.map((scene) => scene.id).join(', ')}`);
}

let layerDepth = 25;
const shallow = heroScenes.filter((scene) => layersOf(scene).length < minLayers);
if (shallow.length) {
  layerDepth -= Math.min(15, shallow.length * 4);
  warnings.push(`Hero shots below ${minLayers} independent layers: ${shallow.map((scene) => scene.id).join(', ')}`);
}
const missingPrimary = heroScenes.filter((scene) => !layersOf(scene).some((layer) => layer.role === 'primary'));
if (missingPrimary.length) {
  layerDepth -= 8;
  hardFailures.push(`Hero shots without a primary layer: ${missingPrimary.map((scene) => scene.id).join(', ')}`);
}
const noDepthRole = heroScenes.filter((scene) => !layersOf(scene).some((layer) => ['tertiary', 'foreground'].includes(layer.role)));
if (noDepthRole.length) {
  layerDepth -= Math.min(8, noDepthRole.length * 2);
  warnings.push(`Shots without tertiary or foreground depth: ${noDepthRole.map((scene) => scene.id).join(', ')}`);
}
const manifestBackgrounds = manifestAssets.filter((asset) => asset.type === 'background');
const manifestLayers = manifestAssets.filter((asset) => ['layer', 'foreground'].includes(asset.type));
if (!manifestBackgrounds.length) hardFailures.push('Asset manifest has no separate background plate.');
if (!manifestLayers.length) hardFailures.push('Asset manifest has no independent layers.');

let composition = 20;
const signatures = new Set(scenes.map((scene) => `${scene.background}|${Math.round((layersOf(scene).find((layer) => layer.role === 'primary')?.x ?? 0) / Math.max(1, project.width) * 4)}`));
if (signatures.size < (brief.quality?.minDistinctCompositions ?? 2)) {
  composition -= 8;
  warnings.push('Fewer than two visibly different composition signatures.');
}
const weakPrimary = heroScenes.filter((scene) => {
  const primary = layersOf(scene).find((layer) => layer.role === 'primary');
  return primary && primary.width / project.width < 0.32;
});
if (weakPrimary.length) {
  composition -= Math.min(7, weakPrimary.length * 2);
  warnings.push(`Primary may be too small: ${weakPrimary.map((scene) => scene.id).join(', ')}`);
}

let motion = 15;
const simultaneous = heroScenes.filter((scene) => {
  const delays = new Set(layersOf(scene).map((layer) => layer.delay ?? 0));
  return layersOf(scene).length > 2 && delays.size < 3;
});
if (simultaneous.length) {
  motion -= Math.min(7, simultaneous.length * 2);
  warnings.push(`Insufficient staggered entrances: ${simultaneous.map((scene) => scene.id).join(', ')}`);
}
if (!scenes.some((scene) => scene.transition || scene.transitionSfx)) {
  motion -= 3;
  warnings.push('No explicit transition treatment or transition sound is configured.');
}

let typography = 10;
if (project.brand?.show !== false && !project.brand?.handle) {
  typography -= 3;
  warnings.push('Brand handle is missing.');
}
if (!scenes.some((scene) => scene.caption)) {
  typography -= 4;
  warnings.push('No captions are configured.');
}
if (scenes.filter((scene) => scene.note && scene.title && scene.caption).length > Math.ceil(scenes.length / 2)) {
  typography -= 2;
  warnings.push('Many scenes stack title, note, and caption; check for card-heavy layout.');
}

let audio = 10;
const sfxCount = scenes.reduce((sum, scene) => sum + (scene.transitionSfx ? 1 : 0) + layersOf(scene).filter((layer) => layer.sfx).length, 0);
if (!project.audio?.music && sfxCount === 0) {
  audio -= 5;
  warnings.push('No music bed or sound effects are configured.');
}
if (!project.audio?.music) audio -= 1;

let technical = 5;
if (![24, 25, 30, 50, 60].includes(project.fps)) {
  technical -= 1;
  warnings.push(`Unusual frame rate: ${project.fps}`);
}
if (![project.width, project.height, project.fps, project.durationInFrames].every((value) => Number.isInteger(value) && value > 0)) {
  technical = 0;
  hardFailures.push('width, height, fps, and durationInFrames must be positive integers.');
}

const bounded = (value, max) => Math.max(0, Math.min(max, value));
const scores = {
  narrative: bounded(narrative, 15),
  layerDepth: bounded(layerDepth, 25),
  composition: bounded(composition, 20),
  motion: bounded(motion, 15),
  typographyAttribution: bounded(typography, 10),
  audio: bounded(audio, 10),
  technical: bounded(technical, 5),
};
const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
details.sceneCount = scenes.length;
details.heroSceneCount = heroScenes.length;
details.averageLayersPerHero = heroScenes.length ? heroScenes.reduce((sum, scene) => sum + layersOf(scene).length, 0) / heroScenes.length : 0;
details.distinctCompositionSignatures = signatures.size;
details.sfxCount = sfxCount;
details.stylePreset = stylePreset;

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
