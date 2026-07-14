#!/usr/bin/env node
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const promptFile = value('--prompt-file');
const out = value('--out');
const model = value('--model', 'gpt-image-2');
const size = value('--size', '1152x2048');
const quality = value('--quality', 'medium');

if (!promptFile || !out) {
  console.error('Usage: generate-openai-image.mjs --prompt-file prompt.txt --out image.png [--model gpt-image-2] [--size 1152x2048] [--quality medium]');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. Set it locally; do not paste it into chat.');
  process.exit(1);
}

const prompt = readFileSync(promptFile, 'utf8').trim();
if (!prompt) {
  console.error(`Prompt file is empty: ${promptFile}`);
  process.exit(1);
}

const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({model, prompt, size, quality, n: 1}),
});

if (!response.ok) {
  console.error(`OpenAI image request failed (${response.status}): ${await response.text()}`);
  process.exit(1);
}

const result = await response.json();
const encoded = result.data?.[0]?.b64_json;
if (!encoded) {
  console.error('OpenAI image response did not contain data[0].b64_json.');
  process.exit(1);
}

mkdirSync(path.dirname(path.resolve(out)), {recursive: true});
writeFileSync(out, Buffer.from(encoded, 'base64'));
console.log(path.resolve(out));
