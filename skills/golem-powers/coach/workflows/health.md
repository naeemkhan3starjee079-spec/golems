# Health & Schedule Workflow

## Before Anything Else

```
brain_search("coach schedule preferences rules")
brain_search("coach WHOOP recovery recent")
brain_search("coach health habits journal")
brain_search("coach journal recent entries")
```

Look for: scheduling constraints, recent health data, habit changes, workout preferences, meal timing rules, yesterday's journal entry, recent substance/recovery correlations.

---

## Journal Entry Collection

When the user reports daily data — whether a voice dump, text stream, or structured input — parse it into structured health data. This is the killer feature: zero-friction data capture from natural speech.

### Step 1: Parse the Stream

Extract these variables from the user's input. Missing values are OK — only track what the user mentions.

| Category | Track What | Example Format |
|----------|-----------|----------------|
| **Meals** | Count, timing, content | "1 meal at 2AM (soup + chicken)" |
| **Caffeine** | Doses, timing | "1 dose, ~11PM" |
| **Supplements** | Each supplement + timing | "Magnesium 11:30PM, Creatine 15g" |
| **Substances** | Type, frequency, end time | "Marijuana 1x, ended 1AM" |
| **Sleep hygiene** | Screen before bed, mouth tape, shower | "Hot shower 1:30AM, no mouth tape" |
| **Wellness** | Anxiety level, mood, sexual activity | "Extremely anxious all day" |
| **Goals** | Important goal progress | "Yes — client call went well" |
| **Snacking** | Count | "2x" |
| **Tobacco** | Count for the day | "3-4x" |
| **Alcohol** | Amount | "None" |

### Step 2: Write Obsidian Diary Entry

Path:
```
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal/Personal/Diary/YYYY-MM-DD.md
```

Use Obsidian callout blocks:

```markdown
> [!info] Health Snapshot
> Recovery: X% | Sleep: Xh Xm | Deep: Xh Xm | REM: Xh Xm
> Strain: X | HRV: X ms | RHR: X bpm

> [!success] Plan
> - Priority 1: ...
> - Priority 2: ...
> - Schedule highlights for today

> [!abstract]- Whoop Journal
> | Variable | Value |
> |----------|-------|
> | Meals | 1 meal at 2AM |
> | Caffeine | 1 dose ~11PM |
> | Supplements | Magnesium 11:30PM, Creatine 15g |
> | Marijuana | 1x, ended 1AM |
> | Tobacco | 3-4x |
> | Alcohol | None |
> | Snacking | 2x |
> | Screen before bed | No |
> | Mouth tape | No |
> | Shower | Hot, 1:30AM |
> | Anxiety | High (situational) |
> | Sexual activity | No |
> | Goal progress | Yes — call went well |

> [!note]- Coach Notes
> - observation -> reference -> recommendation (see Step 3)

> [!note]- Reflections
> *(Fill in the evening — how did the day go?)*
```

### Step 3: Generate Coach Notes

Coach notes follow the **observation -> reference -> recommendation** pattern. Not summaries — actionable insights with numbers.

1. Pull today's WHOOP numbers (recovery, sleep stages, HRV, RHR)
2. Pull yesterday's journal inputs from BrainLayer or Obsidian
3. Compare recovery % with each behavioral variable
4. Generate 3-5 specific observations with concrete numbers
5. Include at least one science/Huberman reference where applicable
6. End with one concrete recommendation for today

Example coach notes:
- "94% recovery after 1x weed vs 70% after 6x weed last week. Clear dose-response relationship."
- "Deep sleep 2h15m (up from 1h58m on 6x weed night). Substance reduction is directly measurable."
- "Meal at 2AM with 3:27AM sleep = 1.5h gap. Huberman recommends 3h minimum for gastric emptying. Too close."
- "Magnesium at 11:30PM — good (60-90min before sleep). Last week's 11AM dose was wasted."
- "One meal the entire day isn't sustainable. Two meals minimum tomorrow."
- "Anxiety was situational (call + uncertainty), not health-driven. Recovery proves the body was fine."

### Step 4: Store in BrainLayer

```
brain_store(
  content: "Coach journal YYYY-MM-DD: Recovery X%, sleep Xh, [substance summary], [meal summary], [supplement summary]. Coach notes: [top 2-3 insights with numbers].",
  tags: ["coach", "journal", "health", "whoop"],
  importance: 6
)
```

This enables cross-day pattern analysis. Future brain_search("coach journal recent") pulls these.

---

## Recovery-Behavior Correlation

After pulling WHOOP data + yesterday's journal, correlate behaviors with recovery outcomes. This is what makes coaching personalized — not generic advice, but data-driven observations using the user's own numbers.

### The Correlation Flow

