# Phase 2: Data Accuracy Fixes

> [Back to main plan](../README.md)

## Goal

Fix incorrect numbers across enrichment, teller, and notifications pages so the dashboard shows accurate, trustworthy data.

## Tools

- **Research:** gemini — verify actual enrichment rates, check Supabase data
- **Code:** opus — edit enrichment/page.tsx, teller/page.tsx, notifications/page.tsx
- **MCPs:** supabase — query actual subscription data, verify notification counts

## Context

### Enrichment Time Estimate (enrichment/page.tsx:104-107)
- Current formula: `needsEnrichment / 50 batches * 3 seconds`
- Problem: assumes 50 chunks/batch at 3s/batch = 16.7 chunks/s. Reality is ~1 chunk/s with GLM (thinking disabled)
- Example: 5000 chunks → shows "5m" but actually takes ~83 minutes
- The "4h20m" user saw was because the formula divides by 3600 (hours) but the unit math is wrong: `(batches * 3) / 3600` gives hours, but it should be `(needsEnrichment * 1) / 3600` for 1s/chunk
- **Fix:** Use actual rate of ~1 chunk/second (from memory: with `"think": false`, enrichment takes ~1s/chunk for simple prompts, ~13s/chunk for longer prompts). Use 2s/chunk as safe average.

### Enrichment Percentage (enrichment/page.tsx:94-102)
- Current: weighted average with embeddings=1x, others=2x
- Problem: embeddings at 100% (226K/226K) pulls up the average. If tags/summaries/importance/intent are all at 20%, weighted average = (100*1 + 20*2 + 20*2 + 20*2 + 20*2) / (1+2+2+2+2) = 260/9 = 28.9% — but user expected lower
- Actually the user said 33% was wrong — this suggests some fields are partially done
- **Fix options:**
  - Option A: Show only non-embedding fields (since embeddings are always 100%)
  - Option B: Equal weights for all 5 fields
  - Option C: Show "text enrichment" as average of tags+summaries+importance+intent only (recommended)
- **Go with Option C:** "Overall" = average of tags, summaries, importance, intent (skip embeddings). Embeddings get their own bar but don't inflate the number.

### Teller Categorization (teller/page.tsx:54-58)
- Current: hardcoded `CATEGORY_MAP` with only 3 entries (Spotify, Railway.app, Bugbot Pro)
- Problem: Bugbot Pro is a GitHub bot subscription, not a recurring bill — shouldn't be in subscriptions
- Also: any subscription not in the map shows as "Other" with gray color
- User wants SMARTER receipt understanding, not just fixing one entry
- **Fix:**
  1. **Research:** Use gemini/exa to find common SaaS subscription categorization rules and receipt patterns
  2. Query `subscriptions` table from Supabase to see what's actually there
  3. Build a comprehensive categorization system:
     - Entertainment (Spotify, Netflix, YouTube Premium, etc.)
     - Infrastructure (Railway, Vercel, AWS, Supabase, etc.)
     - Dev Tools (GitHub, JetBrains, Cursor, etc.)
     - Communication (Slack, Zoom, etc.)
     - AI/ML (Anthropic, OpenAI, Replicate, etc.)
     - Productivity (Notion, Linear, 1Password, etc.)
  4. Auto-categorize by matching vendor name patterns (case-insensitive, partial match)
  5. Add `is_active` filtering — only show active subscriptions
  6. Fallback: "Other" category for unmatched, but make it smart about common vendors

### Notifications/Emails Caps (notifications/page.tsx, emails/page.tsx)
- PAGE_SIZE was increased to 2000 in PR #185
- User says "still capped at 1000" — need to verify:
  1. Is the change deployed on Vercel?
  2. Is Supabase RLS limiting rows?
  3. Is there a `.limit(1000)` somewhere else in the query?
- Check `fetchNotifications` and `fetchEmails` in `queries.ts`

## Steps

1. **Enrichment time estimate:** Change formula from batch-based to chunk-based: `needsEnrichment * 2` seconds (2s/chunk average)
2. **Enrichment percentage:** Change overall to average of tags+summaries+importance+intent only (4 fields, equal weight). Keep embeddings bar visible but excluded from overall
3. **Teller:** Query Supabase subscriptions table, update CATEGORY_MAP with real data, remove non-bill items or flag them
4. **Notifications/emails caps:** Check the actual query functions in queries.ts, verify PAGE_SIZE is used correctly, check for other limits
5. Build + test all 4 pages locally

## Depends On

- None (independent of Phase 1)

## Status

- [ ] Fix enrichment time estimate formula
- [ ] Fix enrichment overall percentage calculation
- [ ] Query Supabase for real subscription data
- [ ] Update teller CATEGORY_MAP
- [ ] Verify notification/email caps
- [ ] Build + local test
