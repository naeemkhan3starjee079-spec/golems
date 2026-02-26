# Voice Personalities

> Each golem has a distinct voice personality powered by VoiceLayer MCP.

## Voice Assignments

| Golem | Voice | Character | Use Case |
|-------|-------|-----------|----------|
| **Orchestrator** (ClaudeGolem) | `theo` | Fast-paced tech energy (Theo Browne / t3.gg) | Telegram chat, status updates, orchestration |
| **Coach** | `huberman` | Measured authority (Andrew Huberman) | Health coaching, protocols, schedule delivery |
| **Services** | `theo` | Same energy for Night Shift, Briefing | Autonomous reports, system updates |
| **Jobs / Recruiter** | default | edge-tts preset | Job alerts, outreach drafts |
| **Content** | default | edge-tts preset | Content creation notifications |
| **Teller** | default | edge-tts preset | Financial alerts |

## Usage

```typescript
// Voice updates use mode auto-detection
voice_speak("Deploy complete, 3 PRs merged overnight")  // → announce (short)
voice_speak("Here's your morning briefing...")            // → brief (long)
voice_ask("Should I merge this PR?")                      // → consult (waits for response)
```

## Engine Priority

VoiceLayer picks the best available engine per voice:

1. **XTTS-v2 fine-tuned** — captures cadence + timbre (needs training complete)
2. **F5-TTS MLX** — zero-shot clone from reference clip (timbre only)
3. **Qwen3-TTS** — daemon-based zero-shot
4. **edge-tts** — preset Microsoft voice (fallback)

## Rate Overrides

| Voice | announce | brief | consult |
|-------|----------|-------|---------|
| `theo` | +15% | +5% | +0% |
| `huberman` | +0% | -5% | -10% |
| default | +0% | +0% | +0% |
