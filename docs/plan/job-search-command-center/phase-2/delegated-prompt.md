# Phase 2: Email Dashboard Improvements — Frontend

You are working on the etanheyman.com admin dashboard. Your goal is to improve the email triage experience with 5 changes.

## Context

- **Repo:** ~/Gits/etanheyman.com
- **Branch:** Create `feature/email-dashboard-v2` from `main`
- **Framework:** Next.js 15 App Router with Tailwind + shadcn/ui
- **Database:** Supabase (existing connection in `app/admin/golem/actions/data.ts`)

## Existing Code

- `app/admin/golem/emails/page.tsx` — email list-detail page with filters, bulk mode, sender modal
- `app/admin/golem/page.tsx` — overview page with category counts
- `app/admin/golem/actions/data.ts` — server actions for Supabase queries
- `app/admin/golem/layout.tsx` — nav layout (tabs)
- Tables: `emails`, `email_senders`, `golem_events`

## Changes Required

### 1. Category drill-down on overview page

On the overview page (`page.tsx`), email category counts are shown. Make them clickable links that navigate to `/admin/golem/emails?category=job` (etc). The emails page already supports `filterCategory` state — wire it to read the URL search param on mount.

### 2. Sender view expansion

When clicking a sender in the emails list, expand to show:
- Display name + email address
- Total emails received, avg score, category
- Unsubscribe URL availability (show "Has unsub link" badge)
- User action status (keep/unsubscribe/block)
- **Unsubscribe button** — calls existing `setSenderAction(address, 'unsubscribe')`
- Recent emails from this sender (last 10)

The `getSenderDetails()` function in data.ts already returns this data + recent emails. Wire it up.

### 3. Individual unsubscribe button on email cards

Add a small "Unsub" button on each email card/row. When clicked:
- Look up the sender from `from_address`
- Call `setSenderAction(from_address, 'unsubscribe')`
- Show success/fail toast
- Gray out the email row to indicate unsubscribed

### 4. Unsubscribe history section

Add a new tab or collapsible section on the emails page showing unsubscribe attempt history. Query `golem_events` table:

```sql
SELECT * FROM golem_events
WHERE type = 'email_unsubscribe_attempt'
ORDER BY timestamp DESC
LIMIT 50
```

Add this server action to `data.ts`:
```typescript
export async function getUnsubscribeHistory(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('golem_events')
    .select('*')
    .eq('type', 'email_unsubscribe_attempt')
    .order('timestamp', { ascending: false })
    .limit(limit);
  return data || [];
}
```

Display as a table: sender, method (http_post/http_get/mailto/none), success (green/red), gmail filter (badge), timestamp.

### 5. Gmail filter badge

On sender rows/cards, show a small shield icon if the sender has `user_action = 'unsubscribe'` or `user_action = 'block'`. This indicates Gmail is filtering them.

### 6. Remove Content page

Delete `app/admin/golem/content/` directory entirely. Remove "Content" from the nav items in `layout.tsx`.

## Rules

- Use existing shadcn/ui components (Button, Badge, Table, Tabs)
- Match the existing dark theme and design patterns
- Use server actions (existing pattern in data.ts) for new queries
- Don't break existing functionality (filters, bulk mode, corrections)
- Commit incrementally with descriptive messages
- Push the branch when done
- Run `npm run build` to verify before pushing

## Output

After completing all changes, write a summary of what you did to stdout.
