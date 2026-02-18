# QA Voice Golem — Voice-Powered QA & Client Discovery Assistant

> AI QA companion that browses pages with you, speaks questions via TTS, listens to your voice responses via Wispr Flow, and generates structured reports.

## Architecture (Approach B: MCP Server)

```text
Terminal Tab 1 (Claude Code)          Terminal Tab 2 (Mic)
┌──────────────────────────┐          ┌─────────────────────┐
│ Claude Code session      │          │ mic.sh              │
│ ├── Playwright MCP       │          │ Wispr Flow types    │
│ ├── QA Voice MCP ────────┼──edge-tts──> speakers          │
│ │   ├── ask(msg)         │          │ User speaks, hits   │
│ │   │   speaks + waits   │<─file────│ Enter               │
│ │   └── say(msg)         │  watcher │                     │
│ └── Supabase MCP         │          │ > response text     │
│                          │          │ writes to /tmp/...  │
│ Session state:           │          └─────────────────────┘
│ ~/.golems/sessions/*.json│
└──────────────────────────┘

Flow: Claude → ask("How's the nav?") → edge-tts speaks → F5 opens Wispr
    → user talks → mic.sh captures → file watcher returns text → Claude processes
```

**Key insight**: Voice I/O as MCP tools keeps everything in ONE Claude Code session. No orchestrator, no resume logic. Playwright + QA Voice MCPs coexist naturally.

## Research Sources

Research files were in `/tmp/` (ephemeral — may be lost after reboot). Key decisions are captured in the plan:
- Claude web research — Main architecture, 3 approaches compared
- Gemini research — Wispr Flow automation, edge-tts streaming, AI QA tools landscape
- Cursor IDE audit — Monorepo structure, notify pattern, skill vs package analysis
- Claude follow-up — MCP server architecture (the winning approach)

## Progress

| # | Phase | Folder | Status | Notes |
|---|-------|--------|--------|-------|
| 1 | MCP Server | [phase-1-mcp-server](phase-1-mcp-server/) | **DONE** | 3 tools (ask/say/think), edge-tts + say fallback, file watcher |
| 2 | Voice Loop | [phase-2-voice-loop](phase-2-voice-loop/) | **DONE** | mic.sh, speak.sh, F5 automation, 11 tests passing. Manual items deferred to first real use. |
| 3 | QA Agent | [phase-3-qa-agent](phase-3-qa-agent/) | **DONE** | Agent prompt, checklist schema, report renderer, 6 QA categories (31 checks), 16 new tests |
| 4 | Discovery Agent | [phase-4-discovery-agent](phase-4-discovery-agent/) | **DONE** | Agent prompt, discovery schema, brief renderer, 7 categories (23 questions), red flags, 15 new tests |
| 5 | Integration | [phase-5-integration](phase-5-integration/) | **DONE** | Session lifecycle, CLAUDE.md, root docs, 6 integration tests. Post-merge: CLI, Doctor, Wizard |

## Execution Rules

- Each phase = one branch = one PR
- Sequential execution (no skipping)
- CLI helpers for research, Opus for orchestration
- See `/large-plan` skill for full protocol

## Cross-Phase Knowledge

- **MCP server pattern**: See `packages/claude/src/lib/notify-server.ts` for HTTP endpoint pattern
- **Skill structure**: See `skills/golem-powers/` for skill file patterns
- **Agent format**: See `.claude/agents/` for agent .md format
- **edge-tts npm**: `edge-tts-universal` package works natively in Bun
- **Wispr F5 keycode**: 96 (external keyboard), 176 (Mac built-in)
- **MCP timeout**: Set to 300s for voice tools (user may take time to respond)

## Cost

- **Marginal cost: $0/month** — rides on existing Max subscription
- edge-tts: free (Microsoft neural voices)
- Wispr Flow: already paid ($20/mo)
- Playwright MCP: free (open source)
- Total new code: ~200 lines
