# Research Prompts — Copy-Paste Ready

> Fire off prompts 1-3 now (all independent). Prompt 4 waits until phases 1-3 are done.

---

## PROMPT 1: Cursor IDE — Zikaron Indexer Audit (Phase 1)

**Where:** Cursor IDE with golems repo open
**Output folder:** `docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/`

```
AUDIT TASK: Zikaron Indexer Format Analysis

I need to build a YouTube transcript indexer for Zikaron (my Python RAG system using sqlite-vec + sentence-transformers). Analyze the existing indexing code and tell me exactly what format new chunks need to be in.

READ AND ANALYZE:

1. **Chunk schema** — read `packages/zikaron/src/zikaron/vector_store.py`
   - What fields does the `chunks` table have?
   - What's the full CREATE TABLE DDL?
   - What's the embedding dimension (should be 1024)?

2. **Indexer flow** — read `packages/zikaron/src/zikaron/cli/__init__.py`, find the `index-fast` command
   - Step-by-step: how does it go from JSONL files to indexed chunks?
   - How are embeddings generated?
   - What's the batch size?

3. **WhatsApp source** — read `packages/zikaron/src/zikaron/pipeline/extract_whatsapp.py`
   - This is the closest analog to what we need for YouTube
   - How does it chunk messages?
   - What metadata does it store per chunk?
   - How does it set the `source` field?

4. **Metadata format** — across all the above files
   - What metadata fields are stored per chunk?
   - What are the valid `source` values?
   - What other fields exist (project, content_type, etc.)?

5. **MCP search filter** — read `packages/zikaron/src/zikaron/mcp/__init__.py`
   - How does `source_filter` work in search?
   - Would adding source="youtube" just work, or does it need code changes?

6. **upsert_chunks()** — read the full method in `vector_store.py`
   - What's the expected input format (List[Dict] + List[List[float]])?
   - What dict keys are required?

DROP YOUR FINDINGS INTO: docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/

Create these files:
- chunk-schema.md — full table DDL + field descriptions
- indexer-flow.md — step-by-step flow of index_fast()
- whatsapp-analog.md — WhatsApp indexer analysis (our template for YouTube)
- metadata-format.md — all metadata fields with examples
- recommendations.md — how to structure YouTube transcript chunks to fit this schema, with sample Python code showing the dict format we need to produce
```

---

## PROMPT 2: Claude.ai OR Gemini — YouTube Transcript Extraction Research (Phase 1)

**Where:** Claude.ai (Projects) or Gemini
**What to do with results:** Save to `docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/transcript-research.md` (or just paste back to me)

```
RESEARCH: Best approach to bulk-index YouTube video transcripts into a Python sqlite-vec RAG system

CONTEXT:
- I have a Python RAG system (Zikaron) using sqlite-vec + sentence-transformers (bge-large-en-v1.5, 1024 dims)
- It currently indexes Claude Code JSONL conversations and WhatsApp messages
- I want to add YouTube video transcripts as a new source
- Primary use case: indexing Huberman Lab podcast episodes (1-3 hour episodes, science-heavy)
- I already have youtube-transcript-api installed in another project (SongScript)

COMPARE THESE APPROACHES:

1. **youtube-transcript-api** (Python library)
   - Pros/cons for long-form podcasts
   - Quality of auto-captions vs manual captions
   - How to detect if manual captions are available
   - Rate limiting concerns for 8-10 videos
   - Does it return timestamps per segment?

2. **yt-dlp --write-auto-sub**
   - Format options (vtt, srt, json3)
   - Quality differences from youtube-transcript-api
   - Any advantages for bulk downloads?
   - Does it get manual captions if available?

3. **YouTube Data API v3 captions endpoint**
   - OAuth requirements
   - Quota limits (daily quota for bulk)
   - Is it overkill for 8-10 videos?

4. **Just copy-paste from YouTube UI**
   - YouTube shows full transcript in the video page
   - For 8-10 videos, is manual copy-paste actually faster?
   - Loses timestamps?

CHUNKING STRATEGY FOR LONG PODCASTS:

Huberman episodes are 1-3 hours with topic transitions. How should I chunk?

- **Time-based** (every 5 min) — simple but splits mid-topic
- **Paragraph/segment-based** (YouTube's natural segments) — preserves flow
- **Sliding window** (500 words, 50 word overlap) — standard RAG approach
- **Topic-based** (detect topic changes) — best quality but complex
- **Chapter-based** (if YouTube chapters exist) — natural boundaries

What chunk size works best for bge-large-en-v1.5? (token limits, retrieval quality)

METADATA TO STORE:
What metadata should each chunk have for useful retrieval?
- Episode title, channel, video ID, upload date
- Timestamp range (start_seconds, end_seconds)
- Chapter title (if available)
- Anything else?

GIVE ME:
1. Your recommended approach (extraction method + chunking strategy)
2. Sample Python code for extracting + chunking a single video
3. Expected output format (what each chunk dict should look like)
4. Any gotchas for Huberman episodes specifically
```

