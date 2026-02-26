# Phase 2: Decouple Golems

> [Back to main plan](../README.md)

## Goal
Break all cross-golem imports so each golem depends only on `@golems/shared`, never on another golem.

## Tools
- **Research:** gemini — map all cross-golem imports, find hidden coupling
- **Code:** cursor (work mode) — rewrite imports, add shared contracts
- **Verify:** `bun test` + grep for cross-golem imports

## Steps

1. **[Gemini research]** Map ALL cross-golem imports — verify Cursor A's list is complete
2. **[Cursor work]** Break Email↔Teller coupling
   - `email-golem/router.ts` imports `teller-golem/index` → use event dispatch instead
   - `email-golem/mcp-server.ts` imports `teller-golem/report` → move report formatters to shared
   - `teller-golem/index.ts` imports `email-golem/db-client` → use shared supabase client
   - `teller-golem/report.ts` imports `email-golem/db-client` → same
3. **[Cursor work]** Break Job↔Recruiter coupling
   - `job-golem/index.ts` imports `recruiter-golem/auto-outreach` → extract shared outreach API
   - `job-golem/mcp-server.ts` imports `recruiter-golem/draft-outreach` → move to shared or event
4. **[Opus]** Add `getStatus()` interface to each golem — needs consistent API design
   - RecruiterGolem: practice streak, unseen jobs, upcoming interviews, outreach pipeline
   - JobGolem: total matches, unseen count, last scrape time, pipeline stats
   - TellerGolem: monthly spend, pending categorizations, subscription count
   - ContentGolem: pending drafts, last post date, style profile status
5. **[Opus]** Add shared types for golem status → `shared/src/golem-status.ts`
6. **[Gemini research]** Verify: grep for any remaining cross-golem imports (should be zero)
7. **[Cursor work]** Fix cross-golem tests:
   - golem-routing.test.ts
   - telegram-topics.test.ts
   - teller-report.test.ts
   - email router.test.ts
   - auto-outreach.test.ts
   - content-pipeline.test.ts
8. **[bun test]** Run full test suite

## Depends On
- Phase 1 (shared lib must exist for golems to import from)

## Status
- [ ] Break Email↔Teller coupling
- [ ] Break Job↔Recruiter coupling
- [ ] Add getStatus() to each golem
- [ ] Add shared golem-status types
- [ ] Verify zero cross-golem imports
- [ ] Fix cross-golem tests
- [ ] All 57 tests pass
