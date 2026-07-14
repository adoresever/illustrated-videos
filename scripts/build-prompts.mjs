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
const rejectPlaceholder = (input, field) => {
  if (input !== undefined && input !== null && (typeof input !== 'string' || !input.trim() || placeholder(input))) {
    errors.push(`${field} must be real text or removed.`);
  }
};

const contentMode = brief.project?.contentMode ?? 'explainer';
const assetStrategy = brief.visualSystem?.assetStrategy ?? 'layered';
if (!['explainer', 'book-review'].includes(contentMode)) {
  errors.push(`Unsupported project.contentMode: ${contentMode}.`);
}
if (!['layered', 'scene-illustrations'].includes(assetStrategy)) {
  errors.push(`Unsupported visualSystem.assetStrategy: ${assetStrategy}.`);
}
if (contentMode === 'explainer' && assetStrategy !== 'layered') {
  errors.push('explainer mode requires visualSystem.assetStrategy=layered in this release.');
}
if (contentMode === 'book-review' && assetStrategy !== 'scene-illustrations') {
  errors.push('book-review mode requires visualSystem.assetStrategy=scene-illustrations in this release.');
}

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

if (contentMode === 'book-review') {
  requireText(brief.project?.book?.title, 'project.book.title');
  rejectPlaceholder(brief.project?.book?.originalTitle, 'project.book.originalTitle');
  requireText(brief.project?.book?.author, 'project.book.author');
  requireText(brief.project?.book?.angle, 'project.book.angle');
  if (!['none', 'low', 'full'].includes(brief.project?.book?.spoilerLevel)) {
    errors.push('project.book.spoilerLevel must be none, low, or full.');
  }
  requireText(brief.visualSystem?.seriesAnchor, 'visualSystem.seriesAnchor');
  const sources = Array.isArray(brief.evidence?.sources) ? brief.evidence.sources : [];
  if (!sources.length) errors.push('book-review mode requires at least one evidence.sources entry.');
  for (const [index, source] of sources.entries()) {
    requireText(source?.title, `evidence.sources[${index}].title`);
    requireText(source?.url, `evidence.sources[${index}].url`);
  }
}

const assets = Array.isArray(brief.assets) ? brief.assets : [];
if (assets.length === 0) {
  errors.push(assetStrategy === 'layered'
    ? 'assets must contain at least one background and one independent layer.'
    : 'assets must contain at least three complete scene illustrations.');
}

const allowedTypes = assetStrategy === 'layered'
  ? new Set(['background', 'layer', 'foreground'])
  : new Set(['illustration']);
const ids = new Set();
for (const [index, asset] of assets.entries()) {
  const prefix = `assets[${index}]`;
  requireText(asset.id, `${prefix}.id`);
  requireText(asset.type, `${prefix}.type`);
  requireText(asset.purpose, `${prefix}.purpose`);
  requireText(asset.request, `${prefix}.request`);
  requireText(asset.composition, `${prefix}.composition`);
  if (asset.id && ids.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}`);
  if (asset.id && !/^[a-z0-9][a-z0-9._-]*$/iu.test(asset.id)) {
    errors.push(`${prefix}.id must be a filename-safe slug using letters, numbers, dot, underscore, or hyphen.`);
  }
  ids.add(asset.id);
  if (asset.type && !allowedTypes.has(asset.type)) {
    errors.push(`${prefix}.type must be ${[...allowedTypes].join(', ')} for ${assetStrategy}.`);
  }
  if (assetStrategy === 'layered' && asset.type !== 'background' && !asset.chromaKey) {
    errors.push(`${prefix}.chromaKey is required for isolated assets.`);
  }
  if (assetStrategy === 'scene-illustrations' && asset.chromaKey) {
    errors.push(`${prefix}.chromaKey must be omitted for a complete scene illustration.`);
  }
}

if (assetStrategy === 'layered') {
  if (!assets.some((asset) => asset.type === 'background')) errors.push('At least one background asset is required.');
  if (!assets.some((asset) => asset.type === 'layer' || asset.type === 'foreground')) errors.push('At least one independent layer asset is required.');
} else {
  const illustrations = assets.filter((asset) => asset.type === 'illustration');
  if (illustrations.length < 3) errors.push('scene-illustrations requires at least three illustration assets; add more when the narration has more visual beats.');
}

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
  const illustration = asset.type === 'illustration';
  const assetType = illustration
    ? 'complete text-free editorial scene illustration plate'
    : background
      ? 'environment background plate'
      : asset.type === 'foreground'
        ? 'isolated foreground animation layer'
        : 'isolated full-subject animation layer';
  const constraints = illustration
    ? [
        'one complete original scene; characters, objects, and environment may share the frame',
        'no readable text, letters, numbers, title, author name, logo, signature, or watermark',
        'do not reproduce a published book cover, edition illustration, film still, or identifiable actor likeness',
        'leave mobile-safe negative space for code-rendered captions; do not draw a caption box',
      ]
    : background
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
  const contextLines = illustration
    ? [
        `Book: ${brief.project.book.title} by ${brief.project.book.author}`,
        `Editorial angle: ${brief.project.book.angle}`,
        `Spoiler policy: ${brief.project.book.spoilerLevel}`,
        `Series anchor (reuse exactly across every plate): ${visual.seriesAnchor}`,
      ]
    : [];
  const lines = [
    'Use case: illustration-story',
    `Asset type: ${assetType} for a ${brief.project.aspectRatio} illustrated video`,
    `Content mode: ${contentMode}`,
    `Asset strategy: ${assetStrategy}`,
    `Style preset: ${stylePreset}`,
    ...contextLines,
    `Purpose: ${asset.purpose}`,
    `Primary request: ${asset.request}`,
    `Scene/backdrop: ${illustration ? asset.environment ?? 'the complete scene described above' : background ? asset.environment ?? 'the environment described in the primary request' : `flat ${asset.chromaKey} chroma-key field`}`,
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
  `${JSON.stringify({
    topic: brief.project.topic,
    contentMode,
    assetStrategy,
    visualSystem: visual,
    assets: compiled,
  }, null, 2)}\n`,
);
console.log(JSON.stringify({ok: true, outputDirectory: path.resolve(outputDirectory), prompts: compiled}, null, 2));
