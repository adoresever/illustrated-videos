#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '.');
const readJson = (relative) => {
  const file = path.join(root, relative);
  if (!existsSync(file)) throw new Error(`Missing ${relative}`);
  return JSON.parse(readFileSync(file, 'utf8'));
};

let project;
let manifest;
let brief = {};
let researchPacket = null;
try {
  project = readJson('public/project.json');
  manifest = readJson('public/asset-manifest.json');
  if (existsSync(path.join(root, 'creative-brief.json'))) brief = readJson('creative-brief.json');
  if (existsSync(path.join(root, 'book-research.json'))) researchPacket = readJson('book-research.json');
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
const contentMode = project.contentMode ?? 'explainer';
const assetStrategy = project.assetStrategy ?? 'layered';

if (contentMode === 'book-review' || assetStrategy === 'scene-illustrations') {
  const realText = (value) => typeof value === 'string' && value.trim() && !/^<.*>$/.test(value.trim());
  const bounded = (value, max) => Math.max(0, Math.min(max, value));
  const normalize = (text) => text.replace(/\s+/gu, '');
  const comparable = (text) => typeof text === 'string' ? text.trim().replace(/\s+/gu, ' ') : '';
  const validHttpUrl = (value) => {
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol) && !parsed.hostname.endsWith('.invalid');
    } catch {
      return false;
    }
  };
  const sources = Array.isArray(brief.evidence?.sources) ? brief.evidence.sources : [];
  const claims = Array.isArray(brief.evidence?.claims) ? brief.evidence.claims : [];
  const captions = Array.isArray(project.captions) ? project.captions : [];
  const illustrationAssets = manifestAssets.filter((asset) => asset.type === 'illustration');
  const uniqueIllustrationPaths = new Set(illustrationAssets.map((asset) => asset.path));

  if (contentMode !== 'book-review') hardFailures.push('scene-illustrations is only verified with contentMode=book-review in this release.');
  if (assetStrategy !== 'scene-illustrations') hardFailures.push('book-review requires assetStrategy=scene-illustrations in this release.');
  if (stylePreset !== 'paper-cut') hardFailures.push(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
  if (brief.project?.contentMode !== 'book-review') hardFailures.push('Creative brief must declare project.contentMode=book-review.');
  if (brief.visualSystem?.assetStrategy !== 'scene-illustrations') hardFailures.push('Creative brief must declare visualSystem.assetStrategy=scene-illustrations.');
  if (!project.audio || typeof project.audio !== 'object' || Array.isArray(project.audio)) hardFailures.push('project.audio must be an object.');
  if (!project.audio?.voice) hardFailures.push('Book-review mode requires final narration audio.');

  let narrative = 20;
  if (scenes.length < 3) {
    narrative -= 10;
    hardFailures.push('Use at least three semantic illustration beats; add more when the narration needs them.');
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
  const longVisualHolds = scenes.filter((scene) => scene.duration / fps > 15);
  if (longVisualHolds.length) {
    narrative -= Math.min(4, longVisualHolds.length);
    warnings.push(`Illustration holds above 15 seconds need an intentional internal visual event: ${longVisualHolds.map((scene) => scene.id).join(', ')}`);
  }

  let research = 15;
  for (const field of ['title', 'author', 'angle']) {
    if (!realText(project.book?.[field])) {
      research -= 4;
      hardFailures.push(`project.book.${field} is required.`);
    }
  }
  const originalTitles = [project.book?.originalTitle, brief.project?.book?.originalTitle].filter((value) => value != null && value !== '');
  if (originalTitles.length && (originalTitles.length !== 2 || originalTitles.some((value) => !realText(value)) || comparable(originalTitles[0]) !== comparable(originalTitles[1]))) {
    research -= 2;
    hardFailures.push('Creative brief and public/project.json originalTitle must both be real text and match, or both be omitted.');
  }
  if (!['none', 'low', 'full'].includes(project.book?.spoilerLevel)) {
    research -= 2;
    hardFailures.push('project.book.spoilerLevel must be none, low, or full.');
  }
  if (!sources.length) {
    research -= 8;
    hardFailures.push('Creative brief has no recorded research sources.');
  } else if (sources.length < 2) {
    research -= 2;
    warnings.push('Only one research source is recorded; use a second authoritative source when facts are contested.');
  }
  if (!claims.length) {
    research -= 2;
    warnings.push('No claim ledger is recorded; distinguish bibliographic facts from original commentary.');
  }
  for (const field of ['title', 'author', 'angle']) {
    if (!realText(brief.project?.book?.[field]) || comparable(brief.project.book[field]) !== comparable(project.book?.[field])) {
      research -= 2;
      hardFailures.push(`Creative brief project.book.${field} must match public/project.json.`);
    }
  }
  if (brief.project?.book?.spoilerLevel !== project.book?.spoilerLevel) {
    research -= 1;
    hardFailures.push('Creative brief spoilerLevel must match public/project.json.');
  }
  if (!researchPacket) {
    research = 0;
    hardFailures.push('book-research.json is required for evidence and rights traceability.');
  } else {
    const metadataPairs = [
      ['book.title', researchPacket.book?.title, project.book?.title],
      ['book.author', researchPacket.book?.author, project.book?.author],
      ['editorial.angle', researchPacket.editorial?.angle, project.book?.angle],
    ];
    for (const [label, researchValue, projectValue] of metadataPairs) {
      if (!realText(researchValue) || comparable(researchValue) !== comparable(projectValue)) {
        research -= 2;
        hardFailures.push(`book-research ${label} must contain real text matching public/project.json.`);
      }
    }
    const projectOriginalTitle = project.book?.originalTitle;
    const researchOriginalTitle = researchPacket.book?.originalTitle;
    if ((projectOriginalTitle != null && projectOriginalTitle !== '') || (researchOriginalTitle != null && researchOriginalTitle !== '')) {
      if (!realText(projectOriginalTitle) || !realText(researchOriginalTitle) || comparable(projectOriginalTitle) !== comparable(researchOriginalTitle)) {
        research -= 2;
        hardFailures.push('book-research book.originalTitle must match public/project.json, or both must be omitted.');
      }
    }
    if (researchPacket.editorial?.spoilerLevel !== project.book?.spoilerLevel) {
      research -= 1;
      hardFailures.push('book-research editorial.spoilerLevel must match public/project.json.');
    }
    if (researchPacket.guardrails?.quotePolicy !== 'original-commentary-only') {
      research -= 3;
      hardFailures.push('book-research guardrails.quotePolicy must be original-commentary-only in this release.');
    }
    for (const flag of ['noCoverReplication', 'noAdaptationFramesOrLikenesses', 'noGeneratedTypography', 'noEditionStyleImitation']) {
      if (researchPacket.guardrails?.visualPolicy?.[flag] !== true) {
        research -= 1;
        hardFailures.push(`book-research guardrails.visualPolicy.${flag} must be true.`);
      }
    }
    const visualExclusions = Array.isArray(researchPacket.guardrails?.visualExclusions)
      ? researchPacket.guardrails.visualExclusions
      : [];
    if (visualExclusions.length < 3 || visualExclusions.some((entry) => !realText(entry))) {
      research -= 3;
      hardFailures.push('book-research must record at least three real visual exclusions.');
    }
    if (!Array.isArray(researchPacket.sources) || !researchPacket.sources.length) {
      research -= 3;
      hardFailures.push('book-research must record at least one source.');
    } else {
      const sourceIds = new Set();
      for (const [index, source] of researchPacket.sources.entries()) {
        if (!realText(source?.id) || !realText(source?.title) || !validHttpUrl(source?.url)) {
          research -= 1;
          hardFailures.push(`book-research sources[${index}] must have a real id/title and http(s) URL.`);
        }
        if (realText(source?.id) && sourceIds.has(source.id)) {
          research -= 1;
          hardFailures.push(`Duplicate book-research source id: ${source.id}.`);
        }
        if (realText(source?.id)) sourceIds.add(source.id);
      }
      const facts = Array.isArray(researchPacket.facts) ? researchPacket.facts : [];
      if (!facts.length) {
        research -= 2;
        hardFailures.push('book-research must record at least one fact.');
      }
      for (const [index, fact] of facts.entries()) {
        const factSources = Array.isArray(fact?.sourceIds) ? fact.sourceIds : [];
        if (fact?.status === 'verified' && !factSources.length) {
          research -= 1;
          hardFailures.push(`book-research facts[${index}] is verified but has no sourceIds.`);
        }
        for (const sourceId of factSources) {
          if (!sourceIds.has(sourceId)) {
            research -= 1;
            hardFailures.push(`book-research facts[${index}] references unknown source id: ${sourceId}.`);
          }
        }
      }
    }
  }

  let illustrationCoverage = 20;
  if (uniqueIllustrationPaths.size < 3) {
    illustrationCoverage -= 12;
    hardFailures.push('Asset manifest has fewer than three unique scene illustrations.');
  }
  const undeclaredSceneBackgrounds = scenes.filter((scene) => !uniqueIllustrationPaths.has(scene.background));
  if (undeclaredSceneBackgrounds.length) {
    illustrationCoverage -= 8;
    hardFailures.push(`Scenes without a declared illustration plate: ${undeclaredSceneBackgrounds.map((scene) => scene.id).join(', ')}`);
  }
  const reusedBackgrounds = scenes.length - new Set(scenes.map((scene) => scene.background)).size;
  if (reusedBackgrounds > 0) {
    illustrationCoverage -= Math.min(5, reusedBackgrounds * 2);
    warnings.push(`${reusedBackgrounds} scene(s) reuse an illustration; confirm that reuse is editorially intentional.`);
  }
  const uninspectedText = illustrationAssets.filter((asset) => asset.textFree !== true);
  if (uninspectedText.length) {
    illustrationCoverage -= Math.min(8, uninspectedText.length * 2);
    hardFailures.push(`Illustrations missing textFree visual confirmation: ${uninspectedText.map((asset) => asset.id).join(', ')}`);
  }
  const uninspectedRights = illustrationAssets.filter((asset) => asset.visuallyInspected !== true);
  if (uninspectedRights.length) {
    illustrationCoverage -= Math.min(8, uninspectedRights.length * 2);
    hardFailures.push(`Illustrations missing visual rights/exclusion inspection: ${uninspectedRights.map((asset) => asset.id).join(', ')}`);
  }
  const scenesWithLayers = scenes.filter((scene) => layersOf(scene).length > 0);
  if (scenesWithLayers.length) hardFailures.push(`scene-illustrations must use layers: []: ${scenesWithLayers.map((scene) => scene.id).join(', ')}`);

  let motion = 15;
  const cameraSignatures = new Set(scenes.map((scene) => {
    const camera = scene.camera ?? {};
    return [camera.scaleFrom ?? 1.01, camera.scaleTo ?? 1.045, camera.xFrom ?? 0, camera.xTo ?? 0, camera.yFrom ?? 0, camera.yTo ?? 0].join('|');
  }));
  if (cameraSignatures.size < Math.min(3, scenes.length)) {
    motion -= 6;
    warnings.push('Use at least three distinct camera trajectories across scene illustrations.');
  }
  if (!scenes.some((scene) => scene.transition && scene.transition !== 'cut')) {
    motion -= 3;
    warnings.push('No visible transition treatment is configured.');
  }

  let typography = 15;
  if (!scenes.some((scene) => scene.showBookMeta === true)) {
    typography -= 5;
    hardFailures.push('Book title and author are not enabled as a code-rendered overlay.');
  }
  if (!captions.length) {
    typography -= 8;
    hardFailures.push('No approved global caption timeline is configured.');
  }
  const orderedCaptions = [...captions].sort((a, b) => a.from - b.from);
  if (captions.some((cue, index) => cue !== orderedCaptions[index])) {
    hardFailures.push('Caption cues must be stored in chronological from order.');
  }
  let captionCursor = 0;
  for (const cue of orderedCaptions) {
    if (!Number.isInteger(cue.from) || cue.from < 0 || !Number.isInteger(cue.duration) || cue.duration <= 0 || !realText(cue.text)) {
      hardFailures.push(`Invalid caption cue: ${cue.id ?? '<unknown>'}.`);
      continue;
    }
    if (cue.from < captionCursor) hardFailures.push(`Caption overlap at ${cue.id}.`);
    captionCursor = Math.max(captionCursor, cue.from + cue.duration);
    if (captionCursor > project.durationInFrames) hardFailures.push(`Caption ${cue.id} extends past durationInFrames.`);
  }
  const narrationPath = path.join(root, 'narration.txt');
  if (!existsSync(narrationPath)) {
    typography -= 8;
    hardFailures.push('book-review requires narration.txt as the approved text authority.');
  } else if (captions.length) {
    const narration = normalize(readFileSync(narrationPath, 'utf8').trim());
    const captionText = normalize(orderedCaptions.map((cue) => cue.text).join(''));
    if (!narration || /^<.*>$/.test(narration)) {
      typography -= 5;
      hardFailures.push('narration.txt is empty or still contains a placeholder.');
    } else if (narration !== captionText) {
      typography -= 5;
      hardFailures.push('Caption text does not concatenate exactly to the approved narration; do not substitute ASR wording.');
    }
  }

  let audio = 10;
  let voiceDurationSeconds = null;
  if (project.audio?.voice) {
    const voicePath = path.resolve(root, 'public', project.audio.voice);
    if (existsSync(voicePath)) {
      const probe = spawnSync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', voicePath,
      ], {encoding: 'utf8'});
      const probed = Number.parseFloat(probe.stdout?.trim());
      if (!probe.error && probe.status === 0 && Number.isFinite(probed)) {
        voiceDurationSeconds = probed;
        const videoDurationSeconds = project.durationInFrames / fps;
        if (videoDurationSeconds + 0.08 < voiceDurationSeconds) {
          audio -= 5;
          hardFailures.push(`Timeline (${videoDurationSeconds.toFixed(3)}s) ends before final narration (${voiceDurationSeconds.toFixed(3)}s).`);
        } else if (videoDurationSeconds - voiceDurationSeconds > 2.5) {
          audio -= 2;
          warnings.push(`Timeline has ${(videoDurationSeconds - voiceDurationSeconds).toFixed(2)} seconds of tail after narration; confirm that it is intentional.`);
        }
      } else {
        audio -= 2;
        warnings.push('Could not probe narration duration with ffprobe.');
      }
    }
  }
  const sfxCount = scenes.reduce((sum, scene) => sum + (scene.transitionSfx ? 1 : 0), 0);
  if (!project.audio?.music && sfxCount === 0) warnings.push('No BGM or transition sound is configured; this is allowed when the voice-only design is intentional.');

  let technical = 5;
  if (![24, 25, 30, 50, 60].includes(project.fps)) {
    technical -= 1;
    warnings.push(`Unusual frame rate: ${project.fps}`);
  }
  if (![project.width, project.height, project.fps, project.durationInFrames].every((entry) => Number.isInteger(entry) && entry > 0)) {
    technical = 0;
    hardFailures.push('width, height, fps, and durationInFrames must be positive integers.');
  }

  const scores = {
    narrative: bounded(narrative, 20),
    researchAndRights: bounded(research, 15),
    illustrationCoverage: bounded(illustrationCoverage, 20),
    motion: bounded(motion, 15),
    typographyAndCaptions: bounded(typography, 15),
    audio: bounded(audio, 10),
    technical: bounded(technical, 5),
  };
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  details.contentMode = contentMode;
  details.assetStrategy = assetStrategy;
  details.stylePreset = stylePreset;
  details.sceneCount = scenes.length;
  details.uniqueIllustrations = uniqueIllustrationPaths.size;
  details.cameraTrajectories = cameraSignatures.size;
  details.captionCount = captions.length;
  details.captionSafeBottom = project.captionSafeBottom ?? Math.round(project.height * 0.095);
  details.durationSeconds = Number.isFinite(project.durationInFrames / fps) ? project.durationInFrames / fps : null;
  details.voiceDurationSeconds = voiceDurationSeconds;
  details.durationPolicy = 'final-narration-driven; no fixed maximum';

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
  process.exit(0);
}

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
