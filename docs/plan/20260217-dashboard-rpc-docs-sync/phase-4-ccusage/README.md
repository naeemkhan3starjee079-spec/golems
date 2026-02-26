# Phase 4: ccusage Integration

> [Back to main plan](../README.md)

## Goal

Sync Claude Code session usage (from JSONL files) into `llm_usage` Supabase table and show CC costs alongside API costs in the tokens dashboard.

## Tools

- **Code:** Opus (self) — TypeScript sync script + dashboard updates
- **Reference:** `docs-audit-results/8-ccusage-feasibility.md`, existing `scripts/cc-usage.ts`
- **MCPs:** supabase (execute_sql, apply_migration)

## Approach

**Parse JSONL directly.** Do NOT use the `ccusage` CLI or `@ccusage/mcp` — they only provide daily aggregates. We need per-message granularity to match the existing `llm_usage` row-per-call pattern. Reuse patterns from `scripts/cc-usage.ts` which already parses these files.

## Architecture

```
~/.claude/projects/**/*.jsonl  →  sync script  →  llm_usage table  →  tokens dashboard
     (962 files, 752MB)         (parse + insert)   (source: "claude-code")
```

### Data Flow

1. Parse JSONL files — extract `type: "assistant"` entries with `message.usage`
2. For each: `model`, `input_tokens`, `output_tokens`, `cache_creation_tokens`, `cache_read_tokens`, `timestamp`
3. Calculate `cost_usd` from pricing table
4. Insert into `llm_usage` with `source: "claude-code"`, `tier: "subscription"`
5. Dedup: skip rows where `(created_at, model, source)` already exists

### Schema Extension

```sql
ALTER TABLE llm_usage ADD COLUMN IF NOT EXISTS cache_read_tokens BIGINT DEFAULT 0;
ALTER TABLE llm_usage ADD COLUMN IF NOT EXISTS cache_creation_tokens BIGINT DEFAULT 0;
```

## Files

| File | Action |
|------|--------|
| `packages/shared/src/lib/cc-usage-sync.ts` | CREATE — reusable sync module |
| `scripts/cc-usage-sync.ts` | CREATE — CLI entry point |
| `packages/services/src/cloud-worker.ts` | MODIFY — add daily sync schedule (or local cron) |
| `packages/dashboard/src/lib/supabase/queries.ts` | MODIFY — include cache tokens in fetchTokenStats |
| `packages/dashboard/src/app/(dashboard)/tokens/page.tsx` | MODIFY — show cache breakdown |

## Pricing Table (Feb 2026)

| Model | Input | Output | Cache Read | Cache Creation |
|-------|-------|--------|------------|----------------|
| claude-opus-4-6 | $15/MTok | $75/MTok | $1.50/MTok | $18.75/MTok |
| claude-sonnet-4-5 | $3/MTok | $15/MTok | $0.30/MTok | $3.75/MTok |
| claude-haiku-4-5 | $0.80/MTok | $4/MTok | $0.08/MTok | $1/MTok |

## Steps

1. Schema migration: add `cache_read_tokens` and `cache_creation_tokens` columns
2. Create `cc-usage-sync.ts` module (parse JSONL, calculate cost, insert)
3. Create CLI script for manual/cron runs: `bun scripts/cc-usage-sync.ts --days 7`
4. Add dedup logic (skip existing timestamps)
5. Test: run sync for last 3 days, verify rows appear in Supabase
6. Update `get_token_stats` RPC (Phase 2) to include cache columns
7. Update tokens page to show cache read/creation breakdown
8. Add daily sync to cloud worker or local launchd cron
9. Verify tokens dashboard shows both API and CC usage

## Depends On

- Phase 2 (if extending `get_token_stats` RPC — otherwise independent)
- Can start independently; RPC update is a late step

## Status

- [ ] Schema migration (cache columns)
- [ ] cc-usage-sync.ts module
- [ ] CLI entry point
- [ ] Dedup logic
- [ ] Test sync
- [ ] Update RPC for cache columns
- [ ] Tokens page cache breakdown UI
- [ ] Schedule sync (cron/cloud worker)
