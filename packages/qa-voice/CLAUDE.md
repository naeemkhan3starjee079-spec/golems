# @golems/qa-voice

> Voice-powered QA & client discovery assistant. MCP server that gives Claude Code voice I/O tools.

## Architecture

```
Claude Code session
  ├── Playwright MCP (browser snapshots, --extension for co-browsing)
  ├── QA Voice MCP (this package)
  │   ├── qa_voice_ask(message) → speaks + waits for response
  │   ├── qa_voice_say(message) → speaks only
  │   └── qa_voice_think(thought) → writes to live thinking log
  └── Supabase MCP (data persistence)
```

## Two Modes

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
- Categories: `src/schemas/discovery-categories.ts` (7 categories, 23 questions)
- Brief: `src/brief.ts` → `~/.golems/briefs/discovery-{date}-{id}.md`

## How It Works

Two terminal tabs:

**Tab 1 (Claude Code):** Normal Claude Code session with QA Voice MCP configured.
**Tab 2 (Mic):** Runs `scripts/mic.sh` — Wispr Flow types transcriptions here, user hits Enter to send.

Communication: file watcher on `/tmp/golems-qa-input.txt`.

## Quick Start

1. Add to `.mcp.json`:
```json
{
  "qa-voice": {
    "command": "bun",
    "args": ["run", "packages/qa-voice/src/mcp-server.ts"]
  }
}
```

2. Open second terminal tab, run:
```bash
packages/qa-voice/scripts/mic.sh
```

3. In Claude Code, use the QA or Discovery agent prompt.

## MCP Tools

| Tool | Purpose | Returns |
|------|---------|---------|
| `qa_voice_ask` | Speak a question, wait for voice response | Transcribed text |
| `qa_voice_say` | Speak a message (no response) | Confirmation |
| `qa_voice_think` | Append to live thinking log (silent) | Confirmation |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/mic.sh` | Companion terminal for voice input |
| `scripts/speak.sh` | Standalone TTS command |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QA_VOICE_TTS_VOICE` | `en-US-EmmaMultilingualNeural` | edge-tts voice ID |
| `QA_VOICE_TTS_ENGINE` | `edge-tts` | TTS engine: `edge-tts` or `say` (macOS fallback) |
| `QA_VOICE_F5_ENABLED` | `true` | Set to `false` to disable F5 simulation after speech |
| `QA_VOICE_INPUT_FILE` | `/tmp/golems-qa-input.txt` | File watcher input path |
| `QA_VOICE_THINK_FILE` | `/tmp/golems-qa-thinking.md` | Live thinking log path |

## File Structure

```
packages/qa-voice/
├── src/
│   ├── mcp-server.ts          # MCP server (3 tools: ask, say, think)
│   ├── tts.ts                 # edge-tts + macOS say fallback + F5 automation
│   ├── input.ts               # File watcher for voice input
│   ├── session.ts             # Session lifecycle (save/load/generate)
│   ├── report.ts              # QA report renderer (JSON → markdown)
│   ├── brief.ts               # Discovery brief renderer (JSON → markdown)
│   ├── schemas/
│   │   ├── checklist.ts       # QA session schema + helpers
│   │   ├── qa-categories.ts   # 6 QA categories (31 checks)
│   │   ├── discovery.ts       # Discovery session schema + helpers
│   │   └── discovery-categories.ts  # 7 discovery categories (23 questions)
│   └── __tests__/             # 42 tests, 104 expect() calls
├── scripts/
│   ├── mic.sh                 # Voice input companion terminal
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

## Wispr Flow Integration

- **F5 push-to-talk:** Automatically triggered after `qa_voice_ask` speaks
- **Key codes:** 96 (external keyboard), 176 (Mac built-in)
- **Accessibility:** iTerm2 needs System Preferences > Accessibility permission for osascript
- **Config location:** `~/Library/Application Support/Wispr Flow/config.json`
- **F5 fix details:** See `memory/wispr-flow-f5-fix.md`

## Dependencies

- `edge-tts-universal` — Microsoft neural TTS (free, no API key)
- `@modelcontextprotocol/sdk` — MCP server SDK
- `afplay` — macOS built-in audio player
- `say` — macOS built-in TTS (fallback)

## Tests

```bash
bun test packages/qa-voice/src/__tests__/
```

42 tests across 6 files:
- `input.test.ts` — file watcher (8 tests)
- `tts.test.ts` — TTS + F5 (3 tests)
- `checklist.test.ts` — QA schema (8 tests)
- `report.test.ts` — QA report renderer (8 tests)
- `discovery.test.ts` — discovery schema (7 tests)
- `brief.test.ts` — brief renderer (8 tests)
