---
name: voice-sessions
description: Structured voice sessions via VoiceLayer MCP. voice_speak + voice_ask for drilling, coaching, and capturing insights to Obsidian.
---

# Voice Sessions

> Structured voice-powered sessions using VoiceLayer MCP ([github.com/EtanHey/voicelayer](https://github.com/EtanHey/voicelayer)). Converse, drill, capture, output.

## When to Use

- After an interview or meeting → **debrief**
- Practicing a presentation or pitch → **practice**
- QA testing a website → **qa** (uses voicelayer schemas)
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
4. Capture: voice_speak logs insights silently
5. Output: structured Obsidian note or report
```

## Voice Tools

| Tool | What It Does |
|------|-------------|
| `voice_speak` | Non-blocking TTS (auto-selects: announce/brief/consult/think based on message) |
| `voice_ask` | Blocking voice Q&A (speak question, wait for voice response) |

Old `qa_voice_*` names still work as backward-compat aliases.

### `voice_speak` mode routing (auto-detected)

`voice_speak` chooses mode automatically from message style/content. You do not manually select announce/brief/consult/think.

| Detected Mode | Typical Trigger | Example |
|---------------|-----------------|---------|
| `announce` | Short start/stop updates | "Let's start your debrief." |
| `brief` | Concise summaries/read-backs | "Here's what I captured..." |
| `consult` | Longer guidance/coaching output | "Let's tighten this section by section." |
| `think` | Silent note capture with `insight:` prefix | "insight: Slide 3 overran by 90 seconds" |

Use `voice_ask` whenever you need a blocking spoken question + microphone response cycle.

## Session Booking

Voice sessions are locked per-session to prevent mic conflicts. `voice_ask` auto-books on first call. Other sessions see "line busy" and fall back to text.

## Requirements

- **VoiceLayer MCP** connected (check `.mcp.json` — points to `~/Gits/voicelayer/src/mcp-server.ts`)
- **Obsidian vault** — workflows reference `$OBSIDIAN_VAULT` (resolve via obsidian skill or user's configured vault path)
- Text fallback: all workflows work with typed answers if voice isn't available
