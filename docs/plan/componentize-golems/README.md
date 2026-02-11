# Componentize Golems — CC Plugin Architecture

> Each golem becomes a self-contained CC plugin that can be worked on independently, shared with friends, and monetized.

## Progress

| # | Phase | Folder | Status | Branch | Notes |
|---|-------|--------|--------|--------|-------|
| 1 | Extract shared lib | [phase-1-shared-lib](phase-1-shared-lib/) | pending | | Supabase, events, notify, LLM, state, costs |
| 2 | Decouple golems | [phase-2-decouple-golems](phase-2-decouple-golems/) | pending | | Break cross-golem imports, add status interfaces |
| 3 | Thin Telegram router | [phase-3-thin-router](phase-3-thin-router/) | pending | | Split 1967-line bot into Composers |
| 4 | Bun workspaces | [phase-4-bun-workspaces](phase-4-bun-workspaces/) | pending | | Monorepo setup, package.json per golem |
| 5 | CC plugin packaging | [phase-5-golem-plugins](phase-5-golem-plugins/) | pending | | plugin.json, CLAUDE.md, commands, skills, MCP |
| 6 | CoachGolem | [phase-6-coach-golem](phase-6-coach-golem/) | pending | | Schedule engine, Google Calendar, nudger |
| 7 | Services migration | [phase-7-services-migration](phase-7-services-migration/) | pending | | Night Shift, Bedtime Guardian, Briefing, Cloud Worker |
| 8 | Launchd + infra | [phase-8-launchd-infra](phase-8-launchd-infra/) | pending | | Plists, Dockerfile, Railway, .env, pre-commit |
| 9 | Distribution + docs | [phase-9-distribution](phase-9-distribution/) | pending | | npm publish, marketplace, docsite, README |

## Priority

1. **Ship golems to production** — componentize, make clean, monetizable
2. **Job pipeline** — use shipped golems to find work
3. **Sleep/health** — CoachGolem coordinates daily schedule

## Architecture

```
golems/                              # Bun workspace monorepo
├── packages/shared/                 # @golems/shared — extracted utilities
├── packages/claude/                 # ClaudeGolem — orchestrator + thin Telegram router
├── packages/recruiter/              # RecruiterGolem — outreach, practice, matching
├── packages/teller/                 # TellerGolem — finances, categorization, reports
├── packages/jobs/                   # JobGolem — scraping, ATS, matching
├── packages/content/                # ContentGolem — LinkedIn, Soltome, ghostwriting
├── packages/coach/                  # CoachGolem — schedule, calendar, life planning
└── packages/services/               # Night Shift, Bedtime Guardian, Briefing, Cloud Worker
```

EmailGolem **dissolves into shared** — email is infrastructure (polling, scoring, routing), not domain expertise.

### Plugin Invocation Model

Users interact with golems in 3 ways:
1. **Direct CLI**: `claude --plugin-dir ./packages/recruiter` — opens Claude with recruiter context
2. **Through Claude**: Ask Claude anything, it auto-routes to the right golem plugin based on context
3. **CoachGolem for scheduling**: `/coach:plan` reads other golems' state + Google Calendar, helps plan your week. Coach doesn't invoke golems — YOU do, through Claude.
4. **CLI aliases**: Each golem gets a shell function (like `recruiterClaude`, `tellerClaude`) with `-s -c -u` options, same pattern as `repoClaude`/`domicClaude`. Power users launch golems directly; CC cowork users open the golem folder.

Each golem is a **CC plugin**:
```
golem-name/
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # golem personality + memory
├── commands/                    # user-invoked (/golem:command)
├── skills/                      # auto-invoked by context
├── src/                         # TypeScript source
│   ├── composer.ts              # grammy Composer for Telegram
│   └── status.ts               # getStatus() for CoachGolem reads
├── .mcp.json                    # MCP tools
└── package.json                 # @golems/golem-name
```

## Execution Rules

### Migration Strategy: Incremental + Strangler Wrappers

Bot stays live during entire migration. Each phase:
1. Branch from master: `feature/componentize-phase-N`
2. Implement phase, run tests
3. Keep compatibility wrappers in `packages/autonomous` until all golems moved
4. PR → review → merge → next phase

### MANDATORY Rules

1. **ALL hidden configs must migrate**: `.env`, `.claude-project-id`, `.deepsource.toml`, `.gitignore`
2. **ALL 9 launchd plists must update**: telegram, email-golem, job-golem, nightshift, briefing, ollama, session-archiver, storage-cleanup, bedtime-guardian (check `~/Library/LaunchAgents/com.golems*`)
3. **Runtime state dir stays**: `~/.golems-zikaron/` paths must work — use `GOLEMS_STATE_DIR` env var, never hard-code
4. **No hard-coded absolute paths**: Replace `~/Gits/golems/packages/autonomous` with config-driven paths
5. **Each golem's MCP server exposes ONLY its own tools** — no cross-golem MCP imports
6. **CoachGolem reads state, doesn't invoke golems** — it's a life planner, not an orchestrator
7. **Bot must stay running** at every phase — no multi-day downtime
8. **57 tests must pass** after each phase (currently 57 test files, not 33)
9. **2 recruiter tests in non-standard location** (`src/recruiter-golem/__tests__/`) — include in migration
10. **Duplicated routing maps** (telegram-bot.ts + telegram-direct.ts) must be unified into shared constants
11. **CC plugin cache limitation**: plugins copied to cache dir — external file paths won't work. Bundle @golems/shared. Use GOLEMS_STATE_DIR for runtime data.
12. **load-env.ts** fallback hard-codes `Gits/golems/packages/autonomous` — must be made workspace-aware
13. **CLI aliases per golem**: Each golem gets a shell function (`recruiterClaude`, `tellerClaude`, etc.) with `-s -c -u` flags, matching the existing `repoClaude`/`domicClaude` pattern in `.zshrc`

