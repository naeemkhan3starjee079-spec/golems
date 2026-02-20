# @golems/qa-voice

> Voice-powered QA & client discovery assistant. MCP server with 4 voice modes + silent thinking.

## Architecture

```text
Claude Code session
  ├── Playwright MCP (browser snapshots, --extension for co-browsing)
  ├── QA Voice MCP (this package)
  │   ├── qa_voice_announce(message) → fire-and-forget TTS
  │   ├── qa_voice_brief(message) → one-way explanation TTS
  │   ├── qa_voice_consult(message) → speak + hint user may respond
  │   ├── qa_voice_converse(message) → speak + record mic → Wispr Flow STT → transcription
  │   ├── qa_voice_think(thought) → writes to live thinking log (silent)
  │   ├── qa_voice_say(message) → ALIAS for announce
  │   └── qa_voice_ask(message) → ALIAS for converse
  └── Supabase MCP (data persistence)
```

## Voice Modes

| Mode | Voice Out | User Response | Blocking | Use Case |
|------|-----------|---------------|----------|----------|
| **announce** | Yes | None | No | Status updates, narration, "task complete" |
| **brief** | Yes | None | No | One-way explanation, reading back decisions |
| **consult** | Yes | None (hint to follow up) | No | Checkpoint: "about to commit, want to review?" |
| **converse** | Yes | Voice (user-controlled stop) | Yes | Full interactive Q&A, drilling sessions |
| **think** | No | None | No | Silent markdown log |

### User-Controlled Stop (converse mode)

- **Primary:** Touch `/tmp/voicelayer-stop` to end recording
- **Fallback:** 5s silence detection (longer than default — users pause to think)
- **Timeout:** 300s default, configurable per call

### Session Booking

Voice sessions use a lockfile (`/tmp/voicelayer-session.lock`) to prevent mic conflicts between multiple Claude sessions.

- `converse` mode auto-books on first call
- Other sessions see "line busy" and fall back to text
- Stale locks (dead PID) are auto-cleaned
- Lock released on: process exit, SIGTERM, SIGINT

## Two Use Modes

### QA Mode
Systematic website testing: browse with Playwright, speak questions about each page, record findings in structured checklist, generate markdown report.

- Agent: `.claude/agents/qa-voice.md`
- Schema: `src/schemas/checklist.ts`
- Categories: `src/schemas/qa-categories.ts` (6 categories, 31 checks)
- Report: `src/report.ts` → `~/.golems/reports/qa-{date}-{id}.md`

### Discovery Mode
Client call assistant: track unknowns, whisper follow-up suggestions, detect red flags, generate project brief.

- Agent: `.claude/agents/discovery-voice.md`
- Schema: `src/schemas/discovery.ts`
- Categories: `src/schemas/discovery-categories.ts` (7 categories, 22 questions)
- Brief: `src/brief.ts` → `~/.golems/briefs/discovery-{date}-{id}.md`

## How It Works

Single terminal — no companion script needed.

1. Claude calls `qa_voice_converse("question")` via MCP
2. Session booking checked/acquired (lockfile)
3. edge-tts speaks the question aloud via afplay
4. Mic recording starts via `rec` (sox) — 16kHz 16-bit mono PCM
5. Audio streams to Wispr Flow WebSocket API in 1-second chunks
6. Stop when: user touches `/tmp/voicelayer-stop`, OR 5s silence detected
7. Wispr Flow returns the transcription
8. Claude receives the text and continues

## Quick Start

### Prerequisites

```bash
brew install sox          # Provides `rec` command for mic recording
pip3 install edge-tts     # Python TTS engine
```

### Setup

