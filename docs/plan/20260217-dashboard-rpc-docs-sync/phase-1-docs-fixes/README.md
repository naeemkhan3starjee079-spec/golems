# Phase 1: Docs Accuracy Fixes

> [Back to main plan](../README.md)

## Goal

Fix all doc inaccuracies found by audits #1, #3, and #4 in the source-of-truth docs (`packages/dashboard/content/docs/`).

## Tools

- **Code:** Opus (self) — bulk markdown edits across 7+ files
- **Reference:** `docs-audit-results/1-zikaron.md`, `3-llm-backend.md`, `4-shared.md`

## Audit Findings to Fix

### From Audit #3 — 18 stale Haiku references (7 files)

| File | Fix |
|------|-----|
| `llm.md` ~901 | Health check example: `"backend": "haiku"` → `"gemini"` |
| `llm.md` ~969 | Rollback example: `LLM_BACKEND=haiku` → `gemini` |
| `llm.md` ~1115-1119 | Mode table: Hybrid/Full Cloud "Haiku (cloud)" → "Gemini (cloud)" |
| `llm.md` ~1127-1132 | Cost table: Haiku ~$5-15/mo → Gemini free, Haiku optional |
| `llm.md` ~1156 | Tech stack: "Anthropic Haiku 4.5" → "Gemini 2.5 Flash-Lite (cloud, free), Haiku 4.5 (fallback)" |
| `llm.md` ~1636 | Email diagram: "Haiku LLM" → "Cloud LLM" |
| `llm.md` ~1648 | Email scoring: add Gemini as default |
| `llm.md` ~1666 | Scorer description: "Ollama/Haiku" → "Gemini/Ollama/Haiku" |
| `llm.md` ~3598 | @golems/shared: "Haiku, Ollama" → "Gemini, Ollama, GLM, MLX" |
| `llm.md` ~3634 | LLM_BACKEND list: add `gemini` first |
| `architecture.md` ~141 | Hybrid mode: `LLM_BACKEND=haiku` → `gemini` |
| `golems/email.md` ~16 | Email diagram: "Haiku LLM" → "Cloud LLM" |
| `golems/email.md` ~28 | Scoring text: add Gemini |
| `golems/email.md` ~46 | Scorer: "Ollama/Haiku" → multi-backend |
| `golems/email.md` ~110 | Env example: `LLM_BACKEND=haiku` → `gemini` |
| `golems/recruiter.md` ~194 | Env example: `LLM_BACKEND=haiku` → `gemini` |
| `golems/teller.md` ~138 | Env example: `LLM_BACKEND=haiku` → `gemini` |
| `golems/job-golem.md` ~92 | Env example: `LLM_BACKEND=haiku` → `gemini` |
| `packages/shared.md` ~74-76 | LLM backend order: list gemini first |

### From Audit #1 — Classify table

| File | Fix |
|------|-----|
| `packages/zikaron.md` | Add `dir_listing` (LOW, structure only) to Classify table |
| `llm.md` | Add `dir_listing` to Zikaron classify table |

### From Audit #4 — Shared package gaps

| File | Fix |
|------|-----|
| `packages/shared.md` | Add 5 missing email MCP tools to table |
| `packages/shared.md` | Mention `auth-server.ts` in Whoop section |
| `packages/shared.md` | Update "7 email tools" → "12 email tools" |

**Not fixing:** The 21 undocumented lib modules — most are internal utilities. Only document public-facing modules.

## Steps

1. Fix all 18 Haiku references in llm.md (bulk — one file, many edits)
2. Fix Haiku refs in architecture.md, email.md, recruiter.md, teller.md, job-golem.md
3. Fix Haiku ref in packages/shared.md
4. Add `dir_listing` to classify tables in zikaron.md and llm.md
5. Update email MCP tools table in shared.md (7→12 tools)
6. Add `auth-server.ts` mention in shared.md Whoop section
7. Verify no remaining stale Haiku-as-default references: `grep -r "LLM_BACKEND=haiku" packages/dashboard/content/docs/`

**Tip:** Line numbers may drift. Use grep for the target text (e.g. `grep -n '"backend": "haiku"' llm.md`) rather than relying on line numbers.

## Depends On

- None (first phase)

## Status

- [ ] Fix Haiku refs in llm.md
- [ ] Fix Haiku refs in 5 other files
- [ ] Fix Haiku ref in shared.md
- [ ] Add dir_listing to classify tables
- [ ] Update email MCP tools (7→12)
- [ ] Add auth-server.ts to Whoop section
- [ ] Verify grep clean
