# Phase 1 Findings

## Decisions

- **Haiku wiring was already complete** — ollama-wrapper.ts (line 16-58) already routes to cloud-llm.ts when `LLM_BACKEND=haiku`. Done during Phase 2 (cloud offload) work.
- **Job matcher already uses LLM** — matcher.ts imports `forJobGolem` from ollama-wrapper and uses `runOllamaJSON` for scoring. NOT just keyword matching.
- **watchlist.ts is data management only** — company tracking, not scoring. Scoring happens in matcher.ts.

## Research

- [initial] Email scorer uses `runOllamaJSON` from ollama-wrapper.ts — routes to Haiku via wrapper
- [initial] cloud-llm.ts Haiku 4.5 (claude-haiku-4-5-20251001), max_tokens 1024, usage tracking
- [initial] Job matching uses LLM via matcher.ts → forJobGolem.runOllamaJSON → ollama-wrapper → cloud-llm
- [initial] cloud-worker.ts schedules: email hourly 6am-7pm, jobs 6am/9am/1pm Sun-Thu
- [verified] Migration 005 was NOT applied → now applied (2026-02-09)
- [verified] Railway env vars all set: LLM_BACKEND=haiku, ANTHROPIC_API_KEY, SUPABASE_*, TELEGRAM_*, STATE_BACKEND=supabase
- [fixed] TELEGRAM_BOT_TOKEN on Railway was DEAD (old token). Updated to current working token.
- [verified] Railway logs show Haiku working: 10 calls, 8095 input + 801 output tokens, $0.0097
- [verified] Email scoring running with proper categories + golem routing
- [observed] Job scraping hitting rate limits on job boards (5s/10s/20s backoff) — Phase 2 issue

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Check migration 005 | opus | done (applied) |
| Trace ollama-wrapper interface | opus | done (already wired) |
| Wire cloud-llm into ollama-wrapper | n/a | already done |
| Railway status check | opus | done (running, healthy) |
| Fix Railway Telegram token | opus | done |
