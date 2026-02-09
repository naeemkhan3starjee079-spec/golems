# Phase 7: Cost Tracking + Observability

> [Back to main plan](../README.md)

## Goal

Track ALL AI usage: paid Haiku API calls AND free CLI helper invocations. Show on dashboard so you know what each golem costs.

## Tools

- **Research:** None needed
- **Code:** Opus direct (backend) + delegated Claude (frontend)

## Current State

- `cloud-llm.ts` logs Haiku usage to `api_costs.jsonl`: `{ timestamp, model, source, input_tokens, output_tokens, cost_usd }`
- Dashboard shows Haiku costs per source
- CLI helpers (Gemini, Cursor, Codex, Kiro) are NOT tracked at all
- `agent-runner.ts` exists but doesn't log invocations

## Steps

### 1. Extend agent-runner.ts Logging

Every CLI helper invocation already goes through `agent-runner.ts`. Add:
```typescript
const logEntry = {
  timestamp: new Date().toISOString(),
  helper: 'gemini' | 'cursor' | 'codex' | 'kiro',
  model: modelUsed,
  source: callingGolem,
  tokens_est: outputLength / 4, // rough estimate
  cost_usd: 0, // free tier
  tier: 'free'
};
appendToFile('~/.golems-zikaron/api_costs.jsonl', JSON.stringify(logEntry));
```

### 2. Split Usage Stats Endpoint

Extend `cloud-llm.ts:getUsageStats()` to return:
```typescript
{
  paid: { totalCost, calls, bySource: {...} },
  free: { totalCalls, byHelper: { gemini: N, cursor: N, codex: N, kiro: N }, bySource: {...} },
  combined: { totalCalls }
}
```

### 3. Per-Golem Cost Breakdown

New endpoint `getUsageByGolem()`:
```typescript
{
  emailgolem: { paid: $0.12, freeCalls: 5 },
  jobgolem: { paid: $0.08, freeCalls: 12 },
  recruitergolem: { paid: $0.45, freeCalls: 3 },
  nightshift: { paid: $0.00, freeCalls: 8 }
}
```

### 4. Dashboard Update (delegated)

- Two cards side by side: "Paid API ($X.XX)" and "Free Tier (N calls)"
- Per-golem table: Golem | Paid Cost | Free Calls | Total Calls
- Period selector: today / 7 days / 30 days

### 5. Service Health Improvements

- Better staleness thresholds (email: 15min, job: 35min, briefing: 25h, nightshift: 25h)
- Show actual last-run time, not just "X ago"
- Warning badge when service is 2x overdue

## Depends On

- Phase 0 (service status writes — needed for service health improvements)

## Status

- [ ] Extend agent-runner.ts logging
- [ ] Split usage stats endpoint
- [ ] Per-golem cost breakdown
- [ ] Dashboard cost cards (delegated)
- [ ] Service health improvements
- [ ] Tests pass
- [ ] Committed
