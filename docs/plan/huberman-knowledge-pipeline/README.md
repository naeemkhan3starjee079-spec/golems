# Huberman Knowledge Pipeline

> Build deep Huberman Lab protocol knowledge into the Coach golem via YouTube transcript indexing + web research.

## Current State (Updated 2026-02-17)

**What exists (on master):**
- `packages/coach/src/protocol.ts` — `CoachProtocol.huberman` interface with: morningLight, caffeineDelay, ultradianCycle, nsdr, afternoonLight, preSleepNoFood, preSleepNoScreens, lastCaffeine, roomTemp, supplements
- `packages/coach/src/coaching-engine.ts` — `computeHubermanReminders()` generates 6 time-based reminders + `generateCoaching()` with LLM + `pickWorkout()` recovery-gated
- `packages/coach/src/calendar-client.ts` — Google Calendar integration via googleapis
- `packages/coach/src/nudger.ts`, `schedule-engine.ts`, `tracker.ts`, `status-aggregator.ts` — full coach infrastructure
- `protocol.json` — live config at `~/.golems-zikaron/coach/protocol.json`
- `packages/shared/src/whoop/client.ts` — Whoop API client (recovery, sleep, strain, backfill)
- `packages/shared/src/whoop/sync.ts` — Whoop → Supabase sync with timezone-aware dates
- `packages/zikaron/scripts/index_youtube.py` — 635-line YouTube transcript indexer (chapter-aware, rate-limited, resume support)
- Zikaron MCP supports `source="youtube"` filter

**What exists (in PR #208, pending merge):**
- `packages/coach/src/calendar-sync.ts` — Calendar → Supabase sync (upsert-first-then-delete-stale)
- `packages/coach/src/__tests__/coaching-engine.test.ts` — 29 tests (boundary thresholds, UNSCORABLE, no-data fallback)
- `packages/dashboard/src/app/(dashboard)/coach/page.tsx` — Coach dashboard with Whoop trends, calendar events, protocol reminders
- Cloud Worker wiring for WhoopSync + CalendarSync cron schedules
- Whoop backfill with correct Israel timezone dates + score_state checks

**YouTube indexing stats (Zikaron DB):**
- 16 Huberman episodes indexed
- 1,799 chunks, 2,002,332 chars total
- Source: `youtube`, Project: `huberman`
- MCP searchable via `zikaron_search(query="...", source="youtube")`

**What's still missing (Phases 3-5):**
- No temperature protocol (hot shower timing for core temp drop)
- No weed/cannabis buffer (REM suppression tracking)
- No NSDR trigger logic (when to suggest based on recovery/energy)
- No wind-down sequence
- No gradual sleep shift plan (minutes per shift, frequency)
- No exercise timing effects on circadian rhythm
- No evening light dimming protocol
- Supplements incomplete (missing Theanine, Inositol)
- `computeHubermanReminders()` only has 6 reminders (needs 12-15)
- Rest of Huberman channel not indexed (~439 episodes remaining)

**Owner context:**
- Target bed: 02:30, target wake: 10:30
- Phase: "shift" (gradual, been failing)
- Smokes weed most evenings
- Left shoulder injury (avoid heavy pressing/overhead)

---

## Progress

| # | Phase | Folder | Status | Notes |
|---|-------|--------|--------|-------|
| 1 | YouTube Transcript Pipeline | [phase-1-youtube-pipeline](phase-1-youtube-pipeline/) | DONE | `index_youtube.py` built, tested, working. 635 lines, chapter-aware chunking, resume support. |
| 2 | Huberman Episode Indexing | [phase-2-huberman-indexing](phase-2-huberman-indexing/) | IN PROGRESS | 16/455 episodes indexed (1,799 chunks). Priority sleep/protocol episodes done. Full channel indexing remaining. |
| 3 | Deep Protocol Research | [phase-3-deep-research](phase-3-deep-research/) | PENDING | Web research + transcript synthesis. Research prompts ready. Can start now. |
| 4 | Protocol Interface Upgrade | [phase-4-protocol-upgrade](phase-4-protocol-upgrade/) | PENDING | Expand `CoachProtocol.huberman`. Cursor audit done (4 files). Depends on Phase 3. |
| 5 | Coaching Engine Upgrade | [phase-5-coaching-engine](phase-5-coaching-engine/) | PENDING | Smart reminders + wind-down + shift plan. Depends on Phase 4. |

**Pre-requisite PR:** #208 (feat/coach-whoop-calendar-sync) — Whoop sync fix, calendar sync, dashboard trends, 29 tests. **5 commits, all review comments addressed. Ready to merge.**

---

## What to Do Next (for the next session)

### Immediate (merge PR #208 first)
1. Merge PR #208 → gets Whoop sync, calendar sync, dashboard, tests onto master
2. Deploy to Railway (`railway up -d`) → cloud worker picks up CalendarSync + fixed WhoopSync

### Phase 2 completion (index remaining episodes)
3. Run `index_youtube.py --channel UC2D2CMWXMOVWx7giW1n3LIg --resume` to index remaining ~439 Huberman episodes
   - This takes time (rate limiting: 10s between videos). Run in background or overnight.
   - The `--resume` flag skips already-indexed videos.
   - Alternatively, cherry-pick priority episodes first (see phase-2 README for the list).

### Phase 3 (can start in parallel with Phase 2)
4. Send the research prompts from `phase-3-deep-research/README.md` to Claude.ai and Gemini
5. Search indexed transcripts: `zikaron search "morning light protocol" --source youtube`
6. Synthesize into `~/.golems-zikaron/coach/huberman-research.md`

### Phases 4-5 (after Phase 3)
7. Expand `CoachProtocol.huberman` interface with new fields (temperature, cannabis, wind-down, etc.)
8. Upgrade `computeHubermanReminders()` from 6 to 12-15 reminders
9. Build `computeWindDownSequence()` — ordered evening routine with timestamps

---

## Execution Rules

Each phase = one branch = one PR. See `/large-plan` skill for the full protocol.

**Special rule for this plan:** Phases 1-2 are infrastructure (Zikaron pipeline). Phase 3 is research (can run in parallel with Phase 2 via external agents). Phases 4-5 depend on Phase 3 findings.

## Cross-Phase Knowledge

- YouTube transcript format → phase-1/findings.md
- Indexed episode metadata → phase-2/findings.md
- Huberman protocol details → phase-3/findings.md (the big one — all protocols land here)
- Protocol interface design → phase-4/findings.md
