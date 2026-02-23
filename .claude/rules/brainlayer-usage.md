# BrainLayer — Memory for Claude Code

> You have 3 tools for persistent memory: `brain_search`, `brain_store`, `brain_recall`.
> 268K+ indexed conversation chunks across 9 projects. [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)

## Tools

| Tool | What | Blocking? |
|------|------|-----------|
| `brain_search` | Find past decisions, code, patterns, file history | No |
| `brain_store` | Save decisions, learnings, mistakes, ideas | No |
| `brain_recall` | Current context, sessions, operations, plans | No |

## Behavioral Triggers — When to Use Each

### brain_search

**Use at session start** — before diving into any task, search for prior context:
```
brain_search(query="authentication refactor")
```

**Use before making decisions** — check if this was already decided:
```
brain_search(query="database choice for jobs pipeline")
```

**5 common patterns:**

| I want to... | Call |
|-------------|------|
| Find past decisions about X | `brain_search(query="X decision")` |
| See what happened with a file | `brain_search(file_path="auth.ts")` |
| Expand context around a result | `brain_search(chunk_id="abc123", before=5, after=5)` |
| Find mistakes related to Y | `brain_search(query="Y", tag="bug-fix")` |
| Search a specific project | `brain_search(query="X", project="-Users-etanheyman-Gits-golems")` |

**Auto-routing** — brain_search picks the right view based on params:
- `chunk_id` → context expansion (surrounding chunks)
- `file_path` alone → file timeline (all changes to that file)
- `file_path` + regression keywords → regression detection
- `query` (default) → hybrid semantic + keyword search

### brain_store

**Use after making decisions:**
```
brain_store(content="Chose Supabase over Firebase for RLS support and PostgREST")
```
Type auto-detected as "decision".

**Use after fixing bugs:**
```
brain_store(content="Bug: EADDRINUSE on launchd restart — need SIGTERM handler for Bun.serve()")
```
Type auto-detected as "mistake".

**Use after learning something:**
```
brain_store(content="TIL: Bun workspace resolution requires all package.json files in Dockerfile COPY")
```
Type auto-detected as "learning".

**Use to bookmark important things:**
```
brain_store(content="Bookmark: Railway deploy fix in PR #236", tags=["railway", "deploy"])
```

**Auto-detection keywords:**
- "Chose", "Decided", "Always use" → decision
- "Bug:", "Fixed:", "Mistake:" → mistake
- "TIL:", "Learned:", "Discovery:" → learning
- "TODO:", "Need to" → todo
- "Idea:" → idea

### brain_recall

**Use at session start** for current context:
```
brain_recall()  // defaults to mode=context
```

**Use to browse recent sessions:**
```
brain_recall(mode="sessions", days=3)
```

**Use to check a plan's progress:**
```
brain_recall(plan_name="brainlayer-v2-launch")
```

**Use for session deep-dive:**
```
brain_recall(mode="summary", session_id="abc123")
```

## Decision Tree

```
I want to...
├── Find something from the past → brain_search(query="...")
├── Understand a file's history → brain_search(file_path="file.ts")
├── Remember something for later → brain_store(content="...")
├── Know what I was working on → brain_recall()
├── See recent sessions → brain_recall(mode="sessions")
└── Check plan progress → brain_recall(plan_name="...")
```

## Storage Paths

| Path | What |
|------|------|
| `~/.local/share/brainlayer/brainlayer.db` | Main database (~1.4GB) |
| `~/.local/share/brainlayer/prompts/` | Deduplicated system prompts |
| `~/.golems-zikaron/` | Golems runtime state (NOT BrainLayer) |

## External Repo

**Repo:** `~/Gits/brainlayer/` | **Install:** `pip install brainlayer` | **MCP:** `brainlayer-mcp`
