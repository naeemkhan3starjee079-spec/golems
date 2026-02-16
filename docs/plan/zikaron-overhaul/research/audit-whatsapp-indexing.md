# WhatsApp Indexing Data Flow Audit

> Complete trace of WhatsApp message indexing in Zikaron. Findings for reindex plan: add user messages, set content_type, enable enrichment.

**Date:** 2026-02-16  
**Issue:** 16K WhatsApp chunks have `sender='other'` (missing user messages) and `content_type=NULL` (enrichment skips them).

---

## 1. WhatsApp Extractor (`extract_whatsapp.py`)

### Parsing

- **Source:** `~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite`
- **Table:** `ZWAMESSAGE`
- **Key columns:** `ZISFROMME`, `ZTEXT`, `ZMESSAGEDATE`, `ZFROMJID`, `ZTOJID`, `ZPUSHNAME`

### `is_from_me` Flag

```python
# Line 61: ZISFROMME as is_from_me
# Line 101: 'is_from_me': bool(row['is_from_me'])
```

- `ZISFROMME = 1` → message sent by the device owner (user)
- `ZISFROMME = 0` → message from contact

### `format_whatsapp_for_pipeline()`

```python
# Lines 200-218
return {
    "type": "whatsapp_message",
    "id": f"whatsapp_{message['id']}",
    "role": "user" if message['is_from_me'] else "contact",  # ← sender info HERE
    "content": message['text'],
    "metadata": {
        "source": "whatsapp",
        "contact": message['contact_name'],
        "jid": message['from_jid'] if not message['is_from_me'] else message['to_jid'],
        "starred": message['starred'],
    }
}
```

**Findings:**
- `role` is set correctly: `"user"` for `is_from_me`, `"contact"` for others
- `metadata` has `source`, `contact`, `jid`, `starred` — **no `is_from_me` or `role`**
- `format_whatsapp_for_pipeline` is **never called** from the main index pipeline (dead code)

### `only_from_me` Filter

- `extract_whatsapp_messages(only_from_me=True)` restricts to user messages
- Default `only_from_me=False` returns both sides
- `exclude_groups=True` filters out group chats (`@g.us`)

---

## 2. Indexing Pipeline: Extractor → Chunking → Vector Store

### Current Flow (index-fast)

```
~/.claude/projects/**/*.jsonl  →  parse_jsonl  →  classify_content  →  chunk_content  →  embed  →  upsert_chunks
```

- **Source:** Only JSONL files from Claude Code projects
- **WhatsApp:** Not part of this flow

### `classify_content()` (classify.py)

- Handles `type == "user"` and `type == "assistant"` (Claude Code format)
- **Ignores** `type == "whatsapp_message"` → returns `None` (skipped)
- No branch for WhatsApp messages

### Where WhatsApp Chunks Came From

WhatsApp chunks in the DB likely came from:

1. **Legacy ChromaDB pipeline** (pre–sqlite-vec) that had its own WhatsApp indexing
2. **Migration** (`migrate.py`) from `chromadb.backup` to sqlite-vec

The migration preserves ChromaDB metadata (`source_file`, `project`, `content_type`, etc.). If the old pipeline did not set `content_type` or `sender`, those fields stayed NULL or wrong.

### `content_type` Assignment

| Stage | Claude Code | WhatsApp |
|-------|-------------|----------|
| classify.py | `ContentType.USER_MESSAGE`, `.ASSISTANT_TEXT`, etc. | Not processed (returns None) |
| index_new.py | `chunk.content_type.value` | N/A — WhatsApp not in pipeline |
| vector_store.upsert_chunks | `chunk.get("content_type")` | Not set → NULL |
| migrate.py | `metadata.get("content_type")` | Often missing in ChromaDB metadata → NULL |

---

## 3. Chunk Schema (`vector_store.py`)

