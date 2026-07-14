#!/usr/bin/env node
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const provider = value('--provider', 'edge-tts');
const textFile = value('--text-file');
const out = value('--out');
const voice = value('--voice', provider === 'openai' ? 'cedar' : 'zh-CN-XiaoxiaoNeural');
const model = value('--model', 'gpt-4o-mini-tts');
const rate = value('--rate', '+0%');
const pitch = value('--pitch', '+0Hz');
const instructions = value('--instructions', 'Speak clearly with a warm, trustworthy documentary tone.');
const inputFile = value('--input-file');

if (!out) {
  console.error('Missing --out.');
  process.exit(1);
}
mkdirSync(path.dirname(path.resolve(out)), {recursive: true});

if (provider === 'file') {
  if (!inputFile) {
    console.error('Provider file requires --input-file.');
    process.exit(1);
  }
  copyFileSync(inputFile, out);
  console.log(path.resolve(out));
  process.exit(0);
}

if (!textFile) {
  console.error(`Provider ${provider} requires --text-file.`);
  process.exit(1);
}
const text = readFileSync(textFile, 'utf8').trim();
if (!text) {
  console.error(`Text file is empty: ${textFile}`);
  process.exit(1);
}

if (provider === 'edge-tts') {
  const result = spawnSync(
    'edge-tts',
    ['--file', textFile, '--voice', voice, '--rate', rate, '--pitch', pitch, '--write-media', out],
    {stdio: 'inherit'},
  );
  if (result.error || result.status !== 0) {
    console.error('edge-tts failed. Install edge-tts or select another voice provider.');
    process.exit(result.status ?? 1);
  }
  console.log(path.resolve(out));
  process.exit(0);
}

if (provider === 'openai') {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Set it locally; do not paste it into chat.');
    process.exit(1);
  }
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      instructions,
      response_format: 'mp3',
    }),
  });
  if (!response.ok) {
    console.error(`OpenAI speech request failed (${response.status}): ${await response.text()}`);
    process.exit(1);
  }
  writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  console.log(path.resolve(out));
  process.exit(0);
}

console.error(`Unsupported voice provider: ${provider}`);
process.exit(1);
