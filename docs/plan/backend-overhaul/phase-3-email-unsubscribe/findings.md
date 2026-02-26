# Phase 3 Findings

## Decisions

- **List-Unsubscribe (RFC 2369/8058):** Gmail API provides this header. We extract both `mailto:` and `https://` variants. RFC 8058 defines one-click unsubscribe via HTTP POST.
- **Sender category mapping:** Email categories map to simpler sender categories: promo→promo, newsletter→newsletter, job/interview→job, tech-update→tech, everything else→normal.
- **Generated column:** `domain` is a generated column (`split_part(email_address, '@', 2)`) — no need to maintain it manually.
- **Backfill:** 158 senders backfilled from 374 existing emails with aggregated counts and avg scores.

## Data Audit (email_senders backfill)

- 158 unique senders from 374 emails
- Top senders: notifications@github.com (93 emails), alerts@drushim.co.il (21), jobs-noreply@linkedin.com (7)
- Categories: lots of promo/newsletter senders with low scores (1-3), tech senders (github, railway) with high scores (7-9)

## Changes Made

### Migration 007: email_senders table

- PK: `email_address` (text)
- `domain` generated column for grouping
- `unsubscribe_url` + `unsubscribe_email` from List-Unsubscribe header
- `unsubscribe_status`: null → requested → confirmed/failed
- `user_action`: null → keep/unsubscribe/block
- Indexes on domain, category, user_action, total_emails

### sender-tracker.ts (new)

- `parseListUnsubscribe()` — RFC 2369 parser for `<mailto:...>, <https://...>` format
- `senderCategoryFromEmail()` — maps email categories to sender categories
- `trackSender()` — upserts sender stats with running average score
- `getSenders()` — filtered query for admin UI
- `setSenderAction()` — set keep/unsubscribe/block
- `attemptUnsubscribe()` — RFC 8058 one-click POST, fallback to GET, fallback to mailto notice

### gmail-client.ts

- Added `listUnsubscribe` to `GmailEmail` interface
- Added `List-Unsubscribe` to `metadataHeaders` in all 3 fetch functions

### index.ts (email processing pipeline)

- After scoring + saving, calls `trackSender()` with parsed List-Unsubscribe data
- Fault-tolerant (try/catch, doesn't fail the pipeline)

### mcp-server.ts

- 3 new MCP tools: `email_getSenders`, `email_setSenderAction`, `email_unsubscribe`

### Tests

- 14 new tests for `parseListUnsubscribe` and `senderCategoryFromEmail`
- Full suite: 853 pass, 0 fail

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Design email_senders schema | opus | done (migration 007) |
| Backfill from existing emails | opus | done (158 senders) |
| Extract List-Unsubscribe header | opus | done (gmail-client.ts) |
| Implement sender aggregation | opus | done (sender-tracker.ts) |
| Wire into email pipeline | opus | done (index.ts) |
| MCP tools for admin UI | opus | done (3 new tools) |
| Implement unsubscribe actions | opus | done (RFC 8058 + fallbacks) |
| Tests | opus | done (14 tests) |
