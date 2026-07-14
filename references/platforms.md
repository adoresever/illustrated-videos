# Platform portability

## Codex

Install the folder under `$CODEX_HOME/skills/` for user scope; `CODEX_HOME` defaults to `~/.codex`. Prefer native image generation when callable. Current Codex documentation identifies the built-in image model as `gpt-image-2`. A Skill cannot install or invent a missing image tool.

## Claude Code

Install the same core folder under `~/.claude/skills/` or `.claude/skills/`. Invoke it as `/illustrated-videos`. Use a configured image MCP or the explicit OpenAI API adapter when Claude Code has no suitable native image tool. Keep API keys in environment variables.

## Tencent WorkBuddy

Use WorkBuddy's Skills page to add and import the local Skill package. If the current build does not accept the ZIP, import the unpacked folder or use `assets/workbuddy-create-skill-prompt.md` to create a platform wrapper that points at the portable scripts and Remotion template. Do not confuse WorkBuddy installation with CodeBuddy IDE/CLI's `.codebuddy/skills/` paths. Configure an image MCP, an image API, or existing separated image assets before running the workflow.

## Other agents

Copy the procedural content and scripts only when the host can read local resources and execute commands. Keep the following capabilities separate:

- workflow instructions: this Skill
- image generation: native tool, API, or MCP
- speech generation: provider adapter
- rendering: Remotion and Chrome
- encoding and QA: FFmpeg and ffprobe
