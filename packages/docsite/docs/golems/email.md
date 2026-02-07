---
sidebar_position: 1
---

# EmailGolem

EmailGolem is the intake layer for all external communication. It polls Gmail every 10 minutes, scores emails for urgency, routes them to domain experts, and manages reply drafting and follow-ups.

## Core Pipeline

```
Gmail → OAuth2 Poll (10min) → Scoring (Haiku) → Routing → Domain Golems
                                                  ↓
                              Reply Drafting ← Follow-up Tracking
```

### Scoring System (1-10)

- **10** — Instant Telegram alert (respond now)
- **7-9** — Morning briefing (check at 8am)
- **5-6** — Monthly tracking (archive, but revisit montly)
- **1-4** — Ignore (auto-archive)

Scoring is done via Haiku LLM (switched from Ollama in Phase 2) analyzing subject, sender, and body context.

### Email Routing

Routes emails to domain golems based on content patterns:

| Email Type | Router | GolemActor | Notes |
|------------|--------|-----------|-------|
| Job offers, interview requests | Contact pattern + keywords | `recruitergolem` | Outreach DB updated |
| Subscription/billing | Domain `@stripe.com`, `@paddle.com`, etc | `tellergolem` | Planned: cost tracking |
| Tech updates, urgent notifications | `[urgent]` tag, mention of code/PR | `claudegolem` | Fast-track to ClaudeGolem |
| General | Fallback | Briefing log | Score determines visibility |

## Files

**Core Engine:**
- `src/email-golem/index.ts` — Main entry point, Gmail client initialization
- `src/email-golem/gmail-client.ts` — OAuth2 auth, polling logic
- `src/email-golem/scorer.ts` — Haiku scoring pipeline with caching
- `src/email-golem/db-client.ts` — SQLite/Supabase adapter for email storage

**Routing & Processing:**
- `src/email-golem/router.ts` — Domain golem routing logic
- `src/email-golem/draft-reply.ts` — AI reply generation with intents
- `src/email-golem/followup.ts` — Follow-up scheduling and tracking

## Key Features

### Reply Drafting

Auto-generate email replies with preset intents:

```typescript
// draft-reply.ts
const intents = [
  'accept',      // Yes, I'm interested
  'decline',     // No thanks
  'interested',  // Tell me more
  'followup',    // When can we talk?
  'acknowledge'  // Received, will review
];
```

Drafts are stored in the database and can be reviewed before sending via Telegram.

### Follow-up Tracking

Category-based due dates:

| Category | Due Date |
|----------|----------|
| Interview | 3 days |
| Job application | 5 days |
| Urgent/PR | 1 day |
| General | 30 days |

Follow-ups trigger alerts if not completed by due date.

## MCP Tools

Available via the Zikaron MCP server:

- **`email_getRecent`** — Fetch last N emails from inbox
- **`email_search`** — Search emails by sender, subject, date range
- **`email_subscriptions`** — Get subscription/billing emails (Stripe, Paddle, etc)
- **`email_urgent`** — Get emails flagged as urgent
- **`email_stats`** — Summary: total, by score, by routing
- **`email_getByGolem`** — Fetch emails routed to a specific golem
- **`email_draftReply`** — Generate reply draft for an email

## Environment Variables

```bash
# 1Password items (store in any vault)
export GMAIL_OAUTH_REFRESH_TOKEN=$(op read op://YOUR_VAULT/YOUR_GMAIL_ITEM/refresh_token)
export ANTHROPIC_API_KEY=$(op read op://YOUR_VAULT/YOUR_ANTHROPIC_ITEM/credential)

# Scoring model (Phase 2+)
export LLM_BACKEND=haiku  # or 'ollama' for local
```

## Database Schema

```sql
-- Emails table
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  from_address TEXT,
  subject TEXT,
  body TEXT,
  score INTEGER (1-10),
  routing_golem TEXT,
  created_at TIMESTAMP,
  routed_at TIMESTAMP,
  follow_up_due_at TIMESTAMP
);

-- Email threads (for conversation tracking)
CREATE TABLE email_threads (
  id TEXT PRIMARY KEY,
  root_email_id TEXT,
  emails JSONB (array of email IDs in thread)
);

-- Drafts (reply suggestions)
CREATE TABLE email_drafts (
  id TEXT PRIMARY KEY,
  email_id TEXT,
  intent TEXT,
  body TEXT,
  sent_at TIMESTAMP
);
```

## Running EmailGolem

```bash
cd packages/autonomous

# Manually trigger poll cycle (normally runs every 10min)
bun src/email-golem/index.ts

# Score a single email
bun src/email-golem/scorer.ts --email-id <id>

# Test reply drafting
bun src/email-golem/draft-reply.ts --email-id <id> --intent accept
```

## Integration with Other Golems

- **RecruiterGolem** — Job emails trigger outreach DB updates
- **TellerGolem** — Subscription emails routed for expense tracking
- **ClaudeGolem** — Urgent emails fast-tracked to code/PR context
- **Telegram Bot** — High-score (10) emails sent as instant alerts

## Troubleshooting

**Emails not being scored:**
```bash
# Check Haiku API key
op read op://YOUR_VAULT/YOUR_ANTHROPIC_ITEM/credential

# Check Gmail OAuth token
op read op://YOUR_VAULT/YOUR_GMAIL_ITEM/refresh_token
```

**Routing to wrong golem:**
```bash
# Review scorer output (check routing patterns in router.ts)
bun src/email-golem/router.ts --debug
```

**Follow-ups not triggering:**
```bash
# Check launchd job (runs via cron or launchd)
launchctl list | grep golems-email
cat ~/Library/LaunchAgents/golems-email.plist
```

See `/docs/configuration.md` for Gmail OAuth setup.