---

## PROMPT 3: Claude.ai — Deep Huberman Protocol Research (Phase 3)

**Where:** Claude.ai (long context / Projects preferred)
**What to do with results:** Save to `~/.golems-zikaron/coach/huberman-research.md`

```
DEEP RESEARCH: Huberman Lab Protocols for Gradual Sleep Schedule Shift

I'm building a personal coaching system that generates daily reminders and advice based on Huberman Lab protocols. I need you to research and document Andrew Huberman's specific, actionable protocols for each topic below.

For each protocol, provide:
- The EXACT recommendation (numbers, timing, doses — not vague "get some sunlight")
- The mechanism (WHY it works — brief, 1-2 sentences)
- Source episode name (if you know it)
- Practical compliance notes for real-world use

MY SITUATION:
- Current sleep: bed 02:30 AM, wake 10:30 AM
- Goal: gradually shift earlier (maybe 15min every 3-5 days?)
- Smoke weed most evenings
- Left shoulder injury (no heavy pressing/overhead)
- Live in Israel (abundant sunlight, hot summers)
- Have a dog (morning walks are easy to do)

---

### PROTOCOL 1: Gradual Circadian Shift
- Exact protocol for shifting sleep schedule earlier
- How many minutes per shift step?
- How many days at each step before shifting again?
- What tools anchor each shift? (light, temperature, meals, exercise)
- How to avoid "relapse" back to late schedule on weekends
- What if you miss a day — reset or continue?

### PROTOCOL 2: Morning Light Exposure
- Exact minutes: clear sky vs overcast vs through window
- Timing relative to wake (within X minutes)
- Mechanism: melanopsin cells → SCN → cortisol pulse
- Very sunny climate (Israel) — still need the full duration?
- Through sunglasses? Through a window? Direct only?
- Can you "bank" morning light or must it be daily?

### PROTOCOL 3: Evening Light Management
- When to start dimming (hours before bed)
- Blue light blockers: do they work? Which wavelengths matter?
- Overhead lights vs low/side lights — why does height matter?
- Candles / red lights / salt lamps
- Screens: do f.lux / Night Shift actually help enough?
- The "campfire rule" — what is it?

### PROTOCOL 4: Temperature Protocol
- Hot shower/bath: how long, how hot, how many minutes before bed?
- Mechanism: core body temp drops after warming → triggers sleepiness
- Room temperature: exact Celsius/Fahrenheit range
- Cold shower in morning: wake-up benefit? Circadian anchor?
- Hot climate considerations (no AC in all rooms)

### PROTOCOL 5: Cannabis & Sleep
- Effect on REM sleep — quantified if possible (% reduction?)
- Minimum hours before bed to minimize REM suppression
- CBD vs THC: different effects on sleep architecture?
- Does tolerance reduce the REM suppression effect?
- Huberman's actual stated position (he's nuanced, not anti-weed)
- What does he recommend for people who do smoke?

### PROTOCOL 6: Caffeine Protocol
- Delay after waking: 90 minutes? 120 minutes? What did he settle on?
- Why delay? (adenosine, cortisol pulse interaction)
- Latest caffeine cutoff: hours before bed based on half-life
- Does afternoon coffee affect sleep even if you "feel fine"?
- The "caffeine nap" — does he recommend it?

### PROTOCOL 7: Exercise & Circadian Rhythm
- Morning exercise anchors circadian rhythm — mechanism?
- Best time window for exercise relative to wake
- Evening exercise: does it delay sleep onset? How late is too late?
- Type matters? (intense cardio vs strength vs walking)
- Minimum effective dose for circadian benefit (10 min walk counts?)
- Exercise when under-recovered — what to modify

### PROTOCOL 8: Supplements for Sleep
For EACH supplement, give: exact dose, timing (minutes before bed), mechanism, who should NOT take it

- **Magnesium L-Threonate (Threonate)** — his #1 recommendation?
- **Magnesium Bisglycinate** — alternative to threonate?
- **Apigenin** — dose, mechanism (GABAergic?)
- **L-Theanine** — dose, who should AVOID (vivid dreamers?)
- **Inositol** — dose, when specifically to use
- **Glycine** — dose, mechanism
- **GABA** — does he recommend it?
- **Melatonin** — his stance (spoiler: he's cautious)
- Which to START with vs add later (stacking order)

### PROTOCOL 9: NSDR (Non-Sleep Deep Rest)
- What is it exactly? (yoga nidra vs self-hypnosis vs body scan)
- When to use: afternoon dip? Can't fall asleep? Middle-of-night wake?
- Duration recommendations: 10, 20, or 30 minutes?
- Specific scripts/apps/videos he recommends by name
- Does NSDR "replace" lost sleep or just help recovery?
- Mechanism: how does it restore dopamine/focus?

### PROTOCOL 10: Wind-Down Sequence
- Huberman's own described nightly routine (from episodes)
- Ordered sequence: when to do what
- Gap between "screens off" and sleep — what to do
- Reading: paper vs e-ink vs phone? Blue light from kindle?
- Journaling: does he recommend it? What kind?
- The "worry list" — write tomorrow's concerns before bed

---

FORMAT each protocol as:

## Protocol N: [Name]
**The Rule:** [one-line summary of the exact action]
**Timing:** [when, relative to bed or wake time]
**Duration/Dose:** [specific numbers]
**Mechanism:** [1-2 sentence why it works]
**Source:** [episode name if known]
**Compliance Tips:** [real-world practical notes]
**Exceptions:** [when to skip or modify]

End with a section called "SUGGESTED WIND-DOWN TIMELINE" that puts it all together as a sample evening timeline for someone going to bed at 02:30 AM (my current target), showing when each action happens.
```

