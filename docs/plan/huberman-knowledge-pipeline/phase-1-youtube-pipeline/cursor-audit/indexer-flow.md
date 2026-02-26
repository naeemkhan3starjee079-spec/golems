# Indexer Flow: index-fast Command

## Entry Point

`packages/zikaron/src/zikaron/cli/__init__.py` — `index_fast` command (line 1219)

Also invoked by `index` command (line 40): `index_fast(source, project, force)`

## Step-by-Step Flow

### 1. Discover JSONL Files

```python
# With --project: only that project dir
project_dir = source / project
jsonl_files = list(project_dir.glob("*.jsonl"))

# Without --project: recursive
jsonl_files = list(source.rglob("*.jsonl"))
```

Default source: `~/.claude/projects`

### 2. For Each JSONL File: Parse → Classify → Chunk

```python
for entry in parse_jsonl(jsonl_file):
    classified = classify_content(entry)
    if classified is not None:  # Skip noise
        chunks = chunk_content(classified)
        all_chunks.extend(chunks)
```

- **parse_jsonl** (`pipeline/extract.py`): Yields each line as dict via `orjson.loads`
- **classify_content** (`pipeline/classify.py`): Returns `ClassifiedContent` or None. Handles `user`, `assistant`, `tool_result`, `whatsapp_message`, etc.
- **chunk_content** (`pipeline/chunk.py`): Returns `List[Chunk]`. AST-aware for code, turn-based for conversation.

### 3. Index Chunks to SQLite

```python
indexed = index_chunks_to_sqlite(
    all_chunks,
    source_file=str(jsonl_file),
    project=proj_name,
    on_progress=progress_callback
)
```

### 4. index_chunks_to_sqlite (`index_new.py`)

1. **Embed chunks**: `embed_chunks(chunks, on_progress=...)`
   - Uses `sentence_transformers` with `BAAI/bge-large-en-v1.5`
   - Batch size: **32**
   - Truncates content to 512 chars before embedding
   - Returns `List[EmbeddedChunk]` (chunk + embedding)

2. **Build chunk_data** for each embedded chunk:
   ```python
   {
       "id": f"{source_file}:{i}",
       "content": chunk.content,
       "metadata": chunk.metadata,
       "source_file": source_file,
       "project": project,
       "content_type": chunk.content_type.value,
       "value_type": chunk.value.value,
       "char_count": chunk.char_count
   }
   ```
   **Note:** `source` is NOT passed here — defaults to `claude_code` in upsert_chunks.

3. **Upsert**: `store.upsert_chunks(chunk_data, embeddings)`

### 5. Embeddings Generation (`embeddings.py`)

- **Model**: BAAI/bge-large-en-v1.5
- **Batch size**: 32
- **Truncation**: Content truncated to 512 chars (`MAX_EMBEDDING_CHARS`)
- **Device**: MPS (Apple Silicon) or CPU
- **Output**: 1024-dimensional float vectors

### 6. upsert_chunks (`vector_store.py`)

For each (chunk, embedding) pair:

1. `INSERT OR REPLACE INTO chunks` with: id, content, metadata, source_file, project, content_type, value_type, char_count, **source** (from `chunk.get("source", "claude_code")`)
2. `DELETE FROM chunk_vectors WHERE chunk_id = ?`
3. `INSERT INTO chunk_vectors (chunk_id, embedding)` with serialized float32 vector

## Batch Size Summary

| Stage | Batch Size |
|-------|------------|
| Embedding | 32 chunks |
| Upsert | 1 chunk at a time (loop) |

## Gap for Non-Claude Sources

The `index_chunks_to_sqlite` function does **not** pass `source` from `chunk.metadata` to the chunk_data dict. So WhatsApp/YouTube chunks indexed through this path would get `source="claude_code"` unless:

1. `index_chunks_to_sqlite` is extended to add `source=chunk.metadata.get("source", "claude_code")` to chunk_data, or
2. A custom indexer builds chunk_data directly with `source="youtube"` and calls `upsert_chunks`.
