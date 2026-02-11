# Phase 4 Findings

## Decisions

1. **Root workspace config**: `"workspaces": ["packages/*"]` in root package.json
2. **Inter-package deps**: All golems depend on `@golems/shared: "workspace:*"`. ClaudeGolem also depends on jobs, recruiter, content (for composers).
3. **Import rewrite rule**: `../lib/*` → `@golems/shared/lib/*`, `../email-golem/*` → `@golems/shared/email/*`, etc.

## Research (from Cursor C — Round 3)

### Complete File Move Manifest

**282 lines of exact file-by-file mapping.** Summary by package:

| Package | Source Files | Test Files | Key Notes |
|---------|-------------|------------|-----------|
| @golems/shared | 30 src + 14 email | 26 tests + 8 email tests | Biggest package, includes all lib/ and email-golem/ |
| @golems/jobs | 7 src | 4 tests | Remove recruiter auto-outreach coupling |
| @golems/recruiter | 12 src | 9 tests (2 in non-standard __tests__/) | Contact finder, outreach, practice, elo |
| @golems/teller | 5 src | 3 tests | Report, categorizer, alerts |
| @golems/claude | 5 NEW files (from bot split) | 1 test (golem-routing) | telegram-bot.ts splits into 5 files |
| @golems/content | 1+ NEW (pipeline, storage, composer) | 1 test (content-pipeline) | Extracted from telegram-bot.ts |
| @golems/coach | ALL NEW | 0 existing tests | Phase 6 builds this from scratch |
| @golems/services | 14 src | 5 tests | Night shift, briefing, doctor, wizard, helpers |

### telegram-bot.ts Split Plan (5 new files)

1. `packages/claude/src/bot.ts` — thin router, grammy setup
2. `packages/claude/src/orchestrator.ts` — event log, state, helpers
3. `packages/claude/src/topic-routing.ts` — shared types only
4. `packages/claude/src/state.ts` — state-store integration
5. `packages/claude/src/composer.ts` — ClaudeGolem conversation logic

Plus extracted composers:
- `packages/jobs/src/composer.ts`
- `packages/recruiter/src/composer.ts`
- `packages/content/src/composer.ts`

### Migration Order (from Cursor C)

1. Create root workspace + package folders
2. Build @golems/shared (lib/ + event-log + llm + ollama + thread-store)
3. Move EmailGolem into shared/email, remove cross-golem calls
4. Move golem packages (jobs/recruiter/teller), break coupling
5. Split telegram-bot.ts into composers
6. Move services/CLIs into @golems/services
7. Move tests, update imports
8. Remove dead code

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Create root workspace config | Opus | pending |
| Scaffold all package.json files | cursor (work mode) | pending |
| Move shared lib files | cursor (work mode) | pending |
| Move golem packages | cursor (work mode) | pending |
| Create strangler wrappers | Opus | pending |

## Notes

- Cursor C full output saved in this findings file (key data above)
- The telegram-bot.ts split is the riskiest part — must be done AFTER Phase 3 (thin router)
- 2 recruiter tests in `src/recruiter-golem/__tests__/` — non-standard location, easy to miss
