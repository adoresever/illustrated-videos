#!/usr/bin/env node
import {existsSync, readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const usage = `Usage: node ${path.basename(process.argv[1])} [--config <project-config.json>] [--project-dir <dir> | <project-directory>]`;
const parseArguments = (arguments_) => {
  let configPath;
  let projectDirectory;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--help' || argument === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (argument === '--config' || argument === '--project-dir') {
      const candidate = arguments_[index + 1];
      if (!candidate || candidate.startsWith('-')) {
        console.error(`Missing value for ${argument}.\n${usage}`);
        process.exit(2);
      }
      if (argument === '--config') {
        if (configPath != null) {
          console.error(`--config was provided more than once.\n${usage}`);
          process.exit(2);
        }
        configPath = candidate;
      } else {
        if (projectDirectory != null) {
          console.error(`Project directory was provided more than once.\n${usage}`);
          process.exit(2);
        }
        projectDirectory = candidate;
      }
      index += 1;
      continue;
    }
    if (argument.startsWith('-')) {
      console.error(`Unknown option: ${argument}\n${usage}`);
      process.exit(2);
    }
    if (projectDirectory != null) {
      console.error(`Project directory was provided more than once.\n${usage}`);
      process.exit(2);
    }
    projectDirectory = argument;
  }
  const resolvedProjectDirectory = projectDirectory == null ? null : path.resolve(projectDirectory);
  return {
    projectDirectory: resolvedProjectDirectory,
    configPath: configPath != null
      ? path.resolve(configPath)
      : resolvedProjectDirectory != null
        ? path.join(resolvedProjectDirectory, 'project-config.json')
        : null,
  };
};

const cli = parseArguments(args);

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

const pythonModule = (module) => commands.python
  ? (() => {
      const result = spawnSync(commands.python, ['-c', `import ${module}`], {encoding: 'utf8'});
      return !result.error && result.status === 0;
    })()
  : false;

const configPath = cli.configPath;
let config = {};
if (configPath) {
  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }
  config = JSON.parse(readFileSync(configPath, 'utf8'));
}

const errors = [];
for (const required of ['node', 'npm', 'ffmpeg', 'ffprobe']) {
  if (!commands[required]) errors.push(`Missing required command: ${required}`);
}

const contentMode = config.contentMode === 'book-review' ? 'book' : (config.contentMode ?? 'explainer');
if (config.contentMode === 'book-review') errors.push('Normalize legacy input book-review to canonical contentMode=book before preflight.');
const assetStrategy = config.assetStrategy ?? 'layered';
const imageProvider = config.image?.provider ?? 'codex-native';
const voiceProvider = config.voice?.provider ?? 'edge-tts';
const timingProvider = config.timing?.provider ?? 'manual';
const rendererProvider = config.renderer?.provider ?? 'remotion';
const imageProviders = new Set(['codex-native', 'openai-api', 'mcp', 'file']);
const voiceProviders = new Set(['edge-tts', 'openai', 'file']);
const timingProviders = new Set(['manual', 'faster-whisper']);

if (!['explainer', 'book'].includes(contentMode)) errors.push(`Unsupported contentMode: ${contentMode}.`);
if (assetStrategy !== 'layered') errors.push('All publishable projects require assetStrategy=layered; composite scene illustrations are rejected.');
if (!imageProviders.has(imageProvider)) {
  errors.push(`Unsupported image provider: ${imageProvider}. Choose codex-native, openai-api, mcp, or file.`);
}
if (!voiceProviders.has(voiceProvider)) {
  errors.push(`Unsupported voice provider: ${voiceProvider}. Choose edge-tts, openai, or file.`);
}
if (!timingProviders.has(timingProvider)) {
  errors.push(`Unsupported timing provider: ${timingProvider}. Choose manual or faster-whisper.`);
}
if (rendererProvider !== 'remotion') {
  errors.push(`Unsupported renderer provider in this release: ${rendererProvider}. Choose remotion.`);
}
if ((assetStrategy === 'layered' || timingProvider === 'faster-whisper') && !commands.python) {
  errors.push('Python is required for layered alpha processing or faster-whisper timing.');
}
if (assetStrategy === 'layered' && commands.python && !pillow) {
  errors.push('Python Pillow is required for layered chroma removal and alpha validation.');
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
const fasterWhisper = timingProvider === 'faster-whisper' ? pythonModule('faster_whisper') : null;
if (timingProvider === 'faster-whisper' && !fasterWhisper) {
  errors.push('Timing provider faster-whisper requires the Python faster_whisper package. Choose manual to supply approved timings without ASR.');
}

const report = {
  ok: errors.length === 0,
  projectDirectory: cli.projectDirectory,
  configPath,
  commands,
  pillow,
  contentMode,
  assetStrategy,
  imageProvider,
  voiceProvider,
  timingProvider,
  rendererProvider,
  fasterWhisper,
  agentChecks:
    imageProvider === 'codex-native'
      ? ['Confirm that a native raster image-generation tool is callable in this agent session.']
      : imageProvider === 'mcp'
        ? ['Inspect and confirm the configured image MCP tool schema before generation.']
        : imageProvider === 'file'
          ? [`Confirm that every input is authorized and satisfies assetStrategy=${assetStrategy}.`]
          : [],
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
