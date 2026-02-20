---
title: "QA Voice — Voice-Powered QA & Discovery"
description: "MCP server that gives Claude Code voice I/O tools for website testing and client discovery calls."
---

# QA Voice

> Voice-powered QA & client discovery assistant. Speak questions, record responses, transcribe via Wispr Flow — all inside Claude Code.

QA Voice is an MCP server that adds **voice I/O** to Claude Code sessions. It speaks questions aloud via edge-tts, records your voice via sox, and transcribes via Wispr Flow's WebSocket API. No companion terminal, no manual setup — just speak and listen.

## How It Works

```mermaid
sequenceDiagram
    participant Claude as Claude Code
    participant MCP as QA Voice MCP
    participant TTS as edge-tts + afplay
    participant Mic as sox rec
    participant Wispr as Wispr Flow API

    Claude->>MCP: qa_voice_converse("How's the nav?")
    MCP->>TTS: Synthesize speech
    TTS-->>MCP: Audio played via speakers
    MCP->>Wispr: Open WebSocket + auth
    Wispr-->>MCP: Auth confirmed
    MCP->>Mic: Start recording (16kHz mono PCM)
    loop Every 1 second
        Mic->>MCP: Audio chunk
        MCP->>MCP: Calculate RMS energy
        MCP->>Wispr: Stream audio (base64)
    end
    Note over MCP: Silence detected (5s) or stop signal
    MCP->>Wispr: Commit transcription
    Wispr-->>MCP: "The navigation looks good but..."
    MCP-->>Claude: Transcribed text
```

## Architecture

```mermaid
graph TB
    subgraph "Claude Code Session"
        CC[Claude Code] --> PW[Playwright MCP<br/><small>Browser snapshots</small>]
        CC --> QV[QA Voice MCP<br/><small>Voice I/O</small>]
        CC --> SB[Supabase MCP<br/><small>Data persistence</small>]
    end

    subgraph "QA Voice MCP"
        ANN["qa_voice_announce<br/><small>Fire-and-forget TTS</small>"]
        BRF["qa_voice_brief<br/><small>One-way explanation</small>"]
        CST["qa_voice_consult<br/><small>Speak + follow-up hint</small>"]
        CNV["qa_voice_converse<br/><small>Speak + Record + Transcribe</small>"]
        THINK["qa_voice_think<br/><small>Silent notes to file</small>"]
    end

    QV --> ANN
    QV --> BRF
    QV --> CST
    QV --> CNV
    QV --> THINK

    CNV --> TTS["edge-tts<br/><small>Python CLI</small>"]
    CNV --> SOX["sox rec<br/><small>Mic recording</small>"]
    CNV --> WSP["Wispr Flow<br/><small>WebSocket STT</small>"]
    ANN --> TTS
    BRF --> TTS
    CST --> TTS

    style QV fill:#4a9eff,color:#fff
    style CNV fill:#22c55e,color:#fff
    style ANN fill:#f59e0b,color:#fff
    style BRF fill:#f59e0b,color:#fff
    style CST fill:#f59e0b,color:#fff
    style THINK fill:#a855f7,color:#fff
```

## Two Modes

### QA Mode — Website Testing

Systematic website testing with voice. Browse pages with Playwright, speak findings, get structured reports.

```mermaid
flowchart LR
    B["Browse page<br/><small>Playwright snapshot</small>"] --> A["Ask question<br/><small>qa_voice_converse</small>"]
    A --> R["Record finding<br/><small>Pass / Fail / Skip</small>"]
    R --> N["Next check<br/><small>31 checks across 6 categories</small>"]
    N --> B
    N --> REP["Generate report<br/><small>~/.golems/reports/</small>"]

    style A fill:#22c55e,color:#fff
    style REP fill:#4a9eff,color:#fff
```

**6 QA Categories (31 checks):**

| Category | Checks | What It Tests |
|----------|--------|---------------|
| Accessibility | 6 | Screen readers, keyboard nav, ARIA, contrast, focus |
| Responsive | 5 | Mobile, tablet, desktop breakpoints, touch targets |
| Content | 5 | Copy, spelling, broken links, images, SEO meta |
| Interaction | 5 | Forms, buttons, modals, navigation, error states |
| Performance | 5 | Load time, animations, lazy loading, bundle size |
| SEO | 5 | Meta tags, headings, structured data, sitemap |

- **Agent prompt:** `.claude/agents/qa-voice.md`
- **Schema:** `packages/qa-voice/src/schemas/checklist.ts`
- **Reports:** `~/.golems/reports/qa-{date}-{id}.md`

### Discovery Mode — Client Calls

Client discovery call assistant. Track unknowns, get whispered follow-up suggestions, detect red flags, generate project briefs.

```mermaid
flowchart LR
    L["Listen<br/><small>qa_voice_converse relays</small>"] --> T["Think<br/><small>qa_voice_think</small>"]
    T --> W["Whisper suggestion<br/><small>qa_voice_announce</small>"]
    W --> L
    L --> BR["Generate brief<br/><small>~/.golems/briefs/</small>"]

    style T fill:#a855f7,color:#fff
    style BR fill:#4a9eff,color:#fff
```

**7 Discovery Categories (22 questions):**

| Category | Questions | What It Covers |
|----------|-----------|----------------|
| Scope | 4 | Project goals, timeline, deliverables |
| Technical | 4 | Stack, integrations, data, APIs |
| Design | 3 | Brand, UI/UX, accessibility needs |
| Content | 3 | Copy, media, CMS, multilingual |
| Budget | 3 | Range, payment terms, ongoing costs |
| Process | 3 | Communication, reviews, handoff |
| Competitive | 2 | Competitors, differentiation |

