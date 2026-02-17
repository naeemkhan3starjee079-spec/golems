# Phase 1: YouTube Transcript → Zikaron Pipeline

> [Back to main plan](../README.md)

## Goal

Build a reusable script to download YouTube transcripts and index them into Zikaron's sqlite-vec store with proper metadata.

## Tools

- **Research:** Claude.ai / Gemini — best transcript extraction approach (see prompts below)
- **Code audit:** Cursor IDE — audit existing Zikaron indexer to understand chunk format
- **Code:** Claude Code (Opus) — implement `index_youtube.py`

## Cursor Audit Prompt

Run this in Cursor IDE with the golems repo open. Tell Cursor to drop all output into `docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/`:

```
AUDIT TASK: Zikaron Indexer Format Analysis

I need to build a YouTube transcript indexer for Zikaron. Analyze the existing indexing code and tell me:

1. **Chunk schema**: What fields does `chunks` table have? (read `packages/zikaron/src/zikaron/vector_store.py`)
2. **Indexer flow**: How does `index_fast()` work? (read `packages/zikaron/src/zikaron/cli/__init__.py`, the `index-fast` command)
3. **Embedding model**: What model/dimensions? How are embeddings generated?
4. **WhatsApp source**: How does the WhatsApp indexer work? (read `packages/zikaron/src/zikaron/pipeline/extract_whatsapp.py`) — this is the closest analog to what we need
5. **Metadata format**: What metadata fields are stored per chunk?
6. **Source field**: What valid `source` values exist in the DB?

Drop your findings into: `docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/`
Create these files:
- `chunk-schema.md` — full table DDL + field descriptions
- `indexer-flow.md` — step-by-step flow of index_fast()
- `whatsapp-analog.md` — WhatsApp indexer analysis (our template)
- `metadata-format.md` — all metadata fields with examples
- `recommendations.md` — how to structure YouTube chunks to fit this schema
```

## Claude.ai / Gemini Research Prompt

Send to Claude.ai (long context) or Gemini:

```
RESEARCH: Best approach to bulk-index YouTube video transcripts into a Python sqlite-vec RAG system

Context:
- I have a Python RAG system (Zikaron) using sqlite-vec + sentence-transformers (bge-large-en-v1.5, 1024 dims)
- It currently indexes Claude Code JSONL conversations and WhatsApp messages
- I want to add YouTube video transcripts as a new source
- Primary use case: indexing Huberman Lab podcast episodes (1-3 hour episodes, science-heavy)

Research these approaches and compare:

1. **youtube-transcript-api** (Python library)
   - Pros/cons, quality of auto-captions vs manual captions
   - How to detect if manual captions are available
   - Rate limiting / bulk download concerns

2. **yt-dlp --write-auto-sub**
   - Format options (vtt, srt, json3)
   - Quality differences from youtube-transcript-api
   - Advantages for bulk downloads

3. **YouTube Data API v3**
   - Captions endpoint
   - OAuth requirements
   - Quota limits (especially for bulk)

4. **Chunking strategy for long-form podcasts**
   - Huberman episodes are 1-3 hours with topic changes
   - Should chunks be time-based (every 5 min)? Topic-based? Paragraph-based?
   - Ideal chunk size for semantic search (bge-large works best at what length?)
   - How to preserve timestamp info for citations

5. **Metadata to extract**
   - Episode title, channel, upload date, video ID
   - Timestamps/chapters if available
   - Speaker identification (Huberman vs guests)

Give me a concrete recommendation:
- Which extraction method
- Which chunking strategy
- What metadata to store
- Sample Python code for the extraction step
```

## Steps

1. Get Cursor audit results on Zikaron indexer format
2. Get research results on YouTube transcript extraction
3. Implement `packages/zikaron/scripts/index_youtube.py`:
   - CLI: `python3 index_youtube.py <url_or_playlist> [--chunk-size 500] [--overlap 50]`
   - Download transcript via `youtube-transcript-api` (or chosen method)
   - Chunk into segments with timestamp metadata
   - Generate embeddings with bge-large-en-v1.5
   - Upsert into Zikaron with `source="youtube"`, proper metadata
4. Test with ONE short YouTube video (not Huberman yet — just verify the pipeline works)
5. Add `source="youtube"` support to Zikaron MCP search filter
6. Create branch, PR, merge

## Depends On

- None (can start immediately)

## Status

- [x] Cursor audit of Zikaron indexer format (6 files in cursor-audit/)
- [x] Research on transcript extraction methods (transcript-research.md — 82-page deep dive)
- [x] Implement `index_youtube.py` (635 lines: yt-dlp extraction, chapter-aware chunking, rate limiting, resume support)
- [x] Test with one short video (tested, then indexed 16 Huberman episodes = 1,799 chunks)
- [x] Add `source="youtube"` to MCP search filter (line 80 of mcp/__init__.py)
- [x] Merged as part of broader coach work (PR #208 branch: feat/coach-whoop-calendar-sync)
