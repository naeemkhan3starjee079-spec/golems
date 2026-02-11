# RecruiterGolem

> Job outreach pipeline — contact finding, style-adapted messaging, interview practice, and Elo-rated skill tracking.

## Role

RecruiterGolem handles the **active job search** side: finding contacts at companies, drafting personalized outreach messages, tracking conversations, and running interview practice sessions with Elo ratings.

## Architecture

```text
packages/recruiter/
├── src/
│   ├── composer.ts              # Grammy Composer: /practice, /stats, /outreach, /followup + callbacks
│   ├── index.ts                 # getStatus() for CoachGolem reads
│   ├── contact-finder.ts        # Find hiring managers via web search
│   ├── draft-outreach.ts        # Style-adapted outreach messages
│   ├── style-adapter.ts         # Match communication style to recipient
│   ├── auto-outreach.ts         # Automated outreach pipeline
│   ├── outreach.ts              # Outreach orchestration
│   ├── outreach-db.ts           # SQLite outreach storage (local)
│   ├── outreach-db-cloud.ts     # Supabase outreach storage (cloud)
│   ├── practice-db.ts           # SQLite practice storage (local)
│   ├── practice-db-cloud.ts     # Supabase practice storage (cloud)
│   ├── elo.ts                   # Elo rating system for interview skills
│   ├── company-research.ts      # Company research for outreach context
│   ├── obsidian-export.ts       # Export outreach data to Obsidian vault
│   └── __tests__/               # Recruiter-specific tests
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/recruiter
```

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM, state store

## Key Patterns

### Outreach Pipeline (E1-E6)
1. **E1: Contact Finder** — Web search for hiring managers at target companies
2. **E2: Outreach DB** — Track contacts, messages, response status
3. **E3: Style Adapter** — Match tone/formality to recipient profile
4. **E4: Auto-Outreach** — Automated pipeline for high-score (8+) job matches
5. **E5: Company Research** — Enrich outreach with company context
6. **E6: Obsidian Export** — Export pipeline data for review

### Dual Storage
- `outreach-db.ts` / `practice-db.ts` — SQLite for local development
- `outreach-db-cloud.ts` / `practice-db-cloud.ts` — Supabase for cloud (Railway)
- Switch via `STATE_BACKEND=file|supabase` env var

### Interview Practice
- 7 interview modes (behavioral, technical, system design, etc.)
- Elo rating tracks skill progression per category
- Practice sessions stored in Supabase for cross-device continuity

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/practice` | Start interview practice session |
| `/stats` | Show Elo ratings and practice history |
| `/outreach` | View/manage outreach pipeline |
| `/followup` | Check overdue follow-ups |

## Email Routing

Emails categorized as `job` or `interview` are routed to RecruiterGolem by the email router (`@golems/shared/email/router`).
