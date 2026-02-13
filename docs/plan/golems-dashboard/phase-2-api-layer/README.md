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
7. Implement `/stats/tokens` — CC usage summary (read from cc-usage data)
8. Implement `/stats/enrichment` — Zikaron enrichment progress
9. Supabase migration: `dashboard_events` table for service heartbeats + token usage events
10. Wire auto-index.sh to push enrichment stats to Supabase (already sends to Axiom)

## Depends On

- Phase 1 (graph.json must exist for `/brain/graph`)

## Status

- [ ] HTTP mode for daemon
- [ ] CORS middleware
- [ ] Brain endpoints
- [ ] Health endpoints
- [ ] Stats endpoints
- [ ] Supabase migration
- [ ] Wire auto-index to Supabase
