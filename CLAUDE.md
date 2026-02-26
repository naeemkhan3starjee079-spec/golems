# Golems Monorepo

> Autonomous AI agent ecosystem — Bun workspace with 16 packages + 2 external repos. Each golem is a self-contained CC plugin.

## Packages

| Package | Purpose |
|---------|---------|
| **@golems/shared** | Supabase, LLM, email, state, notifications |
| **@golems/claude** | Telegram bot, orchestrator, external face |
| **@golems/jobs** | Job scraping, matching, ATS |
| **@golems/recruiter** | Outreach, interview practice, contacts |
| **@golems/teller** | Finance, subscriptions, tax |
| **@golems/content** | Visual content factory (Remotion, ComfyUI, dataviz) + text publishing |
| **@golems/coach** | Calendar, schedule, life planning |
| **@golems/services** | Night Shift, Briefing, Cloud Worker, Doctor, Wizard |
| **@golems/orchestrator** | n8n orchestration, render microservice |
| **dashboard** | Next.js web dashboard (brain view, ops, backlog, content, tokens) |
| **golems-tui** | React Ink terminal dashboard |
| **tax-helper** | Schedule C transaction categorization (Sophtron MCP) |
| **ralph** | Autonomous coding loop (PRD execution) |
| **brainlayer** | Memory layer — external repo (Python + sqlite-vec, 268K+ chunks) |
| **voicelayer** | Voice I/O layer — external repo (MCP server, edge-tts, whisper.cpp) |

**Always read the package-specific CLAUDE.md when working in a package.**

## Key Relationships

- **ClaudeGolem** registers Composers from Jobs + Recruiter for Telegram commands
- **CoachGolem** reads getStatus() from Jobs, Recruiter, Teller (read-only)
- **Services** (briefing) imports from Coach for daily plan generation
- **Cloud Worker** runs Jobs + Email golems on Railway schedules
- **All packages** depend on Shared for Supabase, LLM, state, notifications

## Development

```bash
bun install              # Install all workspace deps
bun test                 # Run all tests
```

## Worktree-Isolated Agents

Some agents run with `isolation: worktree` for parallel work without file conflicts:

| Agent | Purpose |
|-------|---------|
| `migration-worker` | Database migrations and schema changes |
| `qa-voice` | Voice-powered QA testing with Playwright |
| `discovery-voice` | Client discovery call assistant |

## Communication Style

- **Formality:** 2/10 — Very casual
- **Length:** Brief, direct
- **Tone:** Friendly, sometimes playful

See `packages/claude/SOUL.md` for bot persona.
