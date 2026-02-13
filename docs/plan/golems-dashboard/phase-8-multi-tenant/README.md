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

- [ ] Supabase Auth integration
- [ ] Login/signup pages
- [ ] RLS policies
- [ ] Graph data upload to Storage
- [ ] Per-user data isolation
- [ ] Settings page
