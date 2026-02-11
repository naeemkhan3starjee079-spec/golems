# Phase 8: Launchd + Infrastructure

> [Back to main plan](../README.md)

## Goal
Update all 9 launchd plists, .env files, pre-commit hooks, and deployment configs to point to new package locations.

## Tools
- **Research:** gemini — launchd best practices with Bun workspaces
- **Code:** Opus — plist updates, config edits
- **Verify:** `launchctl list | grep golems` + manual service restart

## Steps

1. **[Opus]** Update all 9 launchd plists with new paths
   - `com.golemszikaron.telegram.plist` → packages/claude/src/bot.ts
   - `com.golemszikaron.email-golem.plist` → packages/services/ (or shared email-intake)
   - `com.golemszikaron.job-golem.plist` → packages/jobs/
   - `com.golemszikaron.nightshift.plist` → packages/services/src/night-shift.ts
   - `com.golemszikaron.briefing.plist` → packages/services/src/briefing.ts
   - `com.golemszikaron.ollama.plist` → unchanged (external service)
   - `com.golems.session-archiver.plist` → packages/services/ or shared
   - `com.golems.storage-cleanup.plist` → packages/services/ or shared
   - Bedtime guardian plist if exists → packages/services/src/bedtime-guardian.ts
2. **[Opus]** Consolidate .env strategy
   - Root `.env` with shared secrets (SUPABASE_URL, TELEGRAM_BOT_TOKEN, etc.)
   - Per-package `.env.example` for documentation
   - Update load-env.ts to find root .env from any package
3. **[Cursor work]** Update pre-commit hook
   - Currently pinned to `packages/autonomous/scripts/test-isolated.sh`
   - Make workspace-aware: run tests for changed packages only
4. **[Cursor work]** Update `.deepsource.toml` for workspace structure
5. **[Opus]** Update `.claude-project-id` or create per-package project bindings
6. **[Gemini research]** Verify all runtime state paths use GOLEMS_STATE_DIR, no hard-coding
7. **[Opus]** Update `golems` CLI tool
   - `golems status` checks new package locations
   - `golems latest` deploys from correct paths
   - `golems doctor` validates new wiring
   - `golems wizard` knows about workspace structure
8. **[manual]** Unload old plists, load new ones
   - `launchctl unload` old → `launchctl load` new
   - Verify all services start cleanly
9. **[manual]** Run all services for 24h, check logs for path errors

## Depends On
- Phase 7 (services must be in final locations)

## Status
- [ ] Update 9 launchd plists
- [ ] Consolidate .env strategy
- [ ] Update pre-commit hook
- [ ] Update .deepsource.toml
- [ ] Update project bindings
- [ ] Verify runtime state paths
- [ ] Update golems CLI
- [ ] Unload/reload plists
- [ ] 24h smoke test
