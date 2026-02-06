---
sidebar_position: 2
---

# RecruiterGolem

RecruiterGolem is the outreach and hiring domain expert. It maintains a contact database, personalizes outreach using anti-AI writing style, and provides interview practice modes.

## Pipeline Stages

```
E1: Contact Finder
   ↓ (LinkedIn profiles, past conversations)
E2: Outreach Database
   ↓ (SQLite/Supabase storage)
E3: Style Adapter
   ↓ (anti-AI, recipient tone matching)
E4: Auto-Outreach
   ↓ (Telegram + email delivery)
E5: Practice Mode
   ↓ (7 interview scenarios)
E6: CLI Commands
   ↓ (/outreach, /followup, /practice)
```

## Core Components

### E1: Contact Finder

Discovers contacts from:
- LinkedIn profiles (URL → parsed)
- Past email conversations (EmailGolem integration)
- Manual entry via CLI

```typescript
// contact-finder.ts
interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  linkedin_url?: string;
  role_title: string;
  last_contacted?: Date;
  outreach_status: 'new' | 'contacted' | 'interested' | 'rejected';
}
```

### E2: Outreach Database

Stores contacts and conversation history (SQLite local or Supabase cloud):

**Local (SQLite):**
- `packages/autonomous/data/outreach.db`
- Syncs to Supabase on startup (Phase 2+)

**Cloud (Supabase):**
- `outreach_contacts` table
- `outreach_messages` table (per contact)
- `company_research` table (cached research on companies)

### E3: Style Adapter

Generates anti-AI writing (no em dashes, natural tone, context-aware):

```typescript
// style-adapter.ts
interface StyleContext {
  recipient_name: string;
  company_name: string;
  recipient_role: string;
  tone: 'formal' | 'casual' | 'technical';
  language: 'en' | 'he';  // Hebrew + English support
}

// Generates personalized message matching recipient's LinkedIn style
const message = await adaptMessage(template, context);
```

**Anti-AI Rules:**
- No em dashes (`—`)
- Varied sentence length
- Genuine compliments based on company/work
- Typo-like natural phrasing (optional)

### E4: Auto-Outreach

Batches outreach with rate limiting:

```typescript
// auto-outreach.ts
const config = {
  max_per_day: 5,          // Max daily outreach
  delay_between: 2 * 60,   // 2 min between sends
  verify_email_before_send: true,
  channels: ['email', 'linkedin', 'telegram']
};
```

Outreach status tracked:
- `sending` → `sent` → `replied` or `no-reply` (30d timeout)

### E5: Practice Mode

7 interview simulation modes:

```typescript
const practiceMode = [
  'leetcode',        // Coding problem solving
  'system-design',   // Architecture questions
  'behavioral',      // STAR method questions
  'product-sense',   // Product thinking
  'startup-pitch',   // Pitch feedback
  'technical-depth', // Deep technical Q&A
  'culture-fit'      // Company values discussion
];
```

Each mode runs 5 questions with Haiku feedback on communication clarity, depth, and interviewer rapport.

### E6: CLI Commands

Telegram commands routed to RecruiterGolem:

- `/outreach` — Send personalized message to contact
- `/followup` — Follow up on previous outreach
- `/practice {mode}` — Start interview practice
- `/contacts` — List all contacts
- `/status` — Outreach stats

## Files

- `src/recruiter-golem/contact-finder.ts` — Contact discovery and parsing
- `src/recruiter-golem/outreach-db.ts` — SQLite adapter for local dev
- `src/recruiter-golem/outreach-db-cloud.ts` — Supabase adapter (Phase 2+)
- `src/recruiter-golem/style-adapter.ts` — Anti-AI message generation
- `src/recruiter-golem/auto-outreach.ts` — Batch sending with rate limits
- `src/recruiter-golem/practice-db.ts` — Interview practice sessions
- `src/recruiter-golem/index.ts` — Main golem orchestrator

## Database Schema

### SQLite (Local)

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  company TEXT,
  role_title TEXT,
  linkedin_url TEXT,
  outreach_status TEXT,
  created_at TIMESTAMP,
  last_contacted_at TIMESTAMP
);