1. **Pull today's WHOOP**: recovery %, deep sleep, REM, HRV, RHR
2. **Pull yesterday's journal**: `brain_search("coach journal YYYY-MM-DD")` or read Obsidian diary
3. **Compare each variable against recovery %**
4. **Search for multi-day patterns**: `brain_search("coach journal recovery correlation")` — look for trends across 7+ days
5. **Identify top 3 correlators**: Which variables had the biggest delta effect?

### What to Look For

| Variable | How to Analyze | Huberman Reference |
|----------|---------------|-------------------|
| **Weed dose** | Compare recovery % on high-dose vs low-dose vs zero days | THC suppresses REM sleep dose-dependently. Less weed = more REM = better learning consolidation |
| **Meal timing** | Gap between last meal and sleep onset — 3h minimum target | Gastric emptying takes 2-3h. Late meals disrupt deep sleep via thermoregulation |
| **Caffeine timing** | Last dose timing vs sleep quality (deep sleep specifically) | Caffeine half-life ~5h. Last dose 10h before bed eliminates most residual |
| **Magnesium timing** | 60-90min before sleep is ideal. Compare deep sleep on good vs bad timing | Mg threonate crosses BBB, promotes GABA activity |
| **Tobacco** | Count trend over days — track reduction progress | Nicotine is a stimulant — evening use delays sleep onset |
| **Sleep consistency** | Same bedtime ± 30min correlates with higher recovery | Circadian regularity index predicts health outcomes better than total sleep |
| **Shower type** | Cold vs hot shower before bed → impact on sleep onset | Hot shower → core temp drop → accelerates sleep onset. Cold = opposite |
| **Sunlight exposure** | Did user get morning sunlight? Correlate with that night's sleep quality | The #1 non-negotiable. Anchors entire circadian rhythm |
| **Phase shift progress** | Weekly bedtime/wake trend — are we moving toward 7am? | Track 7-day moving average. 15min/week is sustainable |

### Output Format

Present as specific A/B observations, not generic advice:
- "94% recovery after 1x weed vs 70% after 6x weed"
- "Deep sleep: 2h15m (up from 1h58m when you had 6x)"
- "Tobacco 3-4x vs 12x last week — massive reduction, keep it going"

Never say "try to sleep more" when you can say "you got 7h12m, which is 45min more than Tuesday — recovery jumped 12 points."

---

## Schedule Creation

### The Core Mission: Wake Earlier

CoachGolem exists to gradually shift Etan's sleep phase from ~10:30 wake → **7:00am target**. Every schedule should serve today's reality while nudging toward this goal.

**Phase shift protocol (Huberman):**
- Shift bedtime 15min earlier per successful week (consistency > aggression)
- Morning sunlight within 60min of waking — the single non-negotiable anchor
- Evening dim lights + no screens 1hr before target bedtime
- Track trend: `brain_search("coach sleep phase shift progress")`
- Celebrate wins: "Woke at 10:15 — 15min earlier than last week's average"

When the user is waking at 10:45, don't treat 10:45 as acceptable — treat it as "today's starting point" and build the schedule from there while noting: "Target bedtime tonight: [current - 15min] to keep the phase shift moving."

### Step 1: Gather Context

1. **Check WHOOP** — pull recovery score AND sleep timing (wake time, bed time)
2. **Check existing calendar** — use Google Calendar MCP for today's commitments
3. **Check BrainLayer** — recent preference changes, phase shift progress
4. **Check cannabis use** — another core goal: manage smarter using Huberman THC + REM research

### Step 2: Calculate Dynamic Anchors

Today's schedule uses actual wake time. But bedtime and wind-down push earlier.

```
Wake time     = WHOOP sleep.end (e.g., 10:43) — today's reality
Sunlight      = Wake + 0-60min (NON-NEGOTIABLE — even cloudy, 5-20min outside)
Caffeine      = Wake + 90-120min (cortisol delay — Huberman)
Workout       = Wake + 2h (adjusted for recovery %)
First meal    = Wake + 2.5h OR 13:00, whichever is LATER (intermittent fasting)
Wind-down     = Target sleep - 1h (screens off, lights dim)
Target sleep  = Previous bedtime - 15min (phase shift nudge)
Sleep         = Target sleep ± 15min (consistency matters more than exact time)
```

**Huberman daily anchors to always include:**

| Anchor | Timing | Why |
|--------|--------|-----|
| Morning sunlight | Within 60min of wake | Triggers cortisol pulse, sets circadian clock, times melatonin 14-16h later |
| Caffeine delay | Wake + 90-120min | Let natural cortisol peak clear first |
| NSDR (non-sleep deep rest) | Afternoon 10min | Reset focus, Huberman's top productivity tool |
| Afternoon sunlight | ~3PM, 10min | Second circadian anchor, helps evening melatonin |
| Last caffeine | 10h before target bedtime | Half-life means residual caffeine disrupts deep sleep |
| Last food | 3h before bed | Gastric emptying — eating close to bed wrecks sleep quality |
| Cold exposure | Morning preferred | Dopamine spike (2.5x baseline, lasts 3-5h) — avoid evening (raises core temp) |

