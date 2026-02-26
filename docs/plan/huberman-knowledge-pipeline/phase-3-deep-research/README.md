# Phase 3: Deep Huberman Protocol Research

> [Back to main plan](../README.md)

## Goal

Research and document all Huberman Lab protocols relevant to the owner's sleep shift, using web research + indexed transcripts, producing a comprehensive reference document.

## Tools

- **Research:** Claude.ai (deep analysis) + Gemini (web search) — see prompts below
- **Data:** Zikaron MCP (search indexed transcripts from Phase 2)
- **Output:** `~/.golems-zikaron/coach/huberman-research.md`

## Claude.ai Research Prompt (Long Context)

Send to Claude.ai (Projects or long-context chat):

```
DEEP RESEARCH: Huberman Lab Protocols for Gradual Sleep Schedule Shift

I'm building a personal coaching system. I need you to research and document Andrew Huberman's specific, actionable protocols for each topic below. For each protocol, provide:
- The EXACT recommendation (numbers, timing, doses)
- The mechanism (WHY it works — brief, 1-2 sentences)
- Source episode (if you know it)
- Practical notes for real-world compliance

MY SITUATION:
- Current bed: 02:30 AM, current wake: 10:30 AM
- Goal: gradually shift earlier (maybe 15min every 3-5 days?)
- Smoke weed most evenings
- Left shoulder injury (no heavy pressing/overhead)
- Live in Israel (lots of sunlight, hot climate)

RESEARCH THESE 10 PROTOCOLS:

1. **Gradual Circadian Shift**
   - Exact protocol for shifting sleep schedule earlier
   - Minutes per shift, how often
   - What tools anchor each shift (light, temperature, meals)
   - How to avoid "relapse" back to late schedule
   - Weekend consistency rules

2. **Morning Light Exposure**
   - Exact minutes needed: clear sky vs overcast vs through window
   - Timing relative to wake (within X minutes)
   - Mechanism: melanopsin cells, SCN, cortisol pulse
   - Does it matter if it's VERY sunny (Israel summer)?
   - Can you "bank" morning light or does it have to be daily?

3. **Evening Light Management**
   - When to start dimming (hours before bed)
   - Blue light blockers: do they work? Which type?
   - Overhead lights vs low/side lights
   - Candles / red lights
   - Screen rules (f.lux, Night Shift — do they help enough?)

4. **Temperature Protocol**
   - Hot shower/bath timing relative to bed (thermoregulatory trick)
   - Mechanism: core temp drop triggers sleepiness
   - Room temperature range
   - What about hot climate (Israel, no AC in all rooms)?
   - Cold shower in morning for wake-up?

5. **Cannabis & Sleep**
   - Effect on REM sleep — how significant?
   - Minimum hours before bed to minimize REM suppression
   - CBD vs THC differences
   - Does tolerance change the REM effect?
   - Huberman's actual stance (he's not anti-weed, what does he recommend?)

6. **Caffeine Protocol**
   - Delay after waking: 90 minutes? 120 minutes? Why?
   - Cutoff hours before bed (adenosine half-life)
   - Does the 90-min delay actually have evidence?
   - Interaction with sleep quality the night before

7. **Exercise & Circadian Rhythm**
   - Morning exercise anchors circadian rhythm — how?
   - Best time window for exercise to support sleep shift
   - Evening exercise: does it delay sleep onset?
   - Type of exercise matters? (cardio vs strength vs walk)
   - Exercise when recovery is red/yellow (Whoop context)

8. **Supplements**
   - Magnesium L-Threonate: dose, timing, mechanism
   - Apigenin: dose, timing, mechanism
   - L-Theanine: dose, timing, who should NOT take it
   - Inositol: dose, timing, when to use
   - Glycine: dose, timing
   - Any others Huberman recommends for sleep
   - Which to START with vs which to add later

9. **NSDR (Non-Sleep Deep Rest)**
   - What is it exactly (yoga nidra, hypnosis)?
   - When to use: daytime energy dip? Can't fall asleep? Woke up middle of night?
   - Duration: 10 min? 20 min? 30 min?
   - Specific scripts/apps Huberman recommends
   - Does NSDR count as "rest" or does it replace sleep?

10. **Wind-Down Sequence**
    - Huberman's own nightly routine (as described in episodes)
    - Order of operations: screens off → dim lights → supplements → shower → bed
    - What to do in the gap between "screens off" and "actually sleepy"
    - Reading: paper book vs kindle vs phone?
    - Journaling / gratitude — does he recommend this?

FORMAT each protocol as:
## Protocol N: Name
**Do this:** [exact action]
**Timing:** [when, relative to bed/wake]
**Mechanism:** [1-2 sentence why]
**Source:** [episode name if known]
**Practical notes:** [real-world tips]

Write the full document. I'll save it as a reference for my coaching system.
```

## Gemini Research Prompt

Send to Gemini (for web-grounded search):

```
Search the web for Andrew Huberman's specific sleep and circadian rhythm protocols. I need CURRENT, SPECIFIC recommendations (not general advice). Focus on:

1. His "Sleep Toolkit" episodes — what are the exact protocols?
2. His stance on cannabis and sleep (REM suppression specifics)
3. NSDR — which specific YouTube videos/apps does he recommend?
4. Supplement stack for sleep: exact doses he recommends
5. His gradual sleep schedule shifting protocol (if he has one)
6. Temperature manipulation for sleep onset
7. The caffeine delay — is it 90 or 120 minutes? Latest evidence?

For each, give me the specific numbers/timing, not just "get morning light." I need "10 minutes within 30 minutes of waking on a clear day, 20-30 minutes on overcast days."

Also search for: "Huberman Lab sleep toolkit summary" and "Huberman Lab protocols compilation"
```

## Steps

1. Send Claude.ai prompt (long-form research)
2. Send Gemini prompt (web-grounded facts)
3. Search Zikaron for indexed transcript content (if Phase 2 is done)
4. Synthesize all findings into `~/.golems-zikaron/coach/huberman-research.md`
5. Cross-reference: do all 3 sources agree? Flag any conflicts.
6. Document final protocols in findings.md

## Depends On

- Phase 2 (ideally — but can start web research in parallel, then verify against transcripts later)

## Status

- [ ] Claude.ai deep research
- [ ] Gemini web research
- [ ] Zikaron transcript search
- [ ] Synthesize into huberman-research.md
- [ ] Cross-reference and resolve conflicts