CREATE TABLE outreach_messages (
  id TEXT PRIMARY KEY,
  contact_id TEXT,
  message_body TEXT,
  intent TEXT,  -- 'introduction', 'followup', etc
  sent_at TIMESTAMP,
  replied_at TIMESTAMP,
  reply_body TEXT
);

CREATE TABLE company_research (
  id TEXT PRIMARY KEY,
  company_name TEXT UNIQUE,
  research_notes TEXT,
  funding TEXT,
  headcount TEXT,
  cached_at TIMESTAMP
);

CREATE TABLE interview_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT,  -- 'leetcode', 'system-design', etc
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  score REAL,
  feedback TEXT
);
```

### Supabase (Cloud)

Same schema + RLS policies for data isolation per account.

## Environment Variables

```bash
# LinkedIn scraper (if using)
export LINKEDIN_EMAIL=$(op read op://development/LINKEDIN_ACCOUNT/username)
export LINKEDIN_PASSWORD=$(op read op://development/LINKEDIN_ACCOUNT/password)

# Outreach DB
export LLM_BACKEND=haiku  # For style adaptation
export STATE_BACKEND=supabase  # Phase 2+ uses cloud
export SUPABASE_URL=$(op read op://development/SUPABASE_URL/username)
export SUPABASE_ANON_KEY=$(op read op://development/SUPABASE_ANON_KEY/password)
```

## Running RecruiterGolem

```bash
cd packages/autonomous

# List all contacts
bun src/recruiter-golem/index.ts --list-contacts

# Add a new contact (interactive)
bun src/recruiter-golem/contact-finder.ts --interactive

# Test style adapter
bun src/recruiter-golem/style-adapter.ts \
  --name "John Doe" \
  --company "Google" \
  --role "Senior Engineer" \
  --template "Generic intro"

# Start interview practice
bun src/recruiter-golem/practice-db.ts --mode leetcode

# Send outreach (via Telegram /outreach command)
# or manually:
bun src/recruiter-golem/auto-outreach.ts --contact-id <id>
```

## Integration Points

- **EmailGolem** — Detects job offers and interview requests, routes to RecruiterGolem
- **ClaudeGolem** — Provides writing feedback on outreach messages
- **Telegram Bot** — Handles `/outreach`, `/practice` commands
- **Zikaron** — Semantic search for past conversations with contacts

## Example: Full Outreach Workflow

```bash
# 1. Add a contact from LinkedIn
bun src/recruiter-golem/contact-finder.ts --linkedin "https://linkedin.com/in/..."

# 2. View contact
bun src/recruiter-golem/index.ts --show-contact "john-doe-google"

# 3. Generate personalized message
bun src/recruiter-golem/style-adapter.ts \
  --contact-id "john-doe-google" \
  --template "intro"

# 4. Send via Telegram
# /outreach john-doe-google

# 5. Track response
bun src/recruiter-golem/index.ts --status

# 6. Practice interview for role
# /practice system-design
```

## Anti-AI Detection

RecruiterGolem avoids patterns that trigger spam filters and anti-AI detection:

✅ Do:
- Use recipient's own work/achievements as reference
- Ask genuine questions
- Vary sentence structure
- Include specific company knowledge
- Use contractions naturally

❌ Don't:
- Use em dashes (`—`)
- Overly formal opening
- Generic "great work" phrases
- Perfect punctuation in every sentence
- Keywords like "leverage", "synergize", "holistic"

See `docs.local/research/anti-ai-detection.md` for full analysis.

## Troubleshooting

**Outreach getting marked as spam:**
```bash
# Check style adapter output
bun src/recruiter-golem/style-adapter.ts --debug

# Review message for anti-AI patterns
```

**Interview practice not scoring:**
```bash
# Check Haiku feedback is running
bun src/recruiter-golem/practice-db.ts --debug
```

**Contacts not syncing to Supabase:**
```bash
# Phase 2+: run migration
bun scripts/migrate-to-supabase.ts --execute

# Check STATE_BACKEND env var
echo $STATE_BACKEND
```

See `/docs/deployment.md` for Supabase setup.
