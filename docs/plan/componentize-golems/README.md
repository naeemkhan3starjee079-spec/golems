# Componentize Golems — CC Plugin Architecture

> Each golem becomes a self-contained CC plugin that can be worked on independently, shared with friends, and monetized.

## Progress — Global Sequence

> After compaction: read this checklist, find the first unchecked item, that's where you are.
> Branch: check git branch name. Status: check the checkbox below.

### Phase 1: Extract Shared Library — `feature/componentize-phase-1-shared-lib`

- [x] **1.1** [Opus] Create `packages/shared/` scaffold (package.json, src/)
- [x] **1.2** [Opus] Extract Supabase client factory (12 files) → `src/lib/supabase-factory.ts`
- [x] **1.3** [Opus] Move event-log.ts → `src/lib/event-log.ts` (10 imports updated)
- [x] **1.4** Already in `src/lib/telegram-direct.ts` — no move needed
- [x] **1.5** [Opus] Move llm.ts → `src/lib/llm.ts` (8 imports updated)
- [x] **1.6** Already in `src/lib/state-store.ts` — no move needed
- [x] **1.7** Already in `src/lib/cost-tracker.ts` — no move needed
- [x] **1.8** Routing maps stay in place (email: router.ts, telegram: bot.ts) — unified in Phase 3
- [x] **1.9** [Opus] Deleted 3 dead items: ollama-wrapper.ts, formatMatchesForTelegram, /surf+/forage stubs. 3 items were false positives.
- [x] **1.10** [Opus] Fixed load-env.ts — removed hardcoded fallback path, uses startPath instead
- [x] **1.11** Option 4: email files stay in email-golem/ (domain-specific), teaching.ts already in lib/. Move to packages/ in Phase 4.
- [x] **1.12** [Opus grep] Verified: no stale imports for event-log, llm, ollama-wrapper, or createClient outside factory+db-client
- [x] **1.13** [bun test] 890 pass, 0 fail → committed → PR created

### Phase 2: Decouple Golems — `feature/componentize-phase-2-decouple`

- [x] **2.1** [Opus grep] Mapped 6 production couplings + 10 test imports + 2 orchestration files. See phase-2 findings.md
- [x] **2.2** [Opus] Created teller-golem/db.ts, moved financial functions + InboundEmail type. Zero email-golem imports in teller-golem.
- [x] **2.3** [Opus] Converted static import to dynamic import() in job-golem/index.ts. MCP server coupling deferred to Phase 3.
- [x] **2.4** [Opus] Added getStatus() to all 4 golems (email, job, recruiter, teller). Created recruiter-golem/index.ts.
- [x] **2.5** [Opus] Added GolemStatus type to lib/shared-types.ts
- [x] **2.6** [Opus grep] Zero cross-golem imports in business logic. 2 remain in MCP servers (orchestration — Phase 3).
- [x] **2.7** Tests already pass (890/0). Cross-golem test imports stay — tests move to golem dirs in Phase 4.
- [x] **2.8** [bun test] 890 pass, 0 fail → committed → PR created

### Phase 3: Thin Telegram Router — `feature/componentize-phase-3-thin-router`

- [x] **3.1** [context7] Confirm grammy Composer API patterns
- [x] **3.2** [Opus] Created JobGolem Composer — /jobs, /jobq, jobs:* pagination (src/composers/job-composer.ts)
- [x] **3.3** [Opus] Created RecruiterGolem Composer — /practice, /stats, /outreach, /followup + callbacks (src/composers/recruiter-composer.ts)
- [x] **3.4** [Opus] Created ClaudeGolem Composer — /start, /status, /admin, /trigger, /fork, /setup, /tonight, /repos + message:text (src/composers/claude-composer.ts)
- [x] **3.5** [Opus] Extracted notification server to src/lib/notify-server.ts (startNotifyServer returns Server for shutdown)
- [x] **3.6** [Opus] Reduced telegram-bot.ts from 1957 → 97 lines (auth middleware, composer registration, startup, shutdown)
- [x] **3.7** [Opus] Removed auto-scrape loop — Railway handles scheduling via cloud-worker.ts
- [x] **3.8** [Opus] Updated GOLEM_REGISTRY — cwds now point to actual golem source dirs under monorepo
- [ ] **3.9** [manual] Test all Telegram commands (deferred — bot must be restarted to test live)
- [x] **3.10** [bun test] 890 pass, 0 fail → committed → PR #103 → merged

