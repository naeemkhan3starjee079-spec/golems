# Zikaron Obsidian Vault — Rich Interconnected Brain

**Implementation Plan**

> How to make the Zikaron Obsidian vault a rich, interconnected knowledge graph with test↔source links, session relationships, co-edited clusters, central index, and Juggl styling (star-system layout).

---

## Current State

**Obsidian export** (`packages/zikaron/src/zikaron/pipeline/obsidian_export.py`):

- Exports sessions → `Sessions/{title}.md`
- Exports top 100 files → `Files/{fname}.md`
- Exports plans → `Plans/{plan_name}.md`
- Dashboards → `Dashboards/{name}.md`
- Session notes link to `[[fname]]` (Files), `[[plan]]` (Plans), `[[PR-N]]`
- File notes include Dataview queries for sessions
- No test↔source links, no session-to-session links, no co-edited clusters, no central index, no Juggl styling

**Data sources** (`vector_store.py`):

- `session_context` — session_id, project, branch, pr_number, plan_name, plan_phase, files_changed, started_at
- `file_interactions` — file_path, session_id, action, timestamp, project
- `topic_chains` — file_path, session_a, session_b (for temporal chains via shared files)
- `operations` — session_id, operation_type, chunk_ids, summary, outcome

---

## 1. Test ↔ Source File Wikilinks

### Goal

Link test files to their source files and vice versa: `foo.test.md` ↔ `foo.md`.

### Test File Patterns

| Pattern | Source | Example |
|---------|--------|---------|
| `foo.test.{ts,tsx,js,py}` | `foo.{ts,tsx,js,py}` | `utils.test.ts` → `utils.ts` |
| `foo.spec.{ts,tsx,js,py}` | `foo.{ts,tsx,js,py}` | `App.spec.tsx` → `App.tsx` |
| `test_foo.py` | `foo.py` | `test_utils.py` → `utils.py` |
| `foo.test.{md}` | `foo.{md}` | `chunk.test.md` → `chunk.md` |

### Implementation

**1.1 Add helper in `obsidian_export.py`:**

```python
import re

TEST_PATTERNS = [
    (r"^(.+)\.test\.(ts|tsx|js|jsx|py|md)$", r"\1.\2"),   # foo.test.ts → foo.ts
    (r"^(.+)\.spec\.(ts|tsx|js|jsx|py|md)$", r"\1.\2"),   # foo.spec.ts → foo.ts
    (r"^test_(.+)\.py$", r"\1.py"),                        # test_foo.py → foo.py
]

def _resolve_test_to_source(basename: str) -> Optional[str]:
    """Return source file basename if this is a test file, else None."""
    for pattern, repl in TEST_PATTERNS:
        m = re.match(pattern, basename, re.IGNORECASE)
        if m:
            return re.sub(pattern, repl, basename, flags=re.IGNORECASE)
    return None

def _resolve_source_to_test(basename: str) -> Optional[str]:
    """Return test file basename if we can infer one, else None."""
    base, ext = basename.rsplit(".", 1) if "." in basename else (basename, "")
    if ext in ("ts", "tsx", "js", "jsx", "py"):
        return f"{base}.test.{ext}"  # Primary convention
    return None
```

**1.2 Update `generate_file_note`** to add "Related" section with test/source links:

```python
# In generate_file_note(), after "## Interaction Timeline" and before "## Sessions (Dataview)"

# Related: test ↔ source
related = []
base_name = file_path.split("/")[-1]
sans_ext = _sanitize_filename(base_name)  # Obsidian note name

source = _resolve_test_to_source(base_name)
if source:
    related.append(("Source", _sanitize_filename(source)))

test = _resolve_source_to_test(base_name)
if test:
    test_note = _sanitize_filename(test)
    related.append(("Test", test_note))

if related:
    lines.append("## Related")
    lines.append("")
    for label, target in related:
        lines.append(f"- {label}: [[{target}]]")
    lines.append("")
```

**1.3 Update `generate_session_note`** (Files Touched section) to emit both source and test wikilinks when a test file is in the list:

