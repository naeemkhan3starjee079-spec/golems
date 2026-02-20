# BrainLayer Integration

> Memory layer for Claude Code — external repo, 12 MCP tools, 268K+ indexed chunks.

## External Repo

**Repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer) (`~/Gits/brainlayer/`)
**Install:** `pip install brainlayer` or `pip install git+https://github.com/EtanHey/brainlayer.git`
**Formerly:** Zikaron (renamed Feb 2026)

## MCP Server

**Name:** `brainlayer` | **Command:** `brainlayer-mcp`

### Tools (12)

| Tool | Purpose |
|------|---------|
| `brainlayer_search` | Semantic search (project, content_type, tag, intent, importance filters) |
| `brainlayer_context` | Surrounding chunks for a search result |
| `brainlayer_stats` | Index statistics |
| `brainlayer_list_projects` | Indexed projects |
| `brainlayer_file_timeline` | File interaction history across sessions |
| `brainlayer_operations` | Logical operation groups (read/edit/test cycles) |
| `brainlayer_regression` | What changed since a file last worked |
| `brainlayer_plan_links` | Session to plan/phase linkage |
| `brainlayer_think` | Task-aware context retrieval |
| `brainlayer_recall` | Proactive retrieval by file or topic |
| `brainlayer_sessions` | Recent sessions with metadata |
| `brainlayer_current_context` | Current working context (lightweight) |

## Storage Paths

| Path | What | Notes |
|------|------|-------|
| `~/.local/share/brainlayer/brainlayer.db` | Main database (~1.4GB) | sqlite-vec + bge-large-en-v1.5 (1024 dims) |
| `~/.local/share/brainlayer/prompts/` | Deduplicated system prompts | |
| `~/.golems-zikaron/` | Golems runtime state (NOT BrainLayer) | state.json, event-log.json — legacy name, still valid |
| `/tmp/brainlayer.sock` | Daemon socket | FastAPI daemon, keeps model hot |

## Enrichment

- **Backend:** Local LLM (Ollama GLM-4.7-Flash or MLX)
- **What:** Generates summary, tags, importance (1-10), intent classification per chunk
- **CLI:** `brainlayer enrich` (resumable, ~13s/chunk with GLM)
- **Status:** ~53% enriched (268K total chunks)
- **Launchd:** `com.golems.enrichment.plist` (background)

## Launchd Services

| Plist | Purpose |
|-------|---------|
| `com.golems.auto-index.plist` | Auto-index new conversations |
| `com.golems.enrichment.plist` | Background enrichment pipeline |

## Common Patterns

```python
# Search past decisions
mcp__brainlayer__brainlayer_search(query="topic", project="-Users-etanheyman-Gits-golems")

# Get context for a search result
mcp__brainlayer__brainlayer_context(chunk_id="<id>")

# File history
mcp__brainlayer__brainlayer_file_timeline(file_path="telegram-bot.ts")

# Task-aware recall
mcp__brainlayer__brainlayer_think(context="implementing JWT auth")
```
