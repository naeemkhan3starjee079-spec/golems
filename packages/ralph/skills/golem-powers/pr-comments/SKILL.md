---
name: pr-comments
description: Fetch and display PR review comments with full context (diff hunks, severity, descriptions). Checks Cursor Bugbot, CodeRabbit, and DeepSource. Use after pushing a PR to check for issues before merging.
allowed-tools:
  - Bash
  - Read
---

# PR Comments

Fetch review comments from a PR with full context — diff hunks, severity tags, descriptions, and DeepSource analysis. No AI summarization; structured extraction that you read directly.

## Steps

1. Run the fetch script:
   ```bash
   bash packages/ralph/skills/golem-powers/pr-comments/scripts/fetch-pr-comments.sh $ARGUMENTS
   ```
2. Read the output: `claude.scratchpad.pr-comments.md`
3. For each comment, assess:
   - **HIGH** = real bug → must fix before merge
   - **MEDIUM** = valid improvement → fix if straightforward
   - **LOW** = style/nitpick → fix only if genuinely better
   - **INFO** = skip
4. Present findings with your assessment of which to fix vs skip

## Usage

```
/pr-comments        # Current branch's PR
/pr-comments 77     # Specific PR number
```

## Output Format

The script extracts per-comment:
- Severity (from Bugbot/CodeRabbit markers)
- Author, file path, line number
- Full description (from DESCRIPTION markers or body)
- Diff hunk (the actual code context)
- DeepSource check status + link
