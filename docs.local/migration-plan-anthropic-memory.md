# Migration Plan: Context System → Anthropic Memory System

> Migration from custom `@context:` system to Anthropic's official memory/rules pattern.

---

## Executive Summary

### What's Changing

| Component | Current | After Migration |
|-----------|---------|-----------------|
| Directory name | `contexts/` | `.claude/rules/` |
| Import syntax | `@context: base` | `@.claude/rules/base.md` |
| Path-conditional | Manual per-project | `paths:` YAML frontmatter |
| User rules location | `~/.claude/contexts/` | `~/.claude/rules/` |
| Skill index | Symlink to golems repo | Same (unchanged) |

### What's NOT Changing

- Skills system (`.claude/commands/golem-powers/`) - unchanged
- CLAUDE.md hierarchy - unchanged
- farther-steps.json sync pattern - unchanged
- /context-audit skill - updated for new paths
- Cursor .mdc files - already use globs (similar to `paths:`)

---

## Current State Inventory

### Projects Using `@context:` Syntax

| Project | CLAUDE.md Location | Contexts Referenced |
|---------|-------------------|---------------------|
| **golems** | `/CLAUDE.md` | Will need update |
| **domica** | `/CLAUDE.md` | `base`, `skill-index`, 6 tech, 6 workflow |
| **domica/apps/*/** | 3 app CLAUDE.md files | Inherit from root |

### Projects WITHOUT Context System (Inline Rules)

| Project | CLAUDE.md | Notes |
|---------|-----------|-------|
| **songscript** | 258 lines | Ralph workflow, Convex, WhisperX pipeline |
| **rudy-monorepo** | ~100 lines | Tailwind v4, design rules |
| **yichus** | ~80 lines | Privacy-first DNA app |
| **etanheyman.com** | ~50 lines | Philosophy-based instructions |

### Context File Locations

```
CANONICAL SOURCE (git-tracked):
~/Gits/golems/contexts/
├── base.md, golem-system.md, README.md, CLAUDE.md
├── skill-index.md, skill-descriptions.md
├── tech/ (7 files)
└── workflow/ (7 files)

ACTIVE LOCATION (Claude loads from):
~/.claude/contexts/
├── base.md, golem-system.md, README.md, CLAUDE.md
├── skill-index.md → symlink to golems/contexts/skill-index.md
├── tech/ (7 files)
└── workflow/ (7 files)

DOMICA COPY:
~/Gits/domica/contexts/
├── base.md
├── tech/ (3 files)
└── workflow/ (6 files)

CURSOR RULES (domica only):
~/Gits/domica/.cursor/rules/*.mdc (11 files with YAML frontmatter)
```

---

## Migration Steps

### Phase 1: Rename Directory Structure

#### 1.1 Golems Repo (Canonical Source)

```bash
cd ~/Gits/golems

# Rename contexts → .claude/rules
mkdir -p .claude
mv contexts .claude/rules

# Update gitignore if needed
# (contexts/ was tracked, .claude/rules/ should also be tracked)
```

**Files created:**
- `.claude/rules/` (all existing context files)

#### 1.2 User Home Directory

```bash
cd ~/.claude

# Rename contexts → rules
mv contexts rules

# Update skill-index symlink
rm rules/skill-index.md
ln -s ~/Gits/golems/.claude/rules/skill-index.md rules/skill-index.md
```

#### 1.3 Domica Repo

```bash
cd ~/Gits/domica

# Rename contexts → .claude/rules
mkdir -p .claude
mv contexts .claude/rules
```

**Note:** Domica's `.cursor/rules/*.mdc` stays unchanged - Cursor uses different format.

---

### Phase 2: Update Import Syntax

#### 2.1 Syntax Change Reference

```markdown
# BEFORE (custom syntax)
@context: base
@context: tech/nextjs
@context: workflow/rtl

# AFTER (Anthropic standard)
@.claude/rules/base.md
@.claude/rules/tech/nextjs.md
@.claude/rules/workflow/rtl.md
```

#### 2.2 Files to Update

**Golems Repo:**
- [ ] `CLAUDE.md` (root)
- [ ] `packages/ralph/CLAUDE.md`
- [ ] `packages/autonomous/CLAUDE.md`
- [ ] `packages/zikaron/CLAUDE.md`
- [ ] `packages/tax-helper/CLAUDE.md`
- [ ] `.claude/rules/README.md` (documentation)
- [ ] `.claude/rules/CLAUDE.md` (sync rules)

**Domica Repo:**
- [ ] `CLAUDE.md` (root)
- [ ] `apps/expo/CLAUDE.md`
- [ ] `apps/admin/CLAUDE.md`
- [ ] `apps/public/CLAUDE.md`
- [ ] `.claude/rules/README.md`

**User Home:**
- [ ] `~/.claude/CLAUDE.md` (update any context references)
- [ ] `~/.claude/rules/README.md`

---

### Phase 3: Add `paths:` Frontmatter

Anthropic's new feature: rules only load when working with matching files.

#### 3.1 Tech Contexts (Add path-conditional loading)

**`.claude/rules/tech/nextjs.md`**
```yaml
---
paths:
  - "**/*.tsx"
  - "**/*.ts"
  - "**/next.config.*"
  - "**/app/**"
  - "**/pages/**"