```python
# When building file links, for each f:
fname = f.split("/")[-1]
sanitized = _sanitize_filename(fname)
lines.append(f"- [[{sanitized}]]")
source = _resolve_test_to_source(fname)
if source:
    lines.append(f"  - source: [[{_sanitize_filename(source)}]]")
```

**1.4 Naming for Obsidian notes**

- File notes use `_sanitize_filename(fname)` which strips extensions. So `utils.test.ts` → `utils.test`, `utils.ts` → `utils`.
- We need consistent note names: `utils.test` (test) and `utils` (source). The wikilink `[[utils]]` points to `Files/utils.md`, `[[utils.test]]` to `Files/utils.test.md`.

---

## 2. Session-to-Session Links via Shared Files

### Goal

If two sessions share >3 common files, add a "Related Sessions" section with wikilinks.

### Implementation

**2.1 Add helper in `obsidian_export.py`:**

```python
def _get_session_file_overlap(
    vector_store: Any,
    session_id: str,
    min_shared: int = 3,
    project: Optional[str] = None,
) -> List[str]:
    """Return session_ids that share >= min_shared files with this session."""
    cursor = vector_store.conn.cursor()
    my_files = set(
        r[0] for r in cursor.execute(
            "SELECT DISTINCT file_path FROM file_interactions WHERE session_id = ?",
            (session_id,),
        )
    )
    if not my_files:
        return []

    # All other sessions with file interactions
    query = """
        SELECT fi.session_id, COUNT(DISTINCT fi.file_path) as shared
        FROM file_interactions fi
        WHERE fi.session_id != ?
          AND fi.file_path IN ({})
    """.format(",".join("?" for _ in my_files))
    params: list = [session_id] + list(my_files)
    if project:
        query = query.replace("WHERE", "WHERE fi.project = ? AND", 1)
        params.insert(0, project)

    query += " GROUP BY fi.session_id HAVING shared >= ?"
    params.append(min_shared)

    rows = list(cursor.execute(query, params))
    return [r[0] for r in rows]
```

**2.2 Update `generate_session_note`** signature and body:

```python
def generate_session_note(
    ctx: Dict[str, Any],
    operations: List[Dict[str, Any]],
    files: List[str],
    related_sessions: Optional[List[str]] = None,  # NEW: session_ids
    session_title_map: Optional[Dict[str, str]] = None,  # session_id -> title
) -> str:
    # ... existing frontmatter and content ...

    # Add "## Related Sessions" section
    if related_sessions and session_title_map:
        lines.append("## Related Sessions")
        lines.append("")
        for sid in related_sessions[:10]:
            title = session_title_map.get(sid)
            if title:
                lines.append(f"- [[{title}]]")
        lines.append("")
```

**2.3 Update `export_obsidian`** to compute and pass related sessions:

```python
# Before the session loop, build session_id -> title map
session_title_map: Dict[str, str] = {}
for sid in session_ids:
    ctx = vector_store.get_session_context(sid)
    if ctx:
        session_title_map[sid] = _session_title(ctx)

# Inside the session loop, before generate_session_note:
related_ids = _get_session_file_overlap(
    vector_store, sid, min_shared=3, project=project
)
content = generate_session_note(
    ctx, ops, files,
    related_sessions=related_ids,
    session_title_map=session_title_map,
)
```

---

## 3. Co-edited File Clusters

### Goal

Identify files that always (or usually) appear together in sessions. Create cluster notes that link to these files.

### Algorithm

1. For each session, get the set of files touched.
2. For each pair of files (A, B) that co-occur in a session, increment `co_edit_count[(A,B)]`.
3. Cluster: files with `co_edit_count >= threshold` (e.g. 3) form a cluster.
4. Use connected components or modularity to group files into clusters.

### Implementation

**3.1 Add new module or functions in `obsidian_export.py`:**

