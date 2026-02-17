---
sidebar_position: 4
---

# MCP Tools Reference

Complete reference of all MCP tools exposed by the Golems ecosystem. Use these in Claude Code via `.mcp.json` configuration.

## Setup

Add to `.mcp.json` in your Claude Code project:

```json
{
  "golems-email": {
    "command": "bun",
    "args": ["run", "packages/shared/src/email/mcp-server.ts"]
  },
  "golems-jobs": {
    "command": "bun",
    "args": ["run", "packages/jobs/src/mcp-server.ts"]
  },
  "golems-glm": {
    "command": "bun",
    "args": ["run", "packages/shared/src/glm/mcp-server.ts"]
  },
  "zikaron": {
    "command": "zikaron-mcp"
  }
}
```

Additional MCP servers (supabase, exa, sophtron) are configured globally in `~/.claude/.mcp.json`.

Then in Claude Code: `/tools` or use `@golems-email` in any prompt.

## All MCP Servers

| Server | Command | Tools | Purpose |
|--------|---------|-------|---------|
| **zikaron** | `zikaron-mcp` | 8 | Memory layer — search 260K+ indexed conversation chunks |
| **golems-email** | `bun run packages/shared/src/email/mcp-server.ts` | 9 | Email triage + TellerGolem financial tools |
| **golems-jobs** | `bun run packages/jobs/src/mcp-server.ts` | 5 | Job discovery, search, and stats |
| **golems-glm** | `bun run packages/shared/src/glm/mcp-server.ts` | 2 | Local GLM-4.7-Flash — summarize, score/classify |
| **supabase** | `@supabase/mcp-server-supabase` | 20+ | Database access, SQL, migrations, types |
| **exa** | `exa-mcp-server` | 3 | Web search, code context, company research |
| **sophtron** | `@sophtron/sophtron-mcp-server` | 6 | Bank accounts, transactions, identity |

---

## Email Tools (golems-email)

### email_getRecent

Get recent emails from the last N hours, filtered by minimum score.

**Parameters:**
- `hours` (number, default: 24) — How many hours back to look
- `minScore` (number, default: 0) — Minimum email score (5=notable, 7=important, 10=urgent)

**Returns:** Array of emails with subject, sender, score, category, received time

**Example:**
```
Get all urgent emails (score 10) from the last 24 hours
```

### email_search

Search emails by keyword in subject or sender.

**Parameters:**
- `query` (string, required) — Search term (subject or sender)
- `limit` (number, default: 20) — Max results to return

**Returns:** Matching emails with scores and context

**Example:**
```
Search for emails from "Microsoft" or about "interview"
```

### email_subscriptions

Get subscription summary: monthly spend, active services, changes.

**Parameters:** None

**Returns:**
- Total monthly spend (USD)
- List of active services
- New subscriptions this month
- Cancelled subscriptions

**Example:**
```
What's my current monthly subscription spend?
```

### email_urgent

Get urgent emails (score 10) that haven't been notified yet.

**Parameters:** None

**Returns:** List of unnotified urgent emails requiring immediate action

**Example:**
```
Are there any urgent emails I haven't seen yet?
```

### email_stats

Quick email statistics for the last 24 hours.

**Parameters:** None

**Returns:**
- Total email count
- Urgent count (score 10)
- Breakdown by category (job, interview, subscription, etc.)

### email_getByGolem

Get emails routed to a specific domain golem.

**Parameters:**
- `golem` (enum, required) — Target golem
  - `recruitergolem` — Job and interview emails
  - `tellergolem` — Subscription and payment emails
  - `claudegolem` — Tech updates and urgent items
  - `emailgolem` — General/newsletter emails
- `hours` (number, default: 24) — How many hours back

**Returns:** Emails routed to the specified golem with routing reason

### email_draftReply

Generate a reply draft to an email.

