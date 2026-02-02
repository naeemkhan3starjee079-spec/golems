# Gmail Client - Implementation Notes

## Session A Complete

**Tests:** 11 pass
**File:** `src/email-golem/gmail-client.ts`

---

## What Was Implemented

### Core Functions

1. **`createGmailClient()`** - Creates OAuth2 client from env vars
2. **`getGmailClient()`** - Singleton pattern for client reuse
3. **`parseEmail(raw)`** - Parses Gmail API response into `GmailEmail` type
4. **`fetchRecentEmails(maxResults, labelIds)`** - Fetch N recent emails
5. **`fetchEmailsSince(timestamp)`** - Fetch emails since date (for polling)
6. **`resetGmailClient()`** - For testing (resets singleton)

### Types

```typescript
interface GmailEmail {
  id: string;
  subject: string;
  from: string;         // email address only
  fromName?: string;    // "John Doe" from "John Doe <email>"
  snippet: string;      // Gmail's auto-generated snippet
  receivedAt: Date;
  labelIds?: string[];  // INBOX, UNREAD, etc.
}
```

---

## Gaps / Questions for Docs Session

1. **OAuth Setup Instructions**
   - The `scripts/gmail-auth.ts` handles initial auth
   - Need to document the full flow in README.md
   - Consider: should we add the Google Cloud Console steps?

2. **Rate Limiting**
   - Gmail API has quotas (default: 250 quota units/user/second)
   - Each `messages.get` = 5 units
   - 50 emails = 250 units = 1 second worth
   - Not implemented: retry with backoff
   - Document: stay under 50 emails per 10-min poll

3. **Batch API**
   - Current impl does sequential `get` calls
   - Gmail supports batch requests (up to 100)
   - Not implemented - probably fine for ~20 emails
   - Document as future optimization if needed

4. **Missing Features (Intentionally)**
   - No email body parsing (snippet is enough for scoring)
   - No attachment handling
   - No send/modify operations (read-only scope)

5. **Environment Variables Required**
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   ```

6. **Error Handling**
   - API errors propagate up (caller must handle)
   - No automatic retry
   - Document: wrap in try/catch in main loop

---

## Integration Points

- **Scorer (Session B):** Will receive `GmailEmail[]` array
- **DB Client (Session E):** Will store scored emails
- **Main Loop (Session C):** Will call `fetchRecentEmails()` every 10 min

---

## Test Mocking Pattern

Tests use `mock.module("googleapis")` to avoid real API calls.
Pattern can be reused for other googleapis integrations.

---

## Verified Working

- [x] OAuth2 client creation
- [x] Email header parsing
- [x] "Name <email>" extraction
- [x] Date parsing from internalDate
- [x] Label filtering
- [x] Empty response handling
- [x] Error propagation

---

# Email Scorer - Implementation Notes

## Session B Complete

**Tests:** 15 pass
**File:** `src/email-golem/scorer.ts`

---

## What Was Implemented

### Core Functions

1. **`scoreEmail(email)`** - Score single email via Ollama
2. **`scoreEmails(emails, options)`** - Batch scoring with filtering/sorting
3. **`extractSubscriptionInfo(subject, snippet, from)`** - Quick regex extraction
4. **`shouldNotifyImmediately(email)`** - Check if score >= 10
5. **`shouldIncludeInBriefing(email)`** - Check if score >= 7
6. **`shouldTrackSubscription(email)`** - Check subscription tracking eligibility

### Score Thresholds (SCORE_THRESHOLDS)

| Score | Constant | Action |
|-------|----------|--------|
| 10 | IMMEDIATE | Telegram alert NOW |
| 7-9 | BRIEFING_MIN | Include in 24h briefing |
| 5-6 | TRACK_MIN | Track for monthly subscription report |
| 1-4 | IGNORE_MAX | Log only |

### Types

```typescript
interface EmailInput {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string;
}

interface ScoredEmail extends EmailInput {
  score: number;
  category: string;
  reason: string;
  subscription: SubscriptionInfo | null;
  scoredAt: string;
}