---

---

## PROMPT 5: Cursor IDE — SongScript YouTube Transcript Reference Code

**Where:** Cursor IDE
**Open at:** `~/Gits/songscript`
**Output folder:** `~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/`

```
AUDIT TASK: YouTube Transcript Extraction — Existing Code Analysis

This project (SongScript) already uses youtube-transcript-api to download YouTube transcripts. I need to reuse this pattern in another project (Zikaron) for indexing podcast episodes.

FIND AND ANALYZE:
1. Where is youtube-transcript-api used? Search for imports and usage
2. How are transcripts fetched? (API call pattern, error handling)
3. What format does the API return? (timestamps, text segments, metadata)
4. Are there any chunking/splitting steps after fetching?
5. How are captions selected? (auto vs manual, language preference)
6. Any rate limiting or retry logic?
7. What Python version / venv setup is used?

Also check:
- requirements.txt or pyproject.toml for the exact youtube-transcript-api version
- Any yt-dlp usage as well?
- Pipeline.py — how does the full flow work?

DROP FINDINGS INTO (ABSOLUTE PATH): ~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/songscript-reference.md

Include:
- Exact code snippets showing how transcripts are fetched
- The return format (sample data structure)
- Which version of youtube-transcript-api is installed
- Any gotchas or workarounds found in the code
```

