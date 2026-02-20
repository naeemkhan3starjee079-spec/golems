# Voice Sessions Rules

> Voice-powered sessions via qa-voice MCP. 5 modes (announce, brief, consult, converse, think) for drilling, coaching, QA, and insights.

## Voice Modes

| Mode | MCP Tool | What |
|------|----------|------|
| **announce** | `qa_voice_say` | Fire-and-forget TTS (status updates, narration) |
| **brief** | `qa_voice_say` | One-way explanation (reading back summaries) |
| **consult** | `qa_voice_ask` | Checkpoint — speak + hint user may respond |
| **converse** | `qa_voice_ask` | Full Q&A — speak question, wait for voice response |
| **think** | `qa_voice_think` | Silent notes to thinking log (insights, red flags) |

## Workflows (6)

| Workflow | When |
|----------|------|
| **debrief** | After interview/meeting — structured recap |
| **practice** | Presenting/pitching — rehearsal with feedback |
| **qa** | Testing a website — voice-guided QA |
| **quick** | Fast capture — text-only, no voice |
| **review** | Review past sessions — summary + insights |
| **code** | Live code review (future stub) |

## Session Booking

- Sessions lock mic access per-session (lockfile-based)
- Other sessions see "line busy" and fall back to text
- `converse` mode auto-books on first call
- User-controlled stop is PRIMARY — silence detection is fallback only

## Text Fallback

All workflows work with typed answers if voice isn't available. The skill detects voice availability and adapts.

## Output

- Structured Obsidian notes (via `$OBSIDIAN_VAULT` or obsidian skill)
- Think log: markdown file with timestamped insights, categorized as insight/question/red-flag/checklist-update

## MCP Server

**Name:** `qa-voice` | **Package:** `packages/qa-voice/`
**Tools:** `qa_voice_ask`, `qa_voice_say`, `qa_voice_think`
