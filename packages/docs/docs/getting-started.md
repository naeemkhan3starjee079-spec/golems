---
sidebar_position: 1
---

# Getting Started

## What is Golems?

Golems is an autonomous AI agent ecosystem built for Claude Code. It's a monorepo of domain-expert agents (RecruiterGolem, EmailGolem, ContentGolem, ClaudeGolem) powered by:

- **Infrastructure:** Supabase (data), Railway (cloud compute), Telegram (notifications), Zikaron (memory layer)
- **Local Engine:** Mac-based night shift, telegram bot, notification server
- **Cloud Worker:** Remote email polling, job scraping, briefing generation
- **Core Principle:** Golems are domain experts, not I/O channels — they own specific knowledge areas and produce specialized outputs

## Architecture Principle

A Golem is a domain expert focused on one area. It doesn't care about how messages arrive (Telegram, email, HTTP) — it cares about solving problems in its domain.

```
┌──────────────────────────┐
│ RecruiterGolem           │ ← Outreach strategy, contact scoring
│ EmailGolem               │ ← Email routing, reply drafting, follow-ups
│ ContentGolem             │ ← Writing, ghostwriting, personalization
│ ClaudeGolem              │ ← Code review, PR comments, PR descriptions
└──────────────────────────┘
         ↓
   Shared Infrastructure
   (Supabase, Telegram, Railway)
```

Each Golem operates independently. Multiple Golems can process the same event. The infrastructure handles routing and notifications.

## Prerequisites

Before you start, ensure you have:

- **Bun** (v1.0+) — runtime and package manager
- **1Password CLI** (`op` command) — secret management
- **Claude Code** — the IDE
- **GitHub** — repo access (SSH key configured)
- **Node.js** 20+ (installed with Bun)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/golems.git
cd golems
bun install
```

### 2. Configure Secrets

Store secrets in 1Password (not `.env`):

```bash
# Create 1Password items in your vault:
# - ANTHROPIC_API_KEY (can name it anything, e.g., "Golems Claude API")
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - TELEGRAM_BOT_TOKEN
# - TELEGRAM_CHAT_ID

# Load them into shell:
export ANTHROPIC_API_KEY=$(op read op://YOUR_VAULT/YOUR_ANTHROPIC_ITEM/credential)
export SUPABASE_URL=$(op read op://YOUR_VAULT/YOUR_SUPABASE_ITEM/url)
export SUPABASE_ANON_KEY=$(op read op://YOUR_VAULT/YOUR_SUPABASE_ITEM/anon_key)
# ... etc
```

### 3. Start Golems

```bash
# From golems/packages/autonomous
bun src/cli/golems.ts status

# Expected output:
# ✓ Golems CLI v2.0
# ✓ Email Golem: running
# ✓ Telegram Bot: connected
# ✓ Night Shift: idle
```

### 4. Run Your First Agent

```bash
# Route an email through EmailGolem
bun src/email-golem/router.ts

# Start the Telegram bot
bun src/telegram/bot.ts

# Trigger night shift improvements
bun src/night-shift/runner.ts --target songscript
```

## Monorepo Structure

```
golems/
├── packages/
│   ├── autonomous/          ← Main app: Telegram bot, Golems, local runners
│   │   ├── src/
│   │   │   ├── *-golem/    ← Recruiter, Email, Content, Claude
│   │   │   ├── telegram/   ← Bot + command handlers
│   │   │   ├── night-shift/ ← Autonomous improvements
│   │   │   ├── mcp/        ← MCP servers (zikaron, email, jobs)
│   │   │   └── cli/        ← CLI entry points
│   │   ├── tests/          ← Unit tests
│   │   └── src/lib/        ← Shared utilities
│   │
│   ├── ralph/              ← Claude Code autonomous loop
│   │   ├── skills/         ← 6 skill categories
│   │   └── src/            ← Loop runner, story parser
│   │
│   ├── zikaron/            ← Memory layer (semantic search)
│   │   ├── src/            ← FastAPI daemon + Python CLI
│   │   └── data/           ← sqlite-vec embeddings
│   │
│   └── docs/               ← This site (Docusaurus)
│       └── docs/           ← Markdown files
│
├── supabase/
│   ├── migrations/         ← SQL schema changes
│   └── functions/          ← Edge Functions
│
└── Dockerfile              ← Railway cloud worker image
```

## Next Steps

1. **Read Architecture** — understand Mac vs Cloud split in `/docs/architecture.md`
2. **Configure Cloud** — set up Supabase and Railway in `/docs/deployment.md`
3. **Explore Golems** — dive into each domain expert in `/docs/golems/`
4. **Join Development** — run tests, create PRs, use Ralph for autonomous stories

## Troubleshooting

**Golems status shows disconnected:**
```bash
# Check env vars loaded
op read op://YOUR_VAULT/YOUR_TELEGRAM_ITEM/credential

# Restart services
bun src/cli/golems.ts restart
```

**Tests failing:**
```bash
# Clear cache and reinstall
rm -rf bun.lock node_modules
bun install
bun test
```

**Memory issues (Node.js OOM):**
```bash
# Increase heap limit for long-running sessions
export NODE_OPTIONS="--max-old-space-size=8192"
bun src/night-shift/runner.ts
```

See `/docs/configuration.md` for detailed setup guides.
