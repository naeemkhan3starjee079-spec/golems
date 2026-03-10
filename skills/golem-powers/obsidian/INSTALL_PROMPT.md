# Install: obsidian

> Use when accessing Obsidian vault notes - reading, searching, listing, or organizing notes. Covers obsidian, notes, vault, ideas, diary, memos. NOT for: general file operations outside the vault.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/obsidian/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/obsidian
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/obsidian/SKILL.md \
  -o ~/.claude/commands/obsidian/SKILL.md
```

3. Download workflows:
```bash
mkdir -p ~/.claude/commands/obsidian/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/obsidian/workflows/read.md \
  -o ~/.claude/commands/obsidian/workflows/read.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/obsidian/workflows/recent.md \
  -o ~/.claude/commands/obsidian/workflows/recent.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/obsidian/workflows/search.md \
  -o ~/.claude/commands/obsidian/workflows/search.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/obsidian/workflows/write.md \
  -o ~/.claude/commands/obsidian/workflows/write.md
```

4. Verify:
```bash
ls ~/.claude/commands/obsidian/
```

## Usage

```
/obsidian
```
