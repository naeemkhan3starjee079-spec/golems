<h1 align="center">Golems</h1>

<p align="center">
  <strong>AI agents that run while you sleep.</strong><br />
  <sub>Job scraping. Email triage. Tax tracking. Code at 4am. All reported via Telegram.</sub>
</p>

<p align="center">
  <a href="https://etanheyman.com/golems/"><img src="https://img.shields.io/badge/docs-live-1a1a2e?style=flat-square&logo=vercel" alt="Docs" /></a>
  <a href="packages/ralph/"><img src="https://img.shields.io/badge/ralph-autonomous_coding-7b2ff7?style=flat-square" alt="Ralph" /></a>
  <a href="packages/zikaron/"><img src="https://img.shields.io/badge/zikaron-memory_layer-0f3460?style=flat-square" alt="Zikaron" /></a>
</p>

---

## What is this?

Golems is a personal AI agent ecosystem built as a **Bun workspace monorepo**. Three domain golems handle different parts of your life — recruitment, finances, scheduling — coordinated by ClaudeGolem through a Telegram group.

Your Mac runs the brain (Telegram bot, Night Shift, memory). Railway runs the body (email polling, job scraping, briefings).

Every conversation and decision gets indexed into searchable memory via [Zikaron](packages/zikaron/).

---

## Quick Start

```bash
git clone https://github.com/EtanHey/golems.git && cd golems
bun install
golems wizard      # Interactive setup — picks services, wires keys
golems status      # See what's running
```

**[Full docs →](https://etanheyman.com/golems/)**

---

## Architecture

Three **domain golems** + an **orchestrator** + **service layers**.

### Golems (Autonomous Agents)

| | Golem | Domain | What it does |
|---|---|---|---|
| 👔 | **RecruiterGolem** | Recruitment | Finds contacts via GitHub + Exa + Hunter. Outreach campaigns. 7 interview practice modes with Elo tracking. |
| 💰 | **TellerGolem** | Finance | Categorizes transactions for tax. Payment failure alerts. Monthly expense reports. |
| 🗓️ | **CoachGolem** | Scheduling | Calendar management. Daily plans. Reads status from all other golems. |

### Orchestrator

| | Component | Role |
|---|---|---|
| 🤖 | **ClaudeGolem** | Persistent Telegram bot. Routes messages to golems. Manages Night Shift + briefings. |

### Service Layers

| Component | Role |
|---|---|
| **Jobs** | Background job scraping (Indeed, SecretTLV, Drushim, Goozali). Feeds RecruiterGolem. |
| **Email** | Scores incoming email 0-10. Routes to domain golems. Drafts replies. |
| **Night Shift** | Runs at 4am. Scans repos for TODOs, creates PRs, sends morning briefing. |
| **Shared** | Supabase, LLM abstraction, state store, notifications, event log. |

---

## Packages

```
golems/
├── packages/
│   ├── claude/         # ClaudeGolem — Telegram bot + orchestrator
│   ├── recruiter/      # RecruiterGolem — outreach, contacts, interview practice
│   ├── teller/         # TellerGolem — finance, tax, subscriptions
│   ├── coach/          # CoachGolem — calendar, daily plans
│   ├── jobs/           # Job scraping service (feeds RecruiterGolem)
│   ├── shared/         # Supabase, LLM, email, state, notifications
│   ├── services/       # Night Shift, Briefing, Cloud Worker, Doctor, Wizard
│   ├── content/        # Content creation skills (LinkedIn, ghostwriting)
│   ├── autonomous/     # Legacy test host (test files only)
│   ├── ralph/          # Autonomous coding loop (PRD → stories → code → review)
│   └── zikaron/        # Memory layer (226k+ chunks, semantic search)
├── skills/             # 34 golem-powers skills in 6 categories
├── contexts/           # Shared Claude context files
├── launchd/            # macOS service plists
└── Dockerfile          # Railway deployment
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| **Runtime** | Bun + TypeScript |
| **LLM** | Claude Code (Opus/Sonnet/Haiku), Gemini CLI, Cursor CLI |
| **Database** | Supabase (Postgres + RLS) |
| **Memory** | sqlite-vec + bge-large-en-v1.5 embeddings (226k+ chunks) |
| **Cloud** | Railway (Docker) |
| **Local** | macOS launchd services |
| **Bot** | grammY (Telegram) |
| **Testing** | Bun test (1179 tests, 4054 assertions) |
| **CI/CD** | GitHub Actions + CodeRabbit + DeepSource |

---

## Deployment

| Environment | What Runs |
|-------------|-----------|
| **Mac (brain)** | Telegram bot, Night Shift, Zikaron, notification server |
| **Railway (body)** | Email poller, job scraper, briefing, cloud LLM (Haiku) |
| **Supabase** | Database, auth, storage |

```
  You ←── Telegram ──→ ClaudeGolem (Mac)
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ Recruiter│  │  Teller  │  │  Coach   │
       │  Golem   │  │  Golem   │  │  Golem   │
       └──────────┘  └──────────┘  └──────────┘
             │              │              │
             └──────┬───────┴──────┬───────┘
                    ▼              ▼
             ┌──────────┐  ┌──────────┐
             │ Services │  │  Zikaron │
             │ (Railway)│  │ (memory) │
             └──────────┘  └──────────┘
```

---

## Telegram

Two topics in the group:
- **General** — interactive ClaudeGolem chat
- **Alerts** — all one-way notifications (jobs, email, nightshift, health)

Commands: `/status` `/trigger` `/tonight` `/morning` `/jobs` `/admin`

---

## CLI

```bash
golems status          # Service overview
golems doctor          # Health checks
golems wizard          # Guided setup
golems skills          # List all skills
golems scrape          # Trigger job search
golems logs telegram   # View service logs
```

---

## Links

- **[Documentation](https://etanheyman.com/golems/)** — interactive docs
- **[@GolemZikaronBot](https://t.me/GolemZikaronBot)** — Telegram bot
- **[etanheyman.com](https://etanheyman.com)** — portfolio

---

<sub>Built by <a href="https://github.com/EtanHey">@EtanHey</a> with Claude Code. Golems write code at 4am so you don't have to.</sub>
