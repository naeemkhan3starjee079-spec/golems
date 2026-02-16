# Zikaron Project Consolidation Audit

> Complete trace of how project names flow from Claude Code session files → DB, and what breaks if we merge/rename projects in bulk.

**Date:** 2026-02-16  
**Goal:** Plan consolidation of fragmented projects (golems monorepo, domica, songscript) into canonical names.

---

## 1. How the Indexer Determines Project Name

### Source: Claude Code Project Folders

Claude Code stores session transcripts under `~/.claude/projects/` with **one folder per workspace root**. The folder name is the **path-encoded workspace path**:

| Workspace Path | Project Folder Name |
|---------------|---------------------|
| `/Users/etanheyman/Gits/golems` | `-Users-etanheyman-Gits-golems` |
| `/Users/etanheyman/Gits/golems/packages/ralph` | `-Users-etanheyman-Gits-golems-packages-ralph` |
| `/Users/etanheyman/Gits/domica` | `-Users-etanheyman-Gits-domica` |
| `/Users/etanheyman/Gits/songscript` | `-Users-etanheyman-Gits-songscript` |

**Encoding rule:** `/` → `-`, leading `/` → leading `-`. So `/Users/etanheyman/Gits/golems` → `-Users-etanheyman-Gits-golems`.

### Indexer Logic (`cli/__init__.py` → `index_fast`)

```python
# Line 1211 (index_fast)
proj_name = jsonl_file.parent.name if jsonl_file.parent != source else None
```

- **Source dir:** `~/.claude/projects` (default)
- **Project = parent folder name** of the JSONL file
- **No normalization applied** — raw folder name goes straight to DB

**Example:**  
`~/.claude/projects/-Users-etanheyman-Gits-golems-packages-zikaron/abc123.jsonl`  
→ `project = "-Users-etanheyman-Gits-golems-packages-zikaron"`

### Path → Project Flow

```
Claude Code opens workspace: ~/Gits/golems/packages/zikaron/
        ↓
Creates folder: ~/.claude/projects/-Users-etanheyman-Gits-golems-packages-zikaron/
        ↓
Saves transcripts: *.jsonl in that folder
        ↓
zikaron index (rglob *.jsonl)
        ↓
For each file: proj_name = jsonl_file.parent.name
        ↓
index_chunks_to_sqlite(..., project=proj_name)
        ↓
VectorStore.upsert_chunks() → chunks.project = proj_name
```

### Existing Normalization (Not Used During Indexing!)

`cli/__init__.py` defines `_clean_project_name()` and `_normalize_project_name()`:

- **`_clean_project_name`**: Extracts repo name from path-style names  
  `-Users-etanheyman-Gits-golems` → `golems`  
  `-Users-etanheyman-Gits-golems-packages-ralph` → `golems-packages-ralph` (takes everything after last marker)

- **`PROJECT_ALIASES`**: Maps old names → canonical (e.g. `ralphtools` → `claude-golem`)

**These are only used by `fix_projects`**, which is **ChromaDB-only** (hidden, legacy). The sqlite-vec indexer does **not** call them.

---

## 2. Where Project Name Is Stored and Used

### Database Schema

| Table | Column | Purpose |
|-------|--------|---------|
| **chunks** | `project` | Primary project attribution for search/filter |
| **session_context** | `project` | Git overlay session metadata |
| **file_interactions** | `project` | Per-interaction project (from git overlay) |
| **topic_chains** | `project` | Topic chain attribution |

**Note:** `chunk_vectors` and `chunks_fts` do **not** store project. Project is metadata only.

### Git Overlay Inconsistency

`git_overlay.py` uses a **different** project format than the indexer:

```python
# git_overlay.py lines 243-276
display_name = slug_to_display(proj_dir.name)  # e.g. "Gits/golems"
vector_store.store_session_context(..., project=display_name)
# file_actions get fa["project"] = display_name
```

- **Indexer (chunks):** `-Users-etanheyman-Gits-golems`
- **Git overlay (session_context, file_interactions):** `Gits/golems` (from `slug_to_display`)

