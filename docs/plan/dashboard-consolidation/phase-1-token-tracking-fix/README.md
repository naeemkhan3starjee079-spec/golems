# Phase 1: Token Tracking Fix

> [Back to main plan](../README.md)

## Goal
Fix the tokens page so ALL LLM usage is visible, daily cost graph works correctly, and period switching is responsive.

## Tools
- **Research:** gemini — Ollama usage stats API, Supabase realtime subscriptions
- **Code:** cursor/opus — dashboard pages + enrichment logging
- **MCPs:** supabase (llm_usage table)

## Steps

1. **Add GLM usage logging to enrichment** — In Zikaron's `update_enrichment()`, log each Ollama call to Supabase `llm_usage` with `model: "glm-4.7-flash"`, `source: "enrichment"`, `cost_usd: 0`. Use `@golems/shared` Supabase client or direct HTTP from Python.
2. **Fix daily cost chart** — Handle edge cases: single-day data shows one bar, empty periods show "No data". Bar width adapts to entry count.
3. **Fix period selector** — Add loading spinner on switch. Show empty state message per period. Ensure `fetchTokenStats(days)` returns fresh data each time (not cached).
4. **Add total calls + sources to summary cards** — Show call count and unique sources alongside cost/tokens.
5. **Improve model table** — Add `source` column. Color-code: free models (green), cheap (amber), expensive (rose). Show per-source breakdown expandable.
6. **Add "last updated" timestamp** — Show when data was last refreshed, auto-refresh every 30s.

## Depends On
- Nothing (standalone fix)

## Status
- [x] Add GLM usage logging
- [x] Fix daily cost chart edge cases
- [x] Fix period selector UX
- [x] Add calls + sources to summary
- [x] Improve model table
- [x] Add last-updated + auto-refresh