**Parameters:**
- `subject` (string, required) — Original email subject
- `from` (string, required) — Original sender email
- `snippet` (string) — Email preview/body
- `category` (string) — Email category (interview, job, subscription, etc.)
- `intent` (enum, required) — Reply intent
  - `accept` — Accepting offer/position
  - `decline` — Declining politely
  - `interested` — Expressing interest, ask for details
  - `followup` — Following up on previous conversation
  - `acknowledge` — Thanking them, acknowledging message
- `customNote` (string) — Optional custom text to prepend

**Returns:** Generated reply draft (template-based, not LLM-generated)

---

## Financial Tools (golems-email — via TellerGolem)

### teller_monthlyReport

Generate monthly spending report.

**Parameters:**
- `month` (string, default: current) — Month in YYYY-MM format

**Returns:**
- `month` — Requested month
- `totalSpend` — Total USD spent
- `byCategory` — Breakdown by IRS Schedule C category
  - advertising, insurance, office, software, education, travel, meals, professional-services, other
- `byVendor` — Breakdown by vendor/service
- `subscriptionCount` — Active services this month

**Example:**
```
What did I spend on software subscriptions in 2026-01?
```

### teller_taxSummary

Generate annual tax report for a year.

**Parameters:**
- `year` (number, default: current) — Tax year (e.g., 2026)

**Returns:**
- `year` — Requested year
- `totalDeductible` — Total IRS-deductible expenses
- `byCategory` — Each category with:
  - `total` — Total for category
  - `items` — Line items (vendor + amount)

**Example:**
```
Generate my 2025 tax report for Schedule C
```

---

## Job Tools (golems-jobs)

### jobs_getRecent

Get recently scraped jobs from the latest results file.

**Parameters:**
- `limit` (number, default: 20) — Max results to return

**Returns:** Latest jobs with company, title, and URL

### jobs_search

Search jobs by keyword (title, company, or description).

**Parameters:**
- `query` (string, required) — Search term

**Returns:** Matching scraped jobs without scores

### jobs_getHot

Get hot job matches (score 8+).

**Parameters:** None

**Returns:** Hot matches with company, title, score, reason, and URL

### jobs_watchlist

Get jobs from watchlist companies.

**Parameters:** None

**Returns:** Jobs from companies in the watchlist

### jobs_stats

Quick job statistics.

**Parameters:** None

**Returns:**
- Total jobs scraped
- Total jobs seen
- Total batches
- Hot/warm/cold counts

---

## Memory Tools (zikaron)

Zikaron provides persistent memory across Claude Code sessions — semantic search over 260K+ indexed conversation chunks using bge-large-en-v1.5 embeddings (1024 dims) and sqlite-vec.

### zikaron_search

Semantic + keyword hybrid search across all past Claude Code sessions.

**Parameters:**
- `query` (string, required) — Natural language search query
- `project` (string, optional) — Filter by project path (e.g., `-Users-etanheyman-Gits-golems`)
- `content_type` (enum, optional) — Filter by type: `ai_code`, `stack_trace`, `user_message`, `assistant_text`, `file_read`, `git_diff`
- `source` (enum, optional) — Filter by source: `claude_code`, `whatsapp`, `youtube`, `all`
- `tag` (string, optional) — Filter by enrichment tag (e.g., `bug-fix`, `authentication`)
- `intent` (enum, optional) — Filter by intent: `debugging`, `designing`, `configuring`, `discussing`, `deciding`, `implementing`, `reviewing`
- `importance_min` (number, optional) — Minimum importance score (1-10)
- `num_results` (number, default: 5) — Max results

**Returns:** Matching chunks with content, score, project, and timestamp

### zikaron_context

Get surrounding conversation context for a search result.

**Parameters:**
- `chunk_id` (string, required) — Chunk ID from a search result
- `before` (number, default: 3) — Chunks before target
- `after` (number, default: 3) — Chunks after target

**Returns:** The chunk plus surrounding conversation turns for full context

### zikaron_stats

Knowledge base statistics.

**Returns:** Total chunks, projects indexed, database size, content type breakdown

### zikaron_list_projects

List all indexed projects.

**Returns:** Project paths with chunk counts

### zikaron_file_timeline

