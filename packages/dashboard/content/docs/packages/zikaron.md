---
title: "BrainLayer — Memory Layer"
description: "Persistent memory for Claude Code. 268K+ indexed conversation chunks with semantic search, 10-field enrichment, and PII sanitization."
---

# BrainLayer (Memory)

> Persistent memory for Claude Code conversations. Index, search, and retrieve knowledge from past coding sessions.
> **External repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer) (formerly Zikaron)

## What It Does

BrainLayer is a **knowledge pipeline** that indexes every Claude Code conversation into a searchable database. It uses semantic embeddings to find past solutions, decisions, and patterns across all your projects. 268K+ chunks indexed, searchable in under 2 seconds.

## Architecture

```
~/.claude/projects/          # Source: Claude Code conversations (JSONL)
        |
  PIPELINE
  Extract -> Classify -> Chunk -> Embed -> Index
                                  bge-large sqlite-vec
                                  1024 dims   fast DB
        |
~/.local/share/brainlayer/brainlayer.db   # Storage (~1.4GB)
        |
  POST-PROCESSING
  Enrichment (10 fields)    PII Sanitization    Brain Graph
  Ollama / MLX (local)      3-layer detection   Obsidian Export
  Gemini (cloud backfill)   mandatory for ext.
        |
  INTERFACES
  CLI            FastAPI Daemon      MCP Server      Dashboard
  brainlayer     :8787 / socket      brainlayer-mcp  Next.js
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
sqlite-vec for vector similarity search. WAL mode + `busy_timeout=5000ms` for concurrent access from daemon, MCP server, and enrichment. Sub-2-second queries across 268K+ chunks.

## Interfaces

### CLI
```bash
brainlayer search "how did I implement auth"
brainlayer enrich                              # Run local LLM enrichment
brainlayer index                               # Re-index conversations
brainlayer dashboard                           # Interactive TUI
```

### MCP Server
Exposed to Claude Code as `brainlayer-mcp` (12 tools):

| Tool | Description |
|------|-------------|
| `brainlayer_search` | Semantic search across all sessions (with project, content_type, tag, intent, importance filters) |
| `brainlayer_context` | Get surrounding conversation chunks for a search result |
| `brainlayer_stats` | Index statistics (chunk count, projects, content types) |
| `brainlayer_list_projects` | List all indexed projects |
| `brainlayer_file_timeline` | File interaction history across sessions |
| `brainlayer_operations` | Logical operation groups (read/edit/test cycles) |
| `brainlayer_regression` | What changed since a file last worked |
| `brainlayer_plan_links` | Session to plan/phase linkage |
| `brainlayer_think` | Task-aware context retrieval (decisions, patterns, bugs) |
| `brainlayer_recall` | Proactive retrieval by file path or topic |
| `brainlayer_sessions` | List recent sessions with metadata |
| `brainlayer_current_context` | Current working context (lightweight) |

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

[`github.com/EtanHey/brainlayer`](https://github.com/EtanHey/brainlayer)
