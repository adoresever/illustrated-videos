#!/usr/bin/env node
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(path.join(tmpdir(), 'illustrated-videos-layered-smoke-'));
const projectDirectory = path.join(work, 'book');
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {encoding: 'utf8', ...options});
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
  return result;
};
const runMustFail = (command, args) => {
  const result = spawnSync(command, args, {encoding: 'utf8'});
  if (!result.error && result.status === 0) throw new Error(`${command} ${args.join(' ')} should have failed.`);
  return result;
};
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const makeBackground = (file, color) => run('python3', ['-c', [
  'from PIL import Image',
  'import sys',
  'Image.new("RGB", (128, 192), sys.argv[2]).save(sys.argv[1])',
].join(';'), file, color]);
const makeAlpha = (file, color, offset) => run('python3', ['-c', [
  'from PIL import Image, ImageDraw',
  'import sys',
  'image=Image.new("RGBA", (128, 192), (0,0,0,0))',
  'draw=ImageDraw.Draw(image)',
  'offset=int(sys.argv[3])',
  'draw.rounded_rectangle((20+offset,35,105+offset,165),radius=15,fill=sys.argv[2])',
  'image.save(sys.argv[1])',
].join(';'), file, color, String(offset)]);
const screenWatermark = (projectRoot, file, id) => {
  const relative = `assets/qa/${id}.watermark.json`;
  const report = path.join(projectRoot, 'public', relative);
  run('python3', [
    path.join(root, 'scripts/detect-watermark.py'), file,
    '--no-ocr', '--visual-confirmation', 'agent', '--report', report,
  ]);
  return {status: 'clear', report: relative};
};

