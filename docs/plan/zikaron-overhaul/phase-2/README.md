# Phase 2: WhatsApp Reindex

> [Back to main plan](../README.md)

## Goal

Fix WhatsApp indexing to include user's own messages, set proper `content_type` and `sender`, making all WhatsApp chunks eligible for enrichment.

## Tools

- **Research:** Done — [audit-whatsapp-indexing.md](../research/audit-whatsapp-indexing.md)
- **Code:** Claude Opus (Python edits in packages/zikaron/)

## Context

Current state (from audit):
- 16,347 WhatsApp chunks in DB
- ALL have `sender='other'` — user's own messages missing
- ALL have `content_type=NULL` — enrichment skips them entirely
- `format_whatsapp_for_pipeline()` exists but is dead code (never called)
- `backfill-metadata.py` detect_sender uses `contact_name`/`relationship_tag`, not `is_from_me`
- `classify_content()` ignores `type=whatsapp_message` (returns None)

Approach: **Option C from audit** — delete existing WhatsApp chunks, build proper pipeline, re-extract + re-index.

## Steps

### 1. Verify WhatsApp source data exists
```bash
# CRITICAL: If this file doesn't exist, DO NOT delete WhatsApp chunks from DB
ls -lh ~/Library/Group\ Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite
```
If ChatStorage.sqlite is missing, STOP. The chunks in DB may be the only copy.

### 2. Backup DB + export WhatsApp chunks
```bash
# Off-disk backup
bash packages/ralph/scripts/backup-golem-system.sh

# Also export WhatsApp chunks as safety net (small — ~16K rows)
sqlite3 ~/.local/share/zikaron/zikaron.db \
  ".mode json" \
  "SELECT * FROM chunks WHERE source = 'whatsapp'" \
  > /tmp/whatsapp-chunks-backup-$(date +%Y%m%d).json
ls -lh /tmp/whatsapp-chunks-backup-*.json
```

### 3. Stop enrichment
```bash
./packages/zikaron/scripts/enrich.sh stop
```

### 4. Count existing WhatsApp chunks
```sql
SELECT COUNT(*) FROM chunks WHERE source = 'whatsapp';
-- Expected: ~16,347
```

### 5. Delete existing WhatsApp chunks
```sql
DELETE FROM chunk_vectors WHERE chunk_id IN (SELECT id FROM chunks WHERE source = 'whatsapp');
DELETE FROM chunks WHERE source = 'whatsapp';
```

### 6. Add WhatsApp to classify.py
Add `whatsapp_message` type handling:
- `role="user"` (is_from_me=True) → `ContentType.USER_MESSAGE`
- `role="contact"` (is_from_me=False) → `ContentType.ASSISTANT_TEXT` (already in HIGH_VALUE_TYPES)

### 7. Add WhatsApp index path
New CLI command or extend `index_fast`:
- Call `extract_whatsapp_messages(only_from_me=False, exclude_groups=True)`
- Use `format_whatsapp_for_pipeline()` (currently dead code — activate it)
- Pass through classify → chunk → embed → upsert
- Use stable IDs: `whatsapp_{chat_id}_{msg_id}` for idempotent re-runs

### 8. Extend `upsert_chunks` to write sender
Add `sender` to the INSERT statement in `vector_store.py`:
- `"user"` role → `sender='me'`
- `"contact"` role → `sender='other'`

### 9. Set `source='whatsapp'` during indexing
Ensure new chunks have `source='whatsapp'` (not default `'claude_code'`).

### 10. Run WhatsApp reindex
```bash
zikaron index-whatsapp  # or however it's wired
```

### 11. Verify
- Count new chunks: `SELECT COUNT(*), sender, content_type FROM chunks WHERE source = 'whatsapp' GROUP BY sender, content_type`
- Should see both `sender='me'` and `sender='other'`
- Should see `content_type='user_message'` and `content_type='assistant_text'`
- Restart enrichment — WhatsApp chunks should now be selected

### 12. Apply min_char_count filter
Filter single-character junk during extraction (audit noted this issue).

## Depends On

- Phase 1 (project consolidation — so new WhatsApp chunks get canonical project names)

## Status

- [x] Verify WhatsApp source data (ChatStorage.sqlite) exists — **NOT FOUND** (blocker for reimport)
- [x] Backup WhatsApp chunks as JSON (11MB at /tmp/whatsapp-chunks-backup-20260216.json)
- [x] Fix content_type on existing WhatsApp chunks (11,687 set to user_message, 4,660 short ones left NULL)
- [x] Add WhatsApp type to classify.py (whatsapp_message → user_message/assistant_text)
- [x] Apply min_char_count filter to extract_whatsapp.py (parameterized SQL)
- [ ] ~~Count + delete existing WhatsApp chunks~~ — SKIPPED (ChatStorage.sqlite missing, chunks are only copy)
- [ ] ~~Build WhatsApp index path~~ — DEFERRED (needs ChatStorage.sqlite for reimport)
- [ ] ~~Extend upsert_chunks to write sender~~ — DEFERRED (needs is_from_me from source)
- [ ] ~~Run WhatsApp reindex~~ — DEFERRED (needs ChatStorage.sqlite)
