---
globs: "packages/{shared,services,jobs,teller,coach,claude,recruiter,content,dashboard,tax-helper}/**"
---

# Supabase Rules

- **Project ID:** `mkijzwkuubtfjqcemorx`
- **RLS always on.** New tables need RLS policies.
- **DDL via `mcp__supabase__apply_migration`**, never `execute_sql`.
- **Client:** `import { getSupabase } from "@golems/shared"` — never create clients directly.
