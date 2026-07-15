# Illustrated Videos

> Turn knowledge into animated illustrations.
>
> 把知识变成会动的插画。

`illustrated-videos` 是一个可移植的 Agent Skill：把主题、文章、图书或参考方法整理成可编辑的插画视频。它负责研究、文案、分镜、提示词、素材契约、配音、Remotion 合成与 FFmpeg 质检；图片和声音由可配置的外部能力提供。

项目由 [AGI_Ananas](https://github.com/adoresever) 创建和维护。创作者账号：`AGI_Ananas`。

## 当前状态

- 已验证预设：`paper-cut`（剪纸 / 纸片拼贴）。
- 内容类型：`explainer`（插画科普）与 `book`（插画讲书）。旧的 `book-review` 输入会映射为 `book`。
- 所有正式成片都使用 `layered`：背景不含主角，人物、核心对象、可动道具与景深元素按内容需要独立生成和动画。
- 用户未指定时长时，Agent 先询问一次大概秒数；无法取得回答时，`explainer` 以约 40 秒规划，`book` 以 60–120 秒规划。用户指定优先，最终精确时长仍由批准文案生成的真实旁白决定。
- 旁白声音可选：用户不需要认识 voice ID。Agent 会先从供应商真实目录中挑出 3–5 个选项，用“温暖叙事 / 清晰可信 / 轻快亲和”等易懂名称说明听感、适合场合、声线、语言或口音和推荐理由；允许先试听同一小段。用户选择优先，未选择时使用第一项真实推荐。更换声音后会重新测量音频并生成场景与字幕时间，不复用旧时间轴。
- 已验证画幅：9:16；模板也支持配置 16:9。
- 默认不在视频中显示账号、Logo、水印或作者署名；只有用户明确要求时才开启 `brand.show`。可显示文字账号、自备图片 Logo，或两者同时显示。
- 图片生成后可运行本地水印初筛；它不调用模型或 API，不产生额外额度消耗。启发式未命中仍需人工或 Agent 视觉确认。
- `crayon`、`doodle`、`pencil-sketch`、`watercolor`、`ink-wash`、`pixel-art` 是规划中的扩展方向，目前不能当作已经完成的预设。

“Illustrated Videos” 是总名称。`contentMode` 只决定研究和叙事流程，不能改变分层底线；`assetStrategy` 固定为 `layered`。`paper-cut` 是当前经过验证的视觉预设。详见 [风格预设说明](references/style-presets.md)。

## 两种视频类型

这里的“两种”是两种内容与叙事流程，不是两个已经完成的画风；当前两者都使用经过验证的 `paper-cut` 分层视觉。

| 你要做的内容 | `contentMode` | 怎么组织视频 | 默认时长规划 |
|---|---|---|---|
| 插画科普、人物或历史故事 | `explainer` | 核对事实，用独立图层的可见动作解释一个问题 | 先询问；无回答约 40 秒 |
| 插画讲书、书评、插画读书 | `book` | 核对书籍、人物与观点，以一个低剧透小故事组织节拍 | 先询问；无回答 60–120 秒 |

两种类型都输出“无人背景 + 独立人物 / 核心对象 + 可动道具 / 景深元素”，最终精确时长都由批准文案生成的真实旁白决定。旧的 `book-review` 只作为兼容输入，会自动转换为 `book`。

## 示例视频

### 端午门前的艾草

[![端午门前的艾草分镜](https://raw.githubusercontent.com/adoresever/illustrated-videos/main/examples/aicao-door/contact-sheet.jpg)](https://github.com/adoresever/illustrated-videos/blob/main/examples/aicao-door/preview.mp4)

25.558 秒，720 × 1280 预览版，H.264/AAC。图片由 Codex 原生图像生成能力制作，旁白使用 Edge TTS `zh-CN-XiaoyiNeural`。查看[制作记录与资料来源](https://github.com/adoresever/illustrated-videos/blob/main/examples/aicao-door/README.md)或[播放 MP4](https://github.com/adoresever/illustrated-videos/blob/main/examples/aicao-door/preview.mp4)。

### 陈皮为什么带个“陈”字

[![陈皮为什么带个陈字分镜](https://raw.githubusercontent.com/adoresever/illustrated-videos/main/examples/chenpi-character/contact-sheet.jpg)](https://github.com/adoresever/illustrated-videos/blob/main/examples/chenpi-character/preview.mp4)

28.459 秒，720 × 1280 预览版，H.264/AAC。图片由 Codex 原生图像生成能力制作，旁白使用 Edge TTS `zh-CN-YunyangNeural`。查看[制作记录与资料来源](https://github.com/adoresever/illustrated-videos/blob/main/examples/chenpi-character/README.md)或[播放 MP4](https://github.com/adoresever/illustrated-videos/blob/main/examples/chenpi-character/preview.mp4)。

仓库内现有的是 `explainer` 内容类型的 GitHub 预览版。书籍案例和 1080 × 1920 母版默认作为工程产物保留在仓库外，不放入 Skill 包或 Git 历史；只有维护者明确决定发布并补充媒体许可说明时才例外。

### 《霍乱时期的爱情》v1.2 验收案例

这是 `book` 类型的真实 9:16 回归案例：成片约 78.23 秒，5 个场景、3 张无人背景、7 个独立透明图层；旁白使用 Edge TTS `zh-CN-XiaoxiaoNeural`，对应“温暖叙事女声”。完整解码、黑帧、异常长静音、逐图水印与 SHA 绑定检查均通过，项目审计 100/100。为控制仓库和安装包体积，母版及工程素材不提交到 Git 历史。

直接复制这段提示词即可生成同类视频：

```text
使用 $illustrated-videos，为《霍乱时期的爱情》制作一条 9:16 的 paper-cut 插画讲书视频。使用“温暖叙事女声”，语气温柔、克制、有文学感；先查证书籍、作者、人物和情节，选择一个低剧透的小故事。所有画面使用真正的 layered 素材：背景不含主角，人物和可动道具独立生成，书名、作者和字幕由代码叠加。先让我确认旁白与声音试听；确认后以最终语音决定精确时长。默认不显示账号或 Logo。
```

科普类型示例：

```text
使用 $illustrated-videos，为“人参为什么长得像人”制作约 40 秒、9:16 的 paper-cut 趣味科普视频。背景、核心对象和前景分别生成并独立运动，使用清晰可信的中文旁白，默认不显示账号或 Logo。
```

## 它怎样把插画变成动画

### 所有内容都使用 `layered`

无论是科普还是讲书，都会分别生成：

1. 不含主角的背景底板；
2. 独立的主角、配角和前景物件；
3. 去除色键背景后的透明 PNG；
4. 由 JSON 描述的位置、大小、层级、延迟和运动。

Remotion 再用 React 把图层叠起来，对各层施加不同的入场、语义动作、姿态切换、视差、遮挡和镜头运动，同时叠加代码生成的标题、字幕、配音、音乐和音效，最后渲染为 MP4。图像模型负责画素材，Remotion 负责让素材按时间运动；两者不是同一个工具。

Skill 不规定每个场景必须有同样数量的图层。Agent 会先判断“谁在做什么”，再决定哪些人物、道具和前景需要独立控制。完整场景插画只能用作参考或 animatic，不能冒充正式分层成片。

## 前置条件

基础运行环境：

- Node.js 20+ 与 npm；
- Python 3 与 Pillow，用于色键移除和透明通道检查；
- FFmpeg 与 ffprobe，用于音频、编码和成片质检；
- 可供 Remotion 使用的 Chrome Headless Shell（首次渲染时通常会自动下载）；
- 足够的磁盘空间与网络连接。

还需按模式提供以下能力：

| 能力 | 可选方案 | 是否随 Skill 提供 |
|---|---|---|
| 书籍资料 | 权威网页 / 图书馆 / 出版社资料；可选微信读书 Skill | 否 |
| 图片 | Codex 原生图像生成、兼容的图片 MCP、OpenAI Image API，或原创 / 授权的已分层素材 | 否 |
| 声音 | Edge TTS、OpenAI Speech API、授权的本地录音；可选 VoxCPM 适配器 | 否 |
| 字幕对齐 | 最终音频 + 人工校对；可选 faster-whisper 时间点 | 否 |
| 合成 | 项目内安装的 Remotion | 模板与依赖声明已提供 |
| 编码 / 质检 | FFmpeg、ffprobe | 否 |

如果 Agent 既没有生图工具，也没有合规的分层图片，Skill 会停止并明确提示配置图片模型 / MCP 或提供素材，不会用色块、临时 SVG 或一张完整插画冒充正式画面，也不会静默降级成动态 PPT。API 密钥只放在本机环境变量中，不要写进 Skill、提示词或 Git 仓库。任何声音克隆都必须获得声音权利人的明确授权。

微信读书 Skill、VoxCPM、faster-whisper 和 HyperFrames 都是可选适配能力，不是本仓库的强制前置。默认链路仍是可追溯资料 + 已配置图片提供方 + 现有语音适配器 + Remotion + FFmpeg。HyperFrames 只能在有等价预览、文字叠加、音频、校验与导出适配层时替代 Remotion。

## 安装

### WorkBuddy

下载 [illustrated-videos.zip](https://github.com/adoresever/illustrated-videos/raw/refs/heads/main/dist/illustrated-videos.zip)，在 WorkBuddy 的 Skills 页面导入 ZIP。若当前版本不能直接导入 ZIP，则解压后导入 `illustrated-videos` 文件夹，或使用 [WorkBuddy 创建提示词](assets/workbuddy-create-skill-prompt.md)。压缩包只包含运行 Skill 所需的代码与文档，不重复打包示例视频；可用同目录的 [SHA-256 文件](https://github.com/adoresever/illustrated-videos/raw/refs/heads/main/dist/illustrated-videos.zip.sha256)校验下载内容。

WorkBuddy 还需要：

- 允许 Skill 读取本地文件并执行 Node、Python、FFmpeg 命令；
- 配置一个图片 MCP / 图片 API，或提前提供背景、人物、道具等真正分离的素材；
- 选择 Edge TTS、OpenAI Speech API，或授权的本地音频作为旁白。
- 可同时指定具体 voice、语言或口音、表达风格、语速与音高；不知道 voice ID 时，Skill 会从供应商真实目录生成少量中文说明选项，不要求用户猜名称。

### Codex

```bash
git clone https://github.com/adoresever/illustrated-videos.git \
  "${CODEX_HOME:-$HOME/.codex}/skills/illustrated-videos"
```

然后直接描述主题、时长与画幅。没有提供时长时，Agent 会先询问一次；若你让它直接开始，则采用对应内容类型的默认规划范围。例如：

```text
使用 $illustrated-videos，为“人参为什么长得像人”制作约 40 秒、9:16 的 paper-cut 趣味科普视频。默认不显示账号水印。
```

插画讲书也可以不先给时长；Agent 会询问，未回答时使用 60–120 秒规划范围：

```text
使用 $illustrated-videos，为《<书名>》制作 9:16 的插画讲书视频。先查证资料并选择一个低剧透的小故事；背景不含主角，人物和可动道具独立生成，书名、作者和字幕用代码叠加。未另行指定时按 60–120 秒规划，最终用真实旁白决定精确时长，默认不显示账号水印。
```

Codex 有可调用的原生生图能力时可直接使用；否则需配置图片 API / MCP。Skill 本身不是图片模型。

### Claude Code

```bash
git clone https://github.com/adoresever/illustrated-videos.git \
  "$HOME/.claude/skills/illustrated-videos"
```

用 `/illustrated-videos` 调用；若宿主版本不提供 slash-command 入口，也可在提示词中直接指定使用 `illustrated-videos` Skill。如果 Claude Code 环境没有图片生成工具，请连接兼容的图片 MCP、配置显式图片 API，或提供符合当前素材策略的现成图片。

更多跨平台说明见 [references/platforms.md](references/platforms.md)，供应商配置见 [references/providers.md](references/providers.md)。

## 先用听感选择旁白

安装 Edge TTS 后，可以动态读取本机供应商目录并生成 3–5 张可读选项卡：

```bash
node scripts/suggest-voices.mjs \
  --locale zh-CN \
  --mode book \
  --max 4 \
  --format markdown
```

每项会给出中文听感名称、适合场合、供应商标注的声线与 locale、真实 voice ID，以及基于 `ContentCategories` / `VoicePersonalities` 的推荐理由。语义规则保存在可扩展的 `assets/voice-presets.json`，只按 `explainer` / `book` 内容类型和供应商元数据匹配，不绑定某一本书或某个科普题材。

如果 Edge TTS 命令不存在，或其他供应商不能直接枚举，脚本只输出“需要真实 catalog”的结构化选择框架，不会虚构一个可用 voice。可以把已经配置好的供应商目录作为 JSON 传给 `--catalog <file>`。正式配音前可以让 Agent 用同一小段文字生成试听；用户没有选择时使用报告中的第一项真实推荐。任何 voice、语速、音高或旁白文字变化都要重新生成音频并对齐时间轴。

## 插画讲书的关键字段位置

下面只是字段位置示意，不是可直接编译的完整 brief。实际项目必须从脚手架生成，并填写完整的 evidence、story beats 与 assets：

```json
{
  "project": {
    "contentMode": "book",
    "book": {
      "title": "<书名>",
      "author": "<作者>",
      "angle": "<一个问题或观点>",
      "spoilerLevel": "low"
    }
  },
  "visualSystem": {
    "assetStrategy": "layered",
    "preset": "paper-cut",
    "seriesAnchor": "<所有背景和独立素材共享的系列视觉锚点>"
  },
  "story": {
    "characters": [
      {"id": "character-01", "continuityAnchor": "<原创且可复用的角色外观锚点>"}
    ],
    "beats": ["<每个 beat 连接人物、论据、可见动作与独立素材 ID>"]
  },
  "evidence": {
    "sources": [
      {"id": "source-01", "title": "<可追溯来源>", "url": "https://<直接来源页>"}
    ]
  },
  "assets": ["<无主体背景>", "<独立人物或核心对象>", "<按动作需要拆出的道具或前景>"]
}
```

这不是让图像模型画书封或逐段生成完整插画。先按 [书籍研究数据规范](references/book-research-schema.md) 查证书名、作者、人物、情节、语境与叙事角度，再按 [插画讲书流程](references/book-workflow.md) 形成小故事和角色连续性设定。随后按每个节拍拆出无人物背景、独立人物、可动道具和景深素材。书名、作者与字幕由代码叠加；具体场景数和图层数由内容决定，不把某一本书的答案写进 Skill。

## 加入自己的账号或 Logo

品牌叠加默认关闭。最简单的方式是在提示词中明确要求，例如：

```text
在成片右上角加入我提供的透明 PNG Logo，同时显示账号 @my_channel；Logo 宽度约为画面宽度的 9%，不遮挡标题和字幕。
```

手动配置时，把自有或已获授权的图片放到生成项目的 `public/assets/brand/logo.png`，再修改 `public/project.json`：

```json
{
  "brand": {
    "show": true,
    "handle": "my_channel",
    "logo": "assets/brand/logo.png",
    "placement": "top-right",
    "logoWidth": 96,
    "opacity": 0.94
  }
}
```

`handle` 与 `logo` 至少填写一个，也可以同时使用；支持 `top-left`、`top-right`、`bottom-left`、`bottom-right`。建议使用透明 PNG。Logo 作为代码图层叠加，不会让生图模型把它画进背景或人物素材；校验器会检查文件存在、能否解码、尺寸和透明度参数。请只使用自己拥有或已经获得授权的标识。

## 最短运行路径

```bash
# 1. 检查本机与所选供应商
node scripts/preflight.mjs --config assets/remotion-template/project-config.json

# 可选：把真实 voice ID 转成用户易懂的 3–5 个声音选项
node scripts/suggest-voices.mjs --locale zh-CN --mode explainer --max 4 --format markdown

# 2. 创建一个独立项目；插画讲书使用 --mode book
node scripts/create-project.mjs ./my-video
# 用户给出大概时长时可传 --duration；未传则写入模式 fallback
# node scripts/create-project.mjs ./my-book-video --mode book --duration 90

# 3. 填写 creative-brief.json；插画讲书还要先完成 book-research.json
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

Agent 实际执行时会按 [完整工作流](references/workflow.md)继续完成研究、旁白、分层生图、音频、分镜联系表和人工观看检查。两种内容类型都执行透明通道、分层关系、语义动作与相对位移检查；书籍内容另外检查研究包、故事节拍、角色连续性与最终音频时间轴。

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
- 插画讲书默认低剧透、使用原创评论；不默认复制原文、书封、影片剧照、演员形象或具体插画版的构图。直接引文必须核对版本、明确归属并确认可用性。
- 字幕时间可来自 faster-whisper 等识别器，但字幕文本来自已确认旁白；书名、人名和专有名词不能被识别结果静默覆盖。
- 自动评分只检查声明的结构和媒体属性，不能替代完整观看、事实核对和审美判断。
- 音乐、字体、图片、参考音频和公开视频素材仍需使用者自行确认许可。

## 致谢与许可证

分层纸片动画的方法研究参考了季白羽（[@vbjby3](https://x.com/vbjby3/status/2076530524110369070)）公开分享的 Codex + Remotion 制作文章；本项目抽取的是可迁移流程，不包含或再分发原文截图。详见 [参考方法记录](references/reference-method.md)。

代码与文档采用 [Apache License 2.0](LICENSE)。`examples/` 下的预览视频与联系表仅作为项目输出演示，保留权利，不纳入 Apache-2.0；详见 [示例媒体说明](https://github.com/adoresever/illustrated-videos/blob/main/examples/MEDIA-LICENSE.md)。

Remotion 是本项目声明的外部依赖，并未被复制进仓库。本项目自身开源不代表 Remotion 是 OSI 定义的开源软件；使用者需根据自己的组织规模与自动化方式核对 [Remotion License FAQ](https://www.remotion.dev/docs/license/faq)。图片、语音、字体、音乐和其他第三方服务也适用各自许可证与条款，商业发布前应单独确认。
