#!/usr/bin/env node
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args = process.argv.slice(2);
let output;
let mode = 'explainer';
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === '--mode') {
    const selected = args[index + 1];
    if (!selected || selected.startsWith('--')) {
      console.error('Missing value for --mode. Choose explainer or book-review.');
      process.exit(1);
    }
    mode = selected;
    index += 1;
  } else if (argument.startsWith('--')) {
    console.error(`Unknown option: ${argument}`);
    process.exit(1);
  } else if (!output) {
    output = argument;
  } else {
    console.error(`Unexpected positional argument: ${argument}`);
    process.exit(1);
  }
}
if (!output) {
  console.error('Usage: create-project.mjs <output-directory> [--mode explainer|book-review]');
  process.exit(1);
}
if (!['explainer', 'book-review'].includes(mode)) {
  console.error(`Unsupported mode: ${mode}. Choose explainer or book-review.`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const template = path.resolve(scriptDir, '..', 'assets', 'remotion-template');
const bookResearchTemplate = path.resolve(scriptDir, '..', 'assets', 'book-research-template.json');
const destination = path.resolve(output);

if (!existsSync(template)) {
  console.error(`Template not found: ${template}`);
  process.exit(1);
}

if (existsSync(destination) && readdirSync(destination).length > 0) {
  console.error(`Destination is not empty: ${destination}`);
  process.exit(1);
}

mkdirSync(destination, {recursive: true});
cpSync(template, destination, {recursive: true, errorOnExist: true});

if (mode === 'book-review') {
  if (!existsSync(bookResearchTemplate)) {
    console.error(`Book research template not found: ${bookResearchTemplate}`);
    process.exit(1);
  }
  cpSync(bookResearchTemplate, path.join(destination, 'book-research.json'));

  const updateJson = (relative, mutate) => {
    const file = path.join(destination, relative);
    const data = JSON.parse(readFileSync(file, 'utf8'));
    mutate(data);
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  };

  updateJson('creative-brief.json', (brief) => {
    brief.project.contentMode = 'book-review';
    brief.project.durationSeconds = null;
    brief.project.book = {
      title: '<replace-with-book-title>',
      originalTitle: '<replace-with-original-title-or-remove>',
      author: '<replace-with-author>',
      angle: '<replace-with-one-editorial-angle>',
      spoilerLevel: 'low',
    };
    brief.visualSystem.assetStrategy = 'scene-illustrations';
    brief.visualSystem.seriesAnchor = '<replace-with-one-exact-series-style-anchor-reused-in-every-image-prompt>';
    delete brief.quality.minHeroLayers;
    brief.quality.minIllustrations = 3;
  });

  updateJson('public/project.json', (project) => {
    project.title = '插画读书视频';
    project.contentMode = 'book-review';
    project.assetStrategy = 'scene-illustrations';
    project.captionSafeBottom = Math.round(project.height * 0.095);
    project.book = {
      title: '<replace-with-book-title>',
      originalTitle: '<replace-with-original-title-or-remove>',
      author: '<replace-with-author>',
      angle: '<replace-with-one-editorial-angle>',
      spoilerLevel: 'low',
      label: '插画读书',
    };
    project.captions = [];
  });

  updateJson('public/asset-manifest.json', (manifest) => {
    manifest.contentMode = 'book-review';
    manifest.assetStrategy = 'scene-illustrations';
  });

  updateJson('project-config.json', (config) => {
    config.contentMode = 'book-review';
    config.assetStrategy = 'scene-illustrations';
    config.timing = {provider: 'manual', model: null};
    config.renderer = {provider: 'remotion'};
  });
}
console.log(destination);