Get the interaction timeline for a specific file across sessions.

**Parameters:**
- `file_path` (string, required) — File path or partial path (e.g., `telegram-bot.ts`)
- `project` (string, optional) — Filter by project
- `limit` (number, default: 50) — Max interactions

**Returns:** Chronological list of all sessions that read, edited, or wrote to the file

### zikaron_operations

Get logical operation groups for a session (read-edit-test cycles, research chains, debug sequences).

**Parameters:**
- `session_id` (string, required) — Session ID to query

**Returns:** Grouped operations with types and file lists

### zikaron_regression

Analyze a file for regressions — shows the last successful operation and all changes after it.

**Parameters:**
- `file_path` (string, required) — File path to analyze
- `project` (string, optional) — Filter by project

**Returns:** Last success point and subsequent changes

### zikaron_plan_links

Query plan-linked sessions — which plan/phase a session belongs to, or all sessions for a plan.

**Parameters:**
- `session_id` (string, optional) — Session ID to look up
- `plan_name` (string, optional) — Plan name to query
- `project` (string, optional) — Filter by project

**Returns:** Plan/phase associations for sessions

---

## Local LLM Tools (golems-glm)

GLM-4.7-Flash running locally via Ollama. Used for context reduction — summarize content before loading into Opus context.

### glm_summarize

Summarize text to key points using local GLM model.

**Parameters:**
- `text` (string, required) — Text to summarize
- `maxSentences` (number, default: 3) — Maximum sentences in summary

**Returns:** Condensed summary of the input text

### glm_score

Structured JSON classification/scoring using local GLM model.

**Parameters:**
- `text` (string, required) — Text to classify
- `prompt` (string, required) — Classification instructions
- `schema` (object, required) — JSON schema for output

**Returns:** Structured JSON matching the provided schema

---

## Database Tools (supabase)

Full Supabase database access via the official `@supabase/mcp-server-supabase` server. Provides read/write access to all Golems tables.

Key capabilities: table listing, SQL queries, migrations, edge functions, type generation. See [Supabase MCP docs](https://github.com/supabase-community/supabase-mcp) for the full tool list.

---

## Web Search Tools (exa)

Exa AI-powered web search via `exa-mcp-server`. Used by RecruiterGolem for company research and contact discovery.

Key capabilities: semantic web search, code context retrieval, company research.

---

## Banking Tools (sophtron)

Bank account and transaction access via `@sophtron/sophtron-mcp-server`. Used by TellerGolem for transaction categorization and tax preparation.

Key capabilities: account listing, transaction history, identity verification.

---

## Example Workflows

### Find Urgent Items to Handle Now

```
1. Get urgent emails: email_urgent
2. For each urgent email about an interview:
   - Draft reply with intent="interested"
3. Check if jobs matched: jobs_getHot
```

### Monthly Budget Review

```
1. Get subscription summary: email_subscriptions
2. Get monthly report: teller_monthlyReport
3. Check for payment failures: email_urgent
4. Identify cost-reduction opportunities
```

### Interview Preparation

```
1. Get recent interview emails: email_getRecent with minScore=8
2. Search related job postings: jobs_search with company name
3. Check if company is in watchlist: jobs_watchlist
4. Draft followup emails
```

### Tax Prep

```
1. Get annual tax report: teller_taxSummary for 2025
2. Review each category for accuracy
3. Identify missing categories
4. Export for accountant
```

---

## Integration Notes

- **Email tools** use Supabase directly (cloud-first architecture)
- **Job tools** query Supabase `golem_jobs` and `scrape_activity` tables
- **Zikaron tools** query local sqlite-vec database (~1.4GB, 260K+ chunks)
- **GLM tools** run locally via Ollama (no network, ~3-8s per call on M1 Pro)
- **Scoring:** Email scores 1-10 (10=urgent), Job scores 1-10 (8+=hot match)
- **Categories:** Email categories are semantic (job, interview, subscription, tech-update, newsletter, promo, social, other)

See individual golem documentation for deeper configuration and usage.
