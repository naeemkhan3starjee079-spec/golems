# Phase 2: Scraping Quality

> [Back to plan](../README.md)

## Goal

Ensure jobs come in with full content (titles, descriptions, not IDs). Add page-load waiting where needed. Create activity/audit log so scrape quality is visible.

## Current State

- SecretTLV: Has 24h cache + retry — quality unknown (titles were IDs before, supposedly fixed)
- Drushim: Scrapes cat5/cat6/cat24, checks for inactive jobs — needs verification
- Indeed: Uses ts-jobspy, 25 results per search — quality unknown
- Goozali: Parses Telegram posts — emoji-based parsing is fragile
- NO activity logging — only console.log, no record of what was scraped vs dropped
- scraper.ts is 885 lines — complex, needs audit

## Tools

- **Research:** `cursor agent -p @codebase` — audit scraper.ts quality, find where content is lost
- **Code:** Direct edits

## Steps

1. [ ] Audit each scraper source with cursor @codebase:
   - Where does title become an ID? Is it still happening?
   - Which sources return truncated/missing descriptions?
   - Where do we need to wait for page load (JS-rendered content)?
2. [ ] Add Playwright/puppeteer for JS-heavy sites that need page load wait
   - SecretTLV and Indeed may need this if they're SPA-rendered
3. [ ] Create `scrape-activity` Supabase table (migration):
   - `source`, `run_at`, `total_found`, `new_saved`, `duplicates_skipped`, `errors`, `avg_description_length`
4. [ ] Add activity logging to each scraper run:
   - Log to Supabase after each source completes
   - Track: jobs found, new vs duplicate, description quality (length, has_title, has_company)
5. [ ] Add description quality check — flag jobs with <50 char descriptions or ID-like titles
6. [ ] Tests for activity logging

## Depends On

- Phase 1 (Haiku wiring — so scored jobs have LLM quality assessment)

## Provides to Admin UI

- `scrape_activity` table for Activity Log view
- Quality flags on jobs (missing description, ID-like title)

## Status

- [x] Scraper audit (cursor @codebase)
- [x] Page-load waiting (Playwright if needed) — not needed, JSON-LD is server-side
- [x] scrape_activity migration
- [x] Activity logging per source
- [x] Description quality checks
- [x] Tests
