# Phase 5: Integration & Polish

> [Back to main plan](../README.md)

## Goal

Wire the QA Voice MCP into the golems ecosystem: .mcp.json config, CLI commands, CLAUDE.md docs, Doctor health checks, and Wizard setup.

## Tools

- **Research:** cursor — audit existing wiring patterns (Doctor, Wizard, .mcp.json)
- **Code:** opus — integration, CLI, documentation
- **MCPs:** qa-voice, supabase (optional session persistence)

## Integration Points

### 1. .mcp.json Configuration

Add qa-voice MCP server alongside existing servers:

```json
{
  "mcpServers": {
    "qa-voice": {
      "command": "bun",
      "args": ["run", "packages/qa-voice/src/mcp-server.ts"],
      "timeout": 300000
    }
  }
}
```

### 2. CLI Commands

Add to `bin/golems` or create standalone scripts:

```bash
golems qa start <url>       # Start QA session on URL
golems qa stop              # End session, generate report
golems qa status            # Show current session progress
golems discover start       # Start discovery session
golems discover stop        # End session, generate brief
```

### 3. Wispr Flow Integration Notes

Document in CLAUDE.md:
- F5 modes: single tap (toggle), long press (hold), double tap (continuous)
- Wispr config: `~/Library/Application Support/Wispr Flow/config.json`
- Key codes: 96 (external KB), 176 (Mac built-in)
- Reference: `memory/wispr-flow-f5-fix.md`

### 4. Playwright MCP Extension Mode

Configure for co-browsing (AI sees user's browser):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp", "--browser", "chromium", "--extension"]
    }
  }
}
```

## Steps

1. Add qa-voice MCP server entry to `.mcp.json` (with 300s timeout)
2. Configure Playwright MCP `--extension` mode for browser co-browsing
3. Create CLI commands: `golems qa start/stop/status`, `golems discover start/stop`
4. Create session directory: `~/.golems/sessions/` for JSON files
5. Create reports directory: `~/.golems/reports/` for markdown reports
6. Create briefs directory: `~/.golems/briefs/` for discovery briefs
7. Add QA Voice source to notify-server.ts SOURCE_CONFIG
8. Update Doctor: health check for qa-voice MCP server, edge-tts availability
9. Update Wizard: setup guide for edge-tts, mic.sh, Accessibility permissions
10. Write `packages/qa-voice/CLAUDE.md` — comprehensive package docs
11. Update root CLAUDE.md — add qa-voice to packages table
12. Add Telegram notification on session complete (via existing `notify`)
13. Write integration tests (full session lifecycle: start, ask, respond, stop, report)
14. Optional: Supabase persistence for session history (table + migration)

## Doctor Health Checks

```typescript
// In packages/services/src/doctor.ts
checks.push({
  name: "qa-voice-mcp",
  check: () => {
    // Verify MCP server can start
    // Verify edge-tts is installed
    // Verify mic.sh exists
    // Verify Accessibility permissions for osascript
  }
});
```

## Depends On

- Phase 1 (MCP server)
- Phase 2 (voice loop + scripts)
- Phase 3 (QA agent)
- Phase 4 (discovery agent)

## Status

- [x] Add qa-voice to .mcp.json (documented in CLAUDE.md, user adds to .mcp.json)
- [x] Configure Playwright extension mode (documented in CLAUDE.md)
- [ ] Create CLI commands (post-merge: add to bin/golems)
- [x] Session lifecycle manager (session.ts — auto-creates ~/.golems/sessions/reports/briefs)
- [ ] Add QA Voice to notify-server SOURCE_CONFIG (post-merge: packages/shared)
- [ ] Update Doctor health checks (post-merge: packages/services)
- [ ] Update Wizard setup guide (post-merge: packages/services)
- [x] Write packages/qa-voice/CLAUDE.md (comprehensive docs)
- [x] Update root CLAUDE.md (packages table + architecture)
- [ ] Add Telegram notification on session complete (post-merge: uses existing notify)
- [x] Write session lifecycle tests (6 tests)
- [ ] Optional: Supabase session persistence (future enhancement)