```python
def _build_coedit_graph(
    vector_store: Any,
    project: Optional[str] = None,
    min_cooccur: int = 3,
) -> Dict[str, List[str]]:
    """
    Build co-edited file clusters.
    Returns: cluster_id -> [file_paths] (cluster_id is representative file or "cluster-N")
    """
    from collections import defaultdict
    cursor = vector_store.conn.cursor()

    query = """
        SELECT fi.session_id, fi.file_path
        FROM file_interactions fi
    """
    params: list = []
    if project:
        query += " WHERE fi.project = ?"
        params.append(project)
    query += " ORDER BY fi.session_id"

    rows = list(cursor.execute(query, params))

    # session_id -> set of file_paths
    session_files: Dict[str, set] = defaultdict(set)
    for sid, fp in rows:
        session_files[sid].add(fp)

    # (f1, f2) -> count of sessions where both appear (f1 < f2 for dedup)
    pair_counts: Dict[tuple, int] = defaultdict(int)
    for files in session_files.values():
        files_list = list(files)
        for i in range(len(files_list)):
            for j in range(i + 1, len(files_list)):
                a, b = files_list[i], files_list[j]
                if a > b:
                    a, b = b, a
                pair_counts[(a, b)] += 1

    # Build edge set: pairs with count >= min_cooccur
    edges = [
        (a, b) for (a, b), c in pair_counts.items()
        if c >= min_cooccur
    ]

    # Union-find to get connected components
    parent: Dict[str, str] = {}

    def find(x: str) -> str:
        if x not in parent:
            parent[x] = x
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(a: str, b: str) -> None:
        pa, pb = find(a), find(b)
        if pa != pb:
            parent[pa] = pb

    for a, b in edges:
        union(a, b)

    # Group by root
    clusters: Dict[str, List[str]] = defaultdict(list)
    for fp in parent:
        root = find(fp)
        clusters[root].append(fp)

    # Filter to clusters with 2+ files
    return {
        k: sorted(v) for k, v in clusters.items()
        if len(v) >= 2
    }
```

**3.2 Add `generate_cluster_note`:**

```python
def generate_cluster_note(
    cluster_id: str,
    files: List[str],
) -> str:
    """Generate a co-edited cluster note."""
    lines = [
        "---",
        f"cssclass: zikaron-cluster",
        f"files: {len(files)}",
        "---",
        "",
        f"# Co-edited Cluster",
        "",
        "Files that frequently appear together in sessions.",
        "",
        "## Files",
        "",
    ]
    for fp in files:
        fname = _sanitize_filename(fp.split("/")[-1])
        lines.append(f"- [[{fname}]]")
    return "\n".join(lines)
```

**3.3 Add cluster export to `export_obsidian`:**

```python
# New directory
(vault / "Clusters").mkdir(parents=True, exist_ok=True)

# After file export, before plans:
clusters = _build_coedit_graph(vector_store, project=project, min_cooccur=3)
for i, (rep, file_list) in enumerate(clusters.items()):
    cluster_name = f"cluster-{i}" if len(file_list) > 2 else _sanitize_filename(rep.split("/")[-1])
    note_path = vault / "Clusters" / f"{cluster_name}.md"
    if not note_path.exists() or force:
        content = generate_cluster_note(rep, file_list)
        note_path.write_text(content)
        counts["clusters"] = counts.get("clusters", 0) + 1
```

**3.4 Add cluster links to file notes**

In `generate_file_note`, add a "Co-edited With" section that lists clusters containing this file (could be computed during export and passed as a `clusters_for_file: Dict[str, List[str]]`).

---

## 4. Central Index Node

### Goal

A single note that links to all major entities: index of sessions, plans, files, dashboards, clusters.

### Implementation

**4.1 Add `generate_index_note`:**

```python
def generate_index_note(
    session_count: int,
    file_count: int,
    plan_count: int,
    cluster_count: int,
    vault: Path,
) -> str:
    """Generate the central Zikaron index note."""
    lines = [
        "---",
        "cssclass: zikaron-index",
        "---",
        "",
        "# Zikaron Brain",
        "",
        "Central index of your coding memory. Export from Zikaron.",
        "",
        "## Quick Links",
        "",
        "| Type | Count | Link |",
        "|------|-------|------|",
        f"| Sessions | {session_count} | [[Dashboards/Recent Sessions]] |",
        f"| Files | {file_count} | [[Dashboards/Most Modified Files]] |",
        f"| Plans | {plan_count} | [[Dashboards/Plans Overview]] |",
        f"| Clusters | {cluster_count} | Clusters/ |",
        "",
        "## By Type",
        "",
        "### Sessions",
        "",
        "```dataview",
        "TABLE date, plan, phase",
        'FROM "Sessions"',
        "SORT date DESC",
        "LIMIT 50",
        "```",
        "",
        "### Plans",
        "",
        "```dataview",
        "TABLE sessions",
        'FROM "Plans"',
        "```",
        "",
        "### Files",
        "",
        "```dataview",
        "TABLE interactions, last_modified",
        'FROM "Files"',
        "SORT interactions DESC",
        "LIMIT 30",
        "```",
        "",
        "### Co-edited Clusters",
        "",
        "```dataview",
        "TABLE files",
        'FROM "Clusters"',
        "```",
        "",
    ]
    return "\n".join(lines)