try {
  run('node', [path.join(root, 'scripts/create-project.mjs'), projectDirectory, '--mode', 'book-review']);
  const briefPath = path.join(projectDirectory, 'creative-brief.json');
  const researchPath = path.join(projectDirectory, 'book-research.json');
  const projectPath = path.join(projectDirectory, 'public/project.json');
  const manifestPath = path.join(projectDirectory, 'public/asset-manifest.json');
  const brief = readJson(briefPath);
  const research = readJson(researchPath);
  const project = readJson(projectPath);
  const manifest = readJson(manifestPath);

  if (brief.project.contentMode !== 'book' || project.contentMode !== 'book' || research.contentMode !== 'book') {
    throw new Error('Legacy book-review input was not normalized to canonical book output.');
  }
  if ([brief.visualSystem.assetStrategy, project.assetStrategy, manifest.assetStrategy].some((value) => value !== 'layered')) {
    throw new Error('Book scaffold did not use the shared layered contract.');
  }
  if (brief.project.durationPlan?.source !== 'fallback'
    || JSON.stringify(brief.project.durationPlan.planningRangeSeconds) !== JSON.stringify([60, 120])
    || brief.project.durationPlan.finalAudioDeterminesRuntime !== true) {
    throw new Error('Book scaffold did not resolve the documented 60–120 second fallback duration plan.');
  }
  const userDurationDirectory = path.join(work, 'user-duration');
  run('node', [path.join(root, 'scripts/create-project.mjs'), userDurationDirectory, '--mode', 'book', '--duration', '73']);
  const userDurationBrief = readJson(path.join(userDurationDirectory, 'creative-brief.json'));
  if (userDurationBrief.project.durationPlan?.source !== 'user'
    || userDurationBrief.project.durationPlan.requestedSeconds !== 73
    || userDurationBrief.project.durationPlan.planningTargetSeconds !== 73) {
    throw new Error('User-specified approximate duration was not preserved in durationPlan.');
  }
  runMustFail('node', [path.join(root, 'scripts/create-project.mjs'), path.join(work, 'invalid-duration'), '--duration', '0']);
  runMustFail('node', [
    path.join(root, 'scripts/create-project.mjs'), path.join(work, 'invalid-strategy'),
    '--mode', 'book', '--asset-strategy', 'scene-illustrations',
  ]);

  const source = {id: 'source-1', title: 'Synthetic fixture source', url: 'https://example.com/source'};
  const claims = [
    {id: 'claim-1', statement: 'The synthetic character begins in one state.', sourceIds: ['source-1'], attribution: 'fact'},
    {id: 'claim-2', statement: 'A visible object changes the relationship in this fixture.', sourceIds: ['source-1'], attribution: 'fact'},
  ];
  const character = {
    id: 'character-1',
    name: '测试人物',
    narrativeRole: 'primary',
    continuityAnchor: 'Original paper-cut figure with a round silhouette, short dark hair, teal coat, coral scarf, no celebrity likeness.',
    sourceIds: ['source-1'],
  };
  const beats = [1, 2, 3].map((number) => ({
    id: `beat-${number}`,
    narrativePurpose: `Advance synthetic beat ${number}.`,
    narrativeChange: {
      before: `State ${number - 1}`,
      turn: `The character moves the independent object in beat ${number}.`,
      after: `State ${number}`,
    },
    narrationIntent: `Explain synthetic change ${number}.`,
    visualAction: {
      subjectLayerId: `character-${number}`,
      action: `move toward object ${number}`,
      targetLayerId: `prop-${number}`,
      result: `the relative position visibly changes`,
    },
    characters: [{characterId: 'character-1', variantId: 'character-1-main', dramaticFunction: 'primary'}],
    claimIds: [number === 1 ? 'claim-1' : 'claim-2'],
    sourceIds: ['source-1'],
    spoilerLevel: 'low',
  }));

  Object.assign(brief.project, {
    topic: '一本虚构测试书的变化主题',
    audience: '普通中文读者',
    lessonObjective: '通过三个可见变化说明一个虚构关系',
    language: 'zh-CN',
    book: {
      title: '变化的测试',
      originalTitle: 'A Test of Change',
      author: '测试作者',
      angle: '关系如何通过行动发生变化',
      spoilerLevel: 'low',
    },
  });
  Object.assign(brief.visualSystem, {
    medium: 'original editorial paper-cut collage',
    lineTreatment: 'hand-cut uneven edges with restrained ink contours',
    palette: ['teal', 'faded coral', 'ivory', 'brown'],
    texture: 'visible paper fibre and dry printed grain',
    lighting: 'warm lateral light with soft shadows',
    depth: 'layered collage with separated environment, subjects, props, and foreground',
    seriesAnchor: 'Original vertical editorial paper collage, ivory fibre, teal shadow, faded coral accent, warm side light.',
    avoid: ['photorealistic look', '3D render', 'generated text', 'watermark', 'published cover art'],
  });
  brief.evidence = {claims, sources: [source], uncertainties: [], disclaimer: null};
  brief.story = {protagonistIds: ['character-1'], characters: [character], beats};
  brief.assets = beats.flatMap((beat, index) => {
    const number = index + 1;
    return [
      {
        id: `background-${number}`,
        type: 'background',
        purpose: `environment for ${beat.id}`,
        request: `Create an empty symbolic paper environment for ${beat.id}.`,
        environment: `synthetic location ${number}`,
        composition: 'vertical environment with open middle space for later compositing',
        beatIds: [beat.id],
        excludedSubjectIds: ['character-1'],
      },
      {
        id: `character-${number}`,
        type: 'layer',
        purpose: `recurring protagonist pose for ${beat.id}`,
        request: `Create one isolated pose that can ${beat.visualAction.action}.`,
        composition: 'complete full-body silhouette with generous padding',
        chromaKey: '#00FF00',
        beatIds: [beat.id],
        characterId: 'character-1',
      },
      {
        id: `prop-${number}`,
        type: 'layer',
        purpose: `action prop for ${beat.id}`,
        request: `Create one isolated geometric story object for ${beat.id}.`,
        composition: 'complete readable object with generous padding',
        chromaKey: '#00FF00',
        beatIds: [beat.id],
      },
    ];
  });
  writeJson(briefPath, brief);

  Object.assign(research.book, {
    title: brief.project.book.title,
    originalTitle: brief.project.book.originalTitle,
    author: brief.project.book.author,
    originalLanguage: 'fixture-language',
    firstPublicationYear: 2000,
    edition: 'synthetic test edition',
  });
  Object.assign(research.editorial, {
    audience: brief.project.audience,
    angle: brief.project.book.angle,
    tone: '克制的原创讲述',
    spoilerPolicy: {level: 'low', allowedRange: 'synthetic fixture only', blockedDetails: []},
    quotePolicy: 'original-commentary-only',
  });
  research.sources = [{
    ...source,
    accessedAt: '2026-07-14',
    sourceClass: 'publisher',
    editionScope: 'synthetic fixture',
    authoritativeFor: ['synthetic fixture facts'],
    rightsUse: 'fact-check-only',
    notes: 'Test data only.',
  }];
  research.claims = claims.map((claim) => ({
    ...claim,
    claimType: 'plot',
    evidence: [{sourceId: 'source-1', locator: 'fixture', supportType: 'direct'}],
    status: 'verified',
    confidence: 'high',
    spoilerLevel: 'low',
    depictionStatus: 'canon-explicit',
  }));
  research.contradictions = [];
  research.characterBible.characters = [{
    id: 'character-1',
    canonicalName: character.name,
    aliases: [],
    narrativeRole: 'primary',
    goal: 'move through the fixture',
    tension: 'the object changes position',
    agency: 'chooses to move the object',
    relationships: [],
    timelineVariants: [{id: 'character-1-main', label: 'main state', claimIds: ['claim-1'], spoilerLevel: 'low'}],
    visualIdentity: {canonExplicit: [], contextSupported: [], creativeDirection: [character.continuityAnchor], exclusions: ['actor likenesses']},
    props: [],
    layerPlan: {assetKind: 'alpha-subject', background: 'transparent', separableParts: []},
    claimIds: ['claim-1'],
    sourceIds: ['source-1'],
    spoilerLevel: 'low',
  }];
  research.storySpine.centralQuestion = 'How does visible action change a synthetic relationship?';
  research.storySpine.narrativePromise = 'The viewer sees three independent state changes.';
  research.storySpine.beats = beats.map((beat) => ({
    ...beat,
    order: Number(beat.id.split('-')[1]),
    layerPlan: {
      background: {assetId: `background-${beat.id.split('-')[1]}`, featuredSubjects: []},
      subjects: [`character-${beat.id.split('-')[1]}`],
      props: [`prop-${beat.id.split('-')[1]}`],
      foreground: [],
    },
    spoilerNotes: 'Synthetic fixture only.',
    transitionOut: 'object movement motivates the next beat',
  }));
  writeJson(researchPath, research);

  const backgroundDirectory = path.join(projectDirectory, 'public/assets/backgrounds');
  const layerDirectory = path.join(projectDirectory, 'public/assets/layers');
  const audioDirectory = path.join(projectDirectory, 'public/assets/audio');
  const brandDirectory = path.join(projectDirectory, 'public/assets/brand');
  mkdirSync(backgroundDirectory, {recursive: true});
  mkdirSync(layerDirectory, {recursive: true});
  mkdirSync(audioDirectory, {recursive: true});
  mkdirSync(brandDirectory, {recursive: true});
  const colors = ['#E8DDC4', '#B9D5D0', '#E7B6A9'];
  for (let number = 1; number <= 3; number += 1) {
    makeBackground(path.join(backgroundDirectory, `background-${number}.png`), colors[number - 1]);
    makeAlpha(path.join(layerDirectory, `character-${number}.png`), '#257B79', 0);
    makeAlpha(path.join(layerDirectory, `prop-${number}.png`), '#C76551', -8);
  }
  makeAlpha(path.join(brandDirectory, 'logo.png'), '#C76551', -8);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'sine=frequency=220:sample_rate=48000:duration=6',
    path.join(audioDirectory, 'voice.wav'),
  ]);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'sine=frequency=220:sample_rate=48000:duration=0.1',
    path.join(audioDirectory, 'short-voice.wav'),
  ]);

  const captions = [
    {id: 'cue-1', from: 0, duration: 60, text: '先看见原来的位置。', style: 'minimal'},
    {id: 'cue-2', from: 60, duration: 60, text: '然后物体改变关系。', style: 'minimal'},
    {id: 'cue-3', from: 120, duration: 60, text: '最后变化形成答案。', style: 'minimal'},
  ];
  Object.assign(project, {
    title: '变化的测试｜插画讲书',
    contentMode: 'book',
    assetStrategy: 'layered',
    durationInFrames: 180,
    book: {...brief.project.book, label: '插画讲书'},
    brand: {show: true, handle: '', logo: 'assets/brand/logo.png', placement: 'top-right', logoWidth: 96, opacity: 0.94},
    audio: {voice: 'assets/audio/voice.wav', music: null, musicVolume: 0.1, intentionalSilence: false},
    captions,
    scenes: beats.map((beat, index) => {
      const number = index + 1;
      return {
        id: `scene-${number}`,
        storyBeatId: beat.id,
        layerPlanRationale: 'A primary and one interacting prop are sufficient for this deliberately simple synthetic beat.',
        from: index * 60,
        duration: 60,
        hero: true,
        background: `assets/backgrounds/background-${number}.png`,
        showBookMeta: number === 1,
        decorations: false,
        camera: {scaleFrom: 1.01, scaleTo: 1.035, xFrom: 0, xTo: number * -4},
        transition: number === 1 ? 'fade' : 'paper-wipe',
        layers: [
          {
            id: `character-${number}`,
            src: `assets/layers/character-${number}.png`,
            role: 'primary',
            x: 180 + number * 20,
            y: 620,
            width: 480,
            delay: 4,
            zIndex: 6,
            enterFrom: 'left',
            motion: {
              action: beat.visualAction.action,
              keyframes: [{at: 0.2, x: 0, rotation: 0}, {at: 0.65, x: 70 + number * 4, rotation: 3}, {at: 0.88, x: 54, rotation: 0}],
              loop: 'none',
            },
          },
          {
            id: `prop-${number}`,
            src: `assets/layers/prop-${number}.png`,
            role: 'secondary',
            x: 620,
            y: 780,
            width: 260,
            delay: 14,
            zIndex: 4,
            enterFrom: 'right',
            motion: {
              action: 'respond to the primary action',
              keyframes: [{at: 0.25, y: 0, scale: 1}, {at: 0.72, y: -45 - number * 3, scale: 1.08}],
              loop: 'none',
            },
          },
        ],
      };
    }),
  });
  writeJson(projectPath, project);
  writeFileSync(path.join(projectDirectory, 'narration.txt'), `${captions.map((cue) => cue.text).join('')}\n`);

  Object.assign(manifest, {
    contentMode: 'book',
    assetStrategy: 'layered',
    imageProvider: 'file',
    voiceProvider: 'file',
    assets: beats.flatMap((beat, index) => {
      const number = index + 1;
      return [
        {
          id: `background-${number}`,
          type: 'background',
          path: `assets/backgrounds/background-${number}.png`,
          beatIds: [beat.id],
          subjectFree: true,
          visuallyInspected: true,
          watermarkCheck: screenWatermark(projectDirectory, path.join(backgroundDirectory, `background-${number}.png`), `background-${number}`),
        },
        {
          id: `character-${number}`,
          type: 'layer',
          path: `assets/layers/character-${number}.png`,
          beatIds: [beat.id],
          characterId: 'character-1',
          alpha: true,
          alphaValidated: true,
          visuallyInspected: true,
          watermarkCheck: screenWatermark(projectDirectory, path.join(layerDirectory, `character-${number}.png`), `character-${number}`),
        },
        {
          id: `prop-${number}`,
          type: 'layer',
          path: `assets/layers/prop-${number}.png`,
          beatIds: [beat.id],
          alpha: true,
          alphaValidated: true,
          visuallyInspected: true,
          watermarkCheck: screenWatermark(projectDirectory, path.join(layerDirectory, `prop-${number}.png`), `prop-${number}`),
        },
      ];
    }),
  });
  writeJson(manifestPath, manifest);

  const promptDirectory = path.join(projectDirectory, 'public/prompts');
  run('node', [path.join(root, 'scripts/build-prompts.mjs'), '--brief', briefPath, '--out', promptDirectory]);
  const backgroundPrompt = readFileSync(path.join(promptDirectory, 'background-1.txt'), 'utf8');
  const characterPrompt = readFileSync(path.join(promptDirectory, 'character-1.txt'), 'utf8');
  if (!backgroundPrompt.includes('exclude these featured characters completely') || !characterPrompt.includes(character.continuityAnchor)) {
    throw new Error('Compiled prompts lost background separation or character continuity rules.');
  }

  const invalidBrief = structuredClone(brief);
  invalidBrief.visualSystem.assetStrategy = 'scene-illustrations';
  const invalidBriefPath = path.join(projectDirectory, 'invalid-brief.json');
  writeJson(invalidBriefPath, invalidBrief);
  runMustFail('node', [path.join(root, 'scripts/build-prompts.mjs'), '--brief', invalidBriefPath, '--out', path.join(projectDirectory, 'public/invalid-prompts')]);

  run('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  const audit = JSON.parse(run('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]).stdout);
  if (!audit.ok || !audit.publishCandidate || audit.details.assetStrategy !== 'layered') {
    throw new Error(`Unexpected audit result: ${JSON.stringify(audit)}`);
  }
  run('node', [path.join(root, 'scripts/validate-manifest.mjs'), '--project-dir', projectDirectory]);
  const flaggedAudit = JSON.parse(run('node', [path.join(root, 'scripts/audit-project.mjs'), '--project-dir', projectDirectory]).stdout);
  if (!flaggedAudit.ok || !flaggedAudit.publishCandidate) {
    throw new Error(`Unexpected --project-dir audit result: ${JSON.stringify(flaggedAudit)}`);
  }
  const rejectProjectAndAudit = () => {
    runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
    runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  };

  const missingPaletteProject = structuredClone(project);
  delete missingPaletteProject.palette;
  writeJson(projectPath, missingPaletteProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const invalidPaletteProject = structuredClone(project);
  invalidPaletteProject.palette.paper = 'definitely-not-a-css-color';
  writeJson(projectPath, invalidPaletteProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const missingLogoProject = structuredClone(project);
  missingLogoProject.brand.logo = 'assets/brand/missing-logo.png';
  writeJson(projectPath, missingLogoProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const emptyBrandProject = structuredClone(project);
  emptyBrandProject.brand.logo = null;
  writeJson(projectPath, emptyBrandProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const offscreenPrimaryProject = structuredClone(project);
  offscreenPrimaryProject.scenes[0].layers[0].x = 999999;
  offscreenPrimaryProject.scenes[0].layers[0].y = 999999;
  writeJson(projectPath, offscreenPrimaryProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const invisiblePrimaryProject = structuredClone(project);
  invisiblePrimaryProject.scenes[0].layers[0].opacity = 0;
  writeJson(projectPath, invisiblePrimaryProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const lateSubjectProject = structuredClone(project);
  lateSubjectProject.scenes[0].layers[0].delay = lateSubjectProject.scenes[0].duration;
  writeJson(projectPath, lateSubjectProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const imageAsVoiceProject = structuredClone(project);
  imageAsVoiceProject.audio.voice = 'assets/backgrounds/background-1.png';
  writeJson(projectPath, imageAsVoiceProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const shortVoiceProject = structuredClone(project);
  shortVoiceProject.audio.voice = 'assets/audio/short-voice.wav';
  writeJson(projectPath, shortVoiceProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const unreadableCaptionProject = structuredClone(project);
  unreadableCaptionProject.captions = unreadableCaptionProject.captions.map((cue, index) => ({...cue, from: index, duration: 1}));
  writeJson(projectPath, unreadableCaptionProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const invalidBookLabelProject = structuredClone(project);
  invalidBookLabelProject.book.label = {not: 'renderable text'};
  writeJson(projectPath, invalidBookLabelProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const disconnectedProject = structuredClone(project);
  disconnectedProject.scenes[0].layers[0].id = 'unrelated-runtime-subject';
  disconnectedProject.scenes[0].layers[0].motion.action = 'an unrelated runtime action';
  writeJson(projectPath, disconnectedProject);
  rejectProjectAndAudit();
  writeJson(projectPath, project);

  const excludedClaimResearch = structuredClone(research);
  excludedClaimResearch.claims[0].status = 'excluded';
  writeJson(researchPath, excludedClaimResearch);
  rejectProjectAndAudit();
  writeJson(researchPath, research);

  const driftedResearch = structuredClone(research);
  driftedResearch.sources[0].url = 'https://example.com/drifted-source';
  driftedResearch.claims[0].statement = 'A drifted claim that was never approved.';
  driftedResearch.storySpine.beats[0].narrativePurpose = 'A different unapproved purpose.';
  driftedResearch.storySpine.beats[0].narrativeChange.turn = 'An unapproved turn.';
  writeJson(researchPath, driftedResearch);
  rejectProjectAndAudit();
  writeJson(researchPath, research);

  const compositeProject = structuredClone(project);
  compositeProject.scenes[0].layers = [];
  writeJson(projectPath, compositeProject);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(projectPath, project);

  const cameraOnlyProject = structuredClone(project);
  delete cameraOnlyProject.scenes[0].layers[0].motion;
  writeJson(projectPath, cameraOnlyProject);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(projectPath, project);

  const unseparatedManifest = structuredClone(manifest);
  unseparatedManifest.assets[0].subjectFree = false;
  writeJson(manifestPath, unseparatedManifest);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(manifestPath, manifest);

  const unresolvedResearch = structuredClone(research);
  unresolvedResearch.contradictions = [{
    id: 'contradiction-1',
    topic: 'synthetic conflict',
    claimIds: ['claim-1'],
    sourceIds: ['source-1'],
    positions: [],
    resolution: 'exclude',
    resolvedStatement: null,
    status: 'unresolved',
    storyImpact: 'must not be used',
  }];
  writeJson(researchPath, unresolvedResearch);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(researchPath, research);

  const explainerDirectory = path.join(work, 'explainer');
  run('node', [path.join(root, 'scripts/create-project.mjs'), explainerDirectory]);
  const explainerBriefPath = path.join(explainerDirectory, 'creative-brief.json');
  const explainerProjectPath = path.join(explainerDirectory, 'public/project.json');
  const explainerManifestPath = path.join(explainerDirectory, 'public/asset-manifest.json');
  const explainerBrief = readJson(explainerBriefPath);
  const explainerProject = readJson(explainerProjectPath);
  const explainerManifest = readJson(explainerManifestPath);
  if (explainerBrief.project.contentMode !== 'explainer' || explainerProject.assetStrategy !== 'layered') {
    throw new Error('Explainer scaffold no longer uses the shared layered contract.');
  }
  if (explainerBrief.project.durationPlan?.source !== 'fallback'
    || explainerBrief.project.durationPlan.planningTargetSeconds !== 40) {
    throw new Error('Explainer scaffold did not resolve the documented approximately 40 second fallback.');
  }

  Object.assign(explainerBrief.project, {
    topic: '一个核心对象如何推动一个简单变化',
    audience: '普通中文观众',
    lessonObjective: '用独立对象的可见位移解释因果变化',
    aspectRatio: '9:16',
  });
  Object.assign(explainerBrief.visualSystem, {
    preset: 'paper-cut',
    medium: 'original editorial paper-cut collage',
    lineTreatment: 'uneven hand-cut contours',
    palette: ['ivory', 'teal', 'coral'],
    texture: 'visible paper fibre',
    lighting: 'warm lateral light',
    depth: 'separated background, core object, and foreground accent',
    avoid: ['photorealistic look', '3D render', 'generated text', 'watermark'],
  });
  explainerBrief.assets = [
    {
      id: 'explainer-background',
      type: 'background',
      purpose: 'empty environment for the explanation',
      request: 'Create an empty symbolic environment with open center space.',
      composition: 'vertical environment without the featured core object',
    },
    {
      id: 'explainer-core',
      type: 'layer',
      purpose: 'independent core object performing the explanatory action',
      request: 'Create one isolated teal paper object with a complete silhouette.',
      composition: 'center-weighted object with generous padding',
      chromaKey: '#00FF00',
    },
    {
      id: 'explainer-foreground',
      type: 'foreground',
      purpose: 'independent depth cue',
      request: 'Create one isolated coral foreground paper accent.',
      composition: 'low corner accent with generous padding',
      chromaKey: '#00FF00',
    },
  ];
  writeJson(explainerBriefPath, explainerBrief);

  const explainerBackgroundDirectory = path.join(explainerDirectory, 'public/assets/backgrounds');
  const explainerLayerDirectory = path.join(explainerDirectory, 'public/assets/layers');
  const explainerAudioDirectory = path.join(explainerDirectory, 'public/assets/audio');
  mkdirSync(explainerBackgroundDirectory, {recursive: true});
  mkdirSync(explainerLayerDirectory, {recursive: true});
  mkdirSync(explainerAudioDirectory, {recursive: true});
  makeBackground(path.join(explainerBackgroundDirectory, 'explainer-background.png'), '#E8DDC4');
  makeAlpha(path.join(explainerLayerDirectory, 'explainer-core.png'), '#257B79', 0);
  makeAlpha(path.join(explainerLayerDirectory, 'explainer-foreground.png'), '#C76551', -8);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', '2', '-c:a', 'pcm_s16le',
    path.join(explainerAudioDirectory, 'explainer-voice.wav'),
  ]);

  if (explainerProject.fps !== 30) {
    throw new Error(`Explainer exact-audio fixture requires the standard 30fps scaffold, received ${explainerProject.fps}.`);
  }

  Object.assign(explainerProject, {
    title: '变化的插画科普',
    contentMode: 'explainer',
    assetStrategy: 'layered',
    durationInFrames: 60,
    audio: {voice: 'assets/audio/explainer-voice.wav', music: null, musicVolume: 0.1, tailSeconds: 0, intentionalSilence: false},
    scenes: [{
      id: 'explainer-scene',
      from: 0,
      duration: 60,
      hero: true,
      layerPlanRationale: 'The core object carries the causal action while one foreground layer establishes depth.',
      background: 'assets/backgrounds/explainer-background.png',
      caption: '核心对象发生位移，关系随之改变。',
      transition: 'fade',
      decorations: false,
      layers: [
        {
          id: 'explainer-core',
          src: 'assets/layers/explainer-core.png',
          role: 'primary',
          x: 220,
          y: 650,
          width: 500,
          delay: 3,
          motion: {
            action: 'move toward the foreground marker to make the causal change visible',
            keyframes: [{at: 0.1, x: 0, rotation: 0}, {at: 0.7, x: 110, rotation: 4}, {at: 0.9, x: 92, rotation: 0}],
            loop: 'none',
          },
        },
        {
          id: 'explainer-foreground',
          src: 'assets/layers/explainer-foreground.png',
          role: 'foreground',
          x: 640,
          y: 1120,
          width: 300,
          delay: 10,
          motion: {
            action: 'shift after the core object reaches it',
            keyframes: [{at: 0.2, x: 0}, {at: 0.75, x: 35}],
            loop: 'none',
          },
        },
      ],
    }],
  });
  writeJson(explainerProjectPath, explainerProject);
  Object.assign(explainerManifest, {
    contentMode: 'explainer',
    assetStrategy: 'layered',
    imageProvider: 'file',
    voiceProvider: 'file',
    assets: [
      {id: 'explainer-background', type: 'background', path: 'assets/backgrounds/explainer-background.png', subjectFree: true, visuallyInspected: true, watermarkCheck: screenWatermark(explainerDirectory, path.join(explainerBackgroundDirectory, 'explainer-background.png'), 'explainer-background')},
      {id: 'explainer-core', type: 'layer', path: 'assets/layers/explainer-core.png', alpha: true, alphaValidated: true, visuallyInspected: true, watermarkCheck: screenWatermark(explainerDirectory, path.join(explainerLayerDirectory, 'explainer-core.png'), 'explainer-core')},
      {id: 'explainer-foreground', type: 'foreground', path: 'assets/layers/explainer-foreground.png', alpha: true, alphaValidated: true, visuallyInspected: true, watermarkCheck: screenWatermark(explainerDirectory, path.join(explainerLayerDirectory, 'explainer-foreground.png'), 'explainer-foreground')},
    ],
  });
  writeJson(explainerManifestPath, explainerManifest);
  run('node', [path.join(root, 'scripts/build-prompts.mjs'), '--brief', explainerBriefPath, '--out', path.join(explainerDirectory, 'public/prompts')]);
  run('node', [path.join(root, 'scripts/validate-manifest.mjs'), explainerDirectory]);
  const explainerAudit = JSON.parse(run('node', [path.join(root, 'scripts/audit-project.mjs'), explainerDirectory]).stdout);
  if (!explainerAudit.ok || !explainerAudit.publishCandidate) throw new Error(`Unexpected explainer audit: ${JSON.stringify(explainerAudit)}`);

  const mismatchedAudioTimelineExplainer = structuredClone(explainerProject);
  mismatchedAudioTimelineExplainer.durationInFrames = 90;
  mismatchedAudioTimelineExplainer.scenes[0].duration = 90;
  writeJson(explainerProjectPath, mismatchedAudioTimelineExplainer);
  const mismatchedValidator = runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), explainerDirectory]);
  const mismatchedAudit = runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), explainerDirectory]);
  const validatorFailure = `${mismatchedValidator.stdout ?? ''}\n${mismatchedValidator.stderr ?? ''}`;
  const auditFailure = `${mismatchedAudit.stdout ?? ''}\n${mismatchedAudit.stderr ?? ''}`;
  if (!validatorFailure.includes('Timeline must equal final narration duration plus project.audio.tailSeconds')) {
    throw new Error(`Explainer validator did not reject the 90-frame timeline for the expected audio-duration reason:\n${validatorFailure}`);
  }
  if (!auditFailure.includes('Timeline must equal narration plus declared tail')) {
    throw new Error(`Explainer audit did not reject the 90-frame timeline for the expected audio-duration reason:\n${auditFailure}`);
  }
  writeJson(explainerProjectPath, explainerProject);

  const compositeExplainer = structuredClone(explainerProject);
  compositeExplainer.scenes[0].layers = [];
  writeJson(explainerProjectPath, compositeExplainer);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), explainerDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), explainerDirectory]);
  writeJson(explainerProjectPath, explainerProject);

  const cameraOnlyExplainer = structuredClone(explainerProject);
  delete cameraOnlyExplainer.scenes[0].layers[0].motion;
  writeJson(explainerProjectPath, cameraOnlyExplainer);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), explainerDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), explainerDirectory]);
  writeJson(explainerProjectPath, explainerProject);

  console.log('all layered content modes smoke test: PASS');
} finally {
  rmSync(work, {recursive: true, force: true});
}
