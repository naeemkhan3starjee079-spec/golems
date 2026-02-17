# Phase 1 Findings: YouTube Transcript Pipeline

## Decisions

- [initial] Zikaron currently has NO YouTube source support — only `claude_code` and `whatsapp`
- [initial] WhatsApp indexer (`extract_whatsapp.py`) is the closest analog — uses `source="whatsapp"` in metadata
- [initial] `youtube-transcript-api` already used in SongScript project (see Zikaron search results)
- [initial] Zikaron uses bge-large-en-v1.5 (1024 dims) for embeddings

## Research

- Awaiting Cursor audit of Zikaron indexer format
- Awaiting Claude.ai/Gemini research on best transcript extraction method

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Cursor audit of Zikaron format | user (Cursor) | pending |
| Research transcript methods | user (Claude.ai/Gemini) | pending |
| Implement index_youtube.py | claude-code | pending |

## Notes

- SongScript already uses `youtube-transcript-api` — confirmed working in user's Python env
- Zikaron `upsert_chunks()` in `vector_store.py` is the entry point for adding new chunks
- `source` field in chunk metadata can be anything (string) — no validation, so `"youtube"` just works
- MCP search filter supports `source_filter` parameter — adding "youtube" as option needed in MCP `__init__.py`
