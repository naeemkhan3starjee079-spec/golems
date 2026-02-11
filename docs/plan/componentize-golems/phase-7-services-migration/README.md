# Phase 7: Services Migration

> [Back to main plan](../README.md)

## Goal
Move standalone services (Night Shift, Bedtime Guardian, Briefing, Cloud Worker) to `packages/services/` with workspace-aware imports.

## Tools
- **Research:** gemini — Railway workspace builds, multi-package Docker
- **Code:** cursor (work mode) — move files, update imports
- **Verify:** `bun test` + Railway deploy test

## Steps

1. **[Cursor work]** Move services to `packages/services/`
   - night-shift.ts → packages/services/src/night-shift.ts
   - bedtime-guardian.ts → packages/services/src/bedtime-guardian.ts
   - briefing.ts → packages/services/src/briefing.ts
   - cloud-worker.ts → packages/services/src/cloud-worker.ts
   - healthcheck.ts → packages/services/src/healthcheck.ts
2. **[Cursor work]** Update all service imports to use `@golems/shared`, `@golems/jobs`, etc.
3. **[Opus]** Wire Bedtime Guardian to CoachGolem schedule
   - Read current Phase/Day from coach state
   - Adjust wind-down times accordingly
4. **[Opus]** Update cloud-worker.ts entry points
   - Uses workspace package imports instead of relative paths
   - Email polling from @golems/shared (dissolved EmailGolem)
   - Job scraping from @golems/jobs
5. **[Gemini research]** Railway workspace builds — multi-package Docker best practices
6. **[Cursor work]** Update Dockerfile for workspace build
   - Copy entire workspace, not just packages/autonomous
   - Or: create per-service Dockerfile with only needed packages
7. **[Cursor work]** Update railway.json paths
8. **[Opus]** Remove strangler wrappers from packages/autonomous
   - At this point all real code lives in proper packages
   - packages/autonomous becomes empty or deleted
9. **[bun run]** Run cloud worker locally to verify
10. **[/railway deploy]** Test Railway deployment (staging)

## Depends On
- Phase 6 (CoachGolem must exist for Bedtime Guardian integration)
- Phase 4 (workspace must be set up)

## Status
- [ ] Move services to packages/services/
- [ ] Update service imports
- [ ] Wire Bedtime Guardian to CoachGolem
- [ ] Update cloud-worker.ts
- [ ] Update Dockerfile
- [ ] Update railway.json
- [ ] Remove strangler wrappers
- [ ] Local cloud worker test
- [ ] Railway deploy test
