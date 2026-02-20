---
name: voice-sessions
description: Structured voice sessions via qa-voice MCP. Covers post-conversation debriefs, presentation/pitch practice, QA testing, and more. Each workflow uses ask/say/think for drilling, coaching, and capturing insights to Obsidian.
---

# Voice Sessions

> Structured voice-powered sessions using qa-voice MCP. Ask, drill, capture, output.

## When to Use

- After an interview or meeting → **debrief**
- Practicing a presentation or pitch → **practice**
- QA testing a website → **qa** (uses qa-voice schemas)
- Quick capture without voice → **quick**
- Reviewing past sessions → **review**

## Workflows

| What you want to do | Workflow |
|---------------------|---------|
| Debrief a conversation | [workflows/debrief.md](workflows/debrief.md) |
| Practice a presentation/pitch | [workflows/practice.md](workflows/practice.md) |
| QA test a site with voice | [workflows/qa.md](workflows/qa.md) |
| Quick text-only capture | [workflows/quick.md](workflows/quick.md) |
| Review past sessions | [workflows/review.md](workflows/review.md) |
| Code review (live) | [workflows/code.md](workflows/code.md) — future stub |

## How It Works

All workflows follow the same pattern:

```text
1. Context: what are we doing? (session type, subject)
2. Walk-through: structured questions or slide-by-slide review
3. Drill: probe vague answers, test understanding, challenge weak spots
4. Capture: qa_voice_think logs insights silently
5. Output: structured Obsidian note or report
```

## Tools Used

| Tool | What It Does |
|------|-------------|
| `qa_voice_ask` | Speak a question, wait for voice response |
| `qa_voice_say` | Speak without waiting (status updates, prompts, slide readback) |
| `qa_voice_think` | Silent notes to thinking log (insights, red flags, timing) |

## Requirements

- **qa-voice MCP** connected (check `.mcp.json`)
- **Obsidian vault** — workflows reference `$OBSIDIAN_VAULT` (resolve via obsidian skill or user's configured vault path)
- Text fallback: all workflows work with typed answers if voice isn't available
