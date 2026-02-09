# Phase 1: Haiku Wiring + Migrations

> [Back to plan](../README.md)

## Goal

Wire Haiku (cloud-llm.ts) into email scoring and job matching so they work on Railway without Ollama. Apply pending migrations. Fix why Railway cloud-worker isn't running.

## Current State

- `cloud-llm.ts` exists with Haiku 4.5 backend — never wired into actual scorers
- `email-golem/scorer.ts` imports `runOllamaJSON` directly — only works with local Ollama
- `job-golem/watchlist.ts` is file-based keyword matching — no LLM scoring at all
- `cloud-worker.ts` exists with schedules but status on Railway unknown
- Migration `005_helper_rate_limits.sql` may not be applied to Supabase yet

## Tools

- **Research:** `cursor agent -p @codebase` — trace LLM usage, understand ollama-wrapper interface
- **Code:** Direct edits (Opus orchestration)

## Steps

1. [ ] Verify migration 005 is applied in Supabase (execute_sql check)
2. [ ] Check Railway deployment status — is cloud-worker.ts deployed? What env vars are set?
3. [ ] Make `ollama-wrapper.ts` check `LLM_BACKEND` env and delegate to `cloud-llm.ts` when `haiku`
   - This way ALL existing callers (scorer.ts, etc.) get Haiku for free
   - Keep Ollama as local fallback
4. [ ] Add LLM-based job match scoring using cloud-llm (profile + job description → score 1-10)
5. [ ] Test locally with `LLM_BACKEND=haiku`
6. [ ] Verify cloud-worker.ts runs on Railway with correct env vars

## Depends On

Nothing — this is the foundation phase.

## Provides to Admin UI

- Haiku-scored emails (better accuracy than Ollama local)
- LLM-scored job matches (new capability)

## Status

- [x] Migration verification
- [x] Railway status check
- [x] ollama-wrapper.ts → cloud-llm.ts delegation
- [x] Job match LLM scoring
- [x] Local test with LLM_BACKEND=haiku
- [x] Railway deployment verification
