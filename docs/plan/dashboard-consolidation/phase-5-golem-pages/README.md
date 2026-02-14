# Phase 5: Per-Golem Detail Pages

> [Back to main plan](../README.md)

## Goal
Add dedicated pages for each domain golem showing their specific data, actions, and status.

## Tools
- **Research:** gemini — review admin golem pages for existing patterns
- **Code:** cursor/opus — new dashboard pages
- **Design:** **`/frontend-design` skill** (MANDATORY) — for all 4 golem detail pages (recruiter, jobs, emails, teller)
- **MCPs:** supabase

## Steps

1. **Create `/recruiter` page** — Contact pipeline status, outreach stats, practice Elo, recent matches. **USE `/frontend-design` SKILL.**
2. **Create `/jobs` page** — Job scraping results, match scores, saved jobs, scrape schedule. **USE `/frontend-design` SKILL.**
3. **Create `/emails` page** — Recent emails, triage scores, routing decisions, drafts. **USE `/frontend-design` SKILL.**
4. **Create `/teller` page** — Subscription tracking, cost overview, transaction categorization. **USE `/frontend-design` SKILL.**
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
