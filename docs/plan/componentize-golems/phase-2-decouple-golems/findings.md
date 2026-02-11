# Phase 2 Findings

## Cross-Golem Import Map

### Production Code Couplings (MUST BREAK)

| From | To | What | Priority |
|------|----|------|----------|
| teller-golem/index.ts | email-golem/db-client | `createDbClient, recordPayment, trackSubscription` | HIGH — shared DB functions |
| teller-golem/index.ts | email-golem/types | `ScoredEmail` type | LOW — type only |
| teller-golem/report.ts | email-golem/db-client | `createDbClient, getSubscriptionSummary` | HIGH — shared DB functions |
| email-golem/mcp-server.ts | teller-golem/report | `generateMonthlyReport` etc | HIGH — bidirectional coupling |
| job-golem/index.ts | recruiter-golem/auto-outreach | `processHotMatches, formatHotMatchSummary, JobMatch` | HIGH |
| job-golem/mcp-server.ts | recruiter-golem/draft-outreach | `createAndSaveDraft, getOutreachDrafts, updateDraftStatus` | HIGH |

### Orchestration Files (OK for now — handled in Phase 3)

| File | Imports From | Reason |
|------|-------------|--------|
| briefing.ts | email-golem/db-client, email-golem/types, teller-golem/report | Orchestrator |
| telegram-bot.ts | job-golem/index, recruiter-golem/elo+practice-db+outreach-db | Orchestrator |

### Test Files (10 cross-golem imports — move tests to golem dirs in Phase 4)

Tests in `__tests__/` that import directly from golem dirs: teller-alerts, teller-report, categorizer, job-golem, job-golem-integration, auto-outreach, outreach-db, obsidian-export, elo, practice-db

## Strategy

### Email↔Teller Decoupling (Step 2.2)

**Problem:** TellerGolem uses EmailGolem's `db-client.ts` for `recordPayment`, `trackSubscription`, `getSubscriptionSummary`. EmailGolem uses TellerGolem's `report.ts` for `generateMonthlyReport`.

**Solution:** Move shared DB functions (`recordPayment`, `trackSubscription`, `getSubscriptionSummary`) to `src/lib/` as they're infrastructure, not golem-specific. TellerGolem's `generateMonthlyReport` stays in teller-golem but gets called via interface, not direct import.

### Job↔Recruiter Decoupling (Step 2.3)

**Problem:** JobGolem calls RecruiterGolem's `processHotMatches` and `createAndSaveDraft` directly.

**Solution:** Extract the outreach interface types to `src/lib/shared-types.ts`. Job golem emits "hot match" events; recruiter golem consumes them. For now, use a simple callback/hook pattern rather than a full event bus.
