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
const realText = (input) => typeof input === 'string' && Boolean(input.trim()) && !placeholder(input);
const requireText = (input, field) => {
  if (!realText(input)) errors.push(`Missing project value: ${field}`);
};
const rejectPlaceholder = (input, field) => {
  if (input !== undefined && input !== null && (typeof input !== 'string' || !input.trim() || placeholder(input))) {
    errors.push(`${field} must be real text or removed.`);
  }
};

const normalizeContentMode = (mode) => mode === 'book-review' ? 'book' : mode;
const beatCharacterIds = (beat) => {
  if (Array.isArray(beat?.characters)) return beat.characters.map((entry) => entry?.characterId).filter(Boolean);
  return Array.isArray(beat?.characterIds) ? beat.characterIds : [];
};
const visualActionText = (beat) => typeof beat?.visualAction === 'string' ? beat.visualAction : beat?.visualAction?.action;
const validNarrativeChange = (beat) => {
  const change = beat?.narrativeChange;
  return change && [change.before, change.turn, change.after].every((value) => typeof value === 'string' && value.trim() && !placeholder(value));
};
const contentMode = normalizeContentMode(brief.project?.contentMode ?? 'explainer');
if (brief.project?.contentMode === 'book-review') {
  errors.push('Legacy book-review is accepted only at project-creation input; normalize creative briefs to contentMode=book.');
}
const assetStrategy = brief.visualSystem?.assetStrategy ?? 'layered';
if (!['explainer', 'book'].includes(contentMode)) {
  errors.push(`Unsupported project.contentMode: ${contentMode}.`);
}
if (assetStrategy !== 'layered') {
  errors.push('All publishable projects require visualSystem.assetStrategy=layered; composite scene illustrations are rejected.');
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

let bookCharacters = [];
let bookBeats = [];
let protagonistIds = [];
let evidenceSourceIds = new Set();
let evidenceClaimIds = new Set();
if (contentMode === 'book') {
  requireText(brief.project?.book?.title, 'project.book.title');
  rejectPlaceholder(brief.project?.book?.originalTitle, 'project.book.originalTitle');
  requireText(brief.project?.book?.author, 'project.book.author');
  requireText(brief.project?.book?.angle, 'project.book.angle');
  if (!['none', 'low', 'full'].includes(brief.project?.book?.spoilerLevel)) {
    errors.push('project.book.spoilerLevel must be none, low, or full.');
  }
  requireText(brief.visualSystem?.seriesAnchor, 'visualSystem.seriesAnchor');
  const sources = Array.isArray(brief.evidence?.sources) ? brief.evidence.sources : [];
  if (!sources.length) errors.push('book mode requires at least one evidence.sources entry.');
  for (const [index, source] of sources.entries()) {
    requireText(source?.id, `evidence.sources[${index}].id`);
    requireText(source?.title, `evidence.sources[${index}].title`);
    requireText(source?.url, `evidence.sources[${index}].url`);
    if (source?.id) evidenceSourceIds.add(source.id);
  }
  const claims = Array.isArray(brief.evidence?.claims) ? brief.evidence.claims : [];
  if (!claims.length) errors.push('book mode requires an evidence.claims ledger before story design.');
  for (const [index, claim] of claims.entries()) {
    requireText(claim?.id, `evidence.claims[${index}].id`);
    requireText(claim?.statement ?? claim?.text, `evidence.claims[${index}].statement`);
    if (claim?.id) evidenceClaimIds.add(claim.id);
  }

  bookCharacters = Array.isArray(brief.story?.characters) ? brief.story.characters : [];
  bookBeats = Array.isArray(brief.story?.beats) ? brief.story.beats : [];
  protagonistIds = Array.isArray(brief.story?.protagonistIds) ? brief.story.protagonistIds : [];
  if (!bookCharacters.length) errors.push('book mode requires story.characters grounded in research.');
  if (!bookBeats.length) errors.push('book mode requires story.beats before asset generation.');
  if (!protagonistIds.length) errors.push('book mode requires at least one story.protagonistIds entry.');
  const characterIds = new Set();
  for (const [index, character] of bookCharacters.entries()) {
    const prefix = `story.characters[${index}]`;
    requireText(character?.id, `${prefix}.id`);
    requireText(character?.name, `${prefix}.name`);
    requireText(character?.narrativeRole, `${prefix}.narrativeRole`);
    requireText(character?.continuityAnchor, `${prefix}.continuityAnchor`);
    if (character?.id && characterIds.has(character.id)) errors.push(`Duplicate story character id: ${character.id}`);
    if (character?.id) characterIds.add(character.id);
    const sourceIds = Array.isArray(character?.sourceIds) ? character.sourceIds : [];
    if (!sourceIds.length) errors.push(`${prefix}.sourceIds must cite the research source for this character.`);
    for (const sourceId of sourceIds) {
      if (!evidenceSourceIds.has(sourceId)) errors.push(`${prefix}.sourceIds references unknown evidence source: ${sourceId}`);
    }
  }
  for (const protagonistId of protagonistIds) {
    if (!characterIds.has(protagonistId)) errors.push(`story.protagonistIds references unknown character: ${protagonistId}`);
  }
  const beatIds = new Set();
  for (const [index, beat] of bookBeats.entries()) {
    const prefix = `story.beats[${index}]`;
    requireText(beat?.id, `${prefix}.id`);
    requireText(beat?.narrativePurpose, `${prefix}.narrativePurpose`);
    if (!validNarrativeChange(beat)) errors.push(`${prefix}.narrativeChange must contain real before, turn, and after text.`);
    requireText(visualActionText(beat), `${prefix}.visualAction.action`);
    if (beat?.id && beatIds.has(beat.id)) errors.push(`Duplicate story beat id: ${beat.id}`);
    if (beat?.id) beatIds.add(beat.id);
    const characterRefs = beatCharacterIds(beat);
    const claimRefs = Array.isArray(beat?.claimIds) ? beat.claimIds : [];
    const sourceRefs = Array.isArray(beat?.sourceIds) ? beat.sourceIds : [];
    if (!characterRefs.length) errors.push(`${prefix}.characters must connect the beat to a researched character.`);
    if (!claimRefs.length) errors.push(`${prefix}.claimIds must connect the beat to the evidence ledger.`);
    if (!sourceRefs.length) errors.push(`${prefix}.sourceIds must connect the beat to inspected sources.`);
    for (const characterId of characterRefs) {
      if (!characterIds.has(characterId)) errors.push(`${prefix}.characterIds references unknown character: ${characterId}`);
    }
    for (const claimId of claimRefs) {
      if (!evidenceClaimIds.has(claimId)) errors.push(`${prefix}.claimIds references unknown evidence claim: ${claimId}`);
    }
    for (const sourceId of sourceRefs) {
      if (!evidenceSourceIds.has(sourceId)) errors.push(`${prefix}.sourceIds references unknown evidence source: ${sourceId}`);
    }
  }
  for (const protagonistId of protagonistIds) {
    if (!bookBeats.some((beat) => beatCharacterIds(beat).includes(protagonistId))) {
      errors.push(`Protagonist ${protagonistId} is not connected to any story beat.`);
    }
  }
}

const assets = Array.isArray(brief.assets) ? brief.assets : [];
if (assets.length === 0) {
  errors.push('assets must contain at least one character-free background and one independent layer.');
}

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
  if (asset.id && !/^[a-z0-9][a-z0-9._-]*$/iu.test(asset.id)) {
    errors.push(`${prefix}.id must be a filename-safe slug using letters, numbers, dot, underscore, or hyphen.`);
  }
  ids.add(asset.id);
  if (asset.type && !allowedTypes.has(asset.type)) {
    errors.push(`${prefix}.type must be ${[...allowedTypes].join(', ')} for ${assetStrategy}.`);
  }
  if (asset.type !== 'background' && !asset.chromaKey) {
    errors.push(`${prefix}.chromaKey is required for isolated assets.`);
  }
  if (asset.type === 'background' && asset.chromaKey) {
    errors.push(`${prefix}.chromaKey must be omitted for a character-free background.`);
  }
  if (contentMode === 'book') {
    const beatIds = Array.isArray(asset.beatIds) ? asset.beatIds : [];
    if (!beatIds.length) errors.push(`${prefix}.beatIds must connect every book asset to at least one story beat.`);
    for (const beatId of beatIds) {
      if (!bookBeats.some((beat) => beat.id === beatId)) errors.push(`${prefix}.beatIds references unknown story beat: ${beatId}`);
    }
    if (asset.characterId && !bookCharacters.some((character) => character.id === asset.characterId)) {
      errors.push(`${prefix}.characterId references unknown story character: ${asset.characterId}`);
    }
    if (asset.type === 'background') {
      const excludedSubjectIds = Array.isArray(asset.excludedSubjectIds) ? asset.excludedSubjectIds : [];
      const requiredCharacterIds = new Set(bookBeats
        .filter((beat) => beatIds.includes(beat.id))
        .flatMap(beatCharacterIds));
      for (const characterId of requiredCharacterIds) {
        if (!excludedSubjectIds.includes(characterId)) {
          errors.push(`${prefix}.excludedSubjectIds must exclude story character ${characterId} from the background plate.`);
        }
      }
    }
  }
}

