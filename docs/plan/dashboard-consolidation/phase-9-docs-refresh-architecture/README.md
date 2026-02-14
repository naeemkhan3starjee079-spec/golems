# Phase 9: Docs Refresh — Architecture

> [Back to main plan](../README.md)

## Goal
Update all architecture documentation to reflect current reality after dashboard consolidation and pipeline hookup.

## Tools
- **Research:** gemini — audit existing docs against codebase
- **Code:** cursor — markdown edits
- **MCPs:** zikaron (search for recent architecture decisions)

## Steps

1. **Update `architecture.md`** — Reflect current monorepo structure (13 packages), deployment topology (Mac + Railway + Vercel), data flow between services.
2. **Update `cloud-worker.md`** — Current Railway deployment, schedule, health endpoints, Gemini backend.
3. **Update `llm.md`** — Add all current models: Haiku (cloud worker), Gemini Flash-Lite (cloud worker), GLM-4.7-Flash (local enrichment), Flux (local image gen). Document routing logic.
4. **Update `mcp-tools.md`** — All 7 MCP servers with current tool counts and descriptions.
5. **Create `dashboard.md`** — New doc page explaining the consolidated dashboard, all pages, data sources.
6. **Create `content-pipelines.md`** — Detailed explanation of each pipeline with flow diagrams (the Phase 8 diagrams, in text form for docs).

## Depends On
- Phase 8 (pipeline hookup must be done to document accurately)

## Status
- [ ] architecture.md
- [ ] cloud-worker.md
- [ ] llm.md
- [ ] mcp-tools.md
- [ ] dashboard.md (new)
- [ ] content-pipelines.md (new)
