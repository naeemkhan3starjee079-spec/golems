# YouTube Transcript Indexer — Recommendations

## Summary

- **source="youtube"** — MCP already supports it. No code changes needed for search.
- **Chunk format** — Build dicts matching `upsert_chunks` input; embed with bge-large-en-v1.5 (1024 dims).
- **Gap** — `index_chunks_to_sqlite` does not pass `source` from metadata; use a custom indexer or extend it.

---

## How to Structure YouTube Transcript Chunks

### Required Dict Format (for upsert_chunks)

```python
{
    "id": "youtube:VIDEO_ID:CHUNK_INDEX",       # Unique, used as primary key
    "content": "Transcript text...",             # The text to embed and search
    "metadata": {                                # JSON-serialized, stored as-is
        "source": "youtube",
        "video_id": "abc123",
        "title": "Video Title",
        "channel": "Channel Name",
        "timestamp": "00:05:30",
        "start_seconds": 330,
        "end_seconds": 390,
    },
    "source_file": "youtube:VIDEO_ID",           # Or full URL; used in search results
    "project": "huberman",                       # Optional; e.g. channel or playlist
    "content_type": "assistant_text",            # Spoken content
    "value_type": "medium",
    "char_count": len(content),
    "source": "youtube",                         # CRITICAL: enables source_filter in MCP
}
```

### Optional: conversation_id + position (for get_context)

If you want `zikaron_context` to return surrounding transcript chunks:

```python
# Same video = same conversation
"conversation_id": f"youtube:{video_id}",
"position": chunk_index,  # 0, 1, 2, ...
```

**Caveat:** `upsert_chunks` does NOT currently write `conversation_id` or `position`. You would need to either:
1. Extend `upsert_chunks` to accept and write these columns, or
2. Run a post-index UPDATE for YouTube chunks.

---

## Sample Python Code

```python
"""Index YouTube transcript chunks into Zikaron."""

from pathlib import Path
from typing import List

from zikaron.embeddings import embed_chunks
from zikaron.vector_store import VectorStore
from zikaron.pipeline.chunk import Chunk
from zikaron.pipeline.classify import ContentType, ContentValue

DEFAULT_DB_PATH = Path.home() / ".local" / "share" / "zikaron" / "zikaron.db"


def chunk_transcript(
    segments: List[dict],
    video_id: str,
    title: str,
    channel: str,
    project: str = "huberman",
    target_chars: int = 1500,
) -> List[Chunk]:
    """
    Chunk transcript segments into ~target_chars each.
    segments: [{"start": 0.0, "end": 5.2, "text": "..."}, ...]
    """
    chunks = []
    current_text = []
    current_start = None
    current_end = None

    for seg in segments:
        text = seg.get("text", "").strip()
        if not text:
            continue

        if not current_text:
            current_start = seg["start"]
        current_end = seg["end"]
        current_text.append(text)

        if sum(len(t) for t in current_text) >= target_chars:
            content = " ".join(current_text)
            chunks.append(Chunk(
                content=content,
                content_type=ContentType.ASSISTANT_TEXT,
                value=ContentValue.MEDIUM,
                metadata={
                    "source": "youtube",
                    "video_id": video_id,
                    "title": title,
                    "channel": channel,
                    "start_seconds": int(current_start),
                    "end_seconds": int(current_end),
                },
                char_count=len(content),
            ))
            current_text = []
            current_start = None
            current_end = None

    if current_text:
        content = " ".join(current_text)
        chunks.append(Chunk(
            content=content,
            content_type=ContentType.ASSISTANT_TEXT,
            value=ContentValue.MEDIUM,
            metadata={
                "source": "youtube",
                "video_id": video_id,
                "title": title,
                "channel": channel,
                "start_seconds": int(current_start or 0),
                "end_seconds": int(current_end or 0),
            },
            char_count=len(content),
        ))

    return chunks


def index_youtube_transcript(
    segments: List[dict],
    video_id: str,
    title: str,
    channel: str,
    project: str = "huberman",
    db_path: Path = DEFAULT_DB_PATH,
) -> int:
    """Index a YouTube transcript into Zikaron."""
    chunks = chunk_transcript(segments, video_id, title, channel, project)

    if not chunks:
        return 0

    # Embed
    embedded = embed_chunks(chunks)

    # Build chunk_data with source="youtube"
    source_file = f"youtube:{video_id}"
    chunk_data = []
    embeddings = []

    for i, ec in enumerate(embedded):
        c = ec.chunk
        chunk_data.append({
            "id": f"{source_file}:{i}",
            "content": c.content,
            "metadata": c.metadata,
            "source_file": source_file,
            "project": project,
            "content_type": c.content_type.value,
            "value_type": c.value.value,
            "char_count": c.char_count,
            "source": "youtube",  # Required for MCP source_filter
        })
        embeddings.append(ec.embedding)

    with VectorStore(db_path) as store:
        return store.upsert_chunks(chunk_data, embeddings)


# Example usage
if __name__ == "__main__":
    segments = [
        {"start": 0.0, "end": 5.2, "text": "Welcome to the Huberman Lab podcast."},
        {"start": 5.2, "end": 12.1, "text": "Today we're discussing sleep and recovery."},
        # ... more segments
    ]
    n = index_youtube_transcript(
        segments=segments,
        video_id="abc123",
        title="The Science of Sleep",
        channel="Huberman Lab",
        project="huberman",
    )
    print(f"Indexed {n} chunks")
```

---

## MCP Search: source_filter

**Adding source="youtube" just works.** The MCP `zikaron_search` tool already has:

```python
"source": {
    "enum": ["claude_code", "whatsapp", "youtube", "all"],
    ...
}
```

When the user passes `source="youtube"`, it becomes `source_filter="youtube"` and is passed to `store.hybrid_search(source_filter="youtube")`. The vector_store adds `c.source = ?` to the WHERE clause. No code changes required.

---

## Code Changes to Consider

### 1. Extend index_chunks_to_sqlite (optional)

Add source from metadata so any pipeline (WhatsApp, YouTube, etc.) gets correct source:

```python
# In index_new.py, chunk_data.append():
"source": chunk.metadata.get("source", "claude_code"),
```

### 2. Extend upsert_chunks for conversation context (optional)

If you want `get_context()` for YouTube:

```python
# In vector_store.py upsert_chunks, extend INSERT:
(id, content, metadata, source_file, project, content_type, value_type,
 char_count, source, sender, conversation_id, position)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
# With chunk.get("sender"), chunk.get("conversation_id"), chunk.get("position")
```

### 3. Add extract_youtube.py

Create `pipeline/extract_youtube.py` that:
- Fetches transcript (yt-dlp, YouTube Transcript API, or pre-downloaded JSON)
- Yields segments in a standard format
- Can be plugged into a CLI command `zikaron index-youtube`

---

## Embedding Notes

- **Model**: BAAI/bge-large-en-v1.5
- **Dimension**: 1024
- **Truncation**: Content is truncated to 512 chars before embedding (`embeddings.py` line 61: `MAX_EMBEDDING_CHARS = 512`)
- **Batch size**: 32

For long transcript chunks, only the first ~462 chars (+ "...") are embedded. Use `target_chars` ≤ 500 if you want the full chunk embedded, or accept that longer chunks are summarized by their opening.
