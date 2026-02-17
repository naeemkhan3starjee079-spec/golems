---
title: "Zikaron — Memory Layer"
description: "Persistent memory for Claude Code. 260K+ indexed conversation chunks with semantic search, 10-field enrichment, and PII sanitization."
---

# Zikaron (Memory)

> Persistent memory for Claude Code conversations. Index, search, and retrieve knowledge from past coding sessions.

## What It Does

Zikaron (Hebrew for "memory") is a **knowledge pipeline** that indexes every Claude Code conversation into a searchable database. It uses semantic embeddings to find past solutions, decisions, and patterns across all your projects. 260K+ chunks indexed, searchable in under 2 seconds.

## Architecture

```
~/.claude/projects/          # Source: Claude Code conversations (JSONL)
        |
  PIPELINE
  Extract -> Classify -> Chunk -> Embed -> Index
                                  bge-large sqlite-vec
                                  1024 dims   fast DB
        |
~/.local/share/zikaron/zikaron.db   # Storage (~1.4GB)
        |
  POST-PROCESSING
  Enrichment (10 fields)    PII Sanitization    Brain Graph
  Ollama / MLX (local)      3-layer detection   Obsidian Export
  Gemini (cloud backfill)   mandatory for ext.
        |
  INTERFACES
  CLI            FastAPI Daemon      MCP Server      Dashboard
  search         :8787 / socket      zikaron-mcp     Next.js
```

## Pipeline Stages

### 1. Extract
Parse JSONL conversation files. Content-addressable storage for system prompts (SHA-256 deduplication). Detects conversation continuations. Also imports WhatsApp, YouTube, Markdown, and Claude Desktop sources.

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
| `dir_listing` | LOW | Structure only |
| `noise` | SKIP | Filter out |

### 3. Chunk
AST-aware chunking with tree-sitter for code (~500 tokens). Never splits stack traces. Turn-based chunking for conversation with 10-20% overlap.

### 4. Embed
Uses `bge-large-en-v1.5` model (1024 dimensions). Runs locally via sentence-transformers with MPS acceleration on Apple Silicon.

### 5. Index
sqlite-vec for vector similarity search. WAL mode + `busy_timeout=5000ms` for concurrent access from daemon, MCP server, and enrichment. Sub-2-second queries across 260K+ chunks.

## Interfaces

### CLI
```bash
zikaron search "how did I implement auth"
zikaron enrich                                 # Run local LLM enrichment
zikaron index                                  # Re-index conversations
zikaron dashboard                              # Interactive TUI
```

### MCP Server
Exposed to Claude Code as `zikaron-mcp` (8 tools):

| Tool | Description |
|------|-------------|
| `zikaron_search` | Semantic search across all sessions (with project, content_type, tag, intent, importance filters) |
| `zikaron_context` | Get surrounding conversation chunks for a search result |
| `zikaron_stats` | Index statistics (chunk count, projects, content types) |
| `zikaron_list_projects` | List all indexed projects |
| `zikaron_file_timeline` | File interaction history across sessions |
| `zikaron_operations` | Logical operation groups (read/edit/test cycles) |
| `zikaron_regression` | What changed since a file last worked |
| `zikaron_plan_links` | Session to plan/phase linkage |

### FastAPI Daemon
HTTP server at `:8787` (or Unix socket) with 25+ endpoints. Powers the Next.js dashboard enrichment and session pages.

## Enrichment Pipeline (10 Fields)

Local LLM enrichment adds structured metadata to each chunk:

| Field | What it captures | Example |
|-------|-----------------|---------|
| `summary` | 1-2 sentence gist | "Debugging why Telegram bot drops messages under load" |
| `tags` | Topic tags (3-7 per chunk) | "telegram, debugging, performance" |
| `importance` | 1-10 relevance score | 8 (architecture decision) vs 2 (directory listing) |
| `intent` | What was happening | `debugging`, `designing`, `implementing`, `configuring` |
| `primary_symbols` | Key code entities | "TelegramBot, handleMessage, grammy" |
| `resolved_query` | Question this answers (HyDE) | "How does the Telegram bot handle rate limiting?" |
| `epistemic_level` | How proven is this | `hypothesis`, `substantiated`, `validated` |
| `version_scope` | Version/system state | "grammy 1.32, Node 22, pre-Railway migration" |
| `debt_impact` | Technical debt signal | `introduction`, `resolution`, `none` |
| `external_deps` | Libraries/APIs mentioned | "grammy, Supabase, Railway" |

### Backends

| Backend | How to start | Speed |
|---------|-------------|-------|
| **Ollama** (default) | `ollama serve` + `ollama pull glm4` | ~1s/chunk (short), ~13s (long) |
| **MLX** (Apple Silicon) | `python3 -m mlx_lm.server --model <model> --port 8080` | 21-87% faster |
| **Gemini** (cloud backfill) | Set `GOOGLE_API_KEY` | Batch API for bulk processing |

Local backends (Ollama, MLX) process content directly. External backends (Gemini) go through mandatory PII sanitization.

## PII Sanitization

Before sending chunks to any external LLM API, content passes through a **3-layer sanitization pipeline**:

1. **Regex** — owner names, emails, file paths, IPs, JWTs, phone numbers, 1Password refs, GitHub username
2. **Known names dictionary** — WhatsApp contacts + manual list (Hebrew + English, with nikud normalization)
3. **spaCy NER** — catches unknown English person names (`en_core_web_sm` model)

The sanitizer is **tightly coupled** into the external enrichment path via `build_external_prompt()` — you cannot send content to Gemini or Groq without sanitizing first. Local enrichment (Ollama/MLX) is unaffected since content stays on-device.

Replacements use stable hash-based pseudonyms (`[PERSON_a1b2c3d4]`) and a reversible mapping file saved locally.

## Stack

- **Language:** Python 3.11+
- **Embeddings:** bge-large-en-v1.5 (sentence-transformers, 1024 dims)
- **Vector DB:** sqlite-vec (WAL mode, busy_timeout=5000ms)
- **API:** FastAPI (HTTP or Unix socket)
- **Parser:** tree-sitter (AST-aware code chunking)
- **NER:** spaCy en_core_web_sm (PII detection)

## Source

[`packages/zikaron/`](https://github.com/EtanHey/golems/tree/master/packages/zikaron)
