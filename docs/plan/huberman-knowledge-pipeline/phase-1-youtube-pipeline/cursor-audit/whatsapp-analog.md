# WhatsApp Indexer Analysis — Template for YouTube

## Overview

WhatsApp is the closest analog to YouTube transcripts: both are non-Claude sources that need to be chunked and indexed with appropriate metadata.

## Data Flow (Current State)

WhatsApp does **not** have a dedicated index path into the main Zikaron DB. The flow is:

1. **Extract** (`extract_whatsapp.py`): Reads from `~/Library/Group Containers/.../ChatStorage.sqlite`
2. **Format for pipeline** (`format_whatsapp_for_pipeline`): Converts to pipeline format
3. **Classify** (`classify.py`): Handles `entry_type == "whatsapp_message"`
4. **Chunk** (`chunk.py`): Uses default text chunking (no AST)

To actually index WhatsApp, you would need to:
- Export messages to JSONL in the format `classify_content` expects, or
- Build a custom script that formats → classifies → chunks → embeds → upserts with `source="whatsapp"`

## WhatsApp Message Format (from extract_whatsapp.py)

### Raw extracted message

```python
{
    'id': row['id'],
    'text': row['text'],
    'is_from_me': bool,
    'timestamp': unix_timestamp,
    'datetime': datetime,
    'from_jid': str,      # e.g. "1234567890@s.whatsapp.net"
    'to_jid': str,
    'contact_name': str,  # ZPUSHNAME
    'message_type': int,
    'starred': bool,
    'stanza_id': str,
}
```

### Pipeline format (format_whatsapp_for_pipeline)

```python
{
    "type": "whatsapp_message",
    "id": f"whatsapp_{message['id']}",
    "timestamp": message['timestamp'],
    "role": "user" if message['is_from_me'] else "contact",
    "content": message['text'],
    "metadata": {
        "source": "whatsapp",
        "contact": message['contact_name'],
        "jid": message['from_jid'] if not message['is_from_me'] else message['to_jid'],
        "starred": message['starred'],
    }
}
```

## Chunking Strategy

- **One message ≈ one chunk** (or small groups if batched)
- `classify_content` returns `ClassifiedContent` with:
  - `content_type`: `USER_MESSAGE` (if from me) or `ASSISTANT_TEXT` (if from contact)
  - `metadata`: `{"source": "whatsapp"}` — **source is in metadata, not top-level**
- `chunk_content` uses `_chunk_text` for non-code (simple char-based with overlap)
- Min length: 10 chars (filtered in classify for WhatsApp)

## Metadata Stored Per Chunk

| Field | Where | Example |
|-------|-------|---------|
| `source` | metadata dict | `"whatsapp"` |
| `contact` | metadata dict | Contact display name |
| `jid` | metadata dict | `972500000000@s.whatsapp.net` |
| `starred` | metadata dict | `true`/`false` |

**Critical:** The `source` field in the **chunks table** (top-level column) comes from `chunk.get("source", "claude_code")` in `upsert_chunks`. The `index_chunks_to_sqlite` does NOT pass `source` from metadata to chunk_data, so WhatsApp chunks would default to `claude_code` unless the indexer is modified.

## Setting the source Field

For WhatsApp to have `source="whatsapp"` in the DB:

1. **Option A**: Extend `index_chunks_to_sqlite` to add:
   ```python
   "source": chunk.metadata.get("source", "claude_code")
   ```
2. **Option B**: Use a custom indexer that builds chunk_data with `source="whatsapp"` and calls `VectorStore.upsert_chunks` directly.
3. **Option C**: Run `backfill-metadata.py` after indexing — it infers source from `metadata.chat_id` containing `@s.whatsapp.net` and updates the `source` column.

## Conversation Context (conversation_id, position)

WhatsApp chunks could use:
- `conversation_id` = chat JID (e.g. `972500000000@s.whatsapp.net`)
- `position` = message order within chat
- `sender` = contact name or "me"

These enable `get_context(chunk_id, before=3, after=3)` to return surrounding messages. The `upsert_chunks` method does **not** currently write `sender`, `conversation_id`, or `position` — those columns exist but are only populated by backfill or a future schema extension.