```

**4.2 In `export_obsidian`:**

```python
# After all exports, generate index
index_path = vault / "Zikaron Index.md"
index_content = generate_index_note(
    session_count=counts["sessions"],
    file_count=counts["files"],
    plan_count=counts["plans"],
    cluster_count=counts.get("clusters", 0),
    vault=vault,
)
index_path.write_text(index_content)
counts["index"] = 1
```

---

## 5. cssclass Frontmatter for Juggl Styling

### Goal

Add `cssclass` to all notes so Juggl can style by type: session, file, plan, dashboard, cluster, index.

### Implementation

**5.1 Update each generator:**

| Note Type | cssclass |
|-----------|----------|
| Session | `zikaron-session` |
| File | `zikaron-file` |
| Plan | `zikaron-plan` |
| Dashboard | `zikaron-dashboard` |
| Cluster | `zikaron-cluster` |
| Index | `zikaron-index` |

**5.2 Code changes:**

```python
# generate_session_note - add to frontmatter:
lines = ["---", "cssclass: zikaron-session", ...]

# generate_file_note - add:
lines = ["---", "cssclass: zikaron-file", ...]

# generate_plan_note - add:
lines = ["---", "cssclass: zikaron-plan", ...]

# generate_dashboard - add:
lines = ["---", "cssclass: zikaron-dashboard", ...]

# generate_cluster_note - already has cssclass: zikaron-cluster
# generate_index_note - already has cssclass: zikaron-index
```

---

## 6. Juggl style.yaml / graph.css for Star-System Layout

### Goal

Plans = suns (center), Sessions = planets (orbit), Files = moons (around sessions). Achieve via Juggl's graph.css and folder structure.

### Note

Juggl uses **graph.css** (not style.yaml) for styling. Path: `.obsidian/plugins/juggl/graph.css`. We can also ship a `style.css` or `juggl-graph.css` in the vault that users copy to Juggl's folder.

### Implementation

**6.1 Create `vault/.obsidian/plugins/juggl/graph.css` (or document for user)**

Juggl supports:
- `.cssclass` from YAML → `.zikaron-plan`, `.zikaron-session`, `.zikaron-file`, etc.
- `node[path^='Plans/']` for path-based selection
- Concentric layout with focused node in center

**6.2 Star-system via cssclass + path:**

```css
/* Zikaron Juggl Star-System Styling */

/* Plans = Suns (large, warm, center when focused) */
.zikaron-plan,
.node.zikaron-plan {
  shape: hexagon;
  width: 80px;
  height: 80px;
  background-color: #f59e0b;
  border-width: 2px;
  border-color: #d97706;
}

/* Sessions = Planets (medium, orbit) */
.zikaron-session,
.node.zikaron-session {
  shape: ellipse;
  width: 50px;
  height: 40px;
  background-color: #3b82f6;
  border-width: 1px;
  border-color: #2563eb;
}

/* Files = Moons (small) */
.zikaron-file,
.node.zikaron-file {
  shape: round-rectangle;
  width: 36px;
  height: 28px;
  background-color: #6b7280;
  border-width: 1px;
  border-color: #4b5563;
}

/* Clusters = Asteroids (diamond) */
.zikaron-cluster {
  shape: diamond;
  width: 44px;
  height: 44px;
  background-color: #8b5cf6;
  border-color: #7c3aed;
}

/* Index = Star (central hub) */
.zikaron-index {
  shape: star;
  width: 100px;
  height: 100px;
  background-color: #ec4899;
  border-color: #db2777;
}

