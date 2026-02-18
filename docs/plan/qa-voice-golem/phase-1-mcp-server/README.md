# Phase 1: QA Voice MCP Server

> [Back to main plan](../README.md)

## Goal

Build a lightweight MCP server (~150 lines) that gives Claude Code two voice tools: `ask` (speak + wait for response) and `say` (speak without waiting).

## Tools

- **Research:** gemini — edge-tts-universal npm API, MCP server patterns
- **Code:** opus — MCP server implementation
- **MCPs:** Reference `@playwright/mcp` for MCP server structure

## Architecture

The MCP server exposes two tools via stdio protocol:

```typescript
// Tool 1: ask — speak a question and wait for user's voice response
qa_voice_ask({ message: string, timeout?: number }) => string

// Tool 2: say — speak a message (no response expected)
qa_voice_say({ message: string }) => void
```

### Input channel: File watcher pattern

MCP servers communicate with Claude Code via their own stdin/stdout pipe — they CAN'T read the terminal's stdin. Solution: file watcher.

```
MCP server polls /tmp/golems-qa-input.txt
mic.sh (separate terminal) writes to that file when user hits Enter
```

### TTS: edge-tts-universal

```typescript
import { Communicate } from 'edge-tts-universal';
const tts = new Communicate(text, { voice: 'en-US-EmmaMultilingualNeural' });
await tts.save('/tmp/golems-tts.mp3');
await Bun.spawn(['afplay', '/tmp/golems-tts.mp3']).exited;
```

Fallback: `say` command (macOS built-in, 50ms latency but robotic).

### F5 automation (optional, enhance in Phase 2)

After TTS playback, simulate F5 to open Wispr Flow:
```bash
osascript -e 'tell application "System Events" to key code 96'
```

## Steps

1. Create `packages/qa-voice/` directory with package.json, CLAUDE.md
2. Install `edge-tts-universal` dependency
3. Implement MCP server with stdio transport (Bun)
4. Implement `qa_voice_ask` tool — TTS + file watcher + timeout
5. Implement `qa_voice_say` tool — TTS only (fire-and-forget)
6. Add fallback to macOS `say` command when edge-tts fails
7. Test: run MCP server manually, verify tools work via MCP inspector
8. Set MCP timeout to 300s in server config (voice responses can be slow)

## File Structure

```
packages/qa-voice/
├── src/
│   ├── mcp-server.ts      # Main MCP server (~150 lines)
│   └── tts.ts             # edge-tts wrapper with say fallback
├── package.json            # @golems/qa-voice
├── CLAUDE.md               # Package docs
└── tsconfig.json
```

## Depends On

- None (first phase)

## Status

- [ ] Create package structure
- [ ] Install edge-tts-universal
- [ ] Implement MCP server with stdio transport
- [ ] Implement qa_voice_ask tool
- [ ] Implement qa_voice_say tool
- [ ] Add macOS say fallback
- [ ] Test with MCP inspector
- [ ] Set 300s timeout
