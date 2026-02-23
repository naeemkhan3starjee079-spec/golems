---
name: voice-sessions
description: Structured voice sessions via VoiceLayer MCP. 4 modes (announce/brief/consult/converse) + silent think for drilling, coaching, and capturing insights to Obsidian.
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
4. Capture: qa_voice_think logs insights silently
5. Output: structured Obsidian note or report
```

## Voice Modes

| Mode | Tool | What It Does |
|------|------|-------------|
| **announce** | `qa_voice_announce` | Fire-and-forget TTS (status updates, narration) |
| **brief** | `qa_voice_brief` | One-way explanation (reading back decisions, summaries) |
| **consult** | `qa_voice_consult` | Checkpoint — speak + hint user may respond |
| **converse** | `qa_voice_converse` | Full Q&A — speak question, wait for voice response |
| **think** | `qa_voice_think` | Silent notes to thinking log (insights, red flags, timing) |

**Aliases:** `qa_voice_ask` → converse, `qa_voice_say` → announce (backward compat)

### Which mode to use when

- **Opening/closing a session** → `announce` ("Let's start your debrief")
- **Explaining something back** → `brief` ("Here's what I captured...")
- **Asking a question** → `converse` ("Walk me through what happened")
- **Pre-action checkpoint** → `consult` ("About to save the report, anything to add?")
- **Taking notes** → `think` (silent markdown log)

## Session Booking

Voice sessions are locked per-session to prevent mic conflicts. `converse` mode auto-books on first call. Other sessions see "line busy" and fall back to text.

## Requirements

- **VoiceLayer MCP** connected (check `.mcp.json` — points to `~/Gits/voicelayer/src/mcp-server.ts`)
- **Obsidian vault** — workflows reference `$OBSIDIAN_VAULT` (resolve via obsidian skill or user's configured vault path)
- Text fallback: all workflows work with typed answers if voice isn't available
