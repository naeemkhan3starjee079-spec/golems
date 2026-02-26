# Phase 1: Extract Shared Library

> [Back to main plan](../README.md)

## Goal
Extract 6 duplicated utility patterns into `packages/shared/` (`@golems/shared`) so golems can be decoupled in Phase 2.

## Tools
- **Research:** gemini — verify no hidden usages before consolidating
- **Code:** cursor (work mode) — bulk extract + import updates
- **Verify:** `bun test` — all 57 test files must pass after each extraction

## Steps

1. **[Opus]** Create `packages/shared/` scaffold (package.json, tsconfig, src/)
2. **[Cursor work]** Extract Supabase client factory (8 duplicates) → `shared/src/supabase.ts`
   - Sources: state-store, event-log, cost-tracker, email db-client, job mcp-server, outreach-db-cloud, practice-db-cloud, telegram-bot
3. **[Cursor work]** Extract event logging (2 implementations) → `shared/src/events.ts`
   - Sources: event-log.ts, lib/state-store.ts — consolidate, state-store delegates
4. **[Cursor work]** Extract Telegram notifications (5 implementations) → `shared/src/notify.ts`
   - Sources: telegram-direct, telegram-bot SOURCE_CONFIG, job-golem, email-golem, night-shift
5. **[Cursor work]** Extract LLM facade (3 files) → `shared/src/llm.ts`
   - Sources: llm.ts, ollama-helper.ts, ollama-wrapper.ts — delete deprecated wrapper
6. **[Cursor work]** Extract state management (6 implementations) → `shared/src/state.ts`
   - Sources: telegram-bot, night-shift, briefing, email-golem, elo, lib/state-store
7. **[Cursor work]** Move cost tracking → `shared/src/costs.ts` (already centralized, just move)
8. **[Opus]** Unify routing maps → `shared/src/routing.ts`
   - Merge SOURCE_CONFIG (telegram-bot.ts) + SOURCE_TO_TOPIC (telegram-direct.ts) — needs multi-file orchestration
9. **[Cursor work]** Delete dead code (6 items)
   - job-golem/index.ts:87-111 formatMatchesForTelegram
   - ollama-wrapper.ts (deprecated)
   - ollama-helper.ts:34-47 runOllamaJSON
   - telegram-bot.ts:1336-1344 disabled /surf /forage
   - email-golem/router.ts:93-99 incomplete stubs
   - night-shift.ts:120-143 unused sendTelegram
10. **[Opus]** Fix load-env.ts — replace hard-coded path with dynamic package.json lookup
11. **[Cursor work]** Move email infrastructure to shared
    - gmail-client.ts, scorer.ts, followup.ts → `shared/src/email-intake.ts`
    - teaching.ts → `shared/src/teaching.ts`
12. **[Gemini research]** Verify no hidden usages of extracted code missed by Cursor
13. **[bun test]** Run full test suite, fix any broken imports

## Depends On
- None — this is the foundation

## Status
- [ ] Create packages/shared/ scaffold
- [ ] Extract Supabase client factory
- [ ] Extract event logging
- [ ] Extract Telegram notifications
- [ ] Extract LLM facade
- [ ] Extract state management
- [ ] Move cost tracking
- [ ] Unify routing maps
- [ ] Delete dead code
- [ ] Fix load-env.ts
- [ ] Move email infrastructure
- [ ] All 57 tests pass
