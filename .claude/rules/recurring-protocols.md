# Recurring Protocols

## Monthly System Audit (1st Sunday of month)

Coach schedules this. Prompt: "Time for monthly system audit."

Steps:
1. Re-run rules triage: read each `.claude/rules/*.md`, check if still needed
2. Check skills word counts: `wc -w skills/golem-powers/*/SKILL.md | sort -rn` — flag >500 words
3. Review CLAUDE.md — any sections the model handles natively now?
4. Check for stale AIDEV-NOTEs: `grep -r "AIDEV-TODO" packages/`
5. Prune anything the model handles without guidance

## /release-day Protocol

Trigger: "new Claude model dropped" or "/release-day"

Steps:
1. Check what model version shipped
2. Test: temporarily remove 2-3 rules files, run tasks (commit flow, PR loop, scraper scoring, skill invocation)
3. If no regression → delete those rules. If regression → restore from git immediately
4. Update MEMORY.md with model version, tests run, and results
5. Regenerate skill indices: `~/.claude/scripts/generate-skill-index.sh`
