#!/usr/bin/env node
import {mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(path.join(tmpdir(), 'illustrated-videos-book-smoke-'));
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
};
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

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

  if (research.contentMode !== 'book-review') {
    throw new Error('Book project scaffold did not create book-research.json.');
  }

  if (brief.project.contentMode !== 'book-review' || brief.visualSystem.assetStrategy !== 'scene-illustrations') {
    throw new Error('Book project scaffold did not select the correct content mode and asset strategy.');
  }

  Object.assign(brief.project, {
    topic: '一本虚构测试书的时间主题',
    audience: '普通中文读者',
    lessonObjective: '用原创评论提出一个关于时间的问题',
    language: 'zh-CN',
    durationSeconds: null,
    book: {
      title: '时间的测试',
      originalTitle: 'A Test of Time',
      author: '测试作者',
      angle: '时间会改变我们怎样理解关系',
      spoilerLevel: 'low',
    },
  });
  Object.assign(brief.visualSystem, {
    medium: 'original editorial paper collage illustration',
    lineTreatment: 'hand-cut uneven edges with restrained ink contours',
    palette: ['Caribbean teal', 'faded coral', 'ivory', 'tobacco brown'],
    texture: 'visible paper fibre and dry printed grain',
    lighting: 'warm lateral light with soft long shadows',
    depth: 'complete editorial scenes with foreground, middle ground, and distance inside each plate',
    seriesAnchor: 'Original vertical editorial paper collage, anonymous silhouettes, ivory fibre, teal shadow, faded coral accent, warm side light.',
    avoid: ['photorealistic look', '3D render', 'generated text', 'watermark', 'published cover art'],
  });
  brief.evidence = {
    claims: [{id: 'claim-1', text: 'This fixture contains no real-world claim.', kind: 'commentary', sourceIds: []}],
    sources: [
      {id: 'source-1', title: 'Fixture source one', url: 'https://example.com/one'},
      {id: 'source-2', title: 'Fixture source two', url: 'https://example.com/two'},
    ],
    uncertainties: [],
    disclaimer: null,
  };
  brief.assets = [1, 2, 3].map((number) => ({
    id: `scene-${number}`,
    type: 'illustration',
    purpose: `semantic beat ${number}`,
    request: `Create an original symbolic scene for beat ${number}.`,
    environment: 'an invented port and river landscape',
    composition: number === 1 ? 'wide establishing view' : number === 2 ? 'medium relationship view' : 'symbolic detail view',
    constraints: ['no readable marks'],
  }));
  writeJson(briefPath, brief);
  Object.assign(research.book, {
    title: brief.project.book.title,
    originalTitle: brief.project.book.originalTitle,
    author: brief.project.book.author,
  });
  Object.assign(research.editorial, {
    audience: brief.project.audience,
    angle: brief.project.book.angle,
    promise: '说明时间怎样改变关系的理解',
    spoilerLevel: brief.project.book.spoilerLevel,
    tone: '克制的原创评论',
  });
  research.facts = [{
    id: 'fact-1',
    claim: 'This is a synthetic fixture fact.',
    sourceIds: ['source-1'],
    status: 'verified',
    notes: 'Synthetic test only.',
  }];
  research.interpretations = [];
  research.sources = [
    {id: 'source-1', title: 'Fixture source one', url: 'https://example.com/one'},
    {id: 'source-2', title: 'Fixture source two', url: 'https://example.com/two'},
  ];
  writeJson(researchPath, research);

  const plateDirectory = path.join(projectDirectory, 'public/assets/plates');
  const audioDirectory = path.join(projectDirectory, 'public/assets/audio');
  mkdirSync(plateDirectory, {recursive: true});
  mkdirSync(audioDirectory, {recursive: true});
  for (let index = 1; index <= 3; index += 1) {
    run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
      '-i', `color=c=${index === 1 ? '0xE8DDC4' : index === 2 ? '0x317C78' : '0xC76A55'}:s=72x128:d=0.04`,
      '-frames:v', '1', path.join(plateDirectory, `scene-${index}.png`),
    ]);
  }
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'sine=frequency=220:sample_rate=48000:duration=6',
    path.join(audioDirectory, 'voice.wav'),
  ]);

  Object.assign(project, {
    title: '时间的测试｜插画读书',
    contentMode: 'book-review',
    assetStrategy: 'scene-illustrations',
    durationInFrames: 180,
    book: {...brief.project.book, label: '插画读书'},
    audio: {voice: 'assets/audio/voice.wav', music: null, musicVolume: 0.1, intentionalSilence: false},
    captions: [
      {id: 'cue-1', from: 0, duration: 60, text: '先提出一个问题。', style: 'minimal'},
      {id: 'cue-2', from: 60, duration: 60, text: '再观察时间怎样经过。', style: 'minimal'},
      {id: 'cue-3', from: 120, duration: 60, text: '最后把答案留给读者。', style: 'minimal'},
    ],
    scenes: [1, 2, 3].map((number) => ({
      id: `scene-${number}`,
      from: (number - 1) * 60,
      duration: 60,
      hero: true,
      background: `assets/plates/scene-${number}.png`,
      showBookMeta: number === 1,
      decorations: false,
      camera: number === 1
        ? {scaleFrom: 1.01, scaleTo: 1.07, xFrom: -8, xTo: 8}
        : number === 2
          ? {scaleFrom: 1.07, scaleTo: 1.02, yFrom: -10, yTo: 12}
          : {scaleFrom: 1.02, scaleTo: 1.08, xFrom: 10, xTo: -12},
      transition: number === 1 ? 'fade' : 'paper-wipe',
      layers: [],
    })),
  });
  writeJson(projectPath, project);
  const narrationPath = path.join(projectDirectory, 'narration.txt');
  const approvedNarration = `${project.captions.map((cue) => cue.text).join('')}\n`;
  writeFileSync(narrationPath, approvedNarration);

  Object.assign(manifest, {
    contentMode: 'book-review',
    assetStrategy: 'scene-illustrations',
    imageProvider: 'file',
    voiceProvider: 'file',
    assets: [1, 2, 3].map((number) => ({
      id: `scene-${number}`,
      type: 'illustration',
      path: `assets/plates/scene-${number}.png`,
      textFree: true,
      visuallyInspected: true,
    })),
  });
  writeJson(manifestPath, manifest);

  const promptDirectory = path.join(projectDirectory, 'public/prompts');
  run('node', [path.join(root, 'scripts/build-prompts.mjs'), '--brief', briefPath, '--out', promptDirectory]);
  for (let number = 1; number <= 3; number += 1) {
    const prompt = readFileSync(path.join(promptDirectory, `scene-${number}.txt`), 'utf8');
    if (!prompt.includes(brief.visualSystem.seriesAnchor) || !prompt.includes('no readable text')) {
      throw new Error(`Compiled prompt ${number} lost the series anchor or text-free constraint.`);
    }
  }
  const invalidBrief = structuredClone(brief);
  invalidBrief.evidence.sources = [];
  const invalidBriefPath = path.join(projectDirectory, 'invalid-brief.json');
  writeJson(invalidBriefPath, invalidBrief);
  runMustFail('node', [
    path.join(root, 'scripts/build-prompts.mjs'), '--brief', invalidBriefPath,
    '--out', path.join(projectDirectory, 'public/invalid-prompts'),
  ]);
  const traversalBrief = structuredClone(brief);
  traversalBrief.assets[0].id = '../escaped';
  const traversalBriefPath = path.join(projectDirectory, 'traversal-brief.json');
  writeJson(traversalBriefPath, traversalBrief);
  runMustFail('node', [
    path.join(root, 'scripts/build-prompts.mjs'), '--brief', traversalBriefPath,
    '--out', path.join(projectDirectory, 'public/traversal-prompts'),
  ]);
  run('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  const auditResult = run('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  const audit = JSON.parse(auditResult.stdout);
  if (!audit.ok || !audit.publishCandidate || audit.details.durationPolicy !== 'final-narration-driven; no fixed maximum') {
    throw new Error(`Unexpected book audit result: ${auditResult.stdout}`);
  }

  const alignedPath = path.join(projectDirectory, 'aligned.json');
  writeJson(alignedPath, {
    audioDuration: 6,
    cues: [
      {id: 'cue-1', sceneId: 'scene-1', text: project.captions[0].text, start: 0, end: 1.9, style: 'minimal'},
      {id: 'cue-2', sceneId: 'scene-2', text: project.captions[1].text, start: 2, end: 3.9, style: 'minimal'},
      {id: 'cue-3', sceneId: 'scene-3', text: project.captions[2].text, start: 4, end: 5.9, style: 'minimal'},
    ],
  });
  run('node', [
    path.join(root, 'scripts/apply-caption-timings.mjs'), '--aligned', alignedPath,
    '--project', projectPath, '--tail-seconds', '0',
  ]);
  const timedProject = readJson(projectPath);
  if (timedProject.durationInFrames !== 180 || timedProject.scenes[1].from !== 60 || timedProject.scenes[2].from !== 120) {
    throw new Error('Caption timing application did not update the scene timeline as expected.');
  }
  run('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);

  rmSync(narrationPath);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  writeFileSync(narrationPath, approvedNarration);

  const invalidCaptionProject = structuredClone(timedProject);
  invalidCaptionProject.captions[0].text += '错误替换';
  writeJson(projectPath, invalidCaptionProject);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  writeJson(projectPath, timedProject);

  const unorderedCaptionProject = structuredClone(timedProject);
  [unorderedCaptionProject.captions[0], unorderedCaptionProject.captions[1]] = [unorderedCaptionProject.captions[1], unorderedCaptionProject.captions[0]];
  writeJson(projectPath, unorderedCaptionProject);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(projectPath, timedProject);

  const placeholderOriginalTitleProject = structuredClone(timedProject);
  placeholderOriginalTitleProject.book.originalTitle = '<replace-with-original-title-or-remove>';
  writeJson(projectPath, placeholderOriginalTitleProject);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  writeJson(projectPath, timedProject);

  const invalidRightsResearch = structuredClone(research);
  invalidRightsResearch.guardrails.visualExclusions = [];
  writeJson(researchPath, invalidRightsResearch);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(researchPath, research);

  const invalidQuoteResearch = structuredClone(research);
  invalidQuoteResearch.guardrails.quotePolicy = 'unverified-excerpts';
  writeJson(researchPath, invalidQuoteResearch);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(researchPath, research);

  const brokenFactResearch = structuredClone(research);
  brokenFactResearch.facts[0].sourceIds = ['missing-source'];
  writeJson(researchPath, brokenFactResearch);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(researchPath, research);

  rmSync(researchPath);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(researchPath, research);

  const escapedPath = path.join(plateDirectory, 'escaped.png');
  symlinkSync(narrationPath, escapedPath);
  const escapedProject = structuredClone(timedProject);
  escapedProject.scenes[0].background = 'assets/plates/escaped.png';
  const escapedManifest = structuredClone(manifest);
  escapedManifest.assets[0].path = 'assets/plates/escaped.png';
  writeJson(projectPath, escapedProject);
  writeJson(manifestPath, escapedManifest);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  writeJson(projectPath, timedProject);
  writeJson(manifestPath, manifest);
  rmSync(escapedPath);

  const uninspectedManifest = structuredClone(manifest);
  uninspectedManifest.assets[0].visuallyInspected = false;
  writeJson(manifestPath, uninspectedManifest);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);
  runMustFail('node', [path.join(root, 'scripts/audit-project.mjs'), projectDirectory]);
  writeJson(manifestPath, manifest);

  const invalidManifest = readJson(manifestPath);
  invalidManifest.assets = invalidManifest.assets.slice(0, 2);
  writeJson(manifestPath, invalidManifest);
  runMustFail('node', [path.join(root, 'scripts/validate-manifest.mjs'), projectDirectory]);

  console.log('book-review mode smoke test: PASS');
} finally {
  rmSync(work, {recursive: true, force: true});
}