### Phase 4: Bun Workspaces — `feature/componentize-phase-4-workspaces`

- [x] **4.1** [Opus] Created root workspace config (package.json with workspaces, tsconfig.base.json)
- [x] **4.2** [Opus] Created 8 package scaffolds (shared, jobs, recruiter, teller, claude, content, coach, services)
- [x] **4.3** [Opus] Moved ~80 files to new packages via git mv (preserving history)
- [x] **4.4** [Haiku agents ×6] Updated all imports to `@golems/*` across 6 packages + 5 manual fixes
- [x] **4.5** [Opus] Created ~90 strangler wrappers in packages/autonomous for backward compat
- [x] **4.6** Recruiter tests already moved in 4.3 (contact-finder.test.ts, draft-outreach.test.ts)
- [x] **4.7** [bun install] 16 workspace packages resolved successfully
- [x] **4.8** [bun test] 862 pass, 0 fail — fixed mock.module issues with DI (_resetClient, resetGmailClient)
- [x] **4.9** [Opus] .gitignore verified — node_modules/ covers all packages
- [x] **4.10** Commit → PR → merge

### Phase 5: CC Plugin Packaging — `feature/componentize-phase-5-plugins`

- [x] **5.1** [Opus] Created .claude-plugin/plugin.json for 7 golem packages (proper author object, keywords, semver)
- [x] **5.2** [Opus + Exa + WebFetch] CC plugin best practices research — official docs, Exa, community specs. Key: commands/ is legacy, use skills/SKILL.md
- [x] **5.3** [Opus] Wrote CLAUDE.md per golem (persona + capabilities + architecture + domain rules)
- [x] **5.4** [Opus] Created 16 skills across 7 packages using skills/<name>/SKILL.md with YAML frontmatter (not legacy commands/)
- [x] **5.5** [Opus] Created 3 agents (interview-coach, content-critic, health-checker) with YAML frontmatter
- [x] **5.6** [Opus] Created .mcp.json for jobs + shared (MCP servers use ${CLAUDE_PLUGIN_ROOT})
- [ ] **5.7** [manual] Test each plugin locally with --plugin-dir (deferred — needs interactive session)
- [ ] **5.8** [manual] Verify namespaced skills (deferred — needs interactive session)
- [x] **5.9** CLI aliases already existed in .zshrc (recruiterClaude, tellerClaude, etc. + golemsClaude)
- [x] **5.10** Commit → PR #105 → merged (+ 3 review fixes folded into Phase 6)

### Phase 6: CoachGolem — `feature/componentize-phase-6-coach`

- [x] **6.1** [Opus] Google Calendar API — reuses Gmail OAuth2, calendar.events scope already granted
- [x] **6.2** [Opus] Google Calendar API client (calendar-client.ts — getTodayEvents, getUpcomingEvents)
- [x] **6.3** [Opus] Schedule engine (schedule-engine.ts — generateDailyPlan, formatPlanForTelegram)
- [x] **6.4** [Opus] Status aggregator (status-aggregator.ts — getEcosystemStatus, getPendingWork)
- [x] **6.5** [Opus] Nudger (nudger.ts — sendMorningNudge, sendEveningCheck)
- [x] **6.6** [Opus] Tracker (tracker.ts — recordDay, getWeeklySummary, formatWeeklySummary)
- [x] **6.7** [Opus] CC plugin structure — CLAUDE.md updated with actual architecture + types table
- [x] **6.8** [Opus] Wired into morning briefing (services/briefing.ts imports coach functions)
- [ ] **6.9** [manual] Test with real schedule data (deferred — needs Google Calendar credentials)
- [x] **6.10** [bun test] 15 pass, 0 fail (36 expect() calls) → commit → PR → merge

### Phase 7: Services Migration — `feature/componentize-phase-7-services`