/* Dashboards = Satellites */
.zikaron-dashboard {
  shape: round-octagon;
  width: 48px;
  height: 48px;
  background-color: #14b8a6;
  border-color: #0d9488;
}
```

**6.3 Path-based fallback** (if cssclass not set):

```css
/* Folder-based styling */
node[path^='Plans/'] {
  shape: hexagon;
  width: 80px;
  height: 80px;
  background-color: #f59e0b;
}

node[path^='Sessions/'] {
  shape: ellipse;
  width: 50px;
  height: 40px;
  background-color: #3b82f6;
}

node[path^='Files/'] {
  shape: round-rectangle;
  width: 36px;
  height: 28px;
  background-color: #6b7280;
}

node[path^='Clusters/'] {
  shape: diamond;
  width: 44px;
  height: 44px;
  background-color: #8b5cf6;
}

node[path^='Dashboards/'] {
  shape: round-octagon;
  width: 48px;
  height: 48px;
  background-color: #14b8a6;
}
```

**6.4 Layout**

- Use **Concentric** layout in Juggl: focused node (e.g. Index or a Plan) goes to center.
- Open "Zikaron Index" and use local/expand mode: Index = center, Sessions/Files/Plans orbit around.
- No explicit "style.yaml" in Juggl; all styling is via graph.css + YAML frontmatter.

**6.5 Optional: `style.yaml` in vault root**

If you want a reference file for users (not used by Juggl directly), create:

```yaml
# Zikaron Juggl Styling Reference
# Copy rules to .obsidian/plugins/juggl/graph.css

node_types:
  plan:     # suns - hexagon, amber
  session:  # planets - ellipse, blue
  file:     # moons - round-rect, gray
  cluster:  # asteroids - diamond, purple
  index:    # central star - pink
  dashboard: # satellites - teal
```

---

## Implementation Order

1. **cssclass** (5) — trivial, add one line to each generator
2. **Test↔source links** (1) — add helpers + Related section in file notes
3. **Session-to-session links** (2) — add overlap query + Related Sessions section
4. **Central index** (4) — add `generate_index_note` + export step
5. **Co-edited clusters** (3) — add cluster logic + Clusters/ folder + cluster notes
6. **Juggl graph.css** (6) — create CSS file, document in README or vault

---

## File Change Summary

| File | Changes |
|------|---------|
| `obsidian_export.py` | Add `_resolve_test_to_source`, `_resolve_source_to_test`; update `generate_file_note`, `generate_session_note`; add `_get_session_file_overlap`, `_build_coedit_graph`, `generate_cluster_note`, `generate_index_note`; update `export_obsidian` |
| `vault/.obsidian/plugins/juggl/graph.css` | New file (or user-copyable) with Zikaron star-system styles |

---

## Testing

- Run `export_obsidian(store, vault_path="/tmp/zikaron-vault", force=True)` and verify:
  - File notes with test/source have "Related" section
  - Session notes with overlapping files have "Related Sessions"
  - `Clusters/` folder exists with cluster notes
  - `Zikaron Index.md` exists and links correctly
  - All notes have `cssclass` in frontmatter
- Open vault in Obsidian, enable Juggl, apply graph.css, confirm star-system visuals

---

## Appendix: Full `export_obsidian` Pseudo-Diff

```python
# New helpers at top of file (after _session_title)
# + _resolve_test_to_source, _resolve_source_to_test
# + _get_session_file_overlap
# + _build_coedit_graph
# + generate_cluster_note
# + generate_index_note

# generate_session_note: add cssclass, related_sessions, session_title_map params
# generate_file_note: add cssclass, Related section (test/source)
# generate_plan_note: add cssclass
# generate_dashboard: add cssclass

# export_obsidian:
#   dirs += ["Clusters"]
#   session_title_map = {...}
#   for sid: related_ids = _get_session_file_overlap(...); generate_session_note(..., related_sessions=related_ids, session_title_map=session_title_map)
#   clusters = _build_coedit_graph(...); for each: generate_cluster_note, write to Clusters/
#   generate_index_note, write to vault / "Zikaron Index.md"
```
