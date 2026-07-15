#!/usr/bin/env node
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(path.join(tmpdir(), 'illustrated-videos-cli-batch-'));
const run = (command, args) => {
  const result = spawnSync(command, args, {encoding: 'utf8'});
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
  return result;
};
const runAnyStatus = (command, args) => {
  const result = spawnSync(command, args, {encoding: 'utf8'});
  if (result.error) throw result.error;
  return result;
};
const expectUsageFailure = (script, option) => {
  const result = runAnyStatus('node', [script, option]);
  if (result.status !== 2 || !result.stderr.includes(`Missing value for ${option}.`) || !result.stderr.includes('Usage:')) {
    throw new Error(`${path.basename(script)} did not return a clear usage error for ${option}.`);
  }
};
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

try {
  const validator = path.join(root, 'scripts/validate-manifest.mjs');
  const auditor = path.join(root, 'scripts/audit-project.mjs');
  const preflight = path.join(root, 'scripts/preflight.mjs');
  const alphaCheck = path.join(root, 'scripts/check-alpha.py');
  expectUsageFailure(validator, '--project-dir');
  expectUsageFailure(auditor, '--project-dir');
  expectUsageFailure(preflight, '--project-dir');
  expectUsageFailure(preflight, '--config');

  const projectDirectory = path.join(work, 'stub-project');
  mkdirSync(path.join(projectDirectory, 'public'), {recursive: true});
  writeJson(path.join(projectDirectory, 'public/project.json'), {});
  writeJson(path.join(projectDirectory, 'public/asset-manifest.json'), {});
  writeJson(path.join(projectDirectory, 'creative-brief.json'), {});

  for (const invocation of [[projectDirectory], ['--project-dir', projectDirectory]]) {
    const validation = runAnyStatus('node', [validator, ...invocation]);
    const report = JSON.parse(validation.stdout);
    if (validation.status === 0 || report.projectDirectory !== path.resolve(projectDirectory)) {
      throw new Error(`Validator did not resolve project directory for ${invocation.join(' ')}.`);
    }

    const audit = runAnyStatus('node', [auditor, ...invocation]);
    const auditReport = JSON.parse(audit.stdout);
    if (audit.status === 0 || !auditReport.scores || !auditReport.hardFailures?.length) {
      throw new Error(`Auditor did not read the stub project for ${invocation.join(' ')}.`);
    }
  }

  const config = {
    contentMode: 'explainer',
    assetStrategy: 'layered',
    image: {provider: 'file'},
    voice: {provider: 'file'},
    timing: {provider: 'manual'},
    renderer: {provider: 'remotion'},
  };
  const configPath = path.join(projectDirectory, 'project-config.json');
  writeJson(configPath, config);
  for (const invocation of [[projectDirectory], ['--project-dir', projectDirectory]]) {
    const result = runAnyStatus('node', [preflight, ...invocation]);
    const report = JSON.parse(result.stdout);
    if (report.projectDirectory !== path.resolve(projectDirectory)
      || report.configPath !== path.resolve(configPath)
      || report.imageProvider !== 'file'
      || report.voiceProvider !== 'file') {
      throw new Error(`Preflight did not auto-discover project-config.json for ${invocation.join(' ')}.`);
    }
  }
  const explicit = JSON.parse(runAnyStatus('node', [preflight, '--config', configPath]).stdout);
  if (explicit.projectDirectory !== null || explicit.configPath !== path.resolve(configPath)) {
    throw new Error('Preflight --config compatibility regressed.');
  }

  const goodImage = path.join(work, 'good.png');
  const badImage = path.join(work, 'bad.png');
  run('python3', ['-c', [
    'from PIL import Image, ImageDraw',
    'import sys',
    'good=Image.new("RGBA",(32,32),(0,0,0,0))',
    'ImageDraw.Draw(good).rectangle((8,8,23,23),fill=(200,80,60,255))',
    'good.save(sys.argv[1])',
    'Image.new("RGBA",(32,32),(20,30,40,255)).save(sys.argv[2])',
  ].join(';'), goodImage, badImage]);

  const single = JSON.parse(run('python3', [alphaCheck, goodImage]).stdout);
  const legacyKeys = ['ok', 'path', 'width', 'height', 'transparentRatio', 'fullyTransparentRatio', 'opaqueRatio', 'cornerAlpha', 'errors'];
  if (JSON.stringify(Object.keys(single)) !== JSON.stringify(legacyKeys) || single.ok !== true) {
    throw new Error('Single-file alpha report is no longer backward compatible.');
  }
  const singleFailure = runAnyStatus('python3', [alphaCheck, badImage]);
  if (singleFailure.status !== 1 || JSON.parse(singleFailure.stdout).ok !== false) {
    throw new Error('Single-file alpha failure exit contract regressed.');
  }

  const batch = JSON.parse(run('python3', [alphaCheck, goodImage, goodImage]).stdout);
  if (!batch.ok || batch.summary.total !== 2 || batch.summary.failed !== 0 || batch.images.length !== 2) {
    throw new Error('Successful batch alpha report is invalid.');
  }
  const batchFailure = runAnyStatus('python3', [alphaCheck, goodImage, badImage, path.join(work, 'missing.png')]);
  const batchFailureReport = JSON.parse(batchFailure.stdout);
  if (batchFailure.status !== 1
    || batchFailureReport.ok !== false
    || batchFailureReport.summary.total !== 3
    || batchFailureReport.summary.failed !== 2) {
    throw new Error('Batch alpha validation did not aggregate all failures.');
  }

  console.log('CLI and batch alpha compatibility smoke test: PASS');
} finally {
  rmSync(work, {recursive: true, force: true});
}