- [x] **7.1** Services already in packages/services/ (Phase 4)
- [x] **7.2** Service imports already use @golems/* (Phase 4)
- [x] **7.3** [Opus] Wired Bedtime Guardian to CoachGolem (weekly summary in bedtime messages)
- [x] **7.4** [Opus] cloud-worker.ts already uses @golems/* imports, updated hardcoded paths in bot-shared.ts, doctor.ts, night-shift.ts, wizard.ts
- [x] **7.5** [Opus] Root Dockerfile for workspace (copies all packages, installs workspace deps)
- [x] **7.6** [Opus] Created root Dockerfile (Bun workspace-aware)
- [x] **7.7** [Opus] Created root railway.json (points to packages/services/src/cloud-worker.ts)
- [x] **7.8** [Opus] Strangler wrappers kept — tests still use relative imports through them. Zero cost (1-line re-exports). Full removal deferred until test imports migrate to @golems/*
- [ ] **7.9** [manual] Local cloud worker test (needs Railway env vars)
- [ ] **7.10** [manual] Railway deploy — update root directory in Railway dashboard → commit → PR → merge

### Phase 8: Launchd + Infra — `feature/componentize-phase-8-infra`

- [ ] **8.1** [Opus] Update 9 launchd plists
- [ ] **8.2** [Opus] Consolidate .env strategy
- [ ] **8.3** [Cursor work] Update pre-commit hook
- [ ] **8.4** [Cursor work] Update .deepsource.toml
- [ ] **8.5** [Opus] Update project bindings
- [ ] **8.6** [Gemini] Verify all runtime state paths
- [ ] **8.7** [Opus] Update golems CLI (doctor/wizard/status)
- [ ] **8.8** [manual] Unload/reload launchd plists
- [ ] **8.9** [manual] 24h smoke test → commit → PR → merge

### Phase 9: Distribution + Docs — `feature/componentize-phase-9-distribution`

- [ ] **9.1** [Cursor work] npm package metadata
- [ ] **9.2** [Gemini] CC marketplace format research
- [ ] **9.3** [Cursor work] Bundle shared for CC plugins
- [ ] **9.4** [Opus] CC marketplace entry
- [ ] **9.5** [Opus] README per package
- [ ] **9.6** [Cursor work] Update docsite
- [ ] **9.7** [Opus] Migration guide
- [ ] **9.8** [Opus] Update CLAUDE.md files
- [ ] **9.9** [Opus] Update memory files
- [ ] **9.10** [bun test + manual] Final verification → commit → PR → merge

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

### STOP-ON-BLOCK Policy

This is a critical refactor of the entire codebase. Speed is NOT the priority — correctness is.

1. **Follow the sequence strictly** — Phase 1 before 2, step 1 before step 2. No skipping ahead.
2. **If blocked, STOP** — don't work around it, don't improvise, don't push through. Stop and notify on Telegram.
3. **Notify between major steps** — Telegram update after each extraction/move/split completes.
4. **Blocked = any of these:**
   - A test fails and the fix isn't obvious
   - A dependency is missing or an import doesn't resolve
   - The findings don't match reality (dead code that isn't dead, coupling not documented)
   - A CLI helper fails or hits rate limits mid-step
   - Anything that feels wrong or surprising
5. **When stopped:** Write what happened to `claude.scratchpad.md`, notify on Telegram, wait for human.
6. **Resume:** Human reviews the blocker, we adjust the plan if needed, then continue.

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

## Post-Migration Checklist (do after all phases)

- [ ] Restart Telegram bot (`golems restart telegram`) — verify all commands work
- [ ] Restart Railway cloud worker (`/railway restart`) — verify email/job golems
- [ ] Update `golems wizard` to know about new package structure
- [ ] Update `golems doctor` to check new wiring paths
- [ ] Backup all `.env` files to 1Password (one item per package)
- [ ] Verify launchd plists point to correct entry files
- [ ] Run `golems status` — all golems healthy
- [ ] Consider: train MCP server on findings.md + session JSONLs for `golems why` command
- [ ] Archive session transcripts from componentization phases (valuable reasoning chain)

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
