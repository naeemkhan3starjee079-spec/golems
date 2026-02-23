---
name: brainlayer
description: Memory layer for Claude Code — search past solutions, file history, regression detection across 268K+ indexed conversation chunks
---

# BrainLayer — Knowledge Pipeline

> **External repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)
> Formerly "Zikaron". CLI: `brainlayer`. MCP tools: `brain_search`, `brain_store`, `brain_recall`.

BrainLayer indexes Claude Code conversation history into a searchable vector database. Query past solutions, code patterns, and debugging sessions.

## MCP Tools (3 available)

| Tool | What It Does |
|------|-------------|
| `brain_search` | Semantic search across past conversations and knowledge |
| `brain_store` | Persistently store memories (auto-type, auto-importance) |
| `brain_recall` | Proactive context retrieval by file, topic, or current state |

*Old `brainlayer_*` names still work as backward-compat aliases.*

## CLI Quick Reference

```bash
# Search past conversations
brainlayer search "how did I implement authentication"
brainlayer search "error handling" --project golems

# Index conversations
brainlayer index
brainlayer index -p project-name

# Run enrichment (local LLM metadata extraction)
brainlayer enrich

# Stats
brainlayer stats

# Interactive dashboard
brainlayer dashboard
```

## MCP Config

```json
{
  "mcpServers": {
    "brainlayer": {
      "command": "brainlayer-mcp"
    }
  }
}
```

## Storage

```text
~/.local/share/brainlayer/
├── brainlayer.db    # sqlite-vec database (vectors + metadata, ~1.4GB)
└── prompts/         # Deduplicated system prompts
```

## When to Use

- **Finding past solutions**: "How did I handle that API rate limiting before?"
- **Debugging patterns**: "What error messages have I seen with this library?"
- **Code reuse**: "Find my previous implementation of pagination"
- **File history**: "What sessions touched this file?"
- **Regression detection**: "What changed since this file last worked?"