### Step 3: Apply Scheduling Rules

Read the full rules: [references/scheduling-rules.md](../references/scheduling-rules.md)

Key rules:
- **Zero gaps** between events — every minute is accounted for
- **Sleep is an event** — block it on the calendar
- **Workout intensity** adapts to WHOOP recovery zone
- **No breakfast** — first meal ~13:00 (intermittent fasting)
- **Caffeine delay** — 90-120min after waking (Huberman protocol)
- **Wind-down routine** — 1hr before sleep, no screens

### Step 4: Color Code Events

| Priority | Color | Google Calendar Color |
|----------|-------|----------------------|
| 10 (critical) | Red | Basil |
| 7 (important) | Blue | Peacock |
| 5 (moderate) | Yellow | Banana |
| 3 (flexible) | Purple | Grape |

### Step 5: Create Events

Use Google Calendar MCP to create events. If MCP fails, write to:
```
~/.golems-zikaron/coach/schedule-YYYY-MM-DD.md
```

---

## WHOOP Integration

**Token source of truth:** Supabase `golem_state` table (not .env, not 1Password).

```
brain_search("WHOOP token refresh")
```

Fallback chain for WHOOP token:
1. Memory (current session)
2. Supabase `golem_state`
3. Environment variable
4. 1Password `WHOOP OAuth` (static backup only)

After each token refresh: persist new token back to Supabase.

### Token Recovery (When ALL Tokens Fail)

When you get a 400/401 error from WHOOP and all fallback sources fail:

1. Start auth server: `cd ~/Gits/golems && bun packages/shared/src/whoop/auth-server.ts`
2. Open browser: `open http://localhost:3333/auth`
3. Tell user: "WHOOP token expired. I've opened the auth page — click Authorize and let me know when done."
4. Wait for user confirmation
5. Re-fetch data immediately

Total interruption: ~30 seconds. **Never say "WHOOP is broken" or give up.** The auth flow is a 30-second fix, not a blocker.

If WHOOP data is unavailable AND auth recovery fails, say so explicitly. Don't guess recovery scores.

---

## Daily Check-in Pattern

When the user asks for a daily check-in or morning briefing:

1. `brain_search("coach yesterday summary")` — what happened yesterday?
2. `brain_search("coach journal recent")` — recent journal entries for pattern context
3. Pull WHOOP recovery, sleep, strain data
4. Read yesterday's Obsidian diary entry (if exists) for behavioral inputs
5. **Generate recovery-behavior correlation** (see Recovery-Behavior Correlation section above)
6. Check calendar for today's commitments
7. **Scan Gmail** for actionable emails:
   - Filter: after yesterday, exclude promotions/social/updates/forums
   - Classify: human emails vs automated (CodeRabbit, Qodo, GitHub Actions = noise)
   - Surface: interview invites, client emails, payment notifications, stale PR nudges
   - If actionable and <5min to resolve: just do it (comment on PR, reply to scheduling email)
8. Check BrainLayer for pending TODOs: `brain_search("coach todo pending")`
9. Generate today's dynamic schedule (based on actual wake time + recovery)
10. Synthesize into briefing: "Here's what I know about your day..."

### Autonomous Actions

When something takes <5 minutes and the user has given implicit permission through the check-in request, just do it:
- Comment on stale GitHub PRs
- Reply to simple scheduling emails
- Fix a WHOOP token (auth recovery flow)
- Create the diary entry in Obsidian

Ask forgiveness, not permission. Report what you did in the briefing.

---

## Habit Tracking

Habits are tracked through BrainLayer. When the user reports on a habit:

```
brain_store(
  content: "Coach habit: <habit> — <status> on <date>. <any notes>",
  tags: ["coach", "habit", "<habit-name>"],
  importance: 5
)
```

To check habit streaks: `brain_search("coach habit <name> recent")`

---

## Weekly Pattern Analysis

When doing a weekly review (or Sunday check-in):

1. `brain_search("coach journal")` for past 7 days of entries
2. Read 7 Obsidian diary entries from `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal/Personal/Diary/`
3. Calculate averages: recovery by substance pattern, meal timing vs recovery, supplement consistency
4. Generate weekly report with trends and A/B comparisons
5. Store key patterns in BrainLayer: `brain_store(content: "Coach weekly analysis: ...", tags: ["coach", "weekly", "health", "patterns"], importance: 7)`
6. Notify via Telegram if running as scheduled task
