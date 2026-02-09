# Phase 3: Email Sender Tracking + Unsubscribe

> [Back to plan](../README.md)

## Goal

Aggregate emails by sender. Identify promo/newsletter senders. Provide unsubscribe actions for known services. Expose sender data via API for admin UI.

## Current State

- Emails stored with `from_address` — individual emails, no sender aggregation
- Categories: job, interview, subscription, tech-update, urgent, newsletter, promo, social, other
- Scoring exists (1-10) but no sender-level aggregation
- No unsubscribe functionality at all
- Gmail API supports label management but not used

## Tools

- **Research:** `cursor agent -p @codebase` — understand email storage schema, Gmail API capabilities
- **Code:** Direct edits

## Steps

1. [ ] Create `email_senders` Supabase table (migration):
   - `email_address` (PK), `display_name`, `category` (promo/newsletter/normal/job)
   - `total_emails`, `last_email_at`, `avg_score`
   - `unsubscribe_url` (extracted from email headers), `unsubscribe_status` (null/requested/confirmed)
   - `user_action` (null/keep/unsubscribe/block)
2. [ ] Extract sender aggregation:
   - After scoring each email, upsert sender stats
   - Parse `List-Unsubscribe` header from Gmail API (standard header for one-click unsubscribe)
3. [ ] Unsubscribe actions:
   - For known services with `List-Unsubscribe`: send HTTP POST or mailto
   - For others: mark as "wants unsubscribe" — surface in admin UI for manual action
   - Gmail label: auto-apply "Unsubscribed" label to future emails from blocked senders
4. [ ] API endpoint or Supabase RPC for admin UI:
   - `getSenders(category?)` — list senders with counts
   - `setSenderAction(email, action)` — keep/unsubscribe/block
   - `triggerUnsubscribe(email)` — attempt automated unsubscribe
5. [ ] Tests for sender aggregation and unsubscribe flow

## Depends On

- Phase 1 (Haiku wiring — better email categorization)

## Provides to Admin UI

- `email_senders` table for sender modal
- Unsubscribe action API
- Sender aggregation data (total emails, avg score, category)

## Status

- [x] email_senders migration
- [x] Sender aggregation in email processing
- [x] List-Unsubscribe header extraction
- [x] Unsubscribe action handler
- [x] Gmail label management (auto-filter: "Golems/Unsubscribed" label + skip inbox)
- [x] API/RPC for admin UI (3 MCP tools)
- [x] Tests (14 new)
