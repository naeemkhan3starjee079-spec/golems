---
name: voice-sessions
description: Use when debriefing meetings, practicing presentations, QA testing with voice, or capturing insights to Obsidian. Covers voice drilling, coaching, capture. NOT for: simple TTS announcements (use voice_speak directly).
---

# Voice Sessions

> Structured voice-powered sessions using VoiceLayer MCP.

## Workflows

| What you want to do | Workflow |
|---------------------|---------|
| Debrief a conversation | [workflows/debrief.md](workflows/debrief.md) |
| Practice a presentation/pitch | [workflows/practice.md](workflows/practice.md) |
| QA test a site with voice | [workflows/qa.md](workflows/qa.md) |
| Quick text-only capture | [workflows/quick.md](workflows/quick.md) |
| Review past sessions | [workflows/review.md](workflows/review.md) |

## How It Works

All workflows follow: Context → Walk-through → Drill → Capture → Output (Obsidian note).

Voice tools: `voice_speak` (non-blocking TTS) + `voice_ask` (blocking Q&A). Mode is auto-detected from message content.

## Requirements

- VoiceLayer MCP connected
- Obsidian vault configured
- Text fallback available if voice isn't
