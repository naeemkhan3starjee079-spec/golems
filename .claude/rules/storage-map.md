# Storage Map — Where to Find Things

> Quick reference for where data lives across the golems ecosystem.

## Memory & Knowledge

| What | Where |
|------|-------|
| Past decisions, learnings | `brain_search(query="topic")` |
| File history / changes | `brain_search(file_path="filename.ts")` |
| Current work context | `brain_recall()` (mode=context, default) |
| Stored memories by tag | `brain_search(query="topic", tag="decision")` |
| Session transcript | BrainLayer auto-indexed (search with `brain_search`) |
| BrainLayer DB | `~/.local/share/brainlayer/brainlayer.db` |
| Deduplicated prompts | `~/.local/share/brainlayer/prompts/` |

## Plans & Documentation

| What | Where |
|------|-------|
| Plan progress | `docs.local/plan/<name>/README.md` |
| Architecture decisions | `docs/architecture/*.md` |
| Learnings (project) | `docs.local/learnings/` |
| Learnings (global) | `~/.claude/learnings/` |
| Research files | `docs.local/research/` |
| Agent prompts | `docs.local/prompts/` |

## Configuration & Rules

| What | Where |
|------|-------|
| Rules (always loaded) | `.claude/rules/*.md` |
| Skills (on demand) | `~/.claude/commands/golem-powers/` |
| Auto-memory | `~/.claude/projects/<project>/memory/MEMORY.md` |
| MCP config | `.mcp.json` (live) / `.mcp.json.example` (template) |
| Agent profiles | `.claude/agents/*.md` |

## Runtime State

| What | Where |
|------|-------|
| Golems runtime state | `~/.golems-zikaron/` (state.json, event-log.json) |
| Scratchpad / temp notes | `claude.scratchpad.md` |
| Voice session notes | `/tmp/voicelayer-thinking.md` |
| Voice profiles | `~/.voicelayer/voices.json` |
| Voice toggle | `/tmp/.claude_voice_disabled` |

## Services & Infrastructure

| What | Where |
|------|-------|
| launchd plists | `launchd/` + `~/Library/LaunchAgents/com.golems*` |
| Railway config | `railway.json` + `Dockerfile` |
| Vercel (dashboard) | `packages/dashboard/` |
| Supabase project | `mkijzwkuubtfjqcemorx` |