if (!assets.some((asset) => asset.type === 'background')) errors.push('At least one character-free background asset is required.');
if (!assets.some((asset) => asset.type === 'layer' || asset.type === 'foreground')) errors.push('At least one independent layer asset is required.');
if (contentMode === 'book') {
  for (const protagonistId of protagonistIds) {
    if (!assets.some((asset) => asset.type !== 'background' && asset.characterId === protagonistId)) {
      errors.push(`Protagonist ${protagonistId} has no independent cutout asset.`);
    }
  }
  for (const beat of bookBeats) {
    const beatAssets = assets.filter((asset) => Array.isArray(asset.beatIds) && asset.beatIds.includes(beat.id));
    if (!beatAssets.some((asset) => asset.type === 'background')) errors.push(`Story beat ${beat.id} has no character-free background asset.`);
    if (!beatAssets.some((asset) => asset.type !== 'background')) errors.push(`Story beat ${beat.id} has no independent subject or prop asset.`);
    for (const characterId of beatCharacterIds(beat)) {
      if (!beatAssets.some((asset) => asset.type !== 'background' && asset.characterId === characterId)) {
        errors.push(`Story beat ${beat.id} has no independent cutout for character ${characterId}.`);
      }
    }
    const subjectLayerId = beat.visualAction?.subjectLayerId;
    requireText(subjectLayerId, `Story beat ${beat.id} visualAction.subjectLayerId`);
    if (realText(subjectLayerId) && !beatAssets.some((asset) => asset.id === subjectLayerId && asset.type !== 'background')) {
      errors.push(`Story beat ${beat.id} visualAction.subjectLayerId must reference an independent asset linked to the beat: ${subjectLayerId}`);
    }
    const targetLayerId = beat.visualAction?.targetLayerId;
    if (targetLayerId != null && targetLayerId !== '') {
      rejectPlaceholder(targetLayerId, `Story beat ${beat.id} visualAction.targetLayerId`);
      if (realText(targetLayerId) && !beatAssets.some((asset) => asset.id === targetLayerId && asset.type !== 'background')) {
        errors.push(`Story beat ${beat.id} visualAction.targetLayerId must reference an independent asset linked to the beat: ${targetLayerId}`);
      }
    }
  }
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
  const assetType = background
      ? 'environment background plate'
      : asset.type === 'foreground'
        ? 'isolated foreground animation layer'
        : 'isolated full-subject animation layer';
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
  const matchedBeats = contentMode === 'book'
    ? bookBeats.filter((beat) => (asset.beatIds ?? []).includes(beat.id))
    : [];
  const matchedCharacter = contentMode === 'book' && asset.characterId
    ? bookCharacters.find((character) => character.id === asset.characterId)
    : null;
  if (contentMode === 'book') {
    constraints.push(
      'do not reproduce a published book cover, edition illustration, film still, or identifiable actor likeness',
    );
    if (matchedCharacter) constraints.push('use an original non-celebrity character design');
  }
  if (background && contentMode === 'book') {
    const excluded = bookCharacters.filter((character) => (asset.excludedSubjectIds ?? []).includes(character.id));
    constraints.push(`exclude these featured characters completely: ${excluded.map((character) => `${character.name} (${character.id})`).join(', ')}`);
  }
  const contextLines = contentMode === 'book'
    ? [
        `Book: ${brief.project.book.title} by ${brief.project.book.author}`,
        `Editorial angle: ${brief.project.book.angle}`,
        `Spoiler policy: ${brief.project.book.spoilerLevel}`,
        `Series anchor (reuse exactly across every related asset): ${visual.seriesAnchor}`,
        `Story beats: ${matchedBeats.map((beat) => `${beat.id}: ${visualActionText(beat)}`).join(' | ')}`,
        ...(matchedCharacter ? [`Character continuity anchor (reuse exactly for ${matchedCharacter.id}): ${matchedCharacter.continuityAnchor}`] : []),
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
  `${JSON.stringify({
    topic: brief.project.topic,
    contentMode,
    assetStrategy,
    visualSystem: visual,
    assets: compiled,
  }, null, 2)}\n`,
);
console.log(JSON.stringify({ok: true, outputDirectory: path.resolve(outputDirectory), prompts: compiled}, null, 2));
