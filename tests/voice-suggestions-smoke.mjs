#!/usr/bin/env node
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/suggest-voices.mjs');
const work = mkdtempSync(path.join(tmpdir(), 'illustrated-voice-suggestions-'));
const catalogPath = path.join(work, 'voices.json');

const catalog = {
  voices: [
    {Name: 'zh-CN-WarmVoice', Gender: 'Female', ContentCategories: 'News, Novel', VoicePersonalities: 'Warm'},
    {Name: 'zh-CN-ReliableVoice', Gender: 'Male', ContentCategories: 'News', VoicePersonalities: 'Professional, Reliable'},
    {Name: 'zh-CN-LivelyVoice', Gender: 'Female', ContentCategories: 'Cartoon, Novel', VoicePersonalities: 'Lively, Sunshine'},
    {Name: 'zh-CN-PassionVoice', Gender: 'Male', ContentCategories: 'Sports, Novel', VoicePersonalities: 'Passion'},
    {Name: 'en-US-GeneralVoice', Gender: 'Female', ContentCategories: 'General', VoicePersonalities: 'Friendly, Positive'},
  ],
};
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

const run = (args, options = {}) => {
  const result = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8', ...options});
  if (result.error || result.status !== 0) {
    throw new Error(`suggest-voices failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
  return result.stdout;
};
const mustFail = (args) => {
  const result = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});
  if (!result.error && result.status === 0) throw new Error(`Expected failure: ${args.join(' ')}`);
};

try {
  const book = JSON.parse(run(['--catalog', catalogPath, '--locale', 'zh-CN', '--mode', 'book', '--max', '4']));
  if (!book.ok || book.recommendations.length !== 4) throw new Error('Book recommendations were not produced.');
  if (book.defaultSelection.voiceId !== book.recommendations[0].voiceId) throw new Error('Default selection is not the first real recommendation.');
  if (new Set(book.recommendations.map((item) => item.voiceId)).size !== 4) throw new Error('Voice recommendations were duplicated.');
  for (const card of book.recommendations) {
    for (const field of ['label', 'description', 'bestFor', 'useCases', 'gender', 'locale', 'voiceId', 'whyRecommended', 'previewCommand']) {
      if (card[field] == null || card[field].length === 0) throw new Error(`Missing semantic card field: ${field}`);
    }
    if (!catalog.voices.some((voice) => voice.Name === card.voiceId)) throw new Error(`Invented voice ID: ${card.voiceId}`);
  }

  const markdown = run([
    '--catalog', catalogPath, '--locale', 'zh-CN', '--mode', 'explainer', '--max', '3', '--format', 'markdown',
  ]);
  if (!markdown.includes('听感：') || !markdown.includes('供应商 voice ID：') || !markdown.includes('推荐原因：')
    || !markdown.includes('试听（可选，不会自动执行）：')) {
    throw new Error('Markdown output does not explain choices in user-facing language.');
  }
  if ((markdown.match(/^## \d+\./gm) ?? []).length !== 3) throw new Error('Markdown did not render the requested three cards.');

  const missing = JSON.parse(run(['--provider', 'edge-tts', '--locale', 'zh-CN'], {
    env: {...process.env, EDGE_TTS_COMMAND: path.join(work, 'definitely-missing-edge-tts')},
  }));
  if (missing.ok || missing.recommendations.length !== 0 || missing.fallback.status !== 'catalog-required') {
    throw new Error('Missing provider did not return the no-invention fallback framework.');
  }
  if (/Neural/.test(JSON.stringify(missing))) throw new Error('Unavailable provider fallback invented a voice ID.');

  const absentLocale = JSON.parse(run(['--catalog', catalogPath, '--locale', 'fr-FR', '--mode', 'book']));
  if (absentLocale.ok || absentLocale.recommendations.length !== 0 || absentLocale.fallback.status !== 'locale-not-found') {
    throw new Error('Absent locale should not produce guessed recommendations.');
  }
  const absentLocaleMarkdown = run([
    '--catalog', catalogPath, '--locale', 'fr-FR', '--mode', 'book', '--format', 'markdown',
  ]);
  if (!absentLocaleMarkdown.includes('没有 locale 为 fr-FR 的声音') || absentLocaleMarkdown.includes('undefined')) {
    throw new Error('Absent-locale Markdown fallback is not directly presentable.');
  }

  mustFail(['--mode', 'advertisement']);
  mustFail(['--max', '2']);
  mustFail(['--format', 'yaml']);
  console.log('voice suggestions smoke test: PASS');
} finally {
  rmSync(work, {recursive: true, force: true});
}