---

## PROMPT 6: Cursor IDE — Zikaron Enrichment Pipeline Compatibility

**Where:** Cursor IDE
**Open at:** `~/Gits/golems/packages/zikaron`
**Output folder:** `~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/`

```
AUDIT TASK: Will YouTube chunks get enriched properly?

Zikaron has an enrichment pipeline that runs GLM-4.7-Flash on chunks to generate summaries, tags, importance scores, and intent classification. I'm about to add a new source type (source="youtube") for podcast transcript chunks.

ANALYZE:
1. Read src/zikaron/pipeline/enrich.py (or wherever enrichment lives)
   - Does it filter by source? Or does it process ALL unenriched chunks?
   - What fields does enrichment add to each chunk?
   - Is there any source-specific logic (different prompts for whatsapp vs claude_code)?

2. Read the enrichment prompt template
   - Would it work well on podcast transcript chunks? (these are spoken word, not code)
   - Would the importance scoring make sense for educational content?
   - Would intent classification (debugging, implementing, etc.) work? Or are those code-specific?

3. Check the MCP search — read src/zikaron/mcp/__init__.py
   - The source_filter parameter — is "youtube" already a valid option or hardcoded to specific values?
   - What's the exact change needed to support source="youtube"?

4. Check the dashboard/stats
   - Does the Zikaron dashboard show per-source stats?
   - Would YouTube chunks show up correctly?

DROP FINDINGS INTO (ABSOLUTE PATH): ~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-1-youtube-pipeline/cursor-audit/enrichment-compatibility.md

Flag:
- Any BLOCKERS (things that would break with youtube source)
- Any ADAPTATIONS needed (enrichment prompt tweaks for spoken content)
- Any FREEBIES (things that just work with no changes)
```

---

## PROMPT 7: Cursor IDE — Coach Engine Integration Audit (Phase 4)

**Where:** Cursor IDE
**Open at:** `~/Gits/golems/packages/coach`
**Output folder:** `~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-4-protocol-upgrade/cursor-audit/`

```
AUDIT TASK: Coach Protocol Integration Points

I'm expanding the Huberman protocol section of the Coach golem. Analyze every file in this package and map where protocol data flows.

READ ALL OF:
- src/protocol.ts — CoachProtocol interface + DEFAULT_PROTOCOL
- src/coaching-engine.ts — computeHubermanReminders() + buildCoachingPrompt() + pickWorkout()
- src/schedule-engine.ts — how protocols feed into the daily schedule
- src/nudger.ts — when/how Telegram nudges are sent
- src/tracker.ts — compliance tracking
- src/index.ts — entry points
- src/composer.ts — Telegram command handlers
- src/__tests__/*.test.ts — all test files

MAP THESE:

1. **Data flow**: protocol.json → loadProtocol() → where does it go? Draw the full chain.
2. **computeHubermanReminders()**: What reminders exist? What's the output format? Who consumes them?
3. **buildCoachingPrompt()**: Does the LLM get ALL protocol data or just some? What's missing?
4. **Nudger**: Can it send time-specific reminders (e.g., "dim lights now")? Or only morning/evening?
5. **Tracker**: Does compliance tracking exist for Huberman items? Could it track "did you take supplements?"
6. **Tests**: What's covered? What protocol paths have ZERO test coverage?

NEW FIELDS I'M ADDING — where should each be consumed?
- temperature.hotShowerMinutesBeforeBed → reminder + wind-down sequence
- cannabis.minHoursBeforeBed → reminder ("last smoke by HH:MM")
- nsdrTriggers → conditional NSDR suggestion based on recovery color
- windDown.sequence → ordered evening steps with timestamps
- sleepShift.shiftMinutesPerStep → progress tracking + adjusted targets
- eveningLight.dimStartHoursBeforeBed → reminder
- exerciseTiming.idealWindowStart → workout window in schedule

DROP FINDINGS INTO (ABSOLUTE PATH): ~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-4-protocol-upgrade/cursor-audit/

Create:
- protocol-data-flow.md — full flow diagram from JSON to Telegram output
- integration-map.md — where each new field should be wired in
- test-gaps.md — what's tested, what's not, suggested new tests
- recommendations.md — implementation approach
```

