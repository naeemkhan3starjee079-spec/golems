# Phase 8 Findings

## Decisions

1. **All 9 launchd plists need path updates** — currently point to packages/autonomous/
2. **Incremental migration strategy** — strangler wrappers keep old paths working until new ones verified
3. **load-env.ts must become workspace-aware** — currently hard-codes packages/autonomous path

## Research (from Cursor D — Round 3)

### Test File Map (57 files total)

| Package | Test Count | Cross-Golem Deps? |
|---------|-----------|-------------------|
| shared/lib | 26 | No |
| shared/email | 8 | Yes — router.test.ts mocks teller/recruiter |
| jobs | 4 | Yes — integration test references recruiter |
| recruiter | 9 (2 in non-standard loc) | No |
| teller | 3 | Yes — report.test.ts needs email db |
| claude | 1 | Yes — golem-routing tests all topic mapping |
| content | 1 | No |
| services | 5 | No |

### Risk Matrix

| Area | Risk | Mitigation |
|------|------|------------|
| Telegram bot splitting | **HIGH** | Phase 3 dedicated; grammy Composer pattern proven in production bots |
| Cross-golem dependencies | **HIGH** | Phase 2 breaks ALL coupling before code moves |
| CC plugin cache dir | **HIGH** | Bundle @golems/shared; use GOLEMS_STATE_DIR for runtime |
| MCP server paths | **MEDIUM-HIGH** | Each golem gets own .mcp.json |
| Cloud worker + Railway | **MEDIUM** | Workspace-aware Dockerfile |
| Launchd plists (9) | **MEDIUM** | Phase 8 dedicated |
| Pre-commit hook | **MEDIUM** | Workspace-aware test runner |

### 9 Launchd Plists to Update

1. `com.golemszikaron.telegram.plist` → packages/claude/src/bot.ts
2. `com.golemszikaron.email-golem.plist` → packages/shared/src/email/ (or cloud worker)
3. `com.golemszikaron.job-golem.plist` → packages/jobs/
4. `com.golemszikaron.nightshift.plist` → packages/services/src/night-shift.ts
5. `com.golemszikaron.briefing.plist` → packages/services/src/briefing.ts
6. `com.golemszikaron.ollama.plist` → unchanged (external service)
7. `com.golems.session-archiver.plist` → packages/services/src/session-archiver.ts
8. `com.golems.storage-cleanup.plist` → packages/services/
9. Bedtime guardian plist → packages/services/src/bedtime-guardian.ts

### Gotchas (from Cursor D)

1. Auto-scrape loop in telegram-bot.ts — splitting job golem risks double-running
2. `GOLEM_REGISTRY` has absolute cwds and SOUL.md paths — break in workspace/cache
3. Pre-commit hook pinned to `packages/autonomous/scripts/test-isolated.sh`
4. `bun test` only runs `src/__tests__/` — recruiter tests at `src/recruiter-golem/__tests__/` currently skipped
5. cloud-worker.ts uses relative entry points

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Update 9 launchd plists | Opus | pending |
| Make load-env.ts workspace-aware | Opus | pending |
| Update pre-commit hook | cursor (work mode) | pending |
| Update golems CLI (doctor/wizard/status) | Opus | pending |
| 24h smoke test | manual | pending |

## Notes

- Cursor D full output: `/tmp/cursor-d-round3-output.md` (ephemeral)
- Recommended strategy: incremental with strangler wrappers — bot never goes down
- Each phase has its own test gate — no moving on until all 57 test files pass