### Research-First Pattern

Each phase step is tagged with its executor:
- **[Cursor work]** — bulk file moves, import rewrites, scaffold generation (work mode modifies files directly)
- **[Opus]** — multi-file orchestration, API design, wiring, CLAUDE.md writing (needs Edit tool)
- **[Gemini research]** — web searches, API docs, best practices lookup (free but not 100% reliable + hard rate limits — have a fallback plan)
- **[context7]** — library docs lookup (grammy, Bun workspaces, etc.)
- **[bun test]** / **[manual]** — verification gates
- **[/skill]** — specific skill invocations (/railway deploy, /commit, etc.)

**Rule:** Each step in each phase has a `[helper]` tag. No unassigned work.

### Quality Gates (per phase)

| Gate | Check |
|------|-------|
| Tests pass | `bun test` green — all 57 test files |
| Typed right | No `any`, proper interfaces for getStatus() etc. |
| No cross-golem imports | Only through @golems/shared |
| No hard-coded paths | GOLEMS_STATE_DIR, workspace-relative only |
| DRY | No duplicated routing maps, Supabase factories, etc. |
| Documented | CLAUDE.md updated if golem scope changed |
| Infra updated | Launchd plists updated if paths changed |
| Build passes | No compile errors, `bun build` clean |
| PR reviewed | CodeRabbit + Cursor Bugbot + DeepSource — all real bugs fixed |
| Findings updated | Phase findings.md captures decisions + learnings |

### Skill Integration

| Skill | When to use |
|-------|-------------|
| `/critique-waves` | Verify phase output with parallel verification agents |
| `/commit` | CodeRabbit review + atomic commit per phase |
| `/create-pr` | Create PR with standard format |
| `/pr-comments` | Check review comments before merge |
| `/cli-agents` | Cursor (work mode) for bulk file moves, Gemini for research |

### Branch Naming

Each phase gets its own branch:
```
feature/componentize-phase-1-shared-lib
feature/componentize-phase-2-decouple
...
```

## Risk Matrix (from Cursor D audit)

| Area | Risk | Mitigation |
|------|------|------------|
| Telegram bot splitting | **HIGH** | Phase 3 dedicated; Composer pattern proven |
| Cross-golem dependencies | **HIGH** | Phase 2 breaks all coupling before moving code |
| CC plugin cache dir | **HIGH** | Bundle @golems/shared; use GOLEMS_STATE_DIR |
| MCP server paths | **MEDIUM-HIGH** | Each golem gets own .mcp.json pointing to own bin |
| Cloud worker + Railway | **MEDIUM** | Phase 7 updates Dockerfile for workspace |
| Launchd plists (9 files) | **MEDIUM** | Phase 8 dedicated to infrastructure |
| Tests + pre-commit | **MEDIUM** | Workspace-aware test runner |

## Gotchas (from research)

1. `telegram-bot.ts` and `lib/telegram-direct.ts` have **duplicated routing maps** (already divergent)
2. `GOLEM_REGISTRY` cwds and `SOUL.md` paths are absolute — break in workspace/cache
3. `lib/load-env.ts` fallback hard-codes `Gits/golems/packages/autonomous`
4. `telegram-bot.ts` runs a **job auto-scrape loop** — splitting job golem risks double-running
5. `bun test` only runs `src/__tests__/` — recruiter tests in `src/recruiter-golem/__tests__/` currently skipped
6. Pre-commit hook pinned to `packages/autonomous/scripts/*`
7. CC plugins copied to cache dir — external file paths won't work
8. `cloud-worker.ts` imports relative entry points — needs workspace-aware paths

## Cross-Phase Knowledge

- Shared lib extractions → phase-1/findings.md
- Cross-golem coupling map → phase-2/findings.md
- telegram-bot.ts split plan → phase-3/findings.md
- File move manifest → phase-4/findings.md (from Cursor C research)
- Risk assessment + test map → phase-8/findings.md (from Cursor D research)

## Research Completed (Rounds 1-3)

| Round | Agent | Output | Key Finding |
|-------|-------|--------|-------------|
| 1 | Cursor A | `/tmp/cursor-a-output.md` | 6 shared lib candidates, 6 dead code items |
| 1 | Cursor B | `/tmp/cursor-b-output.md` | Component boundaries, 500 lines domain logic in bot |
| 1 | context7 | scratchpad | grammy Composer + Bun workspaces confirmed |
| 1 | WebSearch | scratchpad | CC Plugin format confirmed from official docs |
| 3 | Cursor C | `/tmp/cursor-c-round3-output.md` | File move manifest — 282 lines, all files mapped |
| 3 | Cursor D | `/tmp/cursor-d-round3-output.md` | 57 tests mapped, risk matrix, incremental strategy |