---

## Summary

| # | Prompt | Send To | Open At | Priority | Output Location |
|---|--------|---------|---------|----------|-----------------|
| 1 | Zikaron indexer format | Cursor | `~/Gits/golems` | NOW | `phase-1-youtube-pipeline/cursor-audit/` |
| 2 | YouTube transcript research | Claude.ai / Gemini | — | NOW | paste back or `transcript-research.md` |
| 3 | Deep Huberman protocols | Claude.ai (long ctx) | — | NOW | `~/.golems-zikaron/coach/huberman-research.md` |
| ~~4~~ | ~~Coach engine audit~~ | — | — | DELETED (replaced by #7) | — |
| 5 | SongScript transcript code | Cursor | `~/Gits/songscript` | NOW | `phase-1-youtube-pipeline/cursor-audit/songscript-reference.md` |
| 6 | Enrichment compatibility | Cursor | `~/Gits/golems/packages/zikaron` | NOW | `phase-1-youtube-pipeline/cursor-audit/enrichment-compatibility.md` |
| 7 | Coach engine integration | Cursor | `~/Gits/golems/packages/coach` | NOW | `phase-4-protocol-upgrade/cursor-audit/` |
| 8 | Whoop API deep research | Claude.ai (Deep Research) | — | NOW | `~/.golems-zikaron/coach/whoop-research.md` |
| 9 | Whoop developer docs + community | Gemini | — | NOW | paste back or `whoop-api-research.md` |
| 10 | Whoop × Coach integration points | Cursor | `~/Gits/golems/packages/coach` | NOW | `phase-4-protocol-upgrade/cursor-audit/whoop-integration.md` |

---

## PROMPT 8: Claude.ai (Deep Research) — Whoop API + Data Model

**Where:** Claude.ai — use Deep Research mode if available, otherwise Projects
**What to do with results:** Save to `~/.golems-zikaron/coach/whoop-research.md`

```
DEEP RESEARCH: Whoop API, Data Model, and Integration for Health Optimization

I'm building a personal coaching system (TypeScript/Bun monorepo) that combines Huberman Lab protocols with real biometric data. I want to integrate Whoop as the primary data source.

RESEARCH THE FOLLOWING:

### 1. Whoop API Access (2025-2026)
- Does Whoop have an official public API? If so, what's the base URL?
- How to get API access: developer portal, OAuth app registration, waitlist?
- Authentication flow: OAuth 2.0? API keys? JWT?
- Rate limits and quotas
- If NO official API: what are the best unofficial/reverse-engineered options?
  - Community Python/JS libraries (whoop-python, etc.)
  - Unofficial API endpoints people have documented
  - Web scraping the Whoop app/dashboard
  - Apple Health / Google Fit export as alternative data source
  - Whoop CSV export frequency and format

### 2. Complete Data Model — What Whoop Tracks
For EACH data type, give: field names, data types, update frequency, and sample values

**Recovery:**
- Recovery score (0-100%) — how is it calculated?
- HRV (ms) — resting? During sleep? Which measurement?
- RHR (bpm) — resting heart rate
- Respiratory rate (breaths/min)
- SpO2 (blood oxygen %)
- Skin temperature deviation
- Recovery score color thresholds: red / yellow / green exact boundaries

**Sleep:**
- Total sleep duration vs time in bed
- Sleep stages: light, deep (SWS), REM, awake — duration of each
- Sleep efficiency %
- Sleep latency (time to fall asleep)
- Disturbances count
- Sleep need (personalized baseline)
- Sleep debt (accumulated)
- Sleep consistency score
- Bed time and wake time

**Strain:**
- Day strain (0-21 scale) — how calculated?
- Activity strain per workout
- Calories burned
- Heart rate zones: time in each zone
- Max HR during activity
- Cardiovascular load

**Journal (Behaviors):**
- What behaviors can users log? (caffeine, alcohol, supplements, etc.)
- Full list of default journal prompts
- Custom journal entries
- Are journal entries accessible via API?
- Can you programmatically create journal entries?

**Cycles:**
- What is a Whoop "cycle"?
- How do daily cycles relate to sleep/recovery/strain?
- Historical cycle data retention

### 3. Huberman Protocol × Whoop Data Mapping
For each Huberman protocol, which Whoop metric validates it or triggers it:

| Huberman Protocol | Whoop Data Source | How to Use |
|---|---|---|
| Morning sunlight timing | Sleep → wake_time | Trigger: "Get outside within 60min of {wake_time}" |
| Caffeine delay 90min | Sleep → wake_time | Trigger: "Coffee OK after {wake_time + 90min}" |
| Cold exposure (recovery-gated) | Recovery → score + color | Only suggest if recovery >= 67% (green) |
| Exercise timing | Strain → activity data | Detect if workout happened, optimal window |
| NSDR suggestion | Recovery → score, Sleep → debt | Suggest if recovery < 67% or sleep debt > 1hr |
| Temperature protocol | Recovery → skin_temp_deviation | Track if hot shower correlates with better sleep |
| Supplement effectiveness | Journal → supplements + next day recovery | Correlate supplement use with recovery delta |
| Sleep shift tracking | Sleep → bed_time, consistency | Track if gradually shifting earlier, alert on regression |
| Wind-down compliance | Sleep → latency + efficiency | If latency improving → wind-down is working |
| Cannabis impact | Journal → cannabis + Sleep → REM | Track REM % on smoke vs no-smoke nights |
| Exercise recovery | Recovery → score + Strain → day_strain | Modify workout intensity based on recovery |
| Workout suggestions | Recovery color + Sleep → debt | Green=intense, Yellow=moderate, Red=rest/NSDR |

### 4. Integration Architecture
Given a TypeScript/Bun monorepo with Supabase backend:

- **Polling vs Webhooks** — does Whoop push data or do I poll? How often?
- **Data freshness** — when does recovery score finalize? Real-time or next morning?
- **Storage strategy** — what to cache locally vs query on demand
- **Token refresh** — OAuth token lifecycle, automatic refresh
- **Multi-device** — does the API need the Whoop band to be worn/synced?

### 5. Apple Health as Fallback
If Whoop API is locked down:
- Can I read Whoop data from Apple Health instead?
- Which Whoop metrics sync to Apple Health?
- How to access Apple Health data from a Node.js/TypeScript backend?
- Any Apple Health → Supabase sync tools?

FORMAT each section with actionable details. I need enough to write TypeScript integration code, not just high-level concepts. Include exact endpoint paths, response shapes, and field names where possible.
```

---

## PROMPT 9: Gemini — Whoop Developer Ecosystem + Community Integrations

**Where:** Gemini (web or API)
**What to do with results:** Paste back to me or save to `docs/plan/huberman-knowledge-pipeline/whoop-api-research.md`

```
RESEARCH: Whoop Developer Ecosystem in 2025-2026

I want to integrate Whoop biometric data into my personal health coaching app. I need to understand the current state of Whoop's developer ecosystem.

FIND:

1. **Official Whoop API (developer.whoop.com)**
   - Current status: is it public, beta, waitlisted?
   - API documentation links
   - Supported endpoints (recovery, sleep, strain, cycles, journal)
   - OAuth 2.0 setup flow
   - Has it changed between 2024-2026? Any deprecations?
   - Rate limits per endpoint
   - Response format examples (actual JSON shapes if you can find them)

2. **Community Libraries**
   - Python: whoop-python, WhoopPy, any others?
   - JavaScript/TypeScript: any npm packages?
   - Which is most maintained and reliable in 2026?
   - GitHub stars, last commit date, open issues
   - Do any of them handle OAuth token refresh automatically?

3. **Notable Whoop Integrations**
   - What apps/services have successfully integrated with Whoop?
   - Strava, Apple Health, Google Fit — what data flows each way?
   - Any Huberman-specific or health-coaching apps that use Whoop?
   - Home Assistant + Whoop — anyone done it?
   - n8n or Zapier Whoop integrations?

4. **Reverse Engineering / Unofficial Approaches**
   - If official API is limited, what have people done?
   - Web dashboard scraping approaches
   - Mobile app API interception
   - Whoop CSV export: format, frequency, what's included
   - Apple HealthKit as proxy — what Whoop data syncs?

5. **Gotchas and Limitations**
   - Which data is NOT available via API (even official)?
   - Journal entries — accessible?
   - Sleep stages granularity — per-stage duration or just totals?
   - Historical data — how far back can you query?
   - Whoop 4.0 vs 5.0 — any API differences?

Give me links to actual docs, GitHub repos, and community posts where possible. I need to evaluate feasibility before writing code.
```

---

## PROMPT 10: Cursor IDE — Coach Package Whoop Integration Points

**Where:** Cursor IDE
**Open at:** `~/Gits/golems/packages/coach`
**Output folder:** `~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-4-protocol-upgrade/cursor-audit/`

```
AUDIT TASK: Whoop Integration Points in Coach Package

I'm planning to add Whoop biometric data to the Coach golem. Audit the existing code and map where Whoop data should plug in.

READ ALL OF:
- src/protocol.ts — Look for ANY existing biometric/health fields (HRV, recovery, sleep baselines)
- src/coaching-engine.ts — How are Huberman reminders generated? Are any conditional on data?
- src/schedule-engine.ts — Daily schedule generation — can it adapt to recovery state?
- src/nudger.ts — Notification sending — can it be triggered by data events?
- src/tracker.ts — What does compliance tracking look like?
- src/composer.ts — Telegram command handlers — any health/status commands?

SPECIFICALLY MAP:

1. **Existing biometric fields**
   - Does protocol.ts already have avgHRV, avgRHR, recoveryGreenThreshold fields?
   - Are they being used ANYWHERE or just defined?
   - Where does the data come from now? (manual? placeholder?)

2. **Where Whoop data should flow**
   For each piece of Whoop data, where should it be consumed?

   | Whoop Data | Should Go To | Current State |
   |---|---|---|
   | Recovery score (0-100) | coaching-engine: gate workout intensity | exists? |
   | Recovery color (red/yellow/green) | coaching-engine: gate cold exposure suggestion | exists? |
   | HRV | protocol.ts: avgHRV | defined but unused? |
   | Sleep debt | coaching-engine: trigger NSDR suggestion | exists? |
   | Wake time | coaching-engine: anchor caffeine/sunlight timers | manual now? |
   | Strain | coaching-engine: modify evening workout suggestion | exists? |
   | Sleep stages (REM %) | tracker: correlate with cannabis/supplements | exists? |
   | Sleep consistency | tracker: sleep shift progress | exists? |

3. **Integration patterns**
   - Is there a "data source" abstraction? Or is everything hardcoded from protocol.json?
   - Could we add a WhoopDataSource that periodically refreshes from API?
   - Where should OAuth tokens be stored? (Supabase? local?)
   - How would real-time data change the coaching engine? (currently generates reminders at fixed times?)

4. **Test coverage**
   - Are there tests for recovery-gated workout suggestions?
   - What would break if we add Whoop-conditional logic?

DROP FINDINGS INTO (ABSOLUTE PATH): ~/Gits/golems/docs/plan/huberman-knowledge-pipeline/phase-4-protocol-upgrade/cursor-audit/whoop-integration.md

Include:
- Exact file:line references for every integration point
- Current state: "exists but unused" vs "doesn't exist yet"
- Recommended implementation approach (incremental — don't rewrite everything)
```
