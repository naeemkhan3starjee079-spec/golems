# VoiceLayer Integration

> Voice I/O for Claude Code — 2 tools. [github.com/EtanHey/voicelayer](https://github.com/EtanHey/voicelayer)

## Tools (2)

| Tool | What | Key Params |
|------|------|------------|
| `voice_speak` | Speak or log silently. NON-BLOCKING. | `message` (required), `mode` (auto-detected), `voice`, `rate` |
| `voice_ask` | Speak question + record voice answer. BLOCKING. | `message` (required), `timeout_seconds`, `silence_mode` |

All 9 old `qa_voice_*` tool names still work as backward-compat aliases.

## voice_speak Auto-Detection

Mode is auto-detected from message content when omitted:
- Starts with `insight:`, `note:`, `TODO:` → **think** (silent log)
- Ends with `?`, contains "about to", "should I" → **consult** (checkpoint)
- Length > 280 chars → **brief** (slower TTS for long content)
- Default → **announce** (fast status update)

Override with `mode` param: `voice_speak("hello", mode="brief")`

## voice_speak Special Modes

- **Toggle:** `voice_speak("", enabled=false)` → disable voice. `enabled=true` → re-enable
- **Replay:** `voice_speak("", replay_index=0)` → replay most recent audio

## Voice Selection

Pass `voice` param to change TTS voice:
- Profile name: `voice_speak("hello", voice="andrew")` → resolves from `~/.voicelayer/voices.json`
- Raw edge-tts: `voice_speak("hello", voice="en-US-BrianNeural")`
- Default: jenny (en-US-JennyNeural)

## When to Use

- **Status update:** `voice_speak("Starting phase 3...")` → announce (default)
- **Explain a decision:** `voice_speak("I chose X because...")` → brief (auto, >280 chars)
- **Checkpoint:** `voice_speak("About to commit. Want to review?")` → consult (auto, has "about to")
- **Silent note:** `voice_speak("insight: found a pattern in the auth code")` → think (auto)
- **Ask for input:** `voice_ask("Which database should we use?")` → blocks for answer

## Session Booking

- `voice_ask` auto-books mic on first call
- Other sessions see "line busy" and fall back to text
- User-controlled stop: `touch /tmp/voicelayer-stop`
- Silero VAD for smart silence detection

## Toggle Safety

PreToolUse hook blocks all voice tools when `/tmp/.claude_voice_disabled` exists.
Only `qa_voice_toggle` is allowed through to re-enable.

## STT Backend

**Primary:** whisper.cpp via `whisper-cli` (local, ~200-400ms)
**Fallback:** Wispr Flow cloud API (`QA_VOICE_WISPR_KEY`)
