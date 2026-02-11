# Golems Monorepo

> Autonomous AI agent ecosystem — Bun workspace with 10 packages. Each golem is a self-contained CC plugin.

---

## Packages

| Package | CLAUDE.md | Purpose |
|---------|-----------|---------|
| **@golems/shared** | [`packages/shared/`](packages/shared/CLAUDE.md) | Supabase, LLM, email, state, notifications |
| **@golems/claude** | [`packages/claude/`](packages/claude/CLAUDE.md) | Telegram bot, orchestrator, external face |
| **@golems/jobs** | [`packages/jobs/`](packages/jobs/CLAUDE.md) | Job scraping, matching, ATS |
| **@golems/recruiter** | [`packages/recruiter/`](packages/recruiter/CLAUDE.md) | Outreach, interview practice, contacts |
| **@golems/teller** | [`packages/teller/`](packages/teller/CLAUDE.md) | Finance, subscriptions, tax |
| **@golems/content** | [`packages/content/`](packages/content/CLAUDE.md) | LinkedIn, Soltome, ghostwriting |
| **@golems/coach** | [`packages/coach/`](packages/coach/CLAUDE.md) | Calendar, schedule, life planning |
| **@golems/services** | [`packages/services/`](packages/services/CLAUDE.md) | Night Shift, Briefing, Cloud Worker, Doctor, Wizard |
| **ralph** | [`packages/ralph/`](packages/ralph/CLAUDE.md) | Autonomous coding loop (PRD execution) |
| **zikaron** | [`packages/zikaron/`](packages/zikaron/CLAUDE.md) | Memory layer (Python + sqlite-vec) |

**Always read the package-specific CLAUDE.md when working in that package.**

---

## Architecture

```
golems/                              # Bun workspace monorepo
├── packages/shared/                 # @golems/shared — extracted utilities
├── packages/claude/                 # ClaudeGolem — orchestrator + Telegram
├── packages/recruiter/              # RecruiterGolem — outreach, practice
├── packages/teller/                 # TellerGolem — finances, categorization
├── packages/jobs/                   # JobGolem — scraping, ATS, matching
├── packages/content/                # ContentGolem — LinkedIn, Soltome
├── packages/coach/                  # CoachGolem — schedule, calendar
├── packages/services/               # Night Shift, Briefing, Cloud Worker
├── packages/autonomous/             # Legacy stranglers (1-line re-exports)
├── launchd/                         # macOS service plists
├── Dockerfile                       # Root workspace Dockerfile (Railway)
└── railway.json                     # Railway deploy config
```

### Key Relationships

- **ClaudeGolem** registers Composers from Jobs + Recruiter for Telegram commands
- **CoachGolem** reads getStatus() from Jobs, Recruiter, Teller (read-only)
- **Services** (briefing) imports from Coach for daily plan generation
- **Cloud Worker** runs Jobs + Email golems on Railway schedules
- **All packages** depend on Shared for Supabase, LLM, state, notifications

---

## Development

```bash
# Install all workspace deps
bun install

# Run all tests
bun test

# Work on a specific package
cd packages/claude && cat CLAUDE.md

# Run telegram bot locally
bun packages/claude/src/telegram-bot.ts

# CLI
golems status          # Service overview
golems doctor          # Health checks
golems wizard          # Guided setup
```

---

## Deployment

| Environment | What Runs | Where |
|-------------|-----------|-------|
| **Local (Mac)** | Telegram bot, Night Shift, Briefing | launchd plists |
| **Railway** | Email poller, Job scraper, Soltome learner | Cloud Worker |
| **Supabase** | Database, auth, storage | Cloud |

---

## Shared Resources

| Path | Purpose |
|------|---------|
| `contexts/` | Shared Claude context files |
| `skills/golem-powers/` | Skills (symlinked to ralph) |
| `docs/plan/` | Active plans and phase tracking |
| `launchd/` | macOS launchd service plists |

---

## Communication Style

Based on Zikaron analysis of owner's patterns:
- **Formality:** 2/10 - Very casual
- **Length:** Brief, direct
- **Tone:** Friendly, sometimes playful

See `packages/claude/SOUL.md` for bot persona.
