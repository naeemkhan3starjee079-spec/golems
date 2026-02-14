# Golems Monorepo

> Autonomous AI agent ecosystem — Bun workspace with 10 packages. Each golem is a self-contained CC plugin.

---

## Packages

| Package | CLAUDE.md | Purpose |
|---------|-----------|---------|
| **@golems/shared** | [`packages/shared/`](packages/shared/CLAUDE.md) | Supabase, LLM, email, state, notifications |
| **@golems/claude** | [`packages/claude/`](packages/claude/CLAUDE.md) | Telegram bot, orchestrator, external face |
| **@golems/jobs** | [`packages/jobs/`](packages/jobs/CLAUDE.md) | Job scraping, matching, ATS |
| **@golems/recruiter** | [`packages/recruiter/`](packages/recruiter/CLAUDE.md) | Outreach, interview practice, contacts |
| **@golems/teller** | [`packages/teller/`](packages/teller/CLAUDE.md) | Finance, subscriptions, tax |
| **@golems/content** | [`packages/content/`](packages/content/CLAUDE.md) | LinkedIn, Soltome, ghostwriting |
| **@golems/coach** | [`packages/coach/`](packages/coach/CLAUDE.md) | Calendar, schedule, life planning |
| **@golems/services** | [`packages/services/`](packages/services/CLAUDE.md) | Night Shift, Briefing, Cloud Worker, Doctor, Wizard |
| **@golems/orchestrator** | [`packages/orchestrator/`](packages/orchestrator/CLAUDE.md) | n8n orchestration, render microservice |
| **ralph** | [`packages/ralph/`](packages/ralph/CLAUDE.md) | Autonomous coding loop (PRD execution) |
| **zikaron** | [`packages/zikaron/`](packages/zikaron/CLAUDE.md) | Memory layer (Python + sqlite-vec) |

**Always read the package-specific CLAUDE.md when working in that package.**

---

## Architecture

```
golems/                              # Bun workspace monorepo
├── packages/shared/                 # @golems/shared — extracted utilities
├── packages/claude/                 # ClaudeGolem — orchestrator + Telegram
├── packages/recruiter/              # RecruiterGolem — outreach, practice
├── packages/teller/                 # TellerGolem — finances, categorization
├── packages/jobs/                   # JobGolem — scraping, ATS, matching
├── packages/content/                # ContentGolem — LinkedIn, Soltome, visual content
├── packages/orchestrator/           # n8n orchestration + Bun render microservice
├── packages/coach/                  # CoachGolem — schedule, calendar
├── packages/services/               # Night Shift, Briefing, Cloud Worker
├── packages/autonomous/             # Legacy stranglers (1-line re-exports)
├── launchd/                         # macOS service plists
├── Dockerfile                       # Root workspace Dockerfile (Railway)
└── railway.json                     # Railway deploy config
```

### Key Relationships

- **ClaudeGolem** registers Composers from Jobs + Recruiter for Telegram commands
- **CoachGolem** reads getStatus() from Jobs, Recruiter, Teller (read-only)
- **Services** (briefing) imports from Coach for daily plan generation
- **Cloud Worker** runs Jobs + Email golems on Railway schedules
- **All packages** depend on Shared for Supabase, LLM, state, notifications

---

## Development

```bash
# Install all workspace deps
bun install

# Run all tests
bun test

# Work on a specific package
cd packages/claude && cat CLAUDE.md

# Run telegram bot locally
bun packages/claude/src/telegram-bot.ts

# CLI
golems status          # Service overview
golems doctor          # Health checks
golems wizard          # Guided setup
```

---

## Deployment

| Environment | What Runs | Where |
|-------------|-----------|-------|
| **Local (Mac)** | Telegram bot, Night Shift, Briefing | launchd plists |
| **Railway** | Email poller, Job scraper, Soltome learner | Cloud Worker |
| **Supabase** | Database, auth, storage | Cloud |

---

## MCP Servers

| Server | Command | Purpose |
|--------|---------|---------|
| **zikaron** | `zikaron-mcp` | Memory layer — search 226K+ indexed conversation chunks across all projects |
| **golems-email** | `bun run packages/shared/src/email/mcp-server.ts` | Email triage — recent, search, subscriptions, urgent, draft replies |
| **golems-jobs** | `bun run packages/jobs/src/mcp-server.ts` | Job discovery — recent matches, search, stats |
| **supabase** | `@supabase/mcp-server-supabase` | Database access — tables, SQL, migrations, types |
| **exa** | `exa-mcp-server` | Web search — code context, company research |
| **golems-glm** | `bun run packages/shared/src/glm/mcp-server.ts` | Local GLM-4.7-Flash — summarize text, score/classify with JSON output |
| **sophtron** | `@sophtron/sophtron-mcp-server` | Bank account access — transactions, identity |

### Zikaron MCP

Zikaron provides persistent memory across Claude Code sessions. Use it to:
- Search past solutions: `mcp__zikaron__zikaron_search(query="how did I fix X")`
- Get context around a result: `mcp__zikaron__zikaron_context(chunk_id="...")`
- Filter by project: `project="-Users-etanheyman-Gits-golems"`
- Check stats: `mcp__zikaron__zikaron_stats()`

---

## Shared Resources

| Path | Purpose |
|------|---------|
| `.claude/agents/` | Agent profiles for `/agents` command |
| `.claude/rules/` | Auto-loaded rules (survives compaction) |
| `rules-library/` | Exportable context/rules library |
| `docs/architecture/` | Architecture decisions (indexed by Zikaron) |
| `skills/golem-powers/` | Skills (symlinked to ralph) |
| `docs/plan/` | Active plans and phase tracking |
| `launchd/` | macOS launchd service plists |

---

## Communication Style

Based on Zikaron analysis of owner's patterns:
- **Formality:** 2/10 - Very casual
- **Length:** Brief, direct
- **Tone:** Friendly, sometimes playful

See `packages/claude/SOUL.md` for bot persona.
