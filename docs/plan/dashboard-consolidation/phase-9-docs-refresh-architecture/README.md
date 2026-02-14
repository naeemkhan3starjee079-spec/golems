# Phase 9: Docs Refresh — Architecture + Rendering Parity

> [Back to main plan](../README.md)

## Goal
Update architecture documentation. Centralize dashboard types. Build unified docs rendering so dashboard and portfolio show the same content with the same formatting.

## User Requirements (Feb 2026)

1. **Types not inlined — centralize.** All page-level types (PipelineRun, PipelineStat, RoutingResult, FlowStep, etc.) should live in `src/lib/types/` or `src/lib/types.ts`, not scattered across pages. Centralize shared helpers too.
2. **Docs rendering parity.** Dashboard docs (`/docs/*`) should render identically to portfolio docs (`etanheyman.com/golems/docs/*`). Same padding, same syntax highlighting, same typography. Colors can differ. One source of truth, two views.
3. **Portfolio docs embedded in dashboard.** The terminal hero page, mascot, journey — all should be viewable and editable from the dashboard. Same markdown source, same rendering tech.
4. **Not "just text floating around."** The current `marked` rendering produces unstyled prose. Need proper prose styling (tailwind typography plugin or custom CSS), code block syntax highlighting, consistent spacing.

## Tools
- **Research:** gemini — audit existing docs against codebase, compare portfolio vs dashboard rendering
- **Code:** cursor — markdown edits, type centralization
- **Design:** `/frontend-design` skill — docs page typography and layout
- **MCPs:** zikaron (search for recent architecture decisions)

## Steps

### Part A: Code Quality
1. **Centralize dashboard types** — Move all inlined types from every page component to `src/lib/types/`. Audit: content, ops, backlog, jobs, emails, recruiter, teller, tokens, enrichment, notifications pages. Create one type file per domain or one big `types.ts`.
2. **Centralize shared helpers** — `timeAgo()`, `formatDuration()`, format utilities repeated across pages → `src/lib/format.ts` (already exists but may be incomplete).

### Part B: Docs Rendering Parity
3. **Audit portfolio docs rendering** — How does `etanheyman.com/golems/docs/*` render markdown? What CSS/layout/syntax highlighting does it use? Screenshot both and compare.
4. **Choose rendering strategy** — Options:
   - **A) Shared component library** — Extract docs renderer into shared React components used by both portfolio and dashboard
   - **B) Dashboard embeds portfolio** — Dashboard's `/docs/*` pages iframe or redirect to portfolio docs
   - **C) Portfolio pulls from dashboard** — Portfolio reads from same `content/docs/` directory, uses same rendering
   - **D) Tailwind Typography plugin** — Add `@tailwindcss/typography` to dashboard, style docs with `prose` classes to match portfolio's formatting
5. **Implement chosen strategy** — Build the unified rendering pipeline.
6. **Add syntax highlighting** — `shiki` or `prism` for code blocks. Both dashboard and portfolio must use the same highlighter + theme.
7. **Verify parity** — Side-by-side screenshots of the same doc page in both views.

### Part C: Architecture Docs Content
8. **Update `architecture.md`** — Reflect current monorepo structure (13 packages), deployment topology (Mac + Railway + Vercel), data flow between services.
9. **Update `cloud-worker.md`** — Current Railway deployment, schedule, health endpoints, Gemini backend.
10. **Update `llm.md`** — Add all current models: Haiku, Gemini Flash-Lite, GLM-4.7-Flash, Flux. Document routing logic.
11. **Update `mcp-tools.md`** — All 7 MCP servers with current tool counts and descriptions.
12. **Create `dashboard.md`** — New doc page explaining the consolidated dashboard, all pages, data sources.
13. **Create `content-pipelines.md`** — Detailed explanation of each pipeline with flow diagrams.

## Depends On
- Phase 8 (pipeline hookup must be done to document accurately)

## Status

### Part A: Code Quality
- [ ] Centralize dashboard types
- [ ] Centralize shared helpers

### Part B: Docs Rendering Parity
- [ ] Audit portfolio docs rendering
- [ ] Choose rendering strategy
- [ ] Implement unified rendering
- [ ] Add syntax highlighting
- [ ] Verify parity (side-by-side)

### Part C: Architecture Docs
- [ ] architecture.md
- [ ] cloud-worker.md
- [ ] llm.md
- [ ] mcp-tools.md
- [ ] dashboard.md (new)
- [ ] content-pipelines.md (new)
