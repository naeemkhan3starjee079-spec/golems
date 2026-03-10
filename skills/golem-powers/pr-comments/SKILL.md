---
name: pr-comments
description: Fetch and display PR review comments with full context (diff hunks, severity, descriptions). Checks Greptile, CodeRabbit, Cursor Bugbot, and DeepSource. Use after pushing a PR to check for issues before merging.
allowed-tools:
  - Bash
  - Read
---

# PR Comments

Fetch review comments from a PR with full context — diff hunks, severity tags, descriptions, and DeepSource analysis. No AI summarization; structured extraction that you read directly.

## Preferred Method: Greptile Plugin

If the Greptile Claude Code plugin is installed (`/plugins → greptile`), use it directly:

1. `list_merge_request_comments` — get all review comments on the PR
2. `search_greptile_comments` — search across all review comments
3. `trigger_code_review` — trigger a new Greptile review on demand

This is faster and more reliable than the shell script fallback.

## Fallback: Shell Script

If Greptile plugin is not installed, use the fetch script:

1. Run the fetch script:
   ```bash
   bash skills/golem-powers/pr-comments/scripts/fetch-pr-comments.sh $ARGUMENTS
   ```
2. Read the output: `claude.scratchpad.pr-comments.md`

## Assessment

For each comment, assess:
- **HIGH** = real bug → must fix before merge
- **MEDIUM** = valid improvement → fix if straightforward
- **LOW** = style/nitpick → fix only if genuinely better
- **INFO** = skip

Present findings with your assessment of which to fix vs skip. Max 3 review-fix rounds — skip persistent nitpicks after that.

## Usage

```
/pr-comments        # Current branch's PR
/pr-comments 77     # Specific PR number
```

## Review Sources (coverage stack)

| Source | Type | Plugin? |
|--------|------|---------|
| Greptile | AI review + codebase understanding | Yes — Claude Code plugin |
| CodeRabbit | AI review + auto-summaries | Yes — Claude Code plugin |
| Cursor Bugbot | Bug detection | No — check via CI |
| DeepSource | Static analysis | No — check via CI |

## Output Format (shell script fallback)

The script extracts per-comment:
- Severity (from Bugbot/CodeRabbit markers)
- Author, file path, line number
- Full description (from DESCRIPTION markers or body)
- Diff hunk (the actual code context)
- DeepSource check status + link
