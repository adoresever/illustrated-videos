#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = `Usage: node scripts/suggest-voices.mjs [options]

Options:
  --provider <name>    Voice provider (default: edge-tts)
  --locale <locale>    Exact provider locale, for example zh-CN (default: zh-CN)
  --mode <mode>        explainer or book (default: explainer)
  --max <3-5>          Number of option cards to return (default: 4)
  --format <format>    json or markdown (default: json)
  --catalog <file>     Read an already configured provider catalog instead of enumerating
  --help, -h           Show this help

The edge-tts provider is enumerated at runtime with "edge-tts --list-voices".
No voice ID is invented when enumeration is unavailable.`;

const failUsage = (message) => {
  console.error(`${message}\n\n${usage}`);
  process.exit(2);
};

const parseArguments = (arguments_) => {
  const parsed = {
    provider: 'edge-tts',
    locale: 'zh-CN',
    mode: 'explainer',
    max: 4,
    format: 'json',
    catalog: null,
  };
  const valued = new Set(['--provider', '--locale', '--mode', '--max', '--format', '--catalog']);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--help' || argument === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (!valued.has(argument)) failUsage(`Unknown option: ${argument}`);
    const candidate = arguments_[index + 1];
    if (!candidate || candidate.startsWith('--')) failUsage(`Missing value for ${argument}.`);
    const key = argument.slice(2);
    parsed[key] = key === 'max' ? Number(candidate) : candidate;
    index += 1;
  }
  if (!['explainer', 'book'].includes(parsed.mode)) failUsage('--mode must be explainer or book.');
  if (!['json', 'markdown'].includes(parsed.format)) failUsage('--format must be json or markdown.');
  if (!Number.isInteger(parsed.max) || parsed.max < 3 || parsed.max > 5) failUsage('--max must be an integer from 3 to 5.');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,16})*$/.test(parsed.locale)) {
    failUsage('--locale must look like a provider locale, for example zh-CN or zh-CN-liaoning.');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(parsed.provider)) failUsage('--provider contains unsupported characters.');
  return parsed;
};

const splitMetadata = (value) => {
  if (Array.isArray(value)) return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
};

const localeFromVoiceId = (voiceId) => {
  const parts = voiceId.split('-');
  return parts.length >= 3 ? parts.slice(0, -1).join('-') : null;
};

const normalizeVoice = (entry) => {
  const voiceId = entry.voiceId ?? entry.ShortName ?? entry.Name ?? entry.voice ?? entry.id;
  if (typeof voiceId !== 'string' || !voiceId.trim()) return null;
  const locale = entry.locale ?? entry.Locale ?? localeFromVoiceId(voiceId.trim());
  return {
    voiceId: voiceId.trim(),
    locale: typeof locale === 'string' ? locale.trim() : null,
    gender: String(entry.gender ?? entry.Gender ?? 'Unknown').trim(),
    contentCategories: splitMetadata(entry.contentCategories ?? entry.ContentCategories),
    voicePersonalities: splitMetadata(entry.voicePersonalities ?? entry.VoicePersonalities),
  };
};

const parseEdgeTable = (stdout) => {
  const lines = stdout.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes('Name')
    && line.includes('Gender')
    && line.includes('ContentCategories')
    && line.includes('VoicePersonalities'));
  if (headerIndex < 0) throw new Error('The edge-tts voice table header was not recognized.');
  const header = lines[headerIndex];
  const genderColumn = header.indexOf('Gender');
  const categoriesColumn = header.indexOf('ContentCategories');
  const personalitiesColumn = header.indexOf('VoicePersonalities');
  if (!(genderColumn > 0 && categoriesColumn > genderColumn && personalitiesColumn > categoriesColumn)) {
    throw new Error('The edge-tts voice table columns were not recognized.');
  }
  const voices = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (!line.trim() || /^\s*-+\s*$/.test(line)) continue;
    const normalized = normalizeVoice({
      voiceId: line.slice(0, genderColumn).trim(),
      gender: line.slice(genderColumn, categoriesColumn).trim(),
      contentCategories: line.slice(categoriesColumn, personalitiesColumn).trim(),
      voicePersonalities: line.slice(personalitiesColumn).trim(),
    });
    if (normalized) voices.push(normalized);
  }
  if (!voices.length) throw new Error('edge-tts returned no parseable voices.');
  return voices;
};

const readCatalog = (file) => {
  const resolved = path.resolve(file);
  const value = JSON.parse(readFileSync(resolved, 'utf8'));
  const entries = Array.isArray(value) ? value : value.voices;
  if (!Array.isArray(entries)) throw new Error('Catalog JSON must be an array or an object with a voices array.');
  const voices = entries.map(normalizeVoice).filter(Boolean);
  if (!voices.length) throw new Error('Catalog contains no usable voice records.');
  return {voices, source: `configured-catalog:${resolved}`};
};

const enumerateProvider = (cli) => {
  if (cli.catalog) return readCatalog(cli.catalog);
  if (cli.provider !== 'edge-tts') {
    throw new Error(`Provider ${cli.provider} has no local catalog enumerator in this Skill.`);
  }
  const command = process.env.EDGE_TTS_COMMAND || 'edge-tts';
  const result = spawnSync(command, ['--list-voices'], {
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr ?? '').trim();
    throw new Error(`${command} --list-voices failed${detail ? `: ${detail}` : '.'}`);
  }
  return {voices: parseEdgeTable(result.stdout), source: `${command} --list-voices`};
};

const presets = JSON.parse(readFileSync(path.join(root, 'assets/voice-presets.json'), 'utf8'));

const intersection = (left, right) => {
  const expected = new Set(right.map((entry) => entry.toLocaleLowerCase('en-US')));
  return left.filter((entry) => expected.has(entry.toLocaleLowerCase('en-US')));
};

const describeGender = (gender) => ({
  Female: '女声',
  Male: '男声',
  Neutral: '中性声线',
}[gender] ?? (gender === 'Unknown' ? '未标注声线' : gender));

const scorePair = (voice, preset, mode) => {
  const categoryMatches = intersection(voice.contentCategories, preset.signals.contentCategories);
  const personalityMatches = intersection(voice.voicePersonalities, preset.signals.voicePersonalities);
  if (!categoryMatches.length && !personalityMatches.length) return null;
  const modeMatch = preset.preferredModes.includes(mode);
  const modePriority = presets.modes[mode].preferredPresetIds.indexOf(preset.id);
  const priorityBonus = modePriority < 0
    ? 0
    : (presets.modes[mode].preferredPresetIds.length - modePriority) * presets.matching.modePriorityStep;
  const score = (modeMatch ? presets.matching.modeWeight : 0)
    + priorityBonus
    + (categoryMatches.length ? presets.matching.contentCategoryWeight : 0)
    + (personalityMatches.length ? presets.matching.personalityWeight : 0);
  return {voice, preset, score, modeMatch, categoryMatches, personalityMatches};
};

const shellQuote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;

const recommend = (voices, mode, maximum, provider) => {
  const pairs = voices.flatMap((voice) => presets.presets
    .map((preset) => scorePair(voice, preset, mode))
    .filter(Boolean));
  pairs.sort((left, right) => right.score - left.score
    || Number(right.modeMatch) - Number(left.modeMatch)
    || left.preset.id.localeCompare(right.preset.id)
    || left.voice.voiceId.localeCompare(right.voice.voiceId));

  const picked = [];
  const usedVoices = new Set();
  const usedPresets = new Set();
  for (const pair of pairs) {
    if (picked.length >= maximum) break;
    if (usedVoices.has(pair.voice.voiceId) || usedPresets.has(pair.preset.id)) continue;
    picked.push(pair);
    usedVoices.add(pair.voice.voiceId);
    usedPresets.add(pair.preset.id);
  }
  for (const pair of pairs) {
    if (picked.length >= maximum) break;
    if (usedVoices.has(pair.voice.voiceId)) continue;
    picked.push(pair);
    usedVoices.add(pair.voice.voiceId);
  }

  return picked.map((pair, index) => {
    const providerSignals = [
      ...pair.categoryMatches.map((value) => `内容类别 ${value}`),
      ...pair.personalityMatches.map((value) => `声音特质 ${value}`),
    ];
    const modeLabel = presets.modes[mode].label;
    const previewArguments = provider === 'edge-tts'
      ? [
          'scripts/generate-voice.mjs',
          '--provider', 'edge-tts',
          '--text-file', 'voice-preview.txt',
          '--out', `voice-preview-${pair.voice.voiceId}.mp3`,
          '--voice', pair.voice.voiceId,
          '--rate', '+0%',
          '--pitch', '+0Hz',
        ]
      : null;
    return {
      rank: index + 1,
      presetId: pair.preset.id,
      label: `${pair.preset.label} · ${describeGender(pair.voice.gender)}`,
      description: pair.preset.description,
      bestFor: pair.preset.bestFor,
      useCases: pair.preset.useCases,
      gender: pair.voice.gender,
      genderLabel: describeGender(pair.voice.gender),
      locale: pair.voice.locale,
      voiceId: pair.voice.voiceId,
      providerMetadata: {
        contentCategories: pair.voice.contentCategories,
        voicePersonalities: pair.voice.voicePersonalities,
      },
      whyRecommended: `供应商将该声音标注为${providerSignals.join('、')}，与“${modeLabel}”下的“${pair.preset.label}”听感相符。`,
      previewCommand: previewArguments == null ? null : {
        automatic: false,
        command: 'node',
        arguments: previewArguments,
        display: ['node', ...previewArguments].map(shellQuote).join(' '),
        preparation: 'Write the same one- or two-sentence sample to voice-preview.txt before running this optional command.',
      },
    };
  });
};

const fallbackFramework = (cli, reason, catalogStatus = 'unavailable') => ({
  ok: false,
  provider: cli.provider,
  request: {locale: cli.locale, mode: cli.mode, max: cli.max},
  catalog: {available: false, status: catalogStatus, reason},
  recommendations: [],
  fallback: {
    status: 'catalog-required',
    message: '当前无法确认真实可用的 voice ID，因此不会虚构音色。请先让已配置语音供应商导出 catalog，再用 --catalog 重新运行。',
    selectionDimensions: [
      {name: '听感', examples: ['温暖叙事', '清晰可信', '轻快亲和', '沉稳思考', '有张力']},
      {name: '用途', examples: ['科普讲解', '文学叙事', '人物故事', '事件转折']},
      {name: '语言与口音', requested: cli.locale},
      {name: '声线偏好', examples: ['女声', '男声', '中性或不限定']},
    ],
    nextAction: 'Provide an actual provider voice catalog as JSON; do not substitute guessed IDs.',
  },
});

const asMarkdown = (report) => {
  const lines = ['# 旁白音色建议', ''];
  if (!report.catalog.available) {
    lines.push(
      `暂时无法读取 ${report.provider} 的真实音色目录：${report.catalog.reason}`,
      '',
      report.fallback.message,
      '',
      '选择时会按以下维度说明：',
      '',
      ...report.fallback.selectionDimensions.map((item) => `- ${item.name}：${item.examples?.join('、') ?? item.requested}`),
      '',
    );
    return lines.join('\n');
  }
  lines.push(
    `场景：${report.modeLabel}；语言 / 口音：${report.request.locale}；目录来源：${report.catalog.source}`,
    '',
  );
  if (!report.recommendations.length) {
    lines.push(
      report.fallback.message,
      '',
      '请改用目录中真实存在且带可匹配元数据的 locale，或接入对应语言的供应商 catalog。',
      '',
    );
    return lines.join('\n');
  }
  for (const card of report.recommendations) {
    lines.push(
      `## ${card.rank}. ${card.label}`,
      '',
      `- 听感：${card.description}`,
      `- 最适合：${card.bestFor}`,
      `- 常见场合：${card.useCases.join('、')}`,
      `- 语言 / 口音：${card.locale}`,
      `- 推荐原因：${card.whyRecommended}`,
      card.previewCommand
        ? `- 试听（可选，不会自动执行）：先把同一小段文字写入 \`voice-preview.txt\`，再运行 \`${card.previewCommand.display}\``
        : `- 试听（可选，不会自动执行）：使用已配置的 ${report.provider} 适配器，对同一小段文字生成试听。`,
      `- 供应商 voice ID：\`${card.voiceId}\``,
      '',
    );
  }
  lines.push(
    `用户未选择时，默认使用第 1 项：\`${report.defaultSelection.voiceId}\`。正式生成前可先用同一小段文字试听。`,
    '',
    '一旦更换 voice、语速、音高或旁白文字，必须重新生成音频并对齐场景与字幕时间。',
    '',
  );
  return lines.join('\n');
};

