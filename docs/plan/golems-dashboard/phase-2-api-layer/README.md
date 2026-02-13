# Phase 2: API Layer

> [Back to main plan](../README.md)

## Goal

Extend the Zikaron FastAPI daemon with HTTP endpoints for brain view data, service health, and token stats. Also set up Supabase tables for cloud-stored metrics.

## Tools

- **Research:** Gemini — FastAPI best practices for hybrid unix socket + HTTP
- **Code:** Opus — extend `daemon.py`, add Supabase migration
- **MCPs:** supabase (migration, tables)

## Steps

1. Add `--http PORT` flag to Zikaron daemon (serve on both unix socket + HTTP)
2. Add CORS middleware (allow localhost:3000 + etanheyman.com)
3. Implement `/brain/graph` — serve pre-generated graph.json
4. Implement `/brain/metadata` — stats about the graph (node count, last generated)
5. Implement `/brain/node/:id` — detail for a specific node (sessions, files, operations)
6. Implement `/health/services` — check Ollama, Telegram bot, Railway, launchd jobs
7. Implement `/stats/tokens` — read from Supabase `llm_usage` table (1088+ rows), fallback to local JSONL
8. Implement `/stats/enrichment` — Zikaron enrichment progress (direct DB query)
9. Supabase migration: `service_heartbeats` table (used existing `llm_usage` + `service_runs` tables)
10. Wire auto-index.sh to push enrichment stats to Supabase (already sends to Axiom)

## Depends On

- Phase 1 (graph.json must exist for `/brain/graph`)

## Status

- [x] HTTP mode for daemon (`--http PORT` flag, dual unix socket + HTTP via asyncio.gather)
- [x] CORS middleware (localhost:3000, localhost:3001, etanheyman.com)
- [x] Brain endpoints (`/brain/graph`, `/brain/metadata`, `/brain/node/{id}`)
- [x] Health endpoints (`/health/services` — Ollama, Telegram, Railway, self)
- [x] Stats endpoints (`/stats/tokens` from Supabase llm_usage, `/stats/enrichment` from local DB)
- [x] Supabase migration (`service_heartbeats` table — `llm_usage` and `service_runs` already existed)
- [ ] Wire auto-index to Supabase (deferred — enrichment stats available via local `/stats/enrichment`)

### Notes
- Reused existing `llm_usage` (1088 rows) and `service_runs` (62 rows) tables instead of creating `dashboard_events`
- `/stats/tokens` queries Supabase directly via REST API (no Python SDK needed), groups by model
- `/health/services` uses subprocess for curl/launchctl checks (async-friendly with timeout)
- Daemon version bumped to 0.2.0
