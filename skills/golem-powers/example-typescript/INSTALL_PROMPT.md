# Install: example-typescript

> Use when learning to write TypeScript-pattern skills. Template for complex skills with Bun runtime. Covers example, template, typescript skill, pattern B. NOT for: production use (this is a demo).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/example-typescript/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/example-typescript
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/example-typescript/SKILL.md \
  -o ~/.claude/commands/example-typescript/SKILL.md
```

3. Download scripts:
```bash
mkdir -p ~/.claude/commands/example-typescript/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/example-typescript/scripts/run.sh \
  -o ~/.claude/commands/example-typescript/scripts/run.sh
chmod +x ~/.claude/commands/example-typescript/scripts/run.sh
```

4. Verify:
```bash
ls ~/.claude/commands/example-typescript/
```

## Usage

```
/example-typescript
```