interface SubscriptionInfo {
  serviceName: string;
  amount: number | null;
  frequency: "monthly" | "yearly" | "one-time" | "unknown";
}
```

---

## Gaps / Questions for Docs Session

1. **Subscription Service List**
   - `KNOWN_SERVICES` map has ~15 services
   - Should be expanded based on user's actual subscriptions
   - Consider: make configurable via JSON file?

2. **Hebrew Email Support**
   - Not implemented (job-golem has bilingual support)
   - Question: Does user receive Hebrew job emails?
   - If needed, add Hebrew keywords to prompt

3. **Subscription Category vs Urgent**
   - Payment FAILED emails: currently scored as `urgent` with subscription info
   - Question: Should category be `subscription` with urgent flag?
   - Document: Urgent always overrides category for notifications

4. **Ollama Fallback Behavior**
   - When Ollama fails: score defaults to 5, category to "unknown"
   - Uses local extraction for subscription info
   - Question: Should failed scores be queued for retry?

5. **Rate Limiting**
   - 500ms delay between Ollama calls
   - For 50 emails = 25 seconds total
   - Document: Acceptable for 10-min polling interval

---

## Integration Points

- **Gmail Client (Session A):** Provides `GmailEmail[]` → maps to `EmailInput[]`
- **DB Client (Session E):** Will store `ScoredEmail` in Supabase
- **Main Loop (Session C):** Calls `scoreEmails()`, checks thresholds, notifies

---

## ollama-wrapper.ts Addition

Added `forEmailGolem` helper:

```typescript
export const forEmailGolem = {
  runOllama: (prompt: string) => runOllama(prompt, "email-golem"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "email-golem"),
};
```

---

## Test Coverage

- [x] Score threshold constants
- [x] Interview detection (score 10)
- [x] Payment failed detection (score 10)
- [x] Job updates (score 7)
- [x] Subscription receipts (score 5)
- [x] New subscriptions (score 6)
- [x] Newsletter detection (score 2)
- [x] Promo detection (score 1)
- [x] Batch processing
- [x] Min score filtering
- [x] Subscription extraction (receipt, yearly, non-subscription)
- [x] Fallback on Ollama failure
- [x] Malformed Ollama response handling

---

# DB Client (Supabase) - Implementation Notes

## Session E Complete

**Tests:** 14 pass
**File:** `src/email-golem/db-client.ts`
**Migration:** `supabase/migrations/001_email_golem_tables.sql` (run manually via dashboard)

---

## What Was Implemented

### Core Functions

1. **`createDbClient(config?)`** - Supabase client factory (uses env vars by default)
2. **`safeInsert(client, table, data)`** - Insert with offline queue fallback
3. **`safeUpsert(client, table, data, conflictColumn)`** - Upsert with offline queue fallback
4. **`syncOfflineQueue(client)`** - Sync queued items when back online
5. **`getSubscriptionSummary(client)`** - Monthly subscription report
6. **`getRecentEmails(client, hours, minScore)`** - Emails for briefing
7. **`saveEmail(client, email)`** - Convenience wrapper for email upsert
8. **`trackSubscription(client, subscription)`** - Track/update subscription
9. **`recordPayment(client, payment)`** - Record payment event
10. **`markNotified(client, emailId)`** - Mark email as notified
11. **`getUnnotifiedUrgentEmails(client)`** - Get score>=10 emails not yet notified

### Offline Queue

- **Path:** `~/.golems-zikaron/offline-queue.json`
- **Format:** Array of `{ id, table, data, timestamp }`
- **Behavior:** All failed inserts queued, synced on next startup

---

## Database Tables (Created)

```sql
-- emails: Scored emails with categories
-- subscriptions: Active services with amounts
-- payments: Payment events linked to subscriptions/emails
```

Indexes on: `emails(category)`, `emails(received_at)`, `payments(paid_at)`

---

## Gaps / Questions for Docs Session

1. **RLS Policies**
   - Not enabled (using anon key)
   - Decision: Keep simple for now, revisit if security concern

2. **Queue Size Limit**
   - No max size on offline queue
   - Could grow if offline for weeks
   - Consider: cleanup after N days or limit to 1000 items

3. **Duplicate Payment Prevention**
   - Payments should include `email_id` to prevent re-processing
   - Session C should check if email already has payment recorded

4. **Monthly Digest Trigger**
   - `getSubscriptionSummary()` ready but no trigger
   - Session C: Add to briefing on 1st of month

---

## Integration Example

```typescript
import {
  createDbClient,
  saveEmail,
  syncOfflineQueue,
  getRecentEmails,
  getSubscriptionSummary,
  getUnnotifiedUrgentEmails,
  markNotified
} from './db-client';

const client = createDbClient();
await syncOfflineQueue(client);

// After scoring
await saveEmail(client, { gmail_id, subject, from_address, snippet, score, category, received_at, notified: false });

// Notifications
const urgent = await getUnnotifiedUrgentEmails(client);
for (const email of urgent) {
  await notify(email);
  await markNotified(client, email.id!);
}

// Briefing
const emails = await getRecentEmails(client, 24, 5);
const subs = await getSubscriptionSummary(client);
```

---

## Test Coverage

- [x] Client creation (env + custom)
- [x] Offline queue on insert failure
- [x] Offline queue on network timeout
- [x] Sync success clears queue
- [x] Sync failure keeps items
- [x] Empty queue handling
- [x] Subscription summary (monthly + yearly conversion)
- [x] Recent emails with time filter
- [x] Recent emails with min score filter
- [x] Error handling returns empty results
