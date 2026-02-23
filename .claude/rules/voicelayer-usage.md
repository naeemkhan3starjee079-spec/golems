# VoiceLayer — Voice I/O for Claude Code

> You have 2 tools for voice: `voice_speak` (output) and `voice_ask` (input).
> [github.com/EtanHey/voicelayer](https://github.com/EtanHey/voicelayer)

## Tools

| Tool | What | Blocking? |
|------|------|-----------|
| `voice_speak` | Speak aloud or log silently | No — returns instantly |
| `voice_ask` | Speak question, record + transcribe answer | Yes — waits for response |

## voice_speak — 4 Modes

Mode is **auto-detected** from message content. Override with `mode` param.

| Mode | When | Example |
|------|------|---------|
| **announce** | Short status updates (default) | `voice_speak("Starting phase 3...")` |
| **brief** | Explanations >280 chars | `voice_speak("I chose X because of these three reasons...")` |
| **consult** | Checkpoints — hints user may respond | `voice_speak("About to commit. Want to review?")` |
| **think** | Silent markdown log, no audio | `voice_speak("insight: auth pattern uses middleware chain")` |

**Auto-detection rules:**
- Starts with `insight:`, `note:`, `TODO:` → think
- Ends with `?`, contains "about to", "should I" → consult
- Length > 280 chars → brief
- Default → announce

### Special Operations

| Operation | Call |
|-----------|------|
| Disable voice | `voice_speak("", enabled=false)` |
| Re-enable voice | `voice_speak("", enabled=true)` |
| Replay last audio | `voice_speak("", replay_index=0)` |
| Change voice | `voice_speak("hello", voice="andrew")` |

## voice_ask — Voice Q&A

Speaks a question, records the user's response, returns transcription.

```
voice_ask("Which database should we use?")
// → blocks until user responds
// → returns transcribed text
```

**Silence modes:** `quick` (0.5s), `standard` (1.5s), `thoughtful` (2.5s, default)

### Session Booking

- `voice_ask` auto-books the mic on first call
- Other Claude sessions see "line busy" and fall back to text
- User stop: `touch /tmp/voicelayer-stop`

## When to Use Voice

- **Starting a task:** `voice_speak("Starting the auth refactor...")` — keep user informed
- **Made a decision:** `voice_speak("Going with approach B — simpler and covers all edge cases")` — brief
- **About to do something risky:** `voice_speak("About to push to master. Good to go?")` — consult
- **Need user input:** `voice_ask("Should I add tests for the edge cases or just the happy path?")` — Q&A
- **Silent note to self:** `voice_speak("insight: this module has no error handling")` — think

## When NOT to Use Voice

- **Long code output** — voice can't usefully read code blocks
- **Sensitive data** — don't speak API keys, passwords, or PII aloud
- **Headless environments** — CI/CD, Docker containers, SSH without audio
- **Rapid iteration** — don't speak on every small edit; batch updates

## Voice Selection

| Method | Example |
|--------|---------|
| Profile name | `voice_speak("hello", voice="andrew")` |
| Raw edge-tts | `voice_speak("hello", voice="en-US-BrianNeural")` |
| Default | jenny (en-US-JennyNeural) |

Profiles defined in `~/.voicelayer/voices.json`.

## STT Backend

**Primary:** whisper.cpp via `whisper-cli` (local, ~200-400ms)
**Fallback:** Wispr Flow cloud API (`QA_VOICE_WISPR_KEY`)

## Toggle Safety

PreToolUse hook blocks all voice tools when `/tmp/.claude_voice_disabled` exists.
Only `voice_speak(enabled=true)` is allowed through to re-enable.
