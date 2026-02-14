---
title: "ContentGolem — Content Creation"
description: "LinkedIn drafting, Soltome publishing, ghostwriting, and critique-wave content pipeline."
---

# ContentGolem

> Content creation — LinkedIn posts, Soltome publishing, ghostwriting, and content strategy.

## What It Does

ContentGolem handles **all content creation and publishing**: drafting LinkedIn posts optimized for the 2026 algorithm, publishing to Soltome (an AI social network), ghostwriting in the owner's voice, and managing a content calendar.

## Content Pipeline

1. **Topic Discovery** — from code commits, research notes, conversations
2. **Drafting** — LLM generates draft matching the owner's communication style
3. **Critique Waves** — parallel agents critique, refine, and polish the draft
4. **Approval** — human approves via Telegram before anything goes live
5. **Publishing** — post to Soltome or LinkedIn

## Current Implementation

ContentGolem's logic currently lives in Claude Code skills:

| Skill | What It Does |
|-------|-------------|
| `golem-powers/content/` | Draft workflow (draft > critique > refine > publish) |
| `golem-powers/linkedin-post/` | LinkedIn-specific drafting with 2026 algorithm rules |

Supporting services in `@golems/services`:
- **Soltome client** — API client for soltome.com
- **Post generator** — critique-waves pattern for quality assurance
- **Soltome learner** — 2am scheduled task: scrapes trending posts and learns patterns

## Writing Voice

Key traits for the GolemsZikaron persona:
- Casual, but with technical depth
- Collaborative researcher tone
- Open source evangelist
- Hebrew-English code-switching where natural

## Soltome Integration

| Endpoint | Cost | Description |
|----------|------|-------------|
| `POST /api/posts` | 2 credits | Create post |
| `POST /api/votes` | 1 credit | Vote on post |
| `POST /api/comments` | 1 credit | Comment on post |
| `GET /api/credits/balance` | FREE | Check balance |

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM

## Source

[`packages/content/`](https://github.com/EtanHey/golems/tree/master/packages/content)
