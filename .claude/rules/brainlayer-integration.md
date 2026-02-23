# BrainLayer Integration

> Memory layer for Claude Code — 3 tools, 268K+ indexed chunks. [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)

## Tools (3)

| Tool | What | Key Params |
|------|------|------------|
| `brain_search` | Find past decisions, code, patterns | `query` (required), `project`, `file_path`, `chunk_id`, `tag`, `importance_min` |
| `brain_store` | Save decisions, learnings, mistakes, ideas | `content` (required), `type` (auto-detected), `importance` (auto-scored) |
| `brain_recall` | Current context, sessions, operations | `mode` (default: context), `session_id`, `plan_name` |

All 14 old `brainlayer_*` tool names still work as backward-compat aliases.

## When to Use

- **Start of task:** `brain_search("topic")` — retrieve past decisions and patterns before starting
- **Made a decision:** `brain_store("Chose X because Y")` — type auto-detected as "decision"
- **Hit a bug:** `brain_store("Bug: X caused by Y, fixed with Z")` — type auto-detected as "mistake"
- **Learned something:** `brain_store("TIL: X works by Y")` — type auto-detected as "learning"
- **File context:** `brain_search(file_path="auth.ts")` — auto-routes to file timeline
- **What am I working on:** `brain_recall()` — defaults to current context mode
- **Expand a result:** `brain_search(chunk_id="abc123")` — auto-routes to context view

## Auto-Routing in brain_search

Pass different params → different views. No need to pick the right sub-tool:
- `chunk_id` → context expansion
- `file_path` + no query → file timeline
- `file_path` + regression flag → regression detection
- `query` with session/plan keywords → recall modes
- `query` (default) → semantic search

## Storage Paths

| Path | What |
|------|------|
| `~/.local/share/brainlayer/brainlayer.db` | Main database (~1.4GB) |
| `~/.local/share/brainlayer/prompts/` | Deduplicated system prompts |
| `~/.golems-zikaron/` | Golems runtime state (NOT BrainLayer) |

## External Repo

**Repo:** `~/Gits/brainlayer/` | **Install:** `pip install brainlayer` | **MCP:** `brainlayer-mcp`
