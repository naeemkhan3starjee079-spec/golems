---
name: brainlayer
description: Memory layer for Claude Code — search past solutions, file history, regression detection across 268K+ indexed conversation chunks
---

# BrainLayer — Knowledge Pipeline

> **External repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)
> Formerly "Zikaron". CLI: `brainlayer`. MCP tools: `brainlayer_*` prefix.

BrainLayer indexes Claude Code conversation history into a searchable vector database. Query past solutions, code patterns, and debugging sessions.

## MCP Tools (12 available)

| Tool | What It Does |
|------|-------------|
| `brainlayer_search` | Semantic search across all sessions (project, content_type, tag, intent, importance filters) |
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
| `brainlayer_current_context` | What you're currently working on (lightweight) |

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
