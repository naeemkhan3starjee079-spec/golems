# Skill Lookup Pattern (Reference-Only)

## Goal

Help Claude find the **right skill for a task** without copying full SKILL contents into project rules. Use a **reference-only** + **progressive discovery** pattern.

This spec is written so you can copy it into `claude-golem` as:

- `claude-golem/docs/skill-lookup-pattern.md`

And then wire individual projects (like `domica`) to follow it.

---

## Invocation & Global Index

- All golem-powers skills use: **`/golem-powers:skill-name`**
- Global indices live in:
  - `~/.claude/contexts/skill-index.md` – names only (Tier 1)
  - `~/.claude/contexts/skill-descriptions.md` – names + short descriptions (Tier 2)

Projects should **reference** these, not duplicate them.

---

## Project-Level Pattern

Each project that participates in this system should have:

1. A **base context** (e.g. `contexts/base.md`) consumed by Claude Code.
2. A **Cursor rule** (for Cursor IDE users) – e.g. `.cursor/rules/skills-reference.mdc` with `alwaysApply: true`.

Both carry the same information, just in different formats.

### 1. Base Context Section

In the project’s `contexts/base.md` (or equivalent), include:

```markdown
## Skills Reference (Golem-Powers)

Invoke with **exact syntax** `/golem-powers:skill-name`. Source: `~/.claude/commands/golem-powers` (symlink).

### Universal Skills (Always Available)

- **context7** – Library docs (API refs, signatures, usage).  
  **Tags:** `docs`, `api`, `library`, `reference`, `how-to`  
  **Invoke:** `/golem-powers:context7`  
  **Key:** `CONTEXT7_API_KEY` or `op://development/context7/API_KEY`.

- **coderabbit** – Code review before commits (iterate until clean).  
  **Tags:** `review`, `pr`, `quality`, `security`  
  **Invoke:** `/golem-powers:coderabbit`.

- **ralph-commit** – Atomic commit with verification for Ralph stories.  
  **Tags:** `commit`, `ralph`, `atomic`, `criteria`  
  **Invoke:** `/golem-powers:ralph-commit`.

- **github** – Git operations, PRs, issues, branches.  
  **Tags:** `git`, `github`, `pr`, `issues`, `branches`  
  **Invoke:** `/golem-powers:github`.

- **prd** – Create/manage PRDs for Ralph.  
  **Tags:** `prd`, `planning`, `stories`, `spec`  
  **Invoke:** `/golem-powers:prd`.

### Skill Discovery Pattern

When you need a skill but aren’t sure which one:

1. **Check this reference first**  
   - Match user intent to skill descriptions and **Tags** above.
2. **If not found, use lookup tools (no copying):**
   - `/golem-powers:skills --search <keyword>` – keyword search across all installed skills.
   - `/golem-powers:project-context` – auto-detect project stack and show relevant skills.
   - Read `~/.claude/contexts/skill-descriptions.md` – full list with descriptions.
3. **After discovery, suggest invocation explicitly:**  
   - `/golem-powers:skill-name` (e.g. `/golem-powers:context7`).

**Full index:**  
- Names only: `~/.claude/contexts/skill-index.md`  
- Names + descriptions: `~/.claude/contexts/skill-descriptions.md`
```

You can adjust:
- Which skills are listed as **Universal**.
- Tags, if a repo has different emphases.

### 2. Cursor Rule Section

For Cursor IDE, mirror the same content in a rule file, e.g.:

```markdown
--- 
description: Golem-powers skills reference - when to use, invoke /golem-powers:name, key info
alwaysApply: true
---

# Skills Reference (Golem-Powers)

Invoke with **exact syntax** `/golem-powers:skill-name`. Source: `~/.claude/commands/golem-powers` (symlink).

## Universal Skills (Always Available)

...same list as base context...

## Skill Discovery Pattern

...same 3-step pattern as base context...
```

This rule should live under:

- `.cursor/rules/skills-reference.mdc`

And be kept in sync with the base context section.

---

## Behavioral Contract (Reference-Only)

To avoid context bloat and duplication:

- **Never** paste full SKILL contents (full `SKILL.md`) into project contexts or rules.
- Always refer to skills by **name + tags + exact invoke syntax**.
- When answering “what skill should I use?”:
  1. Try the project’s small **Skills Reference** first.
  2. If that’s not enough, suggest:
     - `/golem-powers:skills --search <keyword>`
     - `/golem-powers:project-context`
     - Or reading `skill-descriptions.md`.
  3. Then suggest the concrete `/golem-powers:skill-name` to run.

This keeps the **canonical definitions** in the skills themselves while giving every project a small, opinionated entry point.

