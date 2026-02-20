---
globs: "packages/{shared,services,jobs,teller,coach,claude,recruiter,content,dashboard,tax-helper}/**"
---

# Supabase Rules

## Project ID
`mkijzwkuubtfjqcemorx`

## RLS is Always On
Every table has Row Level Security enabled. When creating new tables via migration, always add RLS policies.

## Migrations
Use `mcp__supabase__apply_migration` for DDL operations. Never run DDL via `execute_sql`.

## Environment Variables
- `SUPABASE_URL` — project URL
- `SUPABASE_ANON_KEY` — publishable key (client-side)
- `SUPABASE_SERVICE_KEY` — service role key (server-side only, never expose)

## Client Factory
Use `@golems/shared` Supabase factory — never create clients directly:
```typescript
import { getSupabaseClient } from "@golems/shared";
```