const cli = parseArguments(process.argv.slice(2));
let report;
try {
  const catalog = enumerateProvider(cli);
  const localeVoices = catalog.voices.filter((voice) => voice.locale?.toLocaleLowerCase('en-US')
    === cli.locale.toLocaleLowerCase('en-US'));
  const recommendations = recommend(localeVoices, cli.mode, cli.max, cli.provider);
  report = {
    ok: recommendations.length > 0,
    provider: cli.provider,
    request: {locale: cli.locale, mode: cli.mode, max: cli.max},
    modeLabel: presets.modes[cli.mode].label,
    catalog: {
      available: true,
      source: catalog.source,
      totalVoiceCount: catalog.voices.length,
      localeVoiceCount: localeVoices.length,
    },
    recommendations,
    defaultSelection: recommendations[0]
      ? {voiceId: recommendations[0].voiceId, reason: 'Highest metadata match for the selected mode; used only when the user does not choose.'}
      : null,
    selectionPolicy: {
      showSmallSetFirst: true,
      previewBeforeFinal: true,
      userChoiceHasPriority: true,
      fallbackWhenNoAnswer: 'Use defaultSelection.',
      timingInvalidation: 'Changing voice, rate, pitch, or approved narration requires new audio measurement and scene/caption alignment.',
    },
  };
  if (!recommendations.length) {
    report.fallback = {
      status: localeVoices.length ? 'metadata-no-match' : 'locale-not-found',
      message: localeVoices.length
        ? `真实目录中 locale 为 ${cli.locale} 的声音没有可匹配元数据，因此没有生成猜测选项。`
        : `真实目录中没有 locale 为 ${cli.locale} 的声音，因此没有生成猜测选项。`,
      availableLocales: [...new Set(catalog.voices.map((voice) => voice.locale).filter(Boolean))].sort(),
    };
  }
} catch (error) {
  report = fallbackFramework(cli, error instanceof Error ? error.message : String(error));
}

console.log(cli.format === 'markdown' ? asMarkdown(report) : JSON.stringify(report, null, 2));
