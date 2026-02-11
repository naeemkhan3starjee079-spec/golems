# Phase 1 Findings

## Decisions

1. **EmailGolem dissolves into shared** — email polling, scoring, routing is infrastructure
2. **Single Supabase factory** — currently 8 duplicate `createClient()` calls across files
3. **Unified routing map** — telegram-bot.ts and telegram-direct.ts have divergent copies

## Research (from Cursor A — Round 1)

### Shared lib extraction candidates (6 patterns)

| Pattern | Current Files | Duplication Count |
|---------|--------------|-------------------|
| Supabase client | event-log, state-store, email db, cost-tracker, sync-to-supabase, outreach-db-cloud, practice-db-cloud, job-golem/mcp | **8** |
| Event logging | event-log.ts + callers in every golem | **2 files, many callers** |
| Telegram notifications | telegram-direct.ts + inline `sendNotification` in 5+ files | **5+** |
| LLM facade | llm.ts, cloud-llm.ts, ollama-helper.ts | **3 files** |
| State management | state-store.ts + direct file I/O in 6+ golems | **6+** |
| Cost tracking | cost-tracker.ts + inline accounting in cloud-worker | **2** |

### Dead code to delete (6 items from Cursor A)

1. `ollama-wrapper.ts` — replaced by ollama-helper.ts
2. `formatMatchesForTelegram` in job-golem/index.ts — unused export
3. `/surf` and `/forage` command handlers in telegram-bot.ts — never called
4. Router stubs for "moltbook" in telegram-direct.ts — Soltome replaced this
5. Unused `sendTelegram` export in night-shift.ts
6. `runOllamaJSON` in ollama-helper.ts — dead code path

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Extract Supabase factory | cursor (work mode) | pending |
| Unify routing maps | Opus | pending |
| Delete dead code | cursor (work mode) | pending |
| Move email-golem to shared/email | cursor (work mode) | pending |
| Fix load-env.ts hard-coded path | Opus | pending |

## Notes

- Cursor A full output: `/tmp/cursor-a-output.md` (ephemeral)
- The Supabase factory is the highest-value extraction — 8 duplicates
- load-env.ts fallback hard-codes `Gits/golems/packages/autonomous` — must be workspace-aware