---
# Next.js Context
...
```

**`.claude/rules/tech/supabase.md`**
```yaml
---
paths:
  - "**/supabase/**"
  - "**/*supabase*.ts"
  - "**/migrations/**"
---
# Supabase Context
...
```

**`.claude/rules/tech/convex.md`**
```yaml
---
paths:
  - "**/convex/**"
  - "**/*convex*.ts"
---
# Convex Context
...
```

**`.claude/rules/tech/react-native.md`**
```yaml
---
paths:
  - "**/expo/**"
  - "**/*.native.tsx"
  - "**/app.json"
  - "**/eas.json"
---
# React Native Context
...
```

**`.claude/rules/tech/ink.md`**
```yaml
---
paths:
  - "**/cli/**"
  - "**/ink/**"
  - "**/*-cli/**"
---
# Ink Context
...
```

#### 3.2 Workflow Contexts (Mostly Always-Apply)

**`.claude/rules/workflow/rtl.md`**
```yaml
---
paths:
  - "**/*.he.json"
  - "**/*.ar.json"
  - "**/locales/he/**"
  - "**/locales/ar/**"
  - "**/i18n/**"
---
# RTL Context
...
```

**`.claude/rules/workflow/testing.md`**
```yaml
---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
  - "**/tests/**"
  - "**/__tests__/**"
  - "**/playwright/**"
---
# Testing Context
...
```

#### 3.3 Always-Apply Contexts (No frontmatter needed)

These load unconditionally:
- `base.md` - Universal rules
- `workflow/interactive.md` - CLAUDE_COUNTER, git safety
- `workflow/ralph.md` - Story execution (when using Ralph)
- `golem-system.md` - Architecture (for golems repo only)
- `skill-index.md` - Skill reference

---

### Phase 4: Update Skills & Scripts

#### 4.1 `/context-audit` Skill

Update to look for `.claude/rules/` instead of `contexts/`:

```bash
# In: ~/.claude/commands/golem-powers/context-audit/

# Change detection paths:
CONTEXT_DIR=".claude/rules"  # was: "contexts"
```

#### 4.2 `generate-skill-index.sh`

```bash
# Update any hardcoded paths from contexts/ to .claude/rules/
```

#### 4.3 Sync Script (if exists)

```bash
# Update rsync paths:
rsync -av --exclude='CLAUDE.md' ~/Gits/golems/.claude/rules/ ~/.claude/rules/
```

---

### Phase 5: Add Imports to Single-File Projects

Projects like songscript, yichus, rudy-monorepo currently have inline rules. Add shared rule imports to reduce duplication and get automatic improvements.

#### 5.1 Songscript

Tech stack: TanStack Start, Convex, Tailwind, Vitest

```markdown
# songscript/CLAUDE.md

## Rules
@~/.claude/rules/base.md
@~/.claude/rules/workflow/interactive.md
@~/.claude/rules/tech/convex.md
@~/.claude/rules/workflow/testing.md

## Project-Specific Rules
(keep existing: Ralph workflow, WhisperX pipeline, Convex .js fix, etc.)
```

#### 5.2 Rudy-Monorepo

Tech stack: Next.js, Tailwind v4

```markdown
# rudy-monorepo/CLAUDE.md

## Rules
@~/.claude/rules/base.md
@~/.claude/rules/workflow/interactive.md
@~/.claude/rules/tech/nextjs.md
@~/.claude/rules/workflow/design-system.md