- **Agent prompt:** `.claude/agents/discovery-voice.md`
- **Schema:** `packages/qa-voice/src/schemas/discovery.ts`
- **Briefs:** `~/.golems/briefs/discovery-{date}-{id}.md`

## MCP Tools

| Tool | Mode | Returns |
|------|------|---------|
| `qa_voice_announce` | Fire-and-forget TTS (status updates, narration) | Confirmation |
| `qa_voice_brief` | One-way explanation TTS (reading back decisions) | Confirmation |
| `qa_voice_consult` | Speak checkpoint + follow-up hint | Confirmation + hint |
| `qa_voice_converse` | Speak + record mic + Wispr Flow STT | Transcribed text (or timeout) |
| `qa_voice_think` | Silent append to thinking log | Confirmation |
| `qa_voice_say` | ALIAS → announce | Confirmation |
| `qa_voice_ask` | ALIAS → converse | Transcribed text |

## Prerequisites

```mermaid
graph LR
    SOX["sox<br/><small>brew install sox</small>"] --> REC["rec command<br/><small>Mic recording</small>"]
    ET["edge-tts<br/><small>pip3 install edge-tts</small>"] --> TTS["Python TTS<br/><small>Microsoft neural voices</small>"]
    WK["Wispr Flow API key<br/><small>wisprflow.ai</small>"] --> WS["WebSocket STT<br/><small>Real-time transcription</small>"]
    MIC["Mic permission<br/><small>System Settings</small>"] --> REC

    style SOX fill:#f59e0b,color:#fff
    style ET fill:#f59e0b,color:#fff
    style WK fill:#f59e0b,color:#fff
    style MIC fill:#f59e0b,color:#fff
```

| Dependency | Install | Purpose |
|------------|---------|---------|
| **sox** | `brew install sox` | `rec` command for mic recording (16kHz 16-bit mono PCM) |
| **edge-tts** | `pip3 install edge-tts` | Microsoft neural TTS (free, no API key needed) |
| **Wispr Flow** | [wisprflow.ai](https://wisprflow.ai) | WebSocket speech-to-text API |
| **Mic access** | System Settings > Privacy > Microphone | Grant access to your terminal app (iTerm2, Terminal) |

## Setup

1. Install dependencies:
```bash
brew install sox
pip3 install edge-tts
```

2. Add to your project's `.mcp.json`:
```json
{
  "qa-voice": {
    "command": "bun",
    "args": ["run", "packages/qa-voice/src/mcp-server.ts"],
    "env": {
      "QA_VOICE_WISPR_KEY": "your-api-key-here"
    }
  }
}
```

3. Grant microphone access to your terminal app (System Settings > Privacy > Microphone).

4. In Claude Code, use the QA or Discovery agent prompt:
   - QA: `.claude/agents/qa-voice.md`
   - Discovery: `.claude/agents/discovery-voice.md`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QA_VOICE_WISPR_KEY` | *(required)* | Wispr Flow API key for WebSocket STT |
| `QA_VOICE_TTS_VOICE` | `en-US-JennyNeural` | edge-tts voice ID ([voice list](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)) |
| `QA_VOICE_TTS_RATE` | `+15%` | Speech rate adjustment (`-50%` to `+100%`) |
| `QA_VOICE_SILENCE_SECONDS` | `2` | Seconds of silence before speech end detection |
| `QA_VOICE_SILENCE_THRESHOLD` | `500` | RMS energy threshold for silence (0-32767) |
| `QA_VOICE_THINK_FILE` | `/tmp/golems-qa-thinking.md` | Path for live thinking log |

## Output Files

| Type | Path | Format |
|------|------|--------|
| Sessions | `~/.golems/sessions/{id}.json` | JSON — raw session data |
| QA Reports | `~/.golems/reports/{id}.md` | Markdown — pass/fail summary with findings |
| Discovery Briefs | `~/.golems/briefs/{id}.md` | Markdown — project brief with red flags |
| Thinking Log | `/tmp/golems-qa-thinking.md` | Markdown — timestamped notes (live) |

## Wispr Flow Integration

- **Protocol:** WebSocket streaming (`wss://platform-api.wisprflow.ai/api/v1/dash/ws`)
- **Auth:** API key as query parameter
- **Audio:** 16kHz, 16-bit signed, mono PCM via sox `rec`
- **Chunking:** 1-second chunks streamed in real-time
- **Silence detection:** RMS energy monitoring with configurable threshold and duration

## Troubleshooting

**"sox not installed" error:**
```bash
brew install sox
# Verify: which rec
```

**"edge-tts failed" error:**
```bash
pip3 install edge-tts
# Verify: python3 -m edge_tts --list-voices | head
```

**No audio recorded (silent mic):**
- Check microphone permissions: System Settings > Privacy > Microphone
- Use iTerm2 or Terminal.app (Zed IDE doesn't propagate mic permissions correctly)
- Test mic: `rec -d -r 16000 -c 1 -b 16 test.raw` — you should see audio levels

**Wispr auth timeout:**
- Verify API key: `echo $QA_VOICE_WISPR_KEY`
- Check Wispr Flow status at [wisprflow.ai](https://wisprflow.ai)

## Source

- **Package:** [`packages/qa-voice/`](https://github.com/EtanHey/golems/tree/master/packages/qa-voice)
- **CLAUDE.md:** [`packages/qa-voice/CLAUDE.md`](https://github.com/EtanHey/golems/blob/master/packages/qa-voice/CLAUDE.md)
- **QA Agent:** [`.claude/agents/qa-voice.md`](https://github.com/EtanHey/golems/blob/master/.claude/agents/qa-voice.md)
- **Discovery Agent:** [`.claude/agents/discovery-voice.md`](https://github.com/EtanHey/golems/blob/master/.claude/agents/discovery-voice.md)
