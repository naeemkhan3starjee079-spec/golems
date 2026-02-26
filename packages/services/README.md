# @golems/services

Infrastructure services — Night Shift, Briefing, Cloud Worker, and ecosystem tools.

## What It Does

- **Cloud Worker** — Railway entry point running email/job golems on schedules
- **Night Shift** — 4am autonomous code improvements via Claude
- **Morning Briefing** — 8am summary to Telegram
- **Bedtime Guardian** — Evening wind-down reminders
- **Doctor** — `golems doctor` health checks
- **Wizard** — `golems wizard` guided setup

## Deployment

Local services run via launchd. Cloud worker runs on Railway.

See [CLAUDE.md](./CLAUDE.md) for schedules, env vars, and architecture.
