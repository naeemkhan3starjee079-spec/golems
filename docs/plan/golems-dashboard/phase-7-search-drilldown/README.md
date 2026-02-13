# Phase 6: Search & Drill-down

> [Back to main plan](../README.md)

## Goal

Full-text search into the 240K chunks from the dashboard. Click a graph node → see actual conversation content. Search across all sessions.

## Tools

- **Research:** Gemini — Turso edge SQLite setup, Vercel edge functions
- **Code:** Opus — Turso integration, edge function API routes
- **MCPs:** supabase (if using Supabase instead of Turso)

## Steps

1. Decide: Turso (edge SQLite, free 1B reads/mo) vs Supabase (already have it)
2. Set up edge database with FTS5 index on chunks
3. Sync pipeline: Python script to push chunks to edge DB
4. API route: `/api/search?q=...` → FTS5 query → return ranked results
5. API route: `/api/node/:id` → session detail with linked chunks, files, operations
6. Search UI: command-palette style (Cmd+K) overlay
7. Results: ranked list with content preview, click to navigate to graph node
8. Session detail panel: conversation chunks (paginated), files touched, operations timeline
9. Graph integration: search highlights matching nodes in brain view

## Depends On

- Phase 4 (brain view for graph integration)
- Phase 2 (API layer)

## Status

- [ ] Choose edge DB (Turso vs Supabase)
- [ ] Set up edge database + FTS5 index
- [ ] Sync pipeline
- [ ] Search API route
- [ ] Node detail API route
- [ ] Search UI (Cmd+K)
- [ ] Session detail panel
- [ ] Graph↔search integration
