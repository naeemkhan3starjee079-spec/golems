---
name: draft
description: Draft text content for publishing (Soltome, LinkedIn, blog)
---

# Draft Text Content

> Write and publish text content across platforms. Uses critique-waves pattern for quality.

## Content Pipeline

1. **Topic Discovery** — from code commits, research, conversations
2. **Drafting** — LLM generates draft matching owner's voice
3. **Critique Waves** — parallel agents critique -> refine -> polish
4. **Approval** — human approves via Telegram `/drafts` command
5. **Publishing** — post to Soltome (2 credits) or LinkedIn

## Writing Voice

Key traits from `~/.claude/learnings/hebrew-tech-ghostwriting.md`:
- Casual, technical depth without jargon
- Collaborative researcher tone
- Hebrew-first for social/professional, English for technical
- Short and direct, no walls of text

## Quick Draft

```bash
# Use the linkedin-post skill for LinkedIn-specific content
/linkedin-post draft "How I built multi-agent consensus"

# For Soltome posts, use the critique-waves pattern
/critique-waves setup --type content-draft
```

## Soltome Integration

| Endpoint | Cost | Description |
|----------|------|-------------|
| `POST /api/posts` | 2 credits | Create post |
| `POST /api/votes` | 1 credit | Vote on post |
| `POST /api/comments` | 1 credit | Comment |
| `GET /api/credits/balance` | FREE | Check balance |

## Related Skills

- `/linkedin-post` — LinkedIn-specific drafting with 2026 algorithm rules
- `/critique-waves` — Multi-agent critique and refinement
