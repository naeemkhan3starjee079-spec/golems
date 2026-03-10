# Install: coach

> Life admin assistant for health/habits, recruiting/jobs, freelancing/contracts, Israeli law, outreach/networking, and scheduling. Use when discussing daily planning, schedule creation, habit tracking, WHOOP data, job hunting, freelance contracts, Israeli business law, client management, or outreach emails. Also triggers for any conversation that references past coaching sessions or personal context that needs memory recall. Even seemingly simple requests ("build me a schedule", "check my WHOOP") benefit from this skill because coachClaude's value comes from persistent memory and accumulated context about the user's life, habits, and goals.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coach/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/coach
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coach/SKILL.md \
  -o ~/.claude/commands/coach/SKILL.md
```

### Workflows

```bash
mkdir -p ~/.claude/commands/coach/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coach/workflows/admin.md \
  -o ~/.claude/commands/coach/workflows/admin.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coach/workflows/freelance.md \
  -o ~/.claude/commands/coach/workflows/freelance.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coach/workflows/health.md \
  -o ~/.claude/commands/coach/workflows/health.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/coach/workflows/recruit.md \
  -o ~/.claude/commands/coach/workflows/recruit.md
```

3. Verify:
```bash
ls ~/.claude/commands/coach/
```

## Usage

```
/coach
```
