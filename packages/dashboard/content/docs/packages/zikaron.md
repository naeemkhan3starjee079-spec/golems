---
title: "Zikaron — Memory Layer"
description: "Persistent memory for Claude Code. 238K+ indexed conversation chunks with semantic search in under 2 seconds."
---

# Zikaron (Memory)

> Persistent memory for Claude Code conversations. Index, search, and retrieve knowledge from past coding sessions.

## What It Does

Zikaron (Hebrew for "memory") is a **knowledge pipeline** that indexes every Claude Code conversation into a searchable database. It uses semantic embeddings to find past solutions, decisions, and patterns across all your projects. 238K+ chunks indexed, searchable in under 2 seconds.

## Architecture

```
~/.claude/projects/          # Source: Claude Code conversations (JSONL)
        |
  PIPELINE
  Extract -> Classify -> Chunk -> Embed -> Index
                                  bge-large sqlite-vec
                                  1024 dims   fast DB
        |
~/.local/share/zikaron/zikaron.db   # Storage (~1GB)
        |
  INTERFACES
  CLI            FastAPI Daemon      MCP Server
  search         /tmp/zikaron.sock   zikaron-mcp
  dashboard      (<2s queries)
```

## Pipeline Stages

### 1. Extract
Parse JSONL conversation files. Content-addressable storage for system prompts (SHA-256 deduplication). Detects conversation continuations.

### 2. Classify
Content types with preservation rules:

| Type | Value | Action |
|------|-------|--------|
| `ai_code` | HIGH | Preserve verbatim |
| `stack_trace` | HIGH | Preserve exact (never split) |
| `user_message` | HIGH | Preserve |
| `assistant_text` | MEDIUM | Preserve |
| `file_read` | MEDIUM | Context-dependent |
| `git_diff` | MEDIUM | Extract changed entities |
| `build_log` | LOW | Summarize or mask |
| `noise` | SKIP | Filter out |

### 3. Chunk
AST-aware chunking with tree-sitter for code (~500 tokens). Never splits stack traces. Turn-based chunking for conversation with 10-20% overlap.

### 4. Embed
Uses `bge-large-en-v1.5` model (1024 dimensions). Runs locally via sentence-transformers.

### 5. Index
sqlite-vec for vector similarity search. Sub-2-second queries across 238K+ chunks.

## Interfaces

### CLI
```bash
zikaron search-fast "how did I implement auth"
zikaron dashboard                              # Interactive TUI
zikaron index                                  # Re-index conversations
```

### MCP Server
Exposed to Claude Code as `zikaron-mcp`:

| Tool | Description |
|------|-------------|
| `zikaron_search` | Semantic search across all sessions |
| `zikaron_context` | Get surrounding conversation for a chunk |
| `zikaron_stats` | Index statistics (chunk count, projects) |

### FastAPI Daemon
Unix socket server at `/tmp/zikaron.sock` for sub-2-second queries from any local process.

## Stack

- **Language:** Python 3.10+
- **Embeddings:** bge-large-en-v1.5 (sentence-transformers)
- **Vector DB:** sqlite-vec (1024 dimensions)
- **API:** FastAPI (Unix socket)
- **Parser:** tree-sitter (AST-aware code chunking)

## Source

[`packages/zikaron/`](https://github.com/EtanHey/golems/tree/master/packages/zikaron)
