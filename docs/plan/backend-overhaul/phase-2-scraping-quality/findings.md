# Phase 2 Findings

## Data Quality Audit (Supabase golem_jobs)

| Source | Total | No Description | ID-like Titles | No Company | Avg Desc Len |
|--------|-------|---------------|----------------|------------|-------------|
| **secretTLV** | 35 | **35 (100%)** | 0 | **22 (63%)** | 0 |
| **drushim** | 67 | **17 (25%)** | **17 (25%)** | 0 | 277 |
| **indeed** | 42 | 0 | 0 | 0 | 744 |
| **goozali** | 28 | 1 | 0 | 0 | 196 |

## Root Causes Found

### SecretTLV (100% broken)

- HTML structure changed — site uses WPJobBoard WordPress plugin
- Old regex patterns looked for `class="description"` divs — page uses `<h3>Description</h3>` + `<p>` tags
- Company name appears as text near logo image, not in labeled elements
- **Fix**: Pages have `<script type="application/ld+json">` with full JobPosting schema

### Drushim (25% broken)

- `og:title` regex expected `property="og:title" content="..."` but actual HTML has different attribute order
- Some pages return redirects without og tags, falling back to `Job #ID`
- Plain `fetch()` was used instead of `fetchWithRetry` (no retry on rate limits)
- **Fix**: Pages have JSON-LD JobPosting schema with company, description, location

### Indeed (good) — no changes needed

### Goozali (decent) — only 1/28 missing description, acceptable

## Changes Made

### SecretTLV scraper

- Strategy 1: Parse JSON-LD → title, company, location, description (up to 2000 chars)
- Strategy 2: Improved regex fallback (company from URL slug, description from `<h3>Description</h3>`)

### Drushim scraper

- Strategy 1: Parse JSON-LD JobPosting schema
- Strategy 2: Flexible og:title regex + `<title>` fallback
- Switched from plain `fetch()` to `fetchWithRetry`

### Activity logging

- Created `scrape_activity` table (migration 006)
- Each source logs: total_found, errors, quality metrics, duration
- Fire-and-forget via lazy import

## Decision: No Playwright Needed
Both SecretTLV and Drushim serve JSON-LD server-side. No JS rendering required.

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Audit scraper quality per source | opus | done |
| Check if Playwright needed | opus | done (not needed) |
| Design scrape_activity schema | opus | done (migration 006) |
| Implement activity logging | opus | done |
| Fix SecretTLV scraper | opus | done (JSON-LD) |
| Fix Drushim scraper | opus | done (JSON-LD + retry) |
