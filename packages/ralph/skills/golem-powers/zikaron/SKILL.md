---
name: zikaron
description: Local knowledge pipeline for Claude Code conversations - index, search, and retrieve past solutions
---

# BrainLayer (formerly Zikaron) - Knowledge Pipeline

> **Extracted to standalone repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)
> CLI commands now use `brainlayer` instead of `zikaron`. MCP tools use `brainlayer_*` prefix.

BrainLayer indexes Claude Code conversation history and markdown files into a searchable vector database. Query past solutions, code patterns, and debugging sessions.

## Architecture (Feb 2026)

```
~/.claude/projects/     →  Pipeline  →  sqlite-vec  →  FastAPI Daemon  →  CLI / MCP
   (JSONL files)           (5 stages)    (vectors)      (pre-loaded)      (query)

Stages:
1. Extract - Parse JSONL, dedupe system prompts
2. Classify - Identify content type (code, errors, messages)
3. Chunk - AST-aware splitting for code, header-based for markdown
4. Embed - Generate vectors via sentence-transformers (bge-large-en-v1.5, 1024 dims)
5. Index - Store in sqlite-vec with metadata
```

## Quick Reference

### Fast Commands (Recommended)

```bash
# Search (daemon-based, <2s)
zikaron search-fast "how did I implement authentication"
zikaron search-fast "error handling" --text  # Exact match

# Stats
zikaron stats-fast

# Interactive Dashboard
zikaron dashboard
```

### Indexing

```bash
# Index all Claude Code conversations (sqlite-vec backend)
zikaron index-fast

# Index specific project only
zikaron index-fast -p project-name

# Index markdown files
zikaron index-md ~/Gits/golems/docs.local/learnings
```

### Migration (One-Time)

```bash
# Convert ChromaDB → sqlite-vec (run once after upgrade)
zikaron migrate
# Time: ~4-6 hours for 200k chunks with bge-large-en-v1.5
# Runs embedding on all chunks - can leave overnight
```

## Storage Location

```
~/.local/share/zikaron/
├── zikaron.db         # sqlite-vec database (vectors + metadata)
├── prompts/           # Deduplicated system prompts
└── chromadb.backup/   # Old ChromaDB (after migration)

/tmp/zikaron.sock      # Unix socket for daemon communication
```

Check size: `du -sh ~/.local/share/zikaron/zikaron.db`

## Performance

| Metric | Old (ChromaDB) | New (sqlite-vec) |
|--------|----------------|------------------|
| Cold Start | 180s | 15s |
| Warm Query | N/A | <2s |
| Model Load | 30s (Ollama) | 8s (sentence-transformers) |
| Memory | 6GB+ | 4GB |

## MCP Integration

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "zikaron": {
      "command": "zikaron-mcp"
    }
  }
}
```

Then Claude Code can query directly: "Search my past conversations for authentication patterns"

## Daemon Management

```bash
# Start daemon manually
zikaron-daemon

# Install auto-start service (launchd)
python ~/Gits/golems/packages/zikaron/scripts/install_service.py install
```

## Troubleshooting

### Schema Errors / Fresh Start
```bash
rm ~/.local/share/zikaron/zikaron.db
zikaron migrate  # Re-migrate from ChromaDB
# or
zikaron index-fast  # Re-index from scratch
```

### Daemon Not Running
```bash
# Check if daemon is running
curl --unix-socket /tmp/zikaron.sock http://localhost/health

# Start manually
zikaron-daemon &
```

## When to Use

- **Finding past solutions**: "How did I handle that API rate limiting before?"
- **Debugging patterns**: "What error messages have I seen with this library?"
- **Code reuse**: "Find my previous implementation of pagination"
- **Learning recall**: "What did I learn about jq escaping?"
