# Phase 7 Findings: Kilo CLI + Free Agent Landscape

> [Back to Phase 7 README](./README.md)
> Source: Claude Desktop deep research (Feb 2026)

## Kilo Code CLI — Confirmed Real

Launched **Feb 3, 2026**. Built on OpenCode (95K stars). 1.5M+ users, $8M seed funding.

| Detail | Value |
|--------|-------|
| Package | `@kilocode/cli` (63 versions published) |
| Install | `npm i -g @kilocode/cli` |
| Headless | `kilo run --auto "task"` |
| JSON output | `--json` / `--json-io` |
| Models | 500+ (5+ free via Kilo Gateway), BYOK, Ollama |
| Tools | read_file, write_to_file, execute_command, apply_diff, browser_action, MCP |
| License | MIT (CLI) / Apache 2.0 (extension) |
| Parallel | Creates isolated git worktrees for concurrent execution |

### Free Models via Kilo Gateway
MiniMax M2.1, Z.AI GLM 4.7, MoonshotAI Kimi K2.5, Giga Potato, Arcee AI Trinity Large Preview.

### Comparison

| Feature | Kilo | Claude Code | Codex CLI | Cursor CLI |
|---------|------|-------------|-----------|------------|
| Headless | `--auto` | `-p` | `--full-auto` | `-p` |
| Models | 500+ | Claude only | OpenAI only | Multi |
| Open source | Yes | No | Yes | No |
| Free models | Yes (5+) | No ($20/mo) | No ($20/mo) | Limited |
| CI/CD maturity | New (Feb 2026) | Excellent | Excellent | Beta |

## Alternative Free CLI Agents

### Aider (39K stars, Apache 2.0)
Most battle-tested. `pip install aider-chat && aider --yes -m "task"`. 75+ LLM providers. No shell execution (file editing only). Python scripting API.

### OpenHands (65K stars, MIT)
Most powerful sandboxed. `openhands --headless -t "task"`. Docker/K8s sandboxes. Parallel agents at scale. $10 free cloud credit.

### Cline CLI
`npm i -g cline && cline -y "task"`. Auto-detects headless mode. Free Kimi K2.5 model. Browser automation via headless Chromium.

### Goose (10K stars, Apache 2.0)
`goose run -t "task"`. Unique YAML recipes system for reusable workflows. Built-in scheduler (cron-like).

### OpenCode (95K stars)
Foundation that Kilo CLI is built on. `opencode run "task"`. Client/server architecture. Can auth via existing GitHub Copilot or ChatGPT Plus subscriptions.

### Qwen Code
`qwen -p "task"`. **1,000 RPD free** via Qwen OAuth — most generous free tier. Forked from Gemini CLI architecture. 256K context window.

## Decisions

1. **Primary addition:** Kilo Code CLI (most features, free models, 500+ model support)
2. **Also add:** Qwen Code (1,000 free RPD — unmatched)
3. **Consider later:** Aider (battle-tested, good for focused file editing)
4. **Safety:** All cloud-routed agents blocked from golems dirs

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Install Kilo CLI | — | Pending |
| Test headless mode | — | Pending |
| Add to cli-agents skill | — | Pending |
| Safety guardrails | — | Pending |
| Also add Qwen Code | — | Pending |
