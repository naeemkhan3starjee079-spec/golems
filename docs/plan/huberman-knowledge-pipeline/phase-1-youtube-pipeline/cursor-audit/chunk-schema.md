# Zikaron Chunk Schema

## Full CREATE TABLE DDL

```sql
CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    metadata TEXT NOT NULL,
    source_file TEXT NOT NULL,
    project TEXT,
    content_type TEXT,
    value_type TEXT,
    char_count INTEGER,
    source TEXT,
    sender TEXT,
    language TEXT,
    conversation_id TEXT,
    position INTEGER,
    context_summary TEXT
);

-- Additional columns (added via ALTER TABLE for existing DBs):
-- tags TEXT
-- tag_confidence REAL
-- summary TEXT
-- importance REAL
-- intent TEXT
-- enriched_at TEXT
-- primary_symbols TEXT
-- resolved_query TEXT
-- epistemic_level TEXT
-- version_scope TEXT
-- debt_impact TEXT
-- external_deps TEXT
```

## Vector Table (sqlite-vec)

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vectors USING vec0(
    chunk_id TEXT PRIMARY KEY,
    embedding FLOAT[1024]
);
```

## FTS5 Full-Text Search Table

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    content, chunk_id UNINDEXED
);
```

## Field Descriptions

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | TEXT | Yes | Primary key. Format: `{source_file}:{index}` for Claude; use `youtube:{video_id}:{chunk_idx}` for YouTube |
| `content` | TEXT | Yes | The actual text content to embed and search |
| `metadata` | TEXT | Yes | JSON-serialized dict. Stores source-specific fields (video_id, timestamp, etc.) |
| `source_file` | TEXT | Yes | Origin identifier. For Claude: path to JSONL file. For YouTube: video URL or `youtube:{video_id}` |
| `project` | TEXT | No | Project/category. e.g. `huberman`, `golems` |
| `content_type` | TEXT | No | One of: `ai_code`, `stack_trace`, `user_message`, `assistant_text`, `file_read`, `git_diff`, `learning`, `skill`, etc. |
| `value_type` | TEXT | No | `high`, `medium`, `low` |
| `char_count` | INTEGER | No | Length of content (default 0) |
| `source` | TEXT | No | **Data source**. `claude_code` (default), `whatsapp`, `youtube`, `all`. **Critical for MCP search filter.** |
| `sender` | TEXT | No | Who sent (for WhatsApp: contact name; for Claude: `me`/`other`) |
| `language` | TEXT | No | `en`, `he`, `mixed` |
| `conversation_id` | TEXT | No | For `get_context()` — groups chunks into a conversation |
| `position` | INTEGER | No | Order within conversation. Required for context retrieval |
| `context_summary` | TEXT | No | Optional summary |

## Embedding Dimension

**1024** — bge-large-en-v1.5 (BAAI/bge-large-en-v1.5)

Defined in:
- `vector_store.py` line 98: `embedding FLOAT[1024]`
- `embeddings.py` line 17: `EMBEDDING_DIM = 1024`

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source);
CREATE INDEX IF NOT EXISTS idx_chunks_sender ON chunks(sender);
CREATE INDEX IF NOT EXISTS idx_chunks_conversation ON chunks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chunks_intent ON chunks(intent);
CREATE INDEX IF NOT EXISTS idx_chunks_importance ON chunks(importance);
CREATE INDEX IF NOT EXISTS idx_chunks_enriched ON chunks(enriched_at);
```
