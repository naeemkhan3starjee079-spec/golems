# Phase 5: CC Plugin Packaging — Findings

## Research Summary

### Official CC Plugin Specification (2026)

Sources consulted:
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference) — official technical spec
- [Plugin Structure](https://claude-plugins.dev/skills/@anthropics/claude-plugins-official/plugin-structure) — Anthropic marketplace plugin
- [GitHub: anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/plugins/README.md) — source repo
- [cc-marketplace schema](https://github.com/ananddtyagi/claude-code-marketplace/blob/main/PLUGIN_SCHEMA.md) — community spec
- Exa search results for monorepo best practices

### Key Findings

1. **`commands/` is legacy** — official docs say "Skill Markdown files (legacy; use skills/ for new skills)". New plugins should use `skills/<name>/SKILL.md` with YAML frontmatter.

2. **`author` must be an object** — `{"name": "...", "url": "..."}`, not a plain string.

3. **Only `name` is required** in plugin.json — version and description are metadata (optional but recommended).

4. **Agents go in `agents/`** — markdown files with YAML frontmatter (`name`, `description`), auto-discoverable, appear in `/agents` UI.

5. **Hooks in `hooks/hooks.json`** — can also be inline in plugin.json. Supports: PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, UserPromptSubmit, Notification, Stop, SubagentStart, SubagentStop, SessionStart, SessionEnd, TeammateIdle, TaskCompleted, PreCompact.

6. **`${CLAUDE_PLUGIN_ROOT}`** — absolute path to plugin root. Use in hooks, MCP, scripts. Critical for caching.

7. **Plugin caching** — installed plugins get copied to `~/.claude/plugins/cache/`. External paths (`../`) won't work. Symlinks ARE followed during copy.

8. **MCP servers in plugins** — `.mcp.json` at plugin root, uses `${CLAUDE_PLUGIN_ROOT}` for paths, auto-starts when plugin is enabled.

9. **Installation scopes** — user (`~/.claude/settings.json`), project (`.claude/settings.json`), local (`.claude/settings.local.json`), managed.

10. **`--plugin-dir`** — for development, loads plugin without caching. Can load multiple: `claude --plugin-dir ./a --plugin-dir ./b`.

## Decisions Made

### Use `skills/` not `commands/`
Per official docs recommendation. Skills support YAML frontmatter, auto-invocation, and SKILL.md structure.

### CLI Aliases Already Existed
The `.zshrc` already had `recruiterClaude`, `tellerClaude`, `jobsClaude`, `contentClaude`, `coachClaude`, `servicesClaude`, and combined `golemsClaude`. No changes needed.

### `.mcp.json` Per Package
Only packages with MCP servers get `.mcp.json`: jobs (golems-jobs) and shared (golems-email). Uses `${CLAUDE_PLUGIN_ROOT}` for portability.

### Agents for Select Packages
Only recruiter (interview-coach), content (content-critic), and services (health-checker) got agents. Other packages don't need specialized subagents yet.

### Root `.mcp.json` Already Updated
Phase 4 already updated the root `.mcp.json` to point to `packages/shared/src/email/mcp-server.ts` and `packages/jobs/src/mcp-server.ts`.

## Files Created

### Per package (7 packages):
- `.claude-plugin/plugin.json` — manifest with proper author object, keywords
- `CLAUDE.md` — persona, architecture, domain rules
- `skills/*/SKILL.md` — YAML frontmatter skills (16 total)

### Select packages:
- `agents/*.md` — 3 agents (recruiter, content, services)
- `.mcp.json` — 2 MCP configs (jobs, shared)

### Skills Distribution

| Package | Skills | Agents |
|---------|--------|--------|
| claude | status, restart | — |
| recruiter | practice, outreach, followup | interview-coach |
| teller | report, subscriptions | — |
| jobs | search, match | — |
| content | draft, publish | content-critic |
| coach | plan (stub), nudge (stub) | — |
| services | deploy, logs, nightshift | health-checker |

## Test Results

- **1164 pass, 5 skip, 2 fail** (same as master — pre-existing flaky practice-db streak test)
- Phase 5 adds zero regressions
- 74 test files, 4023 expect() calls

## Pre-existing Flaky Test

`Practice Database > Statistics > should calculate streak correctly` in `packages/autonomous/src/__tests__/practice-db.test.ts` — fails in full suite due to test ordering (shared temp DB), passes in isolation. Not caused by any phase.