## Project-Specific Rules
(keep existing: Tailwind v4 specifics, design rules)
```

#### 5.3 Yichus

Tech stack: Privacy-first DNA app (check actual stack)

```markdown
# yichus/CLAUDE.md

## Rules
@~/.claude/rules/base.md
@~/.claude/rules/workflow/interactive.md

## Project-Specific Rules
(keep existing: privacy rules, DNA-specific patterns)
```

**Note:** Review each project's actual tech stack during migration to add appropriate tech contexts.

---

### Phase 6: Cursor Rules Auto-Generation

Create a script to auto-generate `.cursor/rules/*.mdc` from `.claude/rules/*.md` for any project.

#### 6.1 Cursor .mdc Format

Cursor rules use YAML frontmatter with these fields:
```yaml
---
description: Brief description of what this rule covers
alwaysApply: true|false
globs:                    # Optional - only load for matching files
  - "**/*.tsx"
  - "**/api/**"
---
# Rule Content (markdown)
```

#### 6.2 Mapping from Anthropic to Cursor Format

| Anthropic `.claude/rules/` | Cursor `.cursor/rules/` |
|---------------------------|------------------------|
| `paths:` frontmatter | `globs:` frontmatter |
| No frontmatter (always load) | `alwaysApply: true` |
| File path `tech/nextjs.md` | File name `tech-nextjs.mdc` |

#### 6.3 Auto-Generation Script

Create `scripts/generate-cursor-rules.sh`:

```bash
#!/bin/bash
# Generate .cursor/rules/*.mdc from .claude/rules/*.md

CLAUDE_RULES=".claude/rules"
CURSOR_RULES=".cursor/rules"

mkdir -p "$CURSOR_RULES"

generate_mdc() {
  local src="$1"
  local name=$(basename "$src" .md)
  local dir=$(dirname "$src" | sed "s|$CLAUDE_RULES/||")

  # Build output filename: tech/nextjs.md → tech-nextjs.mdc
  if [[ "$dir" != "." && "$dir" != "$CLAUDE_RULES" ]]; then
    local out="$CURSOR_RULES/${dir}-${name}.mdc"
  else
    local out="$CURSOR_RULES/${name}.mdc"
  fi

  # Extract description from first line after # heading
  local desc=$(grep -m1 "^>" "$src" | sed 's/^> //' || echo "Rules for $name")

  # Check if source has paths: frontmatter
  if grep -q "^paths:" "$src"; then
    # Convert paths: to globs:
    local globs=$(sed -n '/^paths:/,/^---/p' "$src" | grep "^\s*-" | sed 's/paths:/globs:/')
    cat > "$out" << EOF
---
description: $desc
alwaysApply: false
globs:
$globs
---

$(sed '1,/^---$/d' "$src" | sed '1,/^---$/d')
EOF
  else
    # No paths = alwaysApply
    cat > "$out" << EOF
---
description: $desc
alwaysApply: true
---

$(cat "$src")
EOF
  fi

  echo "Generated: $out"
}

# Process all .md files (skip README, CLAUDE.md)
find "$CLAUDE_RULES" -name "*.md" -type f | while read -r file; do
  name=$(basename "$file")
  [[ "$name" == "README.md" || "$name" == "CLAUDE.md" ]] && continue
  generate_mdc "$file"
done

echo "Done! Generated Cursor rules in $CURSOR_RULES/"
```

#### 6.4 Usage

```bash
# In any project with .claude/rules/
./scripts/generate-cursor-rules.sh

