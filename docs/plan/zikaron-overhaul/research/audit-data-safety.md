# Zikaron Data Safety Audit

> **Audit date:** 2026-02-16  
> **Purpose:** Ensure 260K+ conversation chunks aren't only on Mac SSD. Map storage, backup coverage, and gaps.

---

## Executive Summary

| Data | Location | Size | Time Machine | iCloud | Supabase |
|------|----------|------|--------------|--------|----------|
| **Chunk DB** | `~/.local/share/zikaron/zikaron.db` | **3.2 GB** | ✅ Included | ❌ No | ❌ No |
| **JSONL source** | `~/.claude/projects/**/*.jsonl` | **640 MB** (913 files) | ✅ Included | ❌ No | ❌ No |
| **WhatsApp source** | `~/Library/Group Containers/.../ChatStorage.sqlite` | N/A | — | — | — |
| **Brain graph** | `~/.golems-brain/graph.json` | ~2 MB | ✅ Included | ❌ No | Optional upload |
| **Supabase** | `enrichment_stats`, `llm_usage` | Aggregates only | — | — | Stats/tokens only |

**Bottom line:** Your chunk data is **only** on your Mac. Time Machine backs it up if configured; iCloud does not. Supabase holds **no** chunk content — only enrichment stats and token usage.

---

## 1. SQLite Database

### Path
```
~/.local/share/zikaron/zikaron.db
```

**Actual size (as of audit):** 3.2 GB (file 3.4 GB with WAL)

### Backup Coverage

| System | Status |
|--------|--------|
| **Time Machine** | ✅ **Included** — `tmutil isexcluded` returns `[Included]` |
| **iCloud Drive** | ❌ **No** — `~/.local` is in home dir, not under `~/Library/Mobile Documents/com~apple~CloudDocs/` |
| **backup-golem-system.sh** | ❌ **No** — Script backs up config/state to iCloud but **does not include** `~/.local/share/zikaron/` |

### Codebase References
- `packages/zikaron/src/zikaron/daemon.py:28` — `DEFAULT_DB_PATH`
- `packages/zikaron/src/zikaron/mcp/__init__.py:15`
- `packages/zikaron/src/zikaron/vector_store.py` — VectorStore
- `packages/zikaron/CLAUDE.md:43`

### Related Files in Same Dir
```
~/.local/share/zikaron/
├── zikaron.db          # Main DB (3.2 GB)
├── zikaron.db-shm      # WAL shared memory
├── zikaron.db-wal      # Write-ahead log
└── knowledge.db -> zikaron.db   # Symlink
```

---

## 2. Raw Claude Code Session JSONL Files

### Path
```
~/.claude/projects/<project-path>/<session-id>.jsonl
```

**Actual size (as of audit):** 640 MB total, 913 files

### Backup Coverage

| System | Status |
|--------|--------|
| **Time Machine** | ✅ **Included** — `tmutil isexcluded` returns `[Included]` |
| **iCloud Drive** | ❌ **No** — `~/.claude` is in home dir, not iCloud |
| **backup-golem-system.sh** | ❌ **No** — Backs up `~/.claude/*.md`, `*.json`, `skills`, `contexts`, `hooks`, `learnings` — **explicitly excludes** `projects/` (the JSONL dir) |

### Codebase References
- `packages/zikaron/src/zikaron/cli/__init__.py:1522` — `source.rglob("*.jsonl")`
- `scripts/auto-index.sh:23` — `PROJECTS_DIR="${HOME}/.claude/projects"`
- `docs/plan/zikaron-enrichment-backfill/audit-project-consolidation.md`

---

## 3. Existing Sync/Backup/Export Logic

### Obsidian Export
- **Command:** `zikaron export-obsidian`
- **Output:** `~/.golems-brain/Zikaron/` — Markdown vault (one note per session)
- **Scope:** Derived content, not raw chunks. Human-readable backup of session summaries.
- **Code:** `packages/zikaron/src/zikaron/pipeline/obsidian_export.py`

### Brain Graph Export
- **Command:** `zikaron brain-export`
- **Output:** `~/.golems-brain/graph.json` (~2 MB) — nodes, edges, 3D coords
- **Supabase:** Optional manual upload via Dashboard Settings → `brain-graphs/{user_id}/graph.json`
- **Scope:** Visualization metadata only, not chunk content.

### backup-golem-system.sh
- **Path:** `packages/ralph/scripts/backup-golem-system.sh`
- **Destination:** `~/Library/Mobile Documents/com~apple~CloudDocs/golem-backup-$(date)/`
- **Includes:** LaunchAgents, `~/.config`, `~/.claude` (skills, contexts, hooks — **not** projects), `~/.agents`, `~/.golems-zikaron`
- **Excludes:** `~/.local/share/zikaron/`, `~/.claude/projects/`

### Phase 1 Manual Backup (docs only)
- `docs/plan/zikaron-overhaul/phase-1/README.md` suggests:
  ```bash
  cp ~/.local/share/zikaron/zikaron.db ~/.local/share/zikaron/zikaron.db.backup-$(date +%Y%m%d)
  ```
- No automated script; manual copy to same disk.

### No Supabase Chunk Sync
- **No** pipeline syncs chunk content to Supabase.
- Supabase holds `enrichment_stats` (aggregates) and `llm_usage` (tokens) — see §4.

---

## 4. Supabase Data

### What Is in Supabase

