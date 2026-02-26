# Phase 2: Enrichment Connect

> [Back to main plan](../README.md)

## Goal
Make enrichment progress visible on the dashboard without requiring the local daemon, by syncing enrichment stats to Supabase.

## Tools
- **Research:** gemini — best approach for periodic stats sync
- **Code:** opus — Python stats syncer + dashboard query
- **MCPs:** supabase (new `enrichment_stats` table or reuse existing)

## Steps

1. **Create `enrichment_stats` Supabase table** — `id, total_chunks, embedded, tags, summaries, importance, intent, projects_json, updated_at`. Single row that gets upserted on each sync.
2. **Add stats sync to enrichment service** — After each batch, upsert current stats to Supabase. Lightweight — one row, one upsert per batch.
3. **Add stats sync to `zikaron index`** — After indexing new sessions, update chunk counts.
4. **Update dashboard enrichment page** — Query `enrichment_stats` from Supabase instead of daemon `/api/stats/enrichment`. Falls back to daemon if stats row is stale (>1 hour).
5. **Restart enrichment service** — Fix the crashed launchd service. Verify it's processing and syncing.
6. **Add enrichment progress to ops page** — Small card showing overall enrichment % alongside service health.

## Depends On
- Nothing (standalone)

## Status
- [x] Create enrichment_stats table
- [x] Add stats sync to enrichment service
- [x] Add stats sync to zikaron index
- [x] Update dashboard enrichment page
- [x] Restart enrichment service (Night Shift fixed in task #76)
- [x] Add enrichment card to ops page
