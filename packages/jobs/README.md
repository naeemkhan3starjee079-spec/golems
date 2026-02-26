# @golems/jobs

JobGolem — job board scraping, matching, and application tracking.

## What It Does

- Scrapes job boards (LinkedIn, Indeed, etc.) on a schedule
- Matches listings against a profile using LLM scoring (1-10)
- Syncs results to Supabase
- Provides MCP server for querying matches

## Schedule

Runs via Railway cloud worker: 6am + 9am + 1pm, Sun-Thu.

See [CLAUDE.md](./CLAUDE.md) for full architecture and MCP tools.