### Columns

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | TEXT | ✓ | Primary key |
| content | TEXT | ✓ | Chunk text |
| metadata | TEXT | ✓ | JSON |
| source_file | TEXT | ✓ | Path or identifier |
| project | TEXT | Optional | |
| content_type | TEXT | Optional | **NULL for WhatsApp** |
| value_type | TEXT | Optional | |
| char_count | INTEGER | Optional | Default 0 |
| source | TEXT | Optional | Default `"claude_code"` |
| sender | TEXT | Optional | **Not written by upsert_chunks** |
| language | TEXT | Optional | |
| conversation_id | TEXT | Optional | |
| position | INTEGER | Optional | |
| tags, summary, importance, intent, enriched_at | TEXT/REAL | Optional | Enrichment fields |

### `upsert_chunks` INSERT

```python
# Lines 243-256 — sender is NOT in the INSERT
INSERT INTO chunks
(id, content, metadata, source_file, project,
 content_type, value_type, char_count, source)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

- `sender` exists in the schema but is **never written** by `upsert_chunks`
- `content_type` comes from `chunk.get("content_type")` — NULL if not provided

### Valid `content_type` Values (from classify.py)

- `ai_code`, `stack_trace`, `user_message`, `assistant_text`
- `file_read`, `git_diff`, `build_log`, `dir_listing`, `config`, `noise`
- `learning`, `skill`, `project_config`, `research`, `prd_archive`, `verification`, `documentation`

For WhatsApp, suitable values:

- `user_message` — user’s own messages (`is_from_me=True`)
- `assistant_text` or new `chat_message` — contact messages (`is_from_me=False`)

---

## 4. Reindexing and Bulk-Update Utilities

### Existing Scripts

| Script | Purpose | WhatsApp Support |
|--------|---------|------------------|
| `backfill-metadata.py` | Sets `source`, `sender`, `language` | Partial — `detect_sender` for WhatsApp ignores `is_from_me` |
| `backfill-context.py` | Sets `conversation_id`, `position` | Per `source_file` |
| `migrate.py` | ChromaDB → sqlite-vec | One-time migration |

### `backfill-metadata.py` `detect_sender` for WhatsApp

```python
# Lines 45-59
if source == "whatsapp":
    contact = metadata.get("contact_name", "")
    rel = metadata.get("relationship_tag", "")
    if rel == "self" or contact in ("You", "אתה"):
        return "me"
    if metadata.get("is_business") or (...):
        return "commercial"
    return "other"  # ← ALL chunks fall here: no is_from_me check!
```

- Uses `relationship_tag` and `contact_name`, not `is_from_me` or `role`
- WhatsApp metadata has `contact`, `jid`, `source` — no `is_from_me`
- Result: all WhatsApp chunks get `sender='other'`

### Reindex Options

1. **In-place UPDATE** — set `content_type` and `sender` for existing WhatsApp chunks using metadata (if `is_from_me`/`role` were ever stored)
2. **Delete + reindex** — remove WhatsApp chunks, re-extract with correct pipeline, re-insert
3. **New index path** — add WhatsApp to the main pipeline and index from scratch

---

## 5. `source='whatsapp'` Filter Path

### Detection (backfill-metadata.py)

```python
chat_id = metadata.get("chat_id", "")
if chat_id and "@s.whatsapp.net" in chat_id:
    return "whatsapp"
```

- `format_whatsapp_for_pipeline` puts `jid` in metadata, not `chat_id`
- Legacy ChromaDB collections may have used `chat_id` (e.g. from unified_timeline)
- `unified_timeline.load_whatsapp_messages` uses `chat_id` (from `ZCONTACTJID` / `ZTOJID`)
- ChromaDB style_index stores `chat_id` in metadata
- If WhatsApp chunks came from ChromaDB, they may have `chat_id` in metadata

### Schema Differences: WhatsApp vs claude_code

| Field | claude_code | whatsapp |
|-------|-------------|----------|
| source_file | JSONL path | Chat identifier or path |
| project | Folder name | Often NULL |
| content_type | user_message, ai_code, etc. | NULL |
| sender | Set by backfill from content_type | Always "other" (backfill bug) |
| metadata | role, language, etc. | contact, jid, source, starred |

---

## 6. Deduplication Logic

### `upsert_chunks`

- Uses `INSERT OR REPLACE` on `id`
- Same `id` overwrites the row
- No hash-based deduplication

### Chunk ID Format

- **Claude Code:** `{source_file}:{i}` (e.g. `~/path/to/session.jsonl:0`)
- **WhatsApp (format_whatsapp_for_pipeline):** `whatsapp_{message['id']}` (DB primary key)

### Re-indexing Without Duplicates

- Use stable IDs: `whatsapp_{chat_id}_{message_id}_{is_from_me}` or similar
- Or delete by `source='whatsapp'` before reindex
- Or `INSERT OR REPLACE` with same IDs (safe if IDs are deterministic)

---

## 7. Enrichment Skip (content_type=NULL)

### `get_unenriched_chunks` (vector_store.py)

```python
# Lines 710-713
if content_types:
    placeholders = ",".join("?" for _ in content_types)
    where.append(f"content_type IN ({placeholders})")
    params.extend(content_types)
