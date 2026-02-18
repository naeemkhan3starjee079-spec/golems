# @golems/qa-voice

> Voice-powered QA & client discovery assistant. MCP server that gives Claude Code voice I/O tools.

## Architecture

```
Claude Code session
  ├── Playwright MCP (browser snapshots)
  ├── QA Voice MCP (this package)
  │   ├── qa_voice_ask(message) → speaks + waits for response
  │   ├── qa_voice_say(message) → speaks only
  │   └── qa_voice_think(thought) → writes to live thinking log
  └── Supabase MCP (data persistence)
```

## How It Works

Two terminal tabs:

**Tab 1 (Claude Code):** Normal Claude Code session with QA Voice MCP configured.
**Tab 2 (Mic):** Runs `mic.sh` — Wispr Flow types transcriptions here, user hits Enter to send.

Communication: file watcher on `/tmp/golems-qa-input.txt`.

## MCP Tools

| Tool | Purpose | Returns |
|------|---------|---------|
| `qa_voice_ask` | Speak a question, wait for voice response | Transcribed text |
| `qa_voice_say` | Speak a message (no response) | Confirmation |
| `qa_voice_think` | Append to live thinking log (silent) | Confirmation |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QA_VOICE_TTS_VOICE` | `en-US-EmmaMultilingualNeural` | edge-tts voice ID |
| `QA_VOICE_TTS_ENGINE` | `edge-tts` | TTS engine: `edge-tts` or `say` (macOS fallback) |
| `QA_VOICE_F5_ENABLED` | `true` | Set to `false` to disable F5 simulation after speech |
| `QA_VOICE_INPUT_FILE` | `/tmp/golems-qa-input.txt` | File watcher input path |
| `QA_VOICE_THINK_FILE` | `/tmp/golems-qa-thinking.md` | Live thinking log path |

## Dependencies

- `edge-tts-universal` — Microsoft neural TTS (free, no API key)
- `@modelcontextprotocol/sdk` — MCP server SDK
- `afplay` — macOS built-in audio player
- `say` — macOS built-in TTS (fallback)

## .mcp.json Config

```json
{
  "qa-voice": {
    "command": "bun",
    "args": ["run", "packages/qa-voice/src/mcp-server.ts"]
  }
}
```
