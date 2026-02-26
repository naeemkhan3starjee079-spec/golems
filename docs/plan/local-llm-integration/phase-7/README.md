# Phase 7: Kilo CLI Agent + Safety

> [Back to main plan](../README.md)

## Goal

Add Kilo Code CLI as a new agent in the cli-agents skill, with clear safety guardrails: never use with personal/golems data.

## Deep Research Findings (Feb 2026)

Kilo Code CLI is **confirmed real** — launched Feb 3, 2026:
- **Package:** `npm i -g @kilocode/cli` (or `npx @kilocode/cli`)
- **Headless:** `kilo run --auto "task"` (fully autonomous)
- **JSON output:** `--json` / `--json-io` for programmatic control
- **Models:** 500+ models (5+ free through Kilo Gateway), BYOK, local Ollama
- **Tools:** Full bash/file tools — read_file, write_to_file, execute_command, browser_action
- **License:** MIT (CLI) / Apache 2.0 (extension)
- **Caveat:** Only 9 days old at time of research — early-stage

### Alternatives Discovered

| Tool | Stars | Headless Command | Free Models | License |
|------|-------|-----------------|-------------|---------|
| **Aider** | 39K | `aider --yes -m "task"` | Any (BYOK) | Apache 2.0 |
| **OpenHands** | 65K | `openhands --headless -t "task"` | Any + $10 cloud credit | MIT |
| **Cline CLI** | — | `cline -y "task"` | Kimi K2.5 free | — |
| **Goose** | 10K | `goose run -t "task"` | Any (BYOK) | Apache 2.0 |
| **OpenCode** | 95K | `opencode run "task"` | Via GitHub Copilot/ChatGPT Plus | — |
| **Qwen Code** | — | `qwen -p "task"` | 1,000 RPD free (Qwen OAuth) | — |

## Steps

1. Install Kilo CLI: `npm install -g @kilocode/cli`
2. Test basic usage:
   - `kilo run --auto "summarize this code"` — non-interactive mode
   - `kilo run --auto --json "prompt"` — structured output
   - Model selection: `--provider` and `--model` for free models
3. Add `kilo` to cli-agents skill scripts:
   - Research mode: capture text output
   - Work mode: let Kilo modify files (has bash + file tools)
   - Handle TTY issues (same as cursor gotcha)
4. Update cli-agents table:
   ```
   | kilo | Yes | Yes (has bash+file tools) | Free (Kilo Gateway models) |
   ```
5. **SAFETY GUARDRAILS:**
   - Add `KILO_SAFE_DIRS` check in run.sh:
     - ALLOW: `~/Gits/songscript`, `~/Gits/domica`, `~/Gits/union`, `~/Gits/rudy`
     - BLOCK: `~/Gits/golems`, `~/.claude`, `~/.golems-zikaron`, any path with "golem"
   - Print warning banner when kilo is selected
   - Add to `.claude/rules/kilo-safety.md`
6. Also consider adding: **Qwen Code** (1,000 free RPD!) and **Aider** (battle-tested)
7. Update memory/cli-agents.md with all new entries
8. Test on a non-sensitive project

## Privacy Model

| Agent | Where code goes | Safe for golems? |
|-------|----------------|-----------------|
| gemini | Google API | No (research-only) |
| cursor | Cursor API | No (widely used) |
| codex | OpenAI API | No |
| kiro | AWS (free) | No |
| **kilo** | **Kilo → various APIs** | **No — BLOCK for golems** |
| **qwen** | **Alibaba Cloud** | **No** |
| **aider** | **Depends on model** | **BYOK = your choice** |
| glm (local) | **Nowhere** | **Yes — golems safe** |

## Depends On

- None (fully independent)

## Status

- [x] Research Kilo CLI (deep research — confirmed real)
- [x] Install Kilo CLI (`npm i -g @kilocode/cli` → v1.0.16)
- [x] Test non-interactive mode (`kilo run -m model "prompt"`)
- [x] Test model selection (`kilo models` → 30+ free models available)
- [x] Add to cli-agents skill (run.sh + SKILL.md)
- [x] Implement KILO_SAFE_DIRS check (blocks golems/personal dirs)
- [x] Add warning banner (prints WARNING when kilo selected)
- [x] Write kilo-safety.md rule (`.claude/rules/kilo-safety.md`)
- [ ] Kilo auth login — **needs user** (opens browser for OAuth)
- [ ] Consider Qwen Code + Aider additions (deferred — Kilo covers the use case)
- [x] Update memory/cli-agents.md
- [ ] Test on non-sensitive project (after auth setup)
