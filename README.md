# Illustrated Videos

> Turn knowledge into animated illustrations.
>
> 把知识变成会动的插画。

`illustrated-videos` 是一个可移植的 Agent Skill：把主题、文章、图书或参考方法整理成可编辑的插画视频。它负责研究、文案、分镜、提示词、素材契约、配音、Remotion 合成与 FFmpeg 质检；图片和声音由可配置的外部能力提供。

项目由 [AGI_Ananas](https://github.com/adoresever) 创建和维护。创作者账号：`AGI_Ananas`。

## 当前状态

- 已验证预设：`paper-cut`（剪纸 / 纸片拼贴）。
- 内容模式：`explainer` 用独立图层做插画科普；`book-review` 用统一风格的无字场景插画做图书号 / 书评短视频 / 插画读书。
- `book-review` 没有 30 秒限制：先把选定的观点讲完，再用最终旁白音频决定成片时长和切图点。
- 已验证画幅：9:16；模板也支持配置 16:9。
- 默认不在视频中显示账号、水印或作者署名；只有用户明确要求时才开启 `brand.show`。
- `crayon`、`doodle`、`pencil-sketch`、`watercolor`、`ink-wash`、`pixel-art` 是规划中的扩展方向，目前不能当作已经完成的预设。

“Illustrated Videos” 是总名称，`contentMode` 决定内容流程，`assetStrategy` 决定素材是独立图层还是完整场景插画，`paper-cut` 则是当前经过验证的视觉预设。详见 [风格预设说明](references/style-presets.md)。

## 示例视频

### 端午门前的艾草

[![端午门前的艾草分镜](https://raw.githubusercontent.com/adoresever/illustrated-videos/main/examples/aicao-door/contact-sheet.jpg)](https://github.com/adoresever/illustrated-videos/blob/main/examples/aicao-door/preview.mp4)

25.558 秒，720 × 1280 预览版，H.264/AAC。图片由 Codex 原生图像生成能力制作，旁白使用 Edge TTS `zh-CN-XiaoyiNeural`。查看[制作记录与资料来源](https://github.com/adoresever/illustrated-videos/blob/main/examples/aicao-door/README.md)或[播放 MP4](https://github.com/adoresever/illustrated-videos/blob/main/examples/aicao-door/preview.mp4)。

### 陈皮为什么带个“陈”字

[![陈皮为什么带个陈字分镜](https://raw.githubusercontent.com/adoresever/illustrated-videos/main/examples/chenpi-character/contact-sheet.jpg)](https://github.com/adoresever/illustrated-videos/blob/main/examples/chenpi-character/preview.mp4)

28.459 秒，720 × 1280 预览版，H.264/AAC。图片由 Codex 原生图像生成能力制作，旁白使用 Edge TTS `zh-CN-YunyangNeural`。查看[制作记录与资料来源](https://github.com/adoresever/illustrated-videos/blob/main/examples/chenpi-character/README.md)或[播放 MP4](https://github.com/adoresever/illustrated-videos/blob/main/examples/chenpi-character/preview.mp4)。

仓库内现有的是 `explainer` 模式的 GitHub 预览版。图书样片和 1080 × 1920 母版默认作为工程产物保留在仓库外，不放入 Skill 包或 Git 历史；只有维护者明确决定发布并补充媒体许可说明时才例外。

## 它怎样把插画变成动画

### `explainer` + `layered`

纸片分层科普分别生成：

1. 不含主角的背景底板；
2. 独立的主角、配角和前景物件；
3. 去除色键背景后的透明 PNG；
4. 由 JSON 描述的位置、大小、层级、延迟和运动。

Remotion 再用 React 把图层叠起来，对各层施加不同的入场、弹性、轻微漂移、视差、遮挡和镜头推拉，同时叠加代码生成的标题、字幕、配音、音乐和音效，最后渲染为 MP4。图像模型负责画素材，Remotion 负责让素材按时间运动；两者不是同一个工具。

### `book-review` + `scene-illustrations`

图书视频允许每个叙事段落使用一张完整的无字插画，画面内可以同时有人物、道具与环境。Remotion 对整张插画做节制的推近、平移、裁切、转场和代码图形动画，书名、作者和字幕仍然由 HTML / CSS / React 叠加，避免生图中的中文错字。这个模式不会假装画内人物能独立运动；真需要局部独立动作时，再为它制作真正分离的素材。

## 前置条件

基础运行环境：

- Node.js 20+ 与 npm；
- Python 3 与 Pillow，用于 `layered` 的色键移除和透明通道检查；只做 `scene-illustrations` 时不需要去色键；
- FFmpeg 与 ffprobe，用于音频、编码和成片质检；
- 可供 Remotion 使用的 Chrome Headless Shell（首次渲染时通常会自动下载）；
- 足够的磁盘空间与网络连接。

还需按模式提供以下能力：

| 能力 | 可选方案 | 是否随 Skill 提供 |
|---|---|---|
| 图书资料 | 权威网页 / 图书馆 / 出版社资料；可选微信读书 Skill | 否 |
| 图片 | Codex 原生图像生成、兼容的图片 MCP、OpenAI Image API、已分层素材，或原创 / 授权的无字场景插画 | 否 |
| 声音 | Edge TTS、OpenAI Speech API、授权的本地录音；可选 VoxCPM 适配器 | 否 |
| 字幕对齐 | 最终音频 + 人工校对；可选 faster-whisper 时间点 | 否 |
| 合成 | 项目内安装的 Remotion | 模板与依赖声明已提供 |
| 编码 / 质检 | FFmpeg、ffprobe | 否 |

如果 Agent 既没有生图工具，也没有符合当前素材策略的合规图片，Skill 会停止并明确提示配置图片模型 / MCP 或提供素材，不会用色块或临时 SVG 冒充正式画面。`explainer` 需要真正分层的图片；`book-review` 可以使用完整场景插画。API 密钥只放在本机环境变量中，不要写进 Skill、提示词或 Git 仓库。任何声音克隆都必须获得声音权利人的明确授权。

微信读书 Skill、VoxCPM、faster-whisper 和 HyperFrames 都是可选适配能力，不是本仓库的强制前置。默认链路仍是可追溯资料 + 已配置图片提供方 + 现有语音适配器 + Remotion + FFmpeg。HyperFrames 只能在有等价预览、文字叠加、音频、校验与导出适配层时替代 Remotion。

## 安装

### WorkBuddy

下载 [illustrated-videos.zip](https://github.com/adoresever/illustrated-videos/raw/refs/heads/main/dist/illustrated-videos.zip)，在 WorkBuddy 的 Skills 页面导入 ZIP。若当前版本不能直接导入 ZIP，则解压后导入 `illustrated-videos` 文件夹，或使用 [WorkBuddy 创建提示词](assets/workbuddy-create-skill-prompt.md)。压缩包只包含运行 Skill 所需的代码与文档，不重复打包示例视频；可用同目录的 [SHA-256 文件](https://github.com/adoresever/illustrated-videos/raw/refs/heads/main/dist/illustrated-videos.zip.sha256)校验下载内容。

WorkBuddy 还需要：

- 允许 Skill 读取本地文件并执行 Node、Python、FFmpeg 命令；
- 配置一个图片 MCP / 图片 API，或提前提供符合模式的素材（科普用独立图层，图书用无字场景插画）；
- 选择 Edge TTS、OpenAI Speech API，或授权的本地音频作为旁白。

### Codex

```bash
git clone https://github.com/adoresever/illustrated-videos.git \
  "${CODEX_HOME:-$HOME/.codex}/skills/illustrated-videos"
```

然后直接描述主题、时长与画幅，例如：

```text
使用 $illustrated-videos，为“人参为什么长得像人”制作约 30 秒、9:16 的 paper-cut 趣味科普视频。默认不显示账号水印。
```

图书模式不必给出时长：

```text
使用 $illustrated-videos，为《<书名>》制作 9:16 的 book-review 插画读书视频。选一个有传播力的低剧透角度，查证资料，使用无字场景插画，书名和作者用代码叠加。旁白讲完即可，用最终音频决定时长，默认不显示账号水印。
```

Codex 有可调用的原生生图能力时可直接使用；否则需配置图片 API / MCP。Skill 本身不是图片模型。

### Claude Code

```bash
git clone https://github.com/adoresever/illustrated-videos.git \
  "$HOME/.claude/skills/illustrated-videos"
```

用 `/illustrated-videos` 调用；若宿主版本不提供 slash-command 入口，也可在提示词中直接指定使用 `illustrated-videos` Skill。如果 Claude Code 环境没有图片生成工具，请连接兼容的图片 MCP、配置显式图片 API，或提供符合当前素材策略的现成图片。

更多跨平台说明见 [references/platforms.md](references/platforms.md)，供应商配置见 [references/providers.md](references/providers.md)。

## 模式选择

| 需求 | `contentMode` | `assetStrategy` | 图片契约 | 时长 |
|---|---|---|---|---|
| 插画科普、纸片分层动画 | `explainer` | `layered` | 背景无主角，主角 / 配角 / 前景为独立 alpha 素材 | 用户目标或旁白决定 |
| 图书号、书评短视频、插画读书 | `book-review` | `scene-illustrations` | 每个叙事段落一张统一风格的完整无字插画 | 无固定上限，由最终旁白音频决定 |

### 图书模式的最小内容契约

在项目研究包与 creative brief 中至少确认：

```json
{
  "project": {
    "contentMode": "book-review",
    "book": {
      "title": "<书名>",
      "author": "<作者>",
      "angle": "<一个问题或观点>",
      "spoilerLevel": "low"
    }
  },
  "visualSystem": {
    "assetStrategy": "scene-illustrations",
    "seriesAnchor": "<每张生图都原样复用的系列视觉锚点>"
  },
  "evidence": {
    "sources": [
      {"id": "source-01", "title": "<可追溯来源>", "url": "https://<直接来源页>"}
    ]
  }
}
```

这不是让图像模型画书封。先按 [图书研究数据规范](references/book-research-schema.md) 查证书名、作者、版本与叙事角度，再按 [图书视频流程](references/book-review-workflow.md) 依次完成整段旁白、最终配音、字幕对齐、场景插画和渲染。当前校验器至少要求 3 张 `type: "illustration"` 的语义场景，旁白更长时应按内容增加，不能为了少生图长时间重复一张。生图内不放书名、作者或字幕；这些文字由代码叠加。每张图人工或视觉检查后，manifest 才能标记 `textFree: true` 与 `visuallyInspected: true`；图书脚手架还会把字幕底部安全区设为画面高度的 9.5%，可按发布平台调整。

## 最短运行路径

```bash
# 1. 检查本机与所选供应商
node scripts/preflight.mjs --config assets/remotion-template/project-config.json

# 2. 创建一个独立项目；图书模式加 --mode book-review
node scripts/create-project.mjs ./my-video
# node scripts/create-project.mjs ./my-book-video --mode book-review

# 3. 填写 creative-brief.json；图书模式还要先完成 book-research.json
#    然后编译每个素材的提示词
node scripts/build-prompts.mjs \
  --brief ./my-video/creative-brief.json \
  --out ./my-video/public/prompts

# 4. 生成素材、按当前契约处理、填写 manifest 与 project.json 后检查工程
node scripts/validate-manifest.mjs ./my-video
node scripts/audit-project.mjs ./my-video

# 5. 预览与渲染
cd ./my-video
npm install
npm start
npm run render

# 6. 验证成片
../scripts/verify-video.sh out/final.mp4
```

Agent 实际执行时会按 [完整工作流](references/workflow.md)继续完成研究、旁白、生图、音频、分镜联系表和人工观看检查。透明通道处理只用于 `layered`；图书模式改为最终整段音频、字幕时间轴和完整场景插画的契约检查。

## 重建发行包

维护者可在仓库根目录运行：

```bash
./scripts/package-skill.sh
```

本机需提供 `zip` 与 `sha256sum`。脚本会生成 `dist/illustrated-videos.zip` 及对应校验文件，并排除示例视频、Git 数据、密钥、缓存和构建输出。

## 项目结构

```text
illustrated-videos/
├── SKILL.md                         # Agent 的主工作说明
├── agents/openai.yaml               # Agent 展示元数据
├── assets/remotion-template/        # 可复制的 Remotion 工程
├── examples/                        # 两个无水印预览视频与制作记录
├── references/                      # 提示词、图层、图书研究、供应商、QA 等规范
├── scripts/                         # 项目创建、生成、审计和媒体检查脚本
└── dist/illustrated-videos.zip      # WorkBuddy 等平台可导入的轻量包
```

## 设计边界

- 参考作品时只抽取叙事结构、分层方法、节奏和运动语法，不复制受保护的画面、角色或独特视觉身份。
- 健康、医学、金融、法律等高风险主题必须核对权威资料，并明确区分文化传统、可观察事实和证据结论。
- 图片内不生成标题、书名、作者或字幕；这些文字由代码叠加，避免中文错字。
- 图书视频默认低剧透、使用原创评论；不默认复制原文、书封、影片剧照、演员形象或具体插画版的构图。直接引文必须核对版本、明确归属并确认可用性。
- 字幕时间可来自 faster-whisper 等识别器，但字幕文本来自已确认旁白；书名、人名和专有名词不能被识别结果静默覆盖。
- 自动评分只检查声明的结构和媒体属性，不能替代完整观看、事实核对和审美判断。
- 音乐、字体、图片、参考音频和公开视频素材仍需使用者自行确认许可。

## 致谢与许可证

分层纸片动画的方法研究参考了季白羽（[@vbjby3](https://x.com/vbjby3/status/2076530524110369070)）公开分享的 Codex + Remotion 制作文章；本项目抽取的是可迁移流程，不包含或再分发原文截图。详见 [参考方法记录](references/reference-method.md)。

代码与文档采用 [Apache License 2.0](LICENSE)。`examples/` 下的预览视频与联系表仅作为项目输出演示，保留权利，不纳入 Apache-2.0；详见 [示例媒体说明](https://github.com/adoresever/illustrated-videos/blob/main/examples/MEDIA-LICENSE.md)。

Remotion 是本项目声明的外部依赖，并未被复制进仓库。本项目自身开源不代表 Remotion 是 OSI 定义的开源软件；使用者需根据自己的组织规模与自动化方式核对 [Remotion License FAQ](https://www.remotion.dev/docs/license/faq)。图片、语音、字体、音乐和其他第三方服务也适用各自许可证与条款，商业发布前应单独确认。