So `session_context.project` and `file_interactions.project` can differ from `chunks.project` for the same logical project. Filters like `zikaron search -p golems` won't match session_context rows if they use `Gits/golems`.

### Search Filters

- **vector_store.search()** / **hybrid_search()**: `project_filter` → `WHERE c.project = ?` (exact match)
- **MCP zikaron_search**: `project` param → `project_filter` (exact)
- **CLI**: `zikaron search "query" -p PROJECT`
- **Daemon** `/search` / `/dashboard/search`: `project_filter` → `c.project LIKE ?` (partial match, e.g. `%golems%`)

### Other Consumers

| Consumer | Project Usage |
|----------|--------------|
| `get_stats()` | `SELECT DISTINCT project FROM chunks` |
| `get_file_timeline()` | `WHERE fi.project = ?` |
| `get_file_regression()` | `WHERE fi.project = ?` |
| `get_sessions_by_plan()` | `WHERE project = ?` |
| `brain_graph.py` | `WHERE project = ?` in load_sessions |
| `obsidian_export.py` | `WHERE project = ?` |
| `plan_linking.py` | `WHERE project = ?` |
| `clear_plan_links()` | `WHERE project = ?` |
| `clear_topic_chains()` | `WHERE project = ?` |

---

## 3. Existing Merge/Rename Utilities

### `zikaron fix-projects` (Hidden, ChromaDB-Only)

- **Location:** `cli/__init__.py` lines 267-424
- **Target:** ChromaDB (legacy)
- **Logic:** Fixes UUID project names by deriving correct project from `source_file` path, then ChromaDB `collection.update()`
- **Not applicable** to sqlite-vec

### No sqlite-vec Merge/Rename Utility

There is **no** `zikaron merge-projects` or `zikaron rename-project` for the current sqlite-vec backend. Consolidation requires **manual SQL UPDATE** or a new CLI command.

---

## 4. What Breaks if We UPDATE Project Names in Bulk?

### Safe to UPDATE

| Component | Impact |
|-----------|--------|
| **chunks.project** | Plain column; UPDATE is safe |
| **session_context.project** | Plain column |
| **file_interactions.project** | Plain column |
| **topic_chains.project** | Plain column |

### Unaffected (No Project Column)

| Component | Notes |
|-----------|-------|
| **chunk_vectors** | Embeddings only; no project |
| **chunks_fts** | FTS5 on `content` + `chunk_id`; no project |
| **operations** | No project column |

### Indexes

- **chunks:** No index on `project` (filtering does table scan; acceptable for ~226K rows)
- **session_context:** `idx_session_context_project` exists
- **file_interactions:** No project index
- **topic_chains:** No project index

**Conclusion:** Bulk `UPDATE chunks SET project = 'golems' WHERE project IN (...)` is safe. Embeddings and FTS stay valid. No schema migration needed.

---

## 5. Worktrees and Project Name Suffixes

### How Worktrees Appear

Examples from your list:
- `songscript-nightshift-1769910280178`
- `-Users-etanheyman-Gits-songscript-nightshift-*`

Worktree paths are typically:
- `repo-path/worktree-name` or
- `repo-path/../repo-worktree-name`

Claude Code encodes the full path, so you get names like `-Users-etanheyman-Gits-songscript-nightshift-1769910280178`.

### Stripping Worktree Suffix

**Option A: Regex in consolidation script**

```python
# Strip -nightshift-\d+ or similar
import re
def strip_worktree_suffix(name: str) -> str:
    return re.sub(r'-nightshift-\d+$', '', name)
```

**Option B: Path-based detection**

If `slug_to_path(name)` resolves to a git worktree (e.g. `.git` is a file with `gitdir:`), map to main repo.

**Recommendation:** Add a consolidation mapping that strips known suffixes (`-nightshift-\d+`, `-worktrees-fix-*`) before merge.

---

## 6. Sub-Package / Monorepo Issue

### Problem

