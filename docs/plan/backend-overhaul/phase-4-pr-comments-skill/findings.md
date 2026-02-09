# Phase 4 Findings

## Research

- [initial] `gh api repos/{owner}/{repo}/pulls/{n}/comments` returns inline code comments
- [initial] `gh api repos/{owner}/{repo}/pulls/{n}/reviews` returns review summaries
- [initial] Comments have `created_at`, `commit_id`, `path`, `line` fields for filtering
- [initial] PR #19 had ~60KB of comments — need to filter to just actionable items
