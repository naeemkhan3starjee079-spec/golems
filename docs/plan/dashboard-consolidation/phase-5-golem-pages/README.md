# Phase 5: Per-Golem Detail Pages

> [Back to main plan](../README.md)

## Goal
Add dedicated pages for each domain golem showing their specific data, actions, and status.

## Tools
- **Research:** gemini — review admin golem pages for existing patterns
- **Code:** cursor/opus — new dashboard pages
- **MCPs:** supabase

## Steps

1. **Create `/recruiter` page** — Contact pipeline status, outreach stats, practice Elo, recent matches.
2. **Create `/jobs` page** — Job scraping results, match scores, saved jobs, scrape schedule.
3. **Create `/emails` page** — Recent emails, triage scores, routing decisions, drafts.
4. **Create `/teller` page** — Subscription tracking, cost overview, transaction categorization.
5. **Add sidebar navigation** — Group golem pages under "Golems" section in sidebar.
6. **Wire data sources** — Each page queries relevant Supabase tables (emails, golem_jobs, outreach_contacts, etc.).

## Depends On
- Phase 4 (admin migration provides the feature inventory)

## Status
- [ ] Recruiter page
- [ ] Jobs page
- [ ] Emails page
- [ ] Teller page
- [ ] Sidebar navigation
- [ ] Wire data sources
