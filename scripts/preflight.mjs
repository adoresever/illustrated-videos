#!/usr/bin/env node
import {existsSync, readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const findCommand = (candidates, versionArgument = '--version') => {
  for (const candidate of candidates) {
    const result = spawnSync(candidate, [versionArgument], {encoding: 'utf8'});
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
};

const commands = {
  node: findCommand(['node']),
  npm: findCommand(['npm']),
  ffmpeg: findCommand(['ffmpeg'], '-version'),
  ffprobe: findCommand(['ffprobe'], '-version'),
  python: findCommand(['python3', 'python']),
  edgeTts: findCommand(['edge-tts']),
};

const pillow = commands.python
  ? (() => {
      const result = spawnSync(commands.python, ['-c', 'from PIL import Image'], {encoding: 'utf8'});
      return !result.error && result.status === 0;
    })()
  : false;

const configPath = value('--config');
let config = {};
if (configPath) {
  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }
  config = JSON.parse(readFileSync(configPath, 'utf8'));
}

const errors = [];
for (const required of ['node', 'npm', 'ffmpeg', 'ffprobe', 'python']) {
  if (!commands[required]) errors.push(`Missing required command: ${required}`);
}
if (commands.python && !pillow) errors.push('Python Pillow is required. Install it in the active environment.');

const imageProvider = config.image?.provider ?? 'codex-native';
const voiceProvider = config.voice?.provider ?? 'edge-tts';
const imageProviders = new Set(['codex-native', 'openai-api', 'mcp', 'file']);
const voiceProviders = new Set(['edge-tts', 'openai', 'file']);

if (!imageProviders.has(imageProvider)) {
  errors.push(`Unsupported image provider: ${imageProvider}. Choose codex-native, openai-api, mcp, or file.`);
}
if (!voiceProviders.has(voiceProvider)) {
  errors.push(`Unsupported voice provider: ${voiceProvider}. Choose edge-tts, openai, or file.`);
}

if (imageProvider === 'openai-api' && !process.env.OPENAI_API_KEY) {
  errors.push('Image provider openai-api requires OPENAI_API_KEY. Set it locally; do not paste it into chat.');
}
if (voiceProvider === 'openai' && !process.env.OPENAI_API_KEY) {
  errors.push('Voice provider openai requires OPENAI_API_KEY. Set it locally; do not paste it into chat.');
}
if (voiceProvider === 'edge-tts' && !commands.edgeTts) {
  errors.push('Voice provider edge-tts requires the edge-tts executable.');
}

const report = {
  ok: errors.length === 0,
  commands,
  pillow,
  imageProvider,
  voiceProvider,
  agentChecks:
    imageProvider === 'codex-native'
      ? ['Confirm that a native raster image-generation tool is callable in this agent session.']
      : imageProvider === 'mcp'
        ? ['Inspect and confirm the configured image MCP tool schema before generation.']
        : imageProvider === 'file'
          ? ['Confirm that every input is authorized and already separated according to the layer contract.']
          : [],
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
