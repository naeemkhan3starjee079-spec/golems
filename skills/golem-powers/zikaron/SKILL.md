---
name: zikaron
description: Local knowledge pipeline for Claude Code conversations - index, search, and retrieve past solutions
---

# Zikaron (זיכרון) - Knowledge Pipeline

Zikaron indexes Claude Code conversation history and markdown files into a searchable vector database. Query past solutions, code patterns, and debugging sessions.

## Prerequisites

```bash
# Ollama must be running for embeddings
ollama serve &
ollama pull nomic-embed-text
```

## Quick Reference

### Index Conversations
```bash
# Index all Claude Code conversations
zikaron index

# Index specific project only
zikaron index -p project-name
```

### Index Markdown Files
```bash
# Index learnings, skills, CLAUDE.md files, research docs
zikaron index-md ~/Gits/claude-golem/docs.local/learnings
zikaron index-md ~/Gits/claude-golem/skills
zikaron index-md ~/path/to/any/markdown/directory
```

**Content types by path:**
| Path Pattern | Type | Value |
|--------------|------|-------|
| `*/learnings/*` | learning | HIGH |
| `*/skills/*` | skill | HIGH |
| `CLAUDE.md` | project_config | HIGH |
| `*/research/*` | research | HIGH |
| `*/prd*/*` | prd_archive | MEDIUM |
| `*/verification*` | verification | LOW |
| Default | documentation | MEDIUM |

### Search
```bash
# Basic search
zikaron search "how did I implement authentication"

# Filter by project
zikaron search "error handling" -p my-project

# Filter by content type
zikaron search "debugging" -t learning

# More results
zikaron search "api design" -n 20
```

### Stats & Management
```bash
# View knowledge base stats
zikaron stats

# Clear entire database (careful!)
zikaron clear -y
```

## Storage Location

Database: `~/.local/share/zikaron/chromadb`

Check size: `du -sh ~/.local/share/zikaron/chromadb`

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

## Troubleshooting

### Schema Errors
If you see "no such column" errors after upgrading:
```bash
rm -rf ~/.local/share/zikaron/chromadb
zikaron index  # Re-index from scratch
```

### Ollama Not Running
```bash
# Check if running
curl http://localhost:11434/api/tags

# Start if needed
ollama serve &
```

### Large Database Size
ChromaDB 0.5.x had bloat issues. Zikaron pins to 0.4.x for stability. If database is huge:
```bash
rm -rf ~/.local/share/zikaron/chromadb
zikaron index  # Should be much smaller
```

## Architecture

```
~/.claude/projects/     →  Pipeline  →  ChromaDB  →  CLI / MCP
   (JSONL files)           (5 stages)    (vectors)    (query)

Stages:
1. Extract - Parse JSONL, dedupe system prompts
2. Classify - Identify content type (code, errors, messages)
3. Chunk - AST-aware splitting for code, header-based for markdown
4. Embed - Generate vectors via Ollama (nomic-embed-text)
5. Index - Store in ChromaDB with metadata
```

## When to Use

- **Finding past solutions**: "How did I handle that API rate limiting before?"
- **Debugging patterns**: "What error messages have I seen with this library?"
- **Code reuse**: "Find my previous implementation of pagination"
- **Learning recall**: "What did I learn about jq escaping?"