1. Get your Wispr Flow API key from [Wispr Flow settings](https://wisprflow.ai)

2. Add to `.mcp.json`:
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

3. Grant microphone access to your terminal app (System Settings > Privacy > Microphone)

4. In Claude Code, use the QA or Discovery agent prompt.

## MCP Tools

| Tool | Mode | Returns |
|------|------|---------|
| `qa_voice_announce` | Fire-and-forget TTS | Confirmation |
| `qa_voice_brief` | One-way explanation TTS | Confirmation |
| `qa_voice_consult` | Speak + follow-up hint | Confirmation + hint |
| `qa_voice_converse` | Speak + wait for voice | Transcribed text |
| `qa_voice_think` | Silent log to file | Confirmation |
| `qa_voice_say` | ALIAS → announce | Confirmation |
| `qa_voice_ask` | ALIAS → converse | Transcribed text |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/speak.sh` | Standalone TTS command (Python edge-tts + afplay). Usage: `speak.sh "text" [rate]` |
| `scripts/test-wispr-ws.ts` | Standalone Wispr Flow WebSocket test |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QA_VOICE_WISPR_KEY` | (required) | Wispr Flow API key for WebSocket STT |
| `QA_VOICE_TTS_VOICE` | `en-US-JennyNeural` | edge-tts voice ID |
| `QA_VOICE_TTS_RATE` | `+15%` | Speech rate adjustment |
| `QA_VOICE_SILENCE_SECONDS` | `2` | Default silence seconds (converse overrides to 5) |
| `QA_VOICE_SILENCE_THRESHOLD` | `500` | RMS energy threshold for silence (0-32767) |
| `QA_VOICE_THINK_FILE` | `/tmp/golems-qa-thinking.md` | Live thinking log path |

## File Structure

```text
packages/qa-voice/
├── src/
│   ├── mcp-server.ts          # MCP server (5 modes + 2 aliases)
│   ├── tts.ts                 # edge-tts (Python CLI) + afplay
│   ├── input.ts               # Wispr Flow WebSocket client + mic recording + silence detection
│   ├── session-booking.ts     # Lockfile-based voice session mutex
│   ├── session.ts             # Session lifecycle (save/load/generate)
│   ├── report.ts              # QA report renderer (JSON → markdown)
│   ├── brief.ts               # Discovery brief renderer (JSON → markdown)
│   ├── schemas/
│   │   ├── checklist.ts       # QA session schema + helpers
│   │   ├── qa-categories.ts   # 6 QA categories (31 checks)
│   │   ├── discovery.ts       # Discovery session schema + helpers
│   │   └── discovery-categories.ts  # 7 discovery categories (23 questions)
│   └── __tests__/             # 59 tests, 145 expect() calls
├── scripts/
│   └── speak.sh               # Standalone TTS command
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## Output Paths

| Type | Path |
|------|------|
| Sessions (JSON) | `~/.golems/sessions/{id}.json` |
| QA Reports (MD) | `~/.golems/reports/{id}.md` |
| Discovery Briefs (MD) | `~/.golems/briefs/{id}.md` |
| Thinking Log | `/tmp/golems-qa-thinking.md` |
| Session Lock | `/tmp/voicelayer-session.lock` |
| Stop Signal | `/tmp/voicelayer-stop` |

## Wispr Flow Integration

- **WebSocket API**: Streams audio chunks for real-time transcription
- **Endpoint**: `wss://platform-api.wisprflow.ai/api/v1/dash/ws`
- **Auth**: API key passed as query parameter
- **Audio format**: 16kHz, 16-bit signed, mono PCM (via sox `rec`)
- **Silence detection**: RMS energy monitoring with configurable threshold

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server SDK
- `edge-tts` (Python) — Microsoft neural TTS (free, no API key)
- `sox` (system) — Audio recording via `rec` command
- `afplay` (macOS built-in) — Audio playback

## Tests

```bash
bun test packages/qa-voice/src/__tests__/
```

59 tests across 8 files:
- `input.test.ts` — RMS calculation + WebSocket input (7 tests)
- `tts.test.ts` — TTS pipeline (3 tests)
- `checklist.test.ts` — QA schema (8 tests)
- `report.test.ts` — QA report renderer (8 tests)
- `discovery.test.ts` — discovery schema (7 tests)
- `brief.test.ts` — brief renderer (8 tests)
- `session.test.ts` — session lifecycle (6 tests)
- `session-booking.test.ts` — voice booking + stop signal (12 tests)
