# Worktree Workflow Audit

> Map everything related to git worktrees: skills, config sync, Zikaron indexing, and ideal flow for Claude Code sessions.

**Date:** 2026-02-16  
**Context:** User runs parallel Claude Code sessions via worktrees; Zikaron indexes worktrees as separate projects; no unified "one command" setup.

---

## 1. Worktrees Skill (`skills/golem-powers/worktrees/`)

### What It Does

| Workflow | Purpose |
|----------|---------|
| `create.md` | Create worktree at `~/worktrees/<repo>/<branch>` with env + deps |
| `from-linear.md` | Create worktree from Linear issue (branch name from `branchName`) |
| `list.md` | List active worktrees |
| `switch.md` | Switch to a worktree |
| `cleanup.md` | Remove completed worktrees |

### Environment Setup (from create.md)

| Item | Handled? | How |
|------|----------|-----|
| **.env** | ✅ | 1Password `op inject` if `.env.template` exists; else copy `.env*.local` from source |
| **node_modules** | ✅ | Auto-detect package manager (bun/pnpm/yarn/npm) and **install** (not symlink) |
| **.claude/** | ❌ | **Not mentioned** — no copy, symlink, or sync |
| **CLAUDE.md** | ⚠️ | Inherited via git (worktree shares repo files) — but worktree path differs from main |
| **.mcp.json** | ⚠️ | Same — in repo, but no explicit sync |

### Gaps

- No `.claude/` config sync — worktree gets repo's `.claude/` via git checkout, but if main repo has `.claude/` in `.gitignore`, worktree won't have it
- No `node_modules` symlink option — always runs full install (slower)
- from-linear workflow: same env handling, no `.claude/` mention

---

## 2. Claude Code Project Determination

### How Claude Code Determines "Project"

From [Claude Code memory docs](https://code.claude.com/docs/en/memory):

> Each project gets its own memory directory at `~/.claude/projects/<path>/memory/`. The `<path>` is **derived from the git repository root**, so all subdirectories within the same repo share one auto memory directory. **Git worktrees get separate memory directories.**

**Key insight:** Claude Code uses `git rev-parse --show-toplevel` (or equivalent). For a worktree, the git root **is the worktree path itself** — not the main repo. So:

| Context | Git root | Project folder in ~/.claude/projects/ |
|---------|----------|--------------------------------------|
| Main repo `~/Gits/songscript` | `~/Gits/songscript` | `-Users-etanheyman-Gits-songscript` |
| Worktree `~/Gits/songscript-nightshift-1770775282043` | `~/Gits/songscript-nightshift-1770775282043` | `-Users-etanheyman-Gits-songscript-nightshift-1770775282043` |
| Worktree `~/worktrees/domica/domica-worktrees-fix-blog` | `~/worktrees/domica/domica-worktrees-fix-blog` | `-Users-etanheyman-worktrees-domica-domica-worktrees-fix-blog` |

**Result:** Each worktree gets its own `~/.claude/projects/<path>/` directory. Sessions in worktrees are isolated from main repo sessions.

---

## 3. Golems-Base Rules & Implementation

### Rules (`.claude/rules/golems-base.md`, `rules-library/base.md`)

```markdown
**Worktree setup for spawned Claudes:**
- Link node_modules: `ln -s ../node_modules node_modules`
- Copy .env: `cp ../.env .env`
- Verify branch: `git branch` (must NOT be master/main)
```

**Note:** These are **instructions for humans/AI** when spawning Claude in a worktree. They are **not** automatically executed by any script. They do **not** mention `.claude/` or CLAUDE.md.

### Where Implemented

| Script | node_modules | .env | .claude/ |
|--------|--------------|------|----------|
| **night-shift.ts** | ✅ `ln -s` | ✅ `cp` | ❌ |
| **ralph-worktrees.zsh** | ✅ `--symlink-deps` (opt) | ✅ copy | ❌ |
| **worktrees skill create** | ❌ install | ✅ 1Password/copy | ❌ |

---

## 4. Zikaron Indexer & Worktree Paths

### Source Layout

Zikaron reads from `~/.claude/projects/`. Each **subdirectory name** = project. JSONL files live in `~/.claude/projects/<project>/<session>.jsonl`.

### How Project Name Is Stored

In `index_fast` (cli/__init__.py:1579–1599):

```python
proj_name = jsonl_file.parent.name  # Parent dir of JSONL = project folder name
# ...
index_chunks_to_sqlite(..., project=proj_name, ...)
```

So the **raw folder name** from Claude Code is stored (e.g. `-Users-etanheyman-Gits-songscript-nightshift-1770775282043`).

### `_clean_project_name` (cli/__init__.py:195–227)

Cleans path-style names for display:

- Input: `-Users-etanheyman-Gits-songscript-nightshift-1770775282043`
- Markers: `Gits`, `Desktop`, `projects`, `config`
- Output: `songscript-nightshift-1770775282043` (everything after last marker)

**Problem:** No worktree detection. The function does not know that `songscript-nightshift-1770775282043` is a worktree of `songscript`. It treats it as a distinct project.

### `PROJECT_ALIASES` (cli/__init__.py:114–119)

```python
PROJECT_ALIASES = {
    "ralphtools": "claude-golem",
    "config-ralphtools": "claude-golem",
    "config-ralph": "claude-golem",
}
```

Manual aliases only. No worktree → parent mapping.

### Can Zikaron Detect Worktree → Parent?

**Currently:** No. The indexer uses folder names as-is. `_clean_project_name` strips path prefixes but does not collapse worktree names to parent repo.

**Possible approach:** Add worktree detection in `_normalize_project_name` or a new function:

- If project matches `*-nightshift-*` or `*-worktrees-*` or path contains `worktrees/`:
  - Extract parent repo (e.g. `songscript` from `songscript-nightshift-1770775282043`)
  - Map to canonical project: `songscript`
- Requires heuristics or `git worktree list` to resolve worktree → main repo

---

## 5. Scripts That Create/Manage Worktrees

### Night Shift (`packages/services/src/night-shift.ts`)

| Aspect | Implementation |
|--------|----------------|
| Worktree path | `${repoPath}-nightshift-${Date.now()}` (sibling to repo) |
| node_modules | `ln -s ${repoPath}/node_modules node_modules` |
| .env | `cp ${repoPath}/.env .env` |
| .claude/ | ❌ Not copied |
| CLAUDE.md | ✅ In worktree via git (same files as main) |

**Claude spawn:** `claude` run with `cwd: worktreePath`. Claude Code sees worktree as project root → sessions go to `~/.claude/projects/-Users-...-songscript-nightshift-<ts>/`.

### Ralph (`packages/ralph/lib/ralph-worktrees.zsh`)

| Aspect | Implementation |
|--------|----------------|
| Worktree path | `~/worktrees/<repo>/ralph-session` |
| node_modules | `--symlink-deps` → symlink from main; else `--install` → full install |
| .env | Copy `.env`, `.env.local` |
| .claude/ | ❌ Not copied |
| .worktree-sync.json | Custom sync: `sync.files`, `sync.symlinks`, `sync.commands` |

**Note:** `.worktree-sync.json` can add custom files/symlinks. User could add `.claude/` there, but it's not default.

### Worktrees Skill (create.md, from-linear.md)

- Path: `~/worktrees/<repo>/<branch>`
- Env: 1Password or copy `.env*.local`
- Deps: Full install (bun/pnpm/yarn/npm)
- .claude/: Not mentioned

### Linear → Worktree (from-linear.md)

Same as worktrees create: env + deps, no `.claude/`.

---

## 6. Summary: What's Missing

| Need | Worktrees Skill | Night Shift | Ralph | Zikaron |
|------|-----------------|-------------|-------|---------|
| node_modules symlink | ❌ (always install) | ✅ | ✅ (opt) | — |
| .env copy | ✅ | ✅ | ✅ | — |
| .claude/ sync | ❌ | ❌ | ❌ | — |
| CLAUDE.md in worktree | ⚠️ git | ⚠️ git | ⚠️ git | — |
| Index under parent project | — | — | — | ❌ |

---

## 7. Ideal Flow: One Command, Full Claude Environment

### Goal

User runs one command → gets a worktree with:

- Full Claude Code environment (configs, rules, agents)
- Dependencies (symlinked for speed)
- Env vars
- Zikaron indexes sessions under **parent project**, not worktree-specific name

### Proposed "claude-worktree" Command

```bash
claude-worktree feature-auth   # or: claude-worktree ENG-123 (Linear)
```

**Would:**

1. Create worktree at `~/worktrees/<repo>/<branch>`
2. Symlink `node_modules` from main repo
3. Copy or inject `.env` (1Password if available)
4. **Symlink or copy `.claude/`** from main repo (or use `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` to load main repo rules)
5. Output: `cd ~/worktrees/<repo>/<branch> && claude`
6. **Zikaron:** Either:
   - (A) Symlink `~/.claude/projects/<worktree-path>` → `~/.claude/projects/<parent>` (Claude Code controls folder; may not support)
   - (B) Post-index normalization: map worktree project names to parent in Zikaron
   - (C) Env var `CLAUDE_CODE_PROJECT_OVERRIDE=songscript` so Claude uses parent project folder (if Claude supports)

### Zikaron-Side Fix (Most Practical)

Add worktree → parent mapping in Zikaron:

1. **During indexing:** If `proj_name` matches worktree pattern (`*-nightshift-*`, `*-worktrees-*`, or parent dir is `worktrees/`), resolve parent repo via `git -C <worktree> rev-parse --show-toplevel` and `git worktree list` to find main repo path, then use main repo name as project.
2. **Or:** Extend `PROJECT_ALIASES` / `_normalize_project_name` with regex: `songscript-nightshift-\d+` → `songscript`, `domica-worktrees-fix-blog` → `domica`.
3. **Or:** New `zikaron fix-worktree-projects` that scans chunks, detects worktree source_file paths, and updates `project` to parent repo.

---

## 8. Recommendations

### Short Term

1. **Worktrees skill:** Add optional `--symlink-deps` and document `.claude/` symlink for Claude Code users:
   ```bash
   ln -s "$SOURCE_REPO/.claude" .claude 2>/dev/null || true
   ```
2. **golems-base rules:** Add ".claude/: symlink from main repo if spawning Claude in worktree"
3. **Zikaron:** Add worktree patterns to `PROJECT_ALIASES` or `_normalize_project_name` (e.g. `songscript-nightshift-*` → `songscript`)

### Medium Term

1. **Unified `claude-worktree` script** in golems or ralph that combines worktree creation + env + .claude sync + clear instructions
2. **Zikaron:** Implement proper worktree detection (git worktree list) during indexing to map worktree sessions to parent project
3. **Ralph:** Add `.claude/` to default sync in `ralph-start` (or document in .worktree-sync.json)

### Long Term

1. **Claude Code:** Feature request for `CLAUDE_CODE_PROJECT_NAME` or similar to override project folder for worktrees
2. **Zikaron:** Optional `--project-map` config file for manual worktree → parent mappings

---

## Appendix: File References

| File | Purpose |
|------|---------|
| `skills/golem-powers/worktrees/SKILL.md` | Worktrees skill entry |
| `skills/golem-powers/worktrees/workflows/create.md` | Create workflow (env, deps) |
| `skills/golem-powers/worktrees/workflows/from-linear.md` | Linear → worktree |
| `.claude/rules/golems-base.md` | Worktree setup rules (link node_modules, copy .env) |
| `packages/services/src/night-shift.ts` | Night Shift worktree creation |
| `packages/ralph/lib/ralph-worktrees.zsh` | Ralph ralph-start, ralph-cleanup |
| `packages/zikaron/src/zikaron/cli/__init__.py` | index_fast, _clean_project_name, PROJECT_ALIASES |
| `packages/zikaron/src/zikaron/index_new.py` | index_chunks_to_sqlite |
