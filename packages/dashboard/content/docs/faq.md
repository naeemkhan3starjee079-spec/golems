---
title: "FAQ"
description: "Frequently asked questions about the Golems ecosystem."
---

# FAQ

## Can I install just one golem?

Yes. Each package is self-contained with its own `plugin.json`. Install any golem as a Claude Code plugin without the rest of the ecosystem:

```bash
claude --plugin-dir ~/Gits/golems/packages/recruiter
```

The only hard dependency is `@golems/shared` for database and LLM access.

## What's the memory cost?

Zikaron uses sqlite-vec with bge-large-en-v1.5 embeddings. For 238K+ chunks, the database is approximately 1-2GB on disk. Queries run in under 2 seconds. The embedding model loads into ~1.5GB of RAM when indexing, but the MCP server uses the pre-built index (no model loaded at query time).

## Does it work without Railway?

Yes. Golems runs in three modes:

| Mode | LLM | State | Best For |
|------|-----|-------|----------|
| **Full Local** | Ollama | File-based | Testing, development |
| **Hybrid** | Haiku (cloud) | File-based | Development with better LLM |
| **Full Cloud** | Haiku (cloud) | Supabase | Production |

Set with env vars: `LLM_BACKEND`, `STATE_BACKEND`, `TELEGRAM_MODE`.

## How much does it cost to run?

Estimated monthly costs for production mode:

| Service | Cost | Notes |
|---------|------|-------|
| **Anthropic (Haiku 4.5)** | ~$5-15/mo | Email scoring, job matching, drafts. Input: $0.80/MTok, Output: $4.00/MTok |
| **Railway** | ~$5-10/mo | Cloud worker compute (email poller, job scraper, briefing) |
| **Supabase** | Free tier | Sufficient for personal use (500MB database, 50K auth users) |
| **Total** | ~$10-25/mo | Varies with usage volume |

Running fully local with Ollama costs $0/mo (just electricity).

## Can I customize the outreach style?

Yes. RecruiterGolem includes a style adapter that matches tone and formality to each recipient. Your base writing style is exported to JSON and can be edited:

- Style analysis from Zikaron session data
- Per-recipient adaptation (formal for enterprise, casual for startups)
- Anti-AI writing patterns to avoid generic-sounding messages

## How many tests does Golems have?

**1,179 tests** with **4,056 assertions** across 75+ test files. The test suite covers all packages — 6 golems plus shared infrastructure — and runs with `bun test` from the monorepo root.

## What's the tech stack?

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun (TypeScript) |
| **Bot Framework** | Grammy (Telegram) |
| **Database** | Supabase (PostgreSQL) |
| **Cloud Compute** | Railway (Docker) |
| **Local Services** | macOS launchd |
| **Memory** | Python + sqlite-vec + sentence-transformers |
| **LLM** | Anthropic Haiku 4.5 (cloud) or Ollama (local) |
| **Autonomous Loop** | Zsh (Ralph) |
| **Secrets** | 1Password CLI |

## Can I use the skills without the full ecosystem?

Yes. The 30+ skills in `skills/golem-powers/` work as standalone Claude Code plugins. Install them individually:

```bash
# Just the commit skill
cp -r ~/Gits/golems/skills/golem-powers/commit .claude/commands/

# Or install all skills
claude --plugin-dir ~/Gits/golems/skills/golem-powers
```

## Is the repo public?

Yes. The full source is at [github.com/EtanHey/golems](https://github.com/EtanHey/golems). It's built by one developer (Etan Heyman) with Claude Code as the primary implementation tool.

## What Claude Code version do I need?

Claude Code v2.1 or later. The plugin system, skill loading, and MCP server support all require v2.1+.
