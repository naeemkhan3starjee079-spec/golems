# Install: learn-mistake

> Record mistakes for nightly aggregation - similar mistakes get higher priority

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/learn-mistake/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/learn-mistake
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/learn-mistake/SKILL.md \
  -o ~/.claude/commands/learn-mistake/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/learn-mistake/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/learn-mistake/scripts/aggregate.ts \
  -o ~/.claude/commands/learn-mistake/scripts/aggregate.ts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/learn-mistake/scripts/default.sh \
  -o ~/.claude/commands/learn-mistake/scripts/default.sh
chmod +x ~/.claude/commands/learn-mistake/scripts/default.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/learn-mistake/scripts/record.sh \
  -o ~/.claude/commands/learn-mistake/scripts/record.sh
chmod +x ~/.claude/commands/learn-mistake/scripts/record.sh
```

4. Verify:
```bash
ls ~/.claude/commands/learn-mistake/
```

## Usage

```
/learn-mistake
```
