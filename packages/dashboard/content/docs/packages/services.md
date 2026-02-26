---
title: "Services — Infrastructure Layer"
description: "Night Shift, Morning Briefing, Cloud Worker, Doctor health checks, Wizard setup, and ecosystem tooling."
---

# Services

> Cross-cutting infrastructure — Night Shift, Briefing, Cloud Worker, and ecosystem management tools.

## What It Does

The Services package contains **infrastructure that doesn't belong to any single golem**: the Cloud Worker orchestrator running on Railway, the Night Shift autonomous coding engine, the Morning Briefing generator, health checks (Doctor), and the guided setup experience (Wizard).

## Night Shift (4am)

Runs daily at 4am via macOS launchd. For each target repo:

1. Scans for TODOs, issues, and improvement opportunities
2. Creates a git worktree for isolation
3. Implements fixes using Claude Code
4. Runs full test suite
5. CodeRabbit review — must pass
6. Creates PR automatically
7. Sends morning briefing with results

Target repos rotate: songscript > zikaron > golems. Configurable via `/tonight` Telegram command.

## Morning Briefing (8am)

Daily summary sent to Telegram. Aggregates:

- Night Shift results (PRs created, fixes applied)
- Pending emails by urgency
- New job matches
- Overdue follow-ups
- Calendar events for the day
- Daily plan from CoachGolem

## Cloud Worker (Railway)

Single Railway service running all cloud golems on timezone-aware schedules (Israel time):

| Schedule | Service | Description |
|----------|---------|-------------|
| Hourly 6am-7pm (skip noon) + 10pm | Email poller | Fetch Gmail, score, route |
| 6am, 9am, 1pm (Sun-Thu) | Job scraper | Scrape boards, match, sync |
| 5x daily (7am, 10am, 2pm, 5pm, 8pm) | Whoop sync | Sync biometrics to `whoop_snapshots` |
| 8am daily | Briefing | Morning summary to Telegram |
| 2am daily | Soltome learner | Scrape posts, learn patterns |

**Endpoints:**
- `GET /` — Health check (port 8080)
- `GET /usage` — API call stats, token counts, cost breakdown

## Ecosystem Tools

| Tool | Command | Description |
|------|---------|-------------|
| Wizard | `golems wizard` | Guided 7-phase setup for new users |
| Doctor | `golems doctor` | Health checks for all services and wiring |
| Status | `golems status` | All-golem status overview |

## Additional Services

- **Session Archiver** — Archives Claude Code session transcripts for Zikaron indexing
- **Bedtime Guardian** — Evening wind-down reminders
- **Health Check** — 9am service health verification
- **CLI Helpers** — Wrappers for Cursor, Gemini, Kiro CLI agents

## Dependencies

- `@golems/shared` — Supabase, event log, state store, LLM, telegram-direct
- `@golems/jobs` — Job scraping (used by cloud worker)
- `@golems/coach` — Daily plan generation (used by briefing)
- `googleapis` — Google APIs

## Source

[`packages/services/`](https://github.com/EtanHey/golems/tree/master/packages/services)
