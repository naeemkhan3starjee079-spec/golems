# @golems/coach

CoachGolem — daily schedule planning, calendar integration, and life coaching.

## What It Does

- Reads status from all other golems
- Integrates with Google Calendar
- Generates daily plans with priority-sorted tasks
- Sends morning nudges and evening wrap-ups via Telegram
- Tracks compliance with weekly summaries

## Design Principle

CoachGolem is **read-only** — it reads other golems' state but never invokes them. It suggests priorities; the human decides.

See [CLAUDE.md](./CLAUDE.md) for full architecture, types, and wiring.