```

- Default: `content_types = HIGH_VALUE_TYPES` = `["ai_code", "stack_trace", "user_message", "assistant_text"]`
- `content_type IS NULL` does not match `IN (...)`
- Result: WhatsApp chunks are never selected for enrichment

---

## 8. Reindex Plan Summary

### Goals

1. Add user messages (`is_from_me=True`)
2. Set `content_type`: `user_message` (self) / `chat_message` or `assistant_text` (other)
3. Set `sender`: `me` (self) / `other` (contact)
4. Make chunks eligible for enrichment

### Implementation Options

**Option A: New WhatsApp index path (recommended)**

1. Add `whatsapp_message` handling in `classify.py`:
   - Map `role="user"` → `ContentType.USER_MESSAGE`
   - Map `role="contact"` → `ContentType.ASSISTANT_TEXT` or new `ContentType.CHAT_MESSAGE`
2. Add WhatsApp indexing to `index-fast` or a new `index-whatsapp` command:
   - Call `extract_whatsapp_messages(only_from_me=False, exclude_groups=True)`
   - Use `format_whatsapp_for_pipeline` for each message
   - Run through classify → chunk → embed → upsert
3. Extend `upsert_chunks` to write `sender` (and ensure `source` is passed): add `sender` to the INSERT, and pass `chunk.get("sender")` from metadata/role
4. Use stable IDs: `whatsapp_{chat_id}_{msg_id}` with `chat_id` from `jid` or session

**Option B: In-place fix (if metadata has role/is_from_me)**

1. If existing chunks have `role` or `is_from_me` in metadata, run an UPDATE script
2. Fix `backfill-metadata.py` to use `metadata.get("role") == "user"` or `metadata.get("is_from_me")` for WhatsApp sender
3. Set `content_type` via UPDATE for `source='whatsapp'` chunks

**Option C: Delete + full reindex**

1. `DELETE FROM chunks WHERE source = 'whatsapp'` (and matching `chunk_vectors`)
2. Implement Option A
3. Re-run index for WhatsApp

### Deduplication

- Use deterministic IDs so re-runs are idempotent (`INSERT OR REPLACE`)
- Or delete WhatsApp chunks before reindex to avoid duplicates

### Suggested content_type for WhatsApp

- `user_message` — user’s messages (aligns with enrichment `HIGH_VALUE_TYPES`)
- `assistant_text` — contact messages (already in `HIGH_VALUE_TYPES`)

---

## Appendix: Key File References

| File | Relevant Sections |
|------|-------------------|
| `extract_whatsapp.py` | Lines 56-110 (extract), 200-218 (format) |
| `classify.py` | Lines 272-352 (classify_content — no whatsapp_message) |
| `vector_store.py` | Lines 43-60 (schema), 225-265 (upsert_chunks), 698-738 (get_unenriched_chunks) |
| `enrichment.py` | Lines 116-117 (HIGH_VALUE_TYPES), 256-264 (enrich_batch) |
| `backfill-metadata.py` | Lines 21-65 (detect_source, detect_sender) |
| `index_new.py` | Lines 37-51 (chunk_data prep — no source/sender) |
