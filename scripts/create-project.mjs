#!/usr/bin/env node
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args = process.argv.slice(2);
let output;
let mode = 'explainer';
let assetStrategy = 'layered';
let requestedDurationSeconds = null;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === '--mode') {
    const selected = args[index + 1];
    if (!selected || selected.startsWith('--')) {
      console.error('Missing value for --mode. Choose explainer or book. Legacy book-review is also accepted.');
      process.exit(1);
    }
    mode = selected;
    index += 1;
  } else if (argument === '--asset-strategy') {
    const selected = args[index + 1];
    if (!selected || selected.startsWith('--')) {
      console.error('Missing value for --asset-strategy. The supported value is layered.');
      process.exit(1);
    }
    assetStrategy = selected;
    index += 1;
  } else if (argument === '--duration') {
    const selected = Number.parseFloat(args[index + 1]);
    if (!Number.isFinite(selected) || selected <= 0) {
      console.error('Missing or invalid value for --duration. Provide an approximate number of seconds greater than zero.');
      process.exit(1);
    }
    requestedDurationSeconds = selected;
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
  console.error('Usage: create-project.mjs <output-directory> [--mode explainer|book|book-review] [--duration approximate-seconds] [--asset-strategy layered]');
  process.exit(1);
}
if (mode === 'book-review') mode = 'book';
if (!['explainer', 'book'].includes(mode)) {
  console.error(`Unsupported mode: ${mode}. Choose explainer or book.`);
  process.exit(1);
}
if (assetStrategy !== 'layered') {
  console.error(`Unsupported asset strategy: ${assetStrategy}. All new projects require layered assets; composite scene illustrations are not a valid production strategy.`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const template = path.resolve(scriptDir, '..', 'assets', 'remotion-template');
const bookResearchTemplate = path.resolve(scriptDir, '..', 'assets', 'book-research-template.json');
const destination = path.resolve(output);
const durationPlan = requestedDurationSeconds == null
  ? mode === 'book'
    ? {
        source: 'fallback',
        requestedSeconds: null,
        planningTargetSeconds: null,
        planningRangeSeconds: [60, 120],
        finalAudioDeterminesRuntime: true,
      }
    : {
        source: 'fallback',
        requestedSeconds: null,
        planningTargetSeconds: 40,
        planningRangeSeconds: [35, 50],
        finalAudioDeterminesRuntime: true,
      }
  : {
      source: 'user',
      requestedSeconds: requestedDurationSeconds,
      planningTargetSeconds: requestedDurationSeconds,
      planningRangeSeconds: null,
      finalAudioDeterminesRuntime: true,
    };

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

const updateJson = (relative, mutate) => {
  const file = path.join(destination, relative);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  mutate(data);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

updateJson('creative-brief.json', (brief) => {
  delete brief.project.durationSeconds;
  brief.project.durationPlan = durationPlan;
});
updateJson('public/project.json', (project) => {
  project.durationPlan = durationPlan;
  const planningSeconds = durationPlan.planningTargetSeconds
    ?? (durationPlan.planningRangeSeconds[0] + durationPlan.planningRangeSeconds[1]) / 2;
  project.durationInFrames = Math.round(planningSeconds * project.fps);
});

if (mode === 'book') {
  if (!existsSync(bookResearchTemplate)) {
    console.error(`Book research template not found: ${bookResearchTemplate}`);
    process.exit(1);
  }
  cpSync(bookResearchTemplate, path.join(destination, 'book-research.json'));

  updateJson('creative-brief.json', (brief) => {
    brief.project.contentMode = 'book';
    brief.project.topic = '<replace-with-book-title-and-selected-angle>';
    brief.project.lessonObjective = '<replace-with-what-the-viewer-will-understand-after-the-story>';
    brief.project.book = {
      title: '<replace-with-book-title>',
      originalTitle: '<replace-with-original-title-or-remove>',
      author: '<replace-with-author>',
      angle: '<replace-with-one-editorial-angle>',
      spoilerLevel: 'low',
    };
    brief.visualSystem.assetStrategy = 'layered';
    brief.visualSystem.seriesAnchor = '<replace-with-one-exact-series-style-anchor-reused-in-every-background-and-cutout-prompt>';
    brief.visualSystem.depth = 'layered collage with character-free backgrounds and independently animated alpha subjects';
    brief.story = {
      protagonistIds: ['<replace-with-primary-character-id>'],
      characters: [{
        id: '<replace-with-primary-character-id>',
        name: '<replace-with-character-name>',
        narrativeRole: 'primary',
        continuityAnchor: '<replace-with-stable-original-non-actor-character-design>',
        sourceIds: ['<replace-with-source-id>'],
      }],
      beats: [{
        id: '<replace-with-story-beat-id>',
        narrativePurpose: '<replace-with-why-this-beat-exists>',
        narrativeChange: {
          before: '<replace-with-state-before>',
          turn: '<replace-with-event-decision-or-reframing>',
          after: '<replace-with-state-after>',
        },
        narrationIntent: '<replace-with-what-the-narration-must-convey>',
        visualAction: {
          subjectLayerId: '<replace-with-independent-subject-asset-id>',
          action: '<replace-with-observable-action>',
          targetLayerId: '<replace-with-target-prop-id-or-remove>',
          result: '<replace-with-visible-result>',
        },
        characters: [{
          characterId: '<replace-with-primary-character-id>',
          variantId: '<replace-with-character-variant-id>',
          dramaticFunction: 'primary',
        }],
        claimIds: ['<replace-with-claim-id>'],
        sourceIds: ['<replace-with-source-id>'],
        spoilerLevel: 'low',
      }],
    };
  });

  updateJson('public/project.json', (project) => {
    project.title = '插画讲书视频';
    project.contentMode = 'book';
    project.assetStrategy = 'layered';
    project.captionSafeBottom = Math.round(project.height * 0.095);
    project.book = {
      title: '<replace-with-book-title>',
      originalTitle: '<replace-with-original-title-or-remove>',
      author: '<replace-with-author>',
      angle: '<replace-with-one-editorial-angle>',
      spoilerLevel: 'low',
      label: '插画讲书',
    };
    project.captions = [];
  });

  updateJson('public/asset-manifest.json', (manifest) => {
    manifest.contentMode = 'book';
    manifest.assetStrategy = 'layered';
  });

  updateJson('project-config.json', (config) => {
    config.contentMode = 'book';
    config.assetStrategy = 'layered';
    config.timing = {provider: 'manual', model: null};
    config.renderer = {provider: 'remotion'};
  });

  updateJson('book-research.json', (research) => {
    research.contentMode = 'book';
    research.storySpine.narrationTiming = {
      durationRule: 'ask-user-then-fit-approved-narration',
      preferenceSource: durationPlan.source,
      requestedSeconds: durationPlan.requestedSeconds,
      planningTargetSeconds: durationPlan.planningTargetSeconds,
      planningRangeSeconds: durationPlan.planningRangeSeconds,
      finalAudioDeterminesRuntime: true,
    };
  });
}
console.log(destination);
