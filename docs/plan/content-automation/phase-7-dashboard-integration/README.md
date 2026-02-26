# Phase 7: Dashboard Integration

> [Back to main plan](../README.md)

## Goal

Add a "Content" tab to the Ops Dashboard showing pipeline status, recent outputs, n8n workflow runs, and a per-project content gallery.

## Tools

- **Research:** gemini — "Next.js media gallery component, n8n API dashboard integration"
- **Code:** cursor — Next.js pages, API routes, components
- **MCPs:** supabase (content metadata, workflow logs)

## Steps

1. Add "Content" nav item to dashboard sidebar
2. Content overview page:
   - Pipeline status cards (Remotion healthy? ComfyUI online? n8n running?)
   - Recent outputs: thumbnail grid of last 20 generated items
   - Quick stats: total renders, avg render time, most-used pipeline
3. Per-project gallery:
   - Browse by project (golems-showcase, techgym, political-merch)
   - Filter by pipeline type, date, output format
   - Click to view full-size + metadata (prompt, pipeline, render time, brand config)
4. n8n workflow viewer:
   - List active workflows
   - Recent execution history (success/fail/pending)
   - Click execution → detailed step-by-step log
   - Trigger workflow from dashboard (with Telegram approval still required)
5. Content request form:
   - Text input: describe what you want
   - Pipeline suggestion (auto-selected by routing logic)
   - Override: manually pick pipeline
   - Submit → triggers n8n workflow → status updates in real-time
6. Store content metadata in Supabase: prompt, pipeline, output_url, project, created_at, quality_score

## Depends On

- Phase 4 (n8n must be running)
- Phase 6 (pipeline intelligence for routing suggestions)
- Dashboard Phase 8 (hybrid multi-tenant for auth)

## Status

- [x] "Content" nav item + page shell — sidebar.tsx + app/content/page.tsx
- [x] Pipeline status cards — available pipelines with live stats from Supabase
- [x] Recent pipeline runs list — scrollable list with success/fail, duration, quality
- [x] Content request form — idea input → AI routing → pipeline suggestion with confidence
- [x] Zikaron daemon API routes — /content/pipeline-runs, /content/pipeline-stats
- [x] Pipeline performance stats — per-pipeline aggregation (runs, success rate, avg time)
- [ ] Per-project gallery with filters — deferred (needs content storage)
- [ ] n8n workflow viewer — deferred (needs n8n API integration)
- [ ] Supabase content metadata table — deferred (pipeline_runs covers tracking)
