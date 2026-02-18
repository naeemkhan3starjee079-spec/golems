# Phase 2: Voice Loop & Mic Setup

> [Back to main plan](../README.md)

## Goal

Create the mic.sh companion script, wire F5 automation, install TTS dependencies, and validate the complete voice loop end-to-end.

## Tools

- **Research:** gemini — Wispr Flow automation, osascript key simulation
- **Code:** opus — scripts, integration testing
- **MCPs:** qa-voice (from Phase 1)

## The Voice Loop

```text
Claude calls qa_voice_ask("question")
  -> MCP server synthesizes speech (edge-tts)
  -> afplay plays audio to speakers/headphones
  -> osascript simulates F5 (opens Wispr Flow)
  -> User speaks naturally
  -> User hits F5 again (Wispr stops) or Enter in mic terminal
  -> Wispr types transcription into mic terminal
  -> mic.sh writes to /tmp/golems-qa-input.txt
  -> MCP server file watcher detects content
  -> Returns text to Claude
  -> Claude processes, updates checklist, asks next question
```

## Steps

1. Create `scripts/mic.sh` — minimal loop: read stdin, write to /tmp file
2. Create `scripts/speak.sh` — standalone TTS command (like `notify`)
3. Test edge-tts installation: `pip3 install edge-tts` (Python CLI fallback)
4. Test edge-tts-universal (Bun): verify voice quality with several voices
5. Pick optimal voice: test EmmaMultilingual, Aria, Guy neural voices
6. Implement F5 automation via osascript (key code 96 external, 176 Mac built-in)
7. Test Accessibility permissions: iTerm2 needs permission for keystroke simulation
8. Test MCP server with MCP inspector (deferred from Phase 1 — verify all 3 tools: ask, say, think)
9. End-to-end test: Claude Code session with ask tool, speech, Wispr, mic.sh, response
10. Write tests for TTS module (mock afplay, verify edge-tts calls)
11. Write tests for file watcher (timing, cleanup, concurrent access)
12. Document latency benchmarks (ask call to audio start, audio end to response)

## Depends On

- Phase 1 (MCP server must exist)

## Status

- [x] Create mic.sh
- [x] Create speak.sh
- [ ] Test edge-tts installation (needs manual: voice quality check)
- [x] Fix edge-tts-universal API (EdgeTTS class, not Communicate)
- [ ] Pick optimal TTS voice (needs manual: listen to voices)
- [x] Implement F5 automation (osascript key code 96, env toggle)
- [ ] Test Accessibility permissions (needs manual: iTerm2 permission)
- [ ] Test MCP server with MCP inspector (deferred from Phase 1)
- [ ] End-to-end voice loop test (needs manual: mic + Wispr Flow)
- [x] Write TTS module tests (3 tests, QA_VOICE_TTS_ENGINE=say mock)
- [x] Write file watcher tests (8 tests, all passing)
- [ ] Document latency benchmarks (needs manual: real audio playback)
