# Phase 4: PR Comments Skill

> [Back to plan](../README.md)

## Goal

Create a `/pr-comments` skill that fetches PR review comments filtered by commit SHA, so Claude can read only NEW comments since the last commit instead of dumping the entire review history into context.

## Problem

Currently reading PR comments dumps ALL comments (60KB+) into context, including already-addressed ones. Need:
- Filter by "after commit X" — only show comments on new/changed code
- Classify: real bug vs style vs over-engineering
- Output concise summary, not raw API dump

## Steps

1. [ ] Create `skills/golem-powers/pr-comments/SKILL.md`
2. [ ] Create `skills/golem-powers/pr-comments/scripts/fetch-comments.sh`:
   - Input: repo, PR number, optional commit SHA
   - Uses `gh api` to fetch comments
   - Filters by `created_at` > commit timestamp (or by `commit_id`)
   - Classifies each: bug / style / over-engineering (simple heuristics or LLM)
   - Outputs clean markdown summary with file:line locations
3. [ ] Handle both `pulls/{n}/comments` (inline) and `pulls/{n}/reviews` (review summaries)
4. [ ] Test with PR #19 comments as reference

## Depends On

Nothing — standalone skill.

## Status

- [ ] SKILL.md
- [ ] fetch-comments.sh
- [ ] Filtering by commit
- [ ] Classification
- [ ] Test