# Or add to package.json
"scripts": {
  "generate:cursor-rules": "./scripts/generate-cursor-rules.sh"
}
```

#### 6.5 Maintenance Workflow

```
1. Edit .claude/rules/*.md (source of truth)
2. Run generate-cursor-rules.sh
3. Both Claude Code AND Cursor get updates
```

---

### Phase 8: Documentation Updates

#### 8.1 Update `.claude/rules/README.md`

```markdown
# Claude Rules System

> Modular rules using Anthropic's official `.claude/rules/` pattern.

## How to Reference Rules

### Standard Import Syntax
@.claude/rules/base.md
@.claude/rules/tech/nextjs.md
@.claude/rules/workflow/rtl.md

### Home Directory Import
@~/.claude/rules/base.md

### Path-Conditional Rules
Rules with `paths:` frontmatter only load when working with matching files:
- `tech/nextjs.md` - loads for *.tsx files
- `workflow/testing.md` - loads for *.test.ts files
...
```

#### 8.2 Update golems/CLAUDE.md

Change from:
```markdown
## Contexts
@context: base
@context: skill-index
```

To:
```markdown
## Rules
@.claude/rules/base.md
@.claude/rules/skill-index.md
```

---

## Migration Checklist

### Pre-Migration
- [ ] Backup `~/.claude/contexts/`
- [ ] Backup `~/Gits/golems/contexts/`
- [ ] Document any custom modifications in active contexts

### Phase 1: Directory Rename
- [ ] Rename `golems/contexts/` → `golems/.claude/rules/`
- [ ] Rename `~/.claude/contexts/` → `~/.claude/rules/`
- [ ] Rename `domica/contexts/` → `domica/.claude/rules/`
- [ ] Update symlinks

### Phase 2: Syntax Update
- [ ] Update golems CLAUDE.md files (5 files)
- [ ] Update domica CLAUDE.md files (4 files)
- [ ] Update ~/.claude/CLAUDE.md if needed
- [ ] Update README documentation

### Phase 3: Add Frontmatter
- [ ] Add `paths:` to tech/nextjs.md
- [ ] Add `paths:` to tech/supabase.md
- [ ] Add `paths:` to tech/convex.md
- [ ] Add `paths:` to tech/react-native.md
- [ ] Add `paths:` to tech/ink.md
- [ ] Add `paths:` to workflow/rtl.md
- [ ] Add `paths:` to workflow/testing.md

### Phase 4: Scripts & Skills
- [ ] Update /context-audit skill
- [ ] Update generate-skill-index.sh
- [ ] Update sync scripts

### Phase 5: Single-File Projects
- [ ] Update songscript/CLAUDE.md with rule imports
- [ ] Update rudy-monorepo/CLAUDE.md with rule imports
- [ ] Update yichus/CLAUDE.md with rule imports

### Phase 6: Cursor Rules Generation
- [ ] Create generate-cursor-rules.sh script
- [ ] Test script on domica
- [ ] Add script to golems for future projects
- [ ] Document maintenance workflow

### Phase 7: Verification
- [ ] Test in golems repo - rules load correctly
- [ ] Test in domica repo - rules load correctly
- [ ] Test path-conditional - tech rules only load for relevant files
- [ ] Verify /context-audit works with new paths
- [ ] Verify symlinks resolve correctly
- [ ] Test Cursor rules generation

### Post-Migration
- [ ] Commit changes to golems repo
- [ ] Commit changes to domica repo
- [ ] Update any documentation referencing old paths
- [ ] Remove old backup directories after 1 week

---

## Rollback Plan

If issues arise:

```bash
# Restore from backup
mv ~/.claude/rules ~/.claude/rules-new
mv ~/.claude/contexts-backup ~/.claude/contexts

# Or revert git changes
cd ~/Gits/golems
git checkout -- .
```

---

## Benefits After Migration

1. **Official support** - Using Anthropic's documented pattern
2. **Path-conditional loading** - Tech contexts only load when relevant
3. **`/memory` command** - Edit rules from Claude CLI
4. **Future improvements** - Anthropic may add more features to `.claude/rules/`
5. **Cleaner hierarchy** - `.claude/rules/` is under `.claude/` with other Claude config

## Preserved Benefits

1. **Canonical source** - golems/.claude/rules/ remains git-tracked source of truth
2. **Sync pattern** - farther-steps.json continues to work
3. **Self-improvement loop** - /context-audit still discovers gaps
4. **Skill system** - Completely unchanged

---

## Decisions Made

1. **Single-file projects**: ✅ YES - Add `@~/.claude/rules/` imports to songscript, rudy, yichus where tech stack matches

2. **Cursor rules sync**: ✅ YES - Auto-generate `.cursor/rules/*.mdc` from `.claude/rules/` via script

3. **Migration timing**: ✅ Execute later, not now - plan is ready for when needed

---

## Estimated Effort

| Task | Time |
|------|------|
| Directory renames | 5 min |
| Symlink updates | 2 min |
| Syntax updates (15 files) | 30 min |
| Add frontmatter (7 files) | 20 min |
| Update scripts/skills | 15 min |
| Single-file project updates (3 files) | 15 min |
| Cursor rules generation script | 20 min |
| Testing | 30 min |
| Documentation | 15 min |
| **Total** | ~2.5 hours |

---

*Plan created: 2026-02-05*
*Status: Ready for review*
