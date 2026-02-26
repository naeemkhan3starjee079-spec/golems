# Golems Services

> Infrastructure services — Night Shift, Bedtime Guardian, Morning Briefing, Cloud Worker, and ecosystem tooling.

## Role

Services package contains **cross-cutting infrastructure** that doesn't belong to any single golem: the cloud worker orchestrator, night shift autonomous coding, morning briefings, health checks, and ecosystem management tools (wizard, doctor).

## Architecture

```text
packages/services/
├── src/
│   ├── cloud-worker.ts          # Railway entry point — runs all cloud golems on schedules
│   ├── night-shift.ts           # 4am autonomous coding improvements
│   ├── briefing.ts              # 8am morning summary
│   ├── bedtime-guardian.ts      # Evening wind-down reminders
│   ├── healthcheck.ts           # 9am service health verification
│   ├── session-archiver.ts      # Archive Claude session transcripts
│   ├── wizard.ts                # `golems wizard` — guided setup
│   ├── doctor.ts                # `golems doctor` — health checks
│   ├── helpers-status.ts        # CLI helper backend status
│   ├── skills-list.ts           # Skills discovery
│   ├── validation-service.ts    # Input validation utilities
│   ├── cursor-helper.ts         # Cursor CLI agent wrapper
│   ├── gemini-helper.ts         # Gemini CLI agent wrapper
│   ├── kiro-helper.ts           # Kiro CLI agent wrapper
│   ├── ollama-chat-bot.ts       # Ollama local chat wrapper
│   ├── run-compaction.ts        # Context compaction utilities
│   ├── thread-compactor.ts      # Thread compaction logic
│   ├── thread-store.ts          # Thread storage
│   └── whatsapp-index-cli.ts    # WhatsApp message indexing
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/services
```

## Dependencies

- `@golems/shared` — Supabase, event log, state store, LLM, telegram-direct
- `@golems/jobs` — Job scraping (used by cloud worker)
- `@golems/teller` — (future) Financial reports in briefing
- `googleapis` — Google APIs (briefing, calendar)

## Cloud Worker (Railway)

Single Railway service running all cloud golems on schedules:

| Schedule | Service | Description |
|----------|---------|-------------|
| Hourly 6am-7pm (skip 12pm) + 10pm | Email poller | Fetch + score emails |
| 6am, 9am, 1pm (Sun-Thu) | Job scraper | Scrape + match jobs |
| 8am daily | Briefing | Morning summary to Telegram |
| 2am daily | Soltome learner | Scrape posts + learn patterns |

**Health endpoint:** `GET /` on `$PORT`
**Usage endpoint:** `GET /usage` — API call stats, token counts, cost

### Railway Env Vars

```bash
LLM_BACKEND=gemini
STATE_BACKEND=supabase
TELEGRAM_MODE=direct
GOOGLE_GENERATIVE_AI_API_KEY=<your-key>
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

## Night Shift

Runs at 4am via launchd. Per-repo Claude sessions:
- Scans for TODOs, issues, improvements
- Creates worktree, implements, runs tests
- CodeRabbit review → PR
- Tracks PRs in `state.nightShiftPRs[]`

## Ecosystem Tools

| Tool | Command | Description |
|------|---------|-------------|
| Wizard | `golems wizard` | Guided setup for new users |
| Doctor | `golems doctor` | Health checks for all wiring |
| Status | `golems status` | All-golem status overview |

## Debugging with BrainLayer MCP

When debugging issues or understanding why something is wired a certain way:

1. **Architecture decisions:** `docs/architecture/` — key decisions and migration records
2. **Phase findings:** `docs/plan/componentize-golems/phase-*/findings.md` — detailed per-phase notes
3. **BrainLayer search:** Use the BrainLayer MCP to search past session transcripts:
   ```
   mcp__brainlayer__brain_search(query="topic", project="-Users-etanheyman-Gits-golems")
   ```
4. **BrainLayer context:** Get surrounding conversation for a search result (via brain_search with chunk_id):
   ```
   mcp__brainlayer__brain_search(query="...", chunk_id="<id from search>")
   ```