When Claude Code opens `~/Gits/golems/packages/zikaron/` as the workspace root, it creates:
- `~/.claude/projects/-Users-etanheyman-Gits-golems-packages-zikaron/`

So you get a **separate project** from the main `-Users-etanheyman-Gits-golems`, even though both are the same monorepo.

### Can We Detect Parent Monorepo?

**Yes.** Options:

1. **Path prefix:** If project A's path is a prefix of project B's path, B is a sub-package of A.  
   Example: `-Users-etanheyman-Gits-golems` is prefix of `-Users-etanheyman-Gits-golems-packages-zikaron`.

2. **Git root:** Resolve `slug_to_path(project)` → run `git rev-parse --show-toplevel` → get repo root path → encode back to project slug. All packages in same repo get same canonical project.

3. **Config file:** Check for `packages/` under path; if so, treat as monorepo and use root.

### Implementation Sketch

```python
def get_canonical_project(raw_project: str) -> str:
    """Map sub-package to monorepo root."""
    path = slug_to_path(raw_project)
    if not path:
        return raw_project
    try:
        root = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=path, capture_output=True, text=True, timeout=5
        )
        if root.returncode == 0 and root.stdout.strip():
            root_path = Path(root.stdout.strip())
            # Encode back: /Users/x/Gits/golems -> -Users-x-Gits-golems
            return path_to_slug(root_path)
    except Exception:
        pass
    return raw_project
```

**Recommendation:** Add `get_canonical_project()` and call it **during indexing** (in index_fast before passing to index_chunks_to_sqlite). That prevents future fragmentation. For existing data, run a consolidation script.

---

## 7. Consolidation Plan Summary

### Merge Groups (Your List)

| Group | Canonical Name | Sources to Merge |
|-------|----------------|------------------|
| **1** | `golems` | `-Users-etanheyman-Gits-golems`, `-Users-etanheyman-Gits-golems-packages-*`, `ralph`, `zikaron`, `claude-golem`, `-Users-etanheyman-Gits-recruiterGolem`, `tellerGolem`, `contentGolem`, `monitorGolem` |
| **2** | `domica` | `domica`, `domica-apps-public`, `domica-worktrees-fix-blog`, `-Users-etanheyman-Gits-domica` |
| **3** | `songscript` | `songscript`, `songscript-haiku`, `songscript-nightshift-*`, `-Users-etanheyman-Gits-songscript`, `-Users-etanheyman-Gits-songscript-nightshift-*` |

### Recommended Approach

1. **Create `zikaron consolidate-projects`** (or one-off script) that:
   - Defines merge mappings (old_name → canonical)
   - Runs `UPDATE chunks SET project = ? WHERE project IN (?)` (and same for session_context, file_interactions, topic_chains)
   - Logs counts per table

2. **Add normalization at index time** (optional but recommended):
   - Use `_normalize_project_name()` or `get_canonical_project()` in index_fast
   - Ensures new data uses canonical names

3. **Align git_overlay** with chunks:
   - Either store raw project in session_context/file_interactions, or
   - Use same slug_to_display logic for chunks when displaying (keep raw in DB for filters)

4. **Run consolidation** on a DB backup first; verify search, MCP, and dashboard still work.

---

## 8. Files Reference

| File | Relevance |
|------|-----------|
| `packages/zikaron/src/zikaron/cli/__init__.py` | index_fast (project = parent.name), fix_projects (ChromaDB), _clean_project_name, _normalize_project_name |
| `packages/zikaron/src/zikaron/index_new.py` | index_chunks_to_sqlite(project=...) |
| `packages/zikaron/src/zikaron/vector_store.py` | chunks.project, session_context.project, file_interactions.project, topic_chains.project |
| `packages/zikaron/src/zikaron/pipeline/git_overlay.py` | slug_to_path, slug_to_display, store_session_context(project=display_name) |
| `packages/zikaron/src/zikaron/mcp/__init__.py` | project param in zikaron_search, zikaron_file_timeline, zikaron_regression, zikaron_plan_links |
| `packages/zikaron/src/zikaron/daemon.py` | project_filter in search, projects in stats |
