# Install: catchup-recent

> Use when taking a short break (hours, not days) and need quick refresh. Reads only uncommitted changes (staged and unstaged). Covers quick catchup, refresh. NOT for: long breaks or full branch review (use catchup instead).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/catchup-recent/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/catchup-recent
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/catchup-recent/SKILL.md \
  -o ~/.claude/commands/catchup-recent/SKILL.md
```

3. Verify:
```bash
ls ~/.claude/commands/catchup-recent/
```

## Usage

```
/catchup-recent
```
