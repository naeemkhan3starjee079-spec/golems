# Phase 8: Multi-tenant (Hybrid Mode) Findings

## Decisions

- **Architecture: Hybrid mode** (approved 2026-02-13)
  - Supabase-backed features are multi-tenant: backlog, tokens, events, service runs
  - Local-only features degrade gracefully when daemon is offline: search, brain graph, service health, enrichment
  - Auth protects Supabase data
  - Brain graph can be uploaded to Supabase Storage as future enhancement
  - Search remains local-first (fastest, no data upload needed)

## Architecture Details

### Multi-tenant (Supabase)
- Backlog items → already in Supabase, add user_id column
- Token usage → already in Supabase
- Events log → already in Supabase
- Service runs → already in Supabase

### Local-only (graceful degradation)
- Brain graph → local daemon (show "Connect daemon" banner when offline)
- FTS5 search → local daemon (show "Local search unavailable" when offline)
- Session detail → local daemon (paginated chunks from sqlite)
- Service health → local machine checks (show "Local services" section only when daemon connected)
- Enrichment status → local daemon

### Auth Strategy
- Supabase Auth (email + OAuth)
- Each user sees only their own data (RLS policies with user_id)
- Local daemon connection is per-machine (no auth needed, it's localhost)

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Add user_id to Supabase tables + RLS policies | - | pending |
| Supabase Auth integration in Next.js | - | pending |
| Graceful degradation UI for local-only features | - | pending |
| "Connect daemon" banner when localhost:8787 unreachable | - | pending |
| Login/signup page | - | pending |
