# Phase 2: Supabase RPC Functions

> [Back to main plan](../README.md)

## Goal

Create 5 Postgres RPC functions that do GROUP BY / SUM / COUNT server-side, eliminating the 1000-row cap and client-side aggregation.

## Tools

- **Research:** Gemini — verify SECURITY INVOKER + RLS interaction
- **Code:** Opus (self) — SQL migrations via `mcp__supabase__apply_migration`
- **MCPs:** supabase (apply_migration, execute_sql)
- **Reference:** `docs-audit-results/6-query-caps.md`, `7-client-aggregation.md`

## RPC Functions to Create

### 1. `get_token_stats(since timestamptz)` → JSON

```sql
SELECT json_build_object(
  'by_model', (SELECT json_agg(row_to_json(t)) FROM (
    SELECT model, COUNT(*) as calls, SUM(input_tokens) as input_tokens,
           SUM(output_tokens) as output_tokens, SUM(cost_usd) as cost_usd
    FROM llm_usage WHERE created_at >= since GROUP BY model
  ) t),
  'by_day', (...GROUP BY date(created_at)),
  'by_source', (...GROUP BY source),
  'totals', (SELECT json_build_object('calls', COUNT(*), ...))
)
```

Replaces: `fetchTokenStats` (queries.ts:53-130) — fetches ALL rows, loops in JS.

### 2. `get_email_stats()` → JSON

```sql
-- by_category: COALESCE(human_category, category, 'unknown'), count
-- last_24h: count WHERE received_at >= now() - '24h'
-- urgent: count WHERE COALESCE(human_score, score, 0) >= 8
```

Replaces: `fetchEmailStats` (queries.ts:394-415) — fetches ALL emails, no limit.

### 3. `get_job_stats()` → JSON

```sql
-- by_status: COALESCE(status, 'new'), count
-- by_source: source, count
-- avg_score: AVG(match_score)
-- total: count
```

Replaces: `fetchJobStats` (queries.ts:338-366) — fetches ALL jobs.

### 4. `get_pipeline_stats()` → JSON

```sql
-- by_pipeline: pipeline_id, total_runs, success_rate, avg_quality, avg_duration
```

Replaces: `fetchPipelineStats` — fetches all pipeline_runs.

### 5. `get_linkedin_stats()` → JSON

```sql
-- by_company: company, count (top 20)
-- by_strength: strength, count
-- total: count
```

Replaces: `fetchLinkedInStats` — fetches all connections.

## Expected Return Shapes

RPCs must return JSON matching what `queries.ts` currently builds in JS (see lines 119-130):

```typescript
// get_token_stats → TokenStats
{ by_model: Record<string, { calls, input_tokens, output_tokens, cost_usd }>,
  by_day: Record<string, { calls, input_tokens, output_tokens, cost_usd }>,
  by_source: Record<string, { calls, input_tokens, output_tokens, cost_usd }>,
  totals: { calls, input_tokens, output_tokens, cost_usd } }

// get_email_stats → EmailStats
{ by_category: Record<string, number>, last_24h: number, urgent: number }

// get_job_stats → JobStats
{ by_status: Record<string, number>, by_source: Record<string, number>,
  avg_score: number, total: number }
```

## RLS Strategy

Use `SECURITY INVOKER` (default). Existing RLS policies on all tables filter by `user_id = auth.uid()`. RPCs inherit the caller's role, so aggregation respects row-level security automatically.

## Safety & Verification

All migrations use `CREATE OR REPLACE FUNCTION` — non-destructive (no DROP TABLE, no ALTER TABLE, no data mutations). Functions are pure read-only aggregations. Verification:

1. **Pre-flight:** Confirm each table exists + has expected columns via `execute_sql` before creating RPC
2. **Post-migration:** Call each RPC via `execute_sql` and verify JSON shape
3. **Rollback:** Each function can be dropped individually: `DROP FUNCTION IF EXISTS get_X()`
4. **Critique wave (optional):** Run `/cli-agents` or `/critique-waves` to verify RPCs return same shape as current JS aggregation

## Steps

1. Test SECURITY INVOKER with a simple RPC via execute_sql
2. Create migration: `get_token_stats(since timestamptz)`
3. Create migration: `get_email_stats()`
4. Create migration: `get_job_stats()`
5. Create migration: `get_pipeline_stats()`
6. Create migration: `get_linkedin_stats()`
7. Test all 5 via execute_sql with sample params
8. Verify output shape matches what `fetchTokenStats` etc. return today

## Depends On

- None (independent of docs work)

## Status

- [ ] Verify SECURITY INVOKER + RLS
- [ ] get_token_stats migration
- [ ] get_email_stats migration
- [ ] get_job_stats migration
- [ ] get_pipeline_stats migration
- [ ] get_linkedin_stats migration
- [ ] Test all 5 RPCs