| Table | Purpose | Contains Chunk Data? |
|-------|---------|----------------------|
| `enrichment_stats` | Dashboard visibility — total_chunks, embedded, tagged, summarized, importance_scored, intent_classified, projects, by_intent | ❌ No — aggregates only |
| `llm_usage` | Token tracking — model, source, input/output tokens, cost_usd, duration_ms | ❌ No — usage metrics only |

### Sync Logic
- `packages/zikaron/src/zikaron/pipeline/enrichment.py`:
  - `_sync_stats_to_supabase()` — POST to `enrichment_stats` after enrichment batches
  - `_log_glm_usage()` — POST to `llm_usage` for each GLM call
- **Chunk content is never sent to Supabase.**

### Brain Graph (Optional)
- `graph.json` can be uploaded to Supabase Storage (`brain-graphs/{user_id}/graph.json`) for dashboard 3D view.
- This is a **derived** visualization (~2 MB), not the 260K chunks.

---

## 5. Total Data Size

| Asset | Size | Notes |
|-------|------|-------|
| **zikaron.db** | 3.2 GB | Main DB + WAL |
| **~/.local/share/zikaron/** | 3.5 GB | Dir total |
| **~/.claude/projects/** | 640 MB | 913 JSONL files |
| **WhatsApp ChatStorage.sqlite** | N/A | Not found on this machine (WhatsApp may not be installed or path differs) |
| **~/.golems-brain/** | ~2 MB | graph.json + metadata + Zikaron vault |

**Total Zikaron-relevant:** ~4.1 GB (DB + JSONL)

---

## 6. iCloud Drive Coverage

| Path | In iCloud? |
|------|------------|
| `~/.local/share/zikaron/` | ❌ **No** — Standard home dir, not under iCloud Drive |
| `~/.claude/` | ❌ **No** — Same |

**iCloud Drive** is typically at `~/Library/Mobile Documents/com~apple~CloudDocs/`. Neither `~/.local` nor `~/.claude` are symlinked or placed there by default.

---

## 7. Time Machine Coverage

| Path | Status |
|------|--------|
| `~/.local/share/zikaron` | ✅ **Included** |
| `~/.claude` | ✅ **Included** |

**Verification:** `tmutil isexcluded` returned `[Included]` for both paths.

**Caveat:** `tmutil listbackups` returned no output in this environment — may indicate Time Machine not configured or no recent backups. **Verify on your Mac** that Time Machine is enabled and backing up.

---

## 8. Backup/Restore Scripts

### Existing
- **Phase 1 doc:** Manual `cp` to `zikaron.db.backup-$(date +%Y%m%d)` — same disk.
- **generate-prd.py / AGENTS.md:** References `~/.local/share/zikaron-backup-*` as backup location — no script creates it.
- **No** `vacuum`, `dump`, or automated export scripts in the codebase.

### Gaps
- No scheduled DB backup (cron/launchd).
- No off-disk backup (external drive, cloud).
- No SQLite `VACUUM` or integrity check automation.

---

## 9. .gitignore and Backup Exclusions

### Repo .gitignore
- `.gitignore` at repo root excludes `.claude/*` (with `!.claude/rules/` and `!.claude/agents/`) — this applies to the **repo's** `.claude/`, not the global `~/.claude/`.
- **Time Machine and iCloud do not use .gitignore.** No impact on backup.

### kilo-safety.md
- `.claude/rules/kilo-safety.md` blocks `~/.local/share/zikaron` and `~/.claude` for **Kilo CLI** (external API safety).
- **Not** a backup exclusion — only restricts which paths Kilo can access.

### System-Level Exclusions
- No `com.apple.bird` or Time Machine exclusion plists found in the codebase for these paths.
- Standard macOS: `~/.local` and `~/.claude` are not in the default TM exclusion list.

---

## Recommendations

### Immediate (Low Effort)
1. **Verify Time Machine** — Ensure it's enabled and that `~/.local` and `~/.claude` are not excluded.
2. **Extend backup-golem-system.sh** — Add `~/.local/share/zikaron/zikaron.db` and `~/.claude/projects/` to the iCloud backup.
3. **Manual DB backup** — Run `cp ~/.local/share/zikaron/zikaron.db ~/Library/Mobile\ Documents/com~apple~CloudDocs/zikaron-backup-$(date +%Y%m%d).db` periodically.

### Medium Term
4. **Scheduled DB backup** — launchd job to copy DB to iCloud or external drive weekly.
5. **SQLite integrity** — Add `PRAGMA integrity_check` to a monthly maintenance script.
6. **Obsidian vault sync** — If Obsidian vault is in iCloud, `zikaron export-obsidian` gives a human-readable backup (not full chunks, but session-level recovery).

### Long Term (If Needed)
7. **Supabase chunk sync** — Design a pipeline to sync chunk metadata + content to Supabase (cost/storage considerations).
8. **Deduplicated cloud backup** — e.g. Borg, Restic, or cloud provider with dedup for `~/.local/share/zikaron/` and `~/.claude/projects/`.

---

## Appendix: Key Paths Reference

```
~/.local/share/zikaron/
├── zikaron.db           # 3.2 GB — chunk + vector data
├── zikaron.db-shm
├── zikaron.db-wal
├── knowledge.db -> zikaron.db
└── prompts/             # Deduplicated system prompts (SHA-256)

~/.claude/projects/
└── <path-encoded-project>/
    └── *.jsonl          # 913 files, 640 MB

~/.golems-brain/
├── graph.json           # Brain graph (~2 MB)
├── metadata.json
└── Zikaron/             # Obsidian vault (export-obsidian)

~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/
├── ChatStorage.sqlite   # WhatsApp messages (if installed)
└── ContactsV2.sqlite
```
