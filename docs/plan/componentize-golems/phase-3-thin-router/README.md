# Phase 3: Thin Telegram Router

> [Back to main plan](../README.md)

## Goal
Split the 1967-line telegram-bot.ts into a ~300-line thin router + grammy Composers per golem.

## Tools
- **Research:** context7 — grammy Composer middleware patterns
- **Code:** cursor (work mode) — extract Composers from bot; Opus for wiring
- **Verify:** `bun test` + manual Telegram test

## Steps

1. **[context7 research]** Confirm grammy Composer API — middleware chaining, error boundaries, session sharing
2. **[Cursor work]** Create Composer for JobGolem (~180 lines)
   - Extract: /jobs, /jobq, job pagination, job callbacks, scrape endpoint, auto-scrape scheduler
   - File: `job-golem/src/composer.ts`
   - Export: `jobComposer`
3. **[Cursor work]** Create Composer for RecruiterGolem (~320 lines)
   - Extract: /practice, /stats, /outreach, /followup + all recruiter callbacks
   - File: `recruiter-golem/src/composer.ts`
   - Export: `recruiterComposer`
4. **[Opus]** Create Composer for ClaudeGolem (~600 lines) — most complex, needs orchestration
   - Extract: askClaude, chat queue, personas, content pipeline orchestration
   - File: `claude/src/composer.ts` or split further
   - Export: `claudeComposer`
5. **[Cursor work]** Extract notification server to standalone module
   - The Bun.serve on port 3847 → `shared/src/notify-server.ts` or `services/notify-server.ts`
6. **[Opus]** Reduce telegram-bot.ts to thin router
   - Framework setup, bot.use() for each Composer, graceful shutdown, /start /status /trigger
   - Target: ~300 lines
7. **[Cursor work]** Remove job auto-scrape loop from bot (now in JobGolem Composer or cloud-worker)
   - Gotcha: avoid double-running with launchd/cloud-worker
8. **[Opus]** Update GOLEM_REGISTRY to use Composers instead of hard-coded paths
9. **[manual]** Test all Telegram commands still work
10. **[bun test]** Run full test suite

## Depends On
- Phase 2 (golems must be decoupled before splitting bot)

## Status
- [ ] Create JobGolem Composer
- [ ] Create RecruiterGolem Composer
- [ ] Create ClaudeGolem Composer
- [ ] Extract notification server
- [ ] Reduce telegram-bot.ts to ~300 lines
- [ ] Remove auto-scrape from bot
- [ ] Update GOLEM_REGISTRY
- [ ] Manual Telegram test
- [ ] All 57 tests pass
