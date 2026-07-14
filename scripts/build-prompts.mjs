#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const briefPath = value('--brief');
const outputDirectory = value('--out');
if (!briefPath || !outputDirectory) {
  console.error('Usage: build-prompts.mjs --brief creative-brief.json --out public/prompts');
  process.exit(1);
}
if (!existsSync(briefPath)) {
  console.error(`Creative brief not found: ${briefPath}`);
  process.exit(1);
}

const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
const errors = [];
const placeholder = (input) => typeof input === 'string' && /^<.*>$/.test(input.trim());
const requireText = (input, field) => {
  if (typeof input !== 'string' || !input.trim() || placeholder(input)) errors.push(`Missing project value: ${field}`);
};

requireText(brief.project?.topic, 'project.topic');
requireText(brief.project?.audience, 'project.audience');
requireText(brief.project?.lessonObjective, 'project.lessonObjective');
requireText(brief.project?.aspectRatio, 'project.aspectRatio');
const stylePreset = brief.visualSystem?.preset ?? 'paper-cut';
if (stylePreset !== 'paper-cut') {
  errors.push(`Unsupported visualSystem.preset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
}
requireText(brief.visualSystem?.medium, 'visualSystem.medium');
requireText(brief.visualSystem?.lineTreatment, 'visualSystem.lineTreatment');
requireText(brief.visualSystem?.texture, 'visualSystem.texture');
requireText(brief.visualSystem?.lighting, 'visualSystem.lighting');
if (!Array.isArray(brief.visualSystem?.palette) || brief.visualSystem.palette.length < 2 || brief.visualSystem.palette.some(placeholder)) {
  errors.push('visualSystem.palette requires at least two real project colors.');
}
const assets = Array.isArray(brief.assets) ? brief.assets : [];
if (assets.length === 0) errors.push('assets must contain at least one background and one independent layer.');

const allowedTypes = new Set(['background', 'layer', 'foreground']);
const ids = new Set();
for (const [index, asset] of assets.entries()) {
  const prefix = `assets[${index}]`;
  requireText(asset.id, `${prefix}.id`);
  requireText(asset.type, `${prefix}.type`);
  requireText(asset.purpose, `${prefix}.purpose`);
  requireText(asset.request, `${prefix}.request`);
  requireText(asset.composition, `${prefix}.composition`);
  if (asset.id && ids.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}`);
  ids.add(asset.id);
  if (asset.type && !allowedTypes.has(asset.type)) errors.push(`${prefix}.type must be background, layer, or foreground.`);
  if (asset.type !== 'background' && !asset.chromaKey) errors.push(`${prefix}.chromaKey is required for isolated assets.`);
}

if (!assets.some((asset) => asset.type === 'background')) errors.push('At least one background asset is required.');
if (!assets.some((asset) => asset.type === 'layer' || asset.type === 'foreground')) errors.push('At least one independent layer asset is required.');

if (errors.length) {
  console.error(JSON.stringify({ok: false, errors}, null, 2));
  process.exit(1);
}

const visual = brief.visualSystem;
const style = [visual.medium, visual.lineTreatment, visual.depth].filter(Boolean).join('; ');
const avoid = [...(visual.avoid ?? [])];
const compiled = [];
mkdirSync(outputDirectory, {recursive: true});

for (const asset of assets) {
  const background = asset.type === 'background';
  const assetType = background ? 'environment background plate' : asset.type === 'foreground' ? 'isolated foreground animation layer' : 'isolated full-subject animation layer';
  const constraints = background
    ? [
        'environment only',
        'exclude all featured subjects named in this brief',
        'leave the planned negative space open for later compositing',
        'no labels, letters, numbers, logos, or watermark',
      ]
    : [
        `background is one perfectly uniform solid ${asset.chromaKey} chroma key edge-to-edge`,
        `do not use ${asset.chromaKey} inside the subject`,
        'complete silhouette with generous padding and nothing cropped',
        'no floor, cast shadow, contact shadow, reflection, scenery, gradient, or background texture',
        'no labels, letters, numbers, logos, or watermark',
      ];
  const lines = [
    'Use case: illustration-story',
    `Asset type: ${assetType} for a ${brief.project.aspectRatio} layered explainer video`,
    `Style preset: ${stylePreset}`,
    `Purpose: ${asset.purpose}`,
    `Primary request: ${asset.request}`,
    `Scene/backdrop: ${background ? asset.environment ?? 'the environment described in the primary request' : `flat ${asset.chromaKey} chroma-key field`}`,
    `Style/medium: ${style}`,
    `Composition/framing: ${asset.composition}`,
    `Lighting/mood: ${visual.lighting}`,
    `Color palette: ${visual.palette.join(', ')}`,
    `Materials/textures: ${visual.texture}`,
    `Constraints: ${[...constraints, ...(asset.constraints ?? [])].join('; ')}`,
    `Avoid: ${[...avoid, ...(asset.avoid ?? [])].join('; ')}`,
  ];
  const prompt = `${lines.join('\n')}\n`;
  const filename = `${asset.id}.txt`;
  writeFileSync(path.join(outputDirectory, filename), prompt);
  compiled.push({id: asset.id, type: asset.type, promptFile: filename, chromaKey: asset.chromaKey ?? null});
}

writeFileSync(
  path.join(outputDirectory, 'prompt-manifest.json'),
  `${JSON.stringify({topic: brief.project.topic, visualSystem: visual, assets: compiled}, null, 2)}\n`,
);
console.log(JSON.stringify({ok: true, outputDirectory: path.resolve(outputDirectory), prompts: compiled}, null, 2));
