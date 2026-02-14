# Phase 7: Multi-tenant

> [Back to main plan](../README.md)

## Goal

Add Supabase auth so each golems user gets their own dashboard. Data isolation per user. Others can deploy and use it with their own data.

## Tools

- **Research:** Gemini — Supabase Auth + RLS patterns for multi-tenant
- **Code:** Opus — auth wiring, RLS policies
- **MCPs:** supabase (auth, RLS, migration)

## Steps

1. Supabase Auth integration (email/password, GitHub OAuth)
2. Login/signup pages in Next.js
3. Add `user_id` column to all dashboard tables (RLS)
4. RLS policies: users can only read/write their own data
5. Graph data upload: users run `zikaron brain-export` locally → upload graph.json to Supabase Storage
6. Dashboard loads graph.json from Supabase Storage (per-user bucket)
7. Service health: per-user configuration (which services to monitor)
8. Token tracking: per-user API key usage
9. Settings page: configure services, upload new graph data, manage auth

## Depends On

- Phase 5 (ops dashboard working for single user first)

## Status

- [x] Supabase Auth integration — @supabase/ssr, browser/server/middleware clients
- [x] Login/signup pages — email/password + GitHub OAuth, (auth) route group
- [x] RLS policies — user_id on backlog_items, pipeline_runs, llm_usage, service_heartbeats
- [x] Graph data upload to Storage — brain-graphs bucket, per-user folder, upload/download helpers
- [x] Per-user data isolation — RLS policies with auth.uid(), legacy null rows accessible
- [x] Settings page — account info, graph upload, data sources, sign out
- [ ] Per-user service monitoring config — deferred (needs service configuration schema)
- [ ] Per-user token tracking — deferred (needs user_id in cloud worker inserts)
