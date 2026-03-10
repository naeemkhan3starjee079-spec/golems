# Install: writing-skills

> Use when creating new golem-powers skills, editing existing skills, or verifying skills work. Covers create skill, write skill, skill template, skill structure. NOT for: using existing skills (invoke them directly), superpowers skills (different structure).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/writing-skills/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/writing-skills
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/writing-skills/SKILL.md \
  -o ~/.claude/commands/writing-skills/SKILL.md
```

3. Download workflows:
```bash
mkdir -p ~/.claude/commands/writing-skills/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/writing-skills/workflows/audit.md \
  -o ~/.claude/commands/writing-skills/workflows/audit.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/writing-skills/workflows/create.md \
  -o ~/.claude/commands/writing-skills/workflows/create.md
```

4. Download scripts:
```bash
mkdir -p ~/.claude/commands/writing-skills/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/writing-skills/scripts/create-skill.sh \
  -o ~/.claude/commands/writing-skills/scripts/create-skill.sh
chmod +x ~/.claude/commands/writing-skills/scripts/create-skill.sh
```

5. Verify:
```bash
ls ~/.claude/commands/writing-skills/
```

## Usage

```
/writing-skills
```
