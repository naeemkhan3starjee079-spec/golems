# CoachGolem Upgrade — Personal AI Life Coach

> Design Doc — Feb 15, 2026
> Status: Approved (brainstorming complete)

---

## Problem

CoachGolem is currently a mechanical status dashboard — it merges calendar events with golem statuses and formats them. It has:
- Zero owner persona or personal context
- Zero health/fitness data integration
- Zero coaching intelligence (no LLM layer)
- Zero Huberman or science-backed protocols
- Zero brain power / cognitive readiness tracking

## Solution

Upgrade CoachGolem into a full personal AI life coach that:
1. Reads live health data from **Whoop API** (recovery, sleep, HRV, strain)
2. Applies **Huberman Lab protocols** (evidence-based rules engine)
3. Knows the owner's **personal context** (injuries, career phase, sleep goals)
4. Uses **LLM coaching** to synthesize all data into natural, actionable advice
5. Sends **morning plans, midday nudges, and evening wrap-ups** via Telegram

## Architecture: Approach A — Whoop MCP + LLM Coach

### Data Flow

```
Whoop API ──→ whoop-client.ts ──→ MCP Server (optional access)
                    │
                    ↓
Calendar ──→ schedule-engine.ts ──→ coaching-engine.ts ──→ Telegram
                    ↑                     │
Protocol.json ──────┘                     │
Golem statuses ─────────────────→ status-aggregator.ts
                                          │
                                          ↓
                                    LLM (Gemini Flash)
                                          │
                                          ↓
                                  Personalized plan/nudge
```

---

## Component 1: Whoop Client + MCP Server

### Location: `packages/shared/src/whoop/`

```
packages/shared/src/whoop/
├── client.ts          # OAuth2 client, token refresh, API calls
├── types.ts           # WhoopRecovery, WhoopSleep, WhoopWorkout, WhoopCycle
├── token-store.ts     # Store/refresh tokens (1Password or Supabase)
├── mcp-server.ts      # MCP tools for Claude Code access
└── auth-server.ts     # One-time local OAuth2 callback server
```

### OAuth2 Flow
- `WHOOP_CLIENT_ID` + `WHOOP_CLIENT_SECRET` in 1Password (stored)
- One-time auth flow: local server at `http://localhost:3000/callback`
- Scopes: `read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement offline`
- Token refresh: hourly (Whoop requirement), refresh-on-demand pattern
- Base URL: `https://api.prod.whoop.com/developer/v1/`

### API Methods

| Method | Endpoint | Returns |
|--------|----------|---------|
| `getLatestRecovery()` | `GET /cycle?limit=1` → `GET /cycle/{id}/recovery` | Score, HRV, RHR, SpO2, skin temp |
| `getLatestSleep()` | `GET /activity/sleep?limit=1` | Duration, stages, performance %, consistency |
| `getTodayStrain()` | `GET /cycle?limit=1` | Strain score, avg/max HR, kilojoules |
| `getRecentWorkouts(n)` | `GET /activity/workout?limit=n` | Type, strain, HR zones, distance |
| `getBodyMeasurements()` | `GET /body_measurement` | Weight, max HR |

### MCP Tools

| Tool | Description |
|------|-------------|
| `whoop_recovery` | Current recovery score + HRV + RHR |
| `whoop_sleep` | Last night's sleep data |
| `whoop_strain` | Today's strain + workout summary |
| `whoop_trends` | 7-day rolling averages |

### Rate Limits
- 100 requests/minute, 10K/day
- Our usage: ~20 calls/day (morning + evening + on-demand)

---

## Component 2: Owner Protocol Engine

### Location: `packages/coach/src/protocol.ts`
### Storage: `~/.golems-zikaron/coach/protocol.json`

```typescript
interface CoachProtocol {
  sleep: {
    phase: "shift" | "maintaining" | "target";
    currentDay: number;
    targetBed: string;           // "02:30"
    targetWake: string;          // "10:30"
    hardCodingStop: string;      // "00:30"
    lastSmokeBuffer: number;     // minutes before bed (120)
    windDownDuration: number;    // minutes (120)
    baselines: {
      avgHRV: number | null;
      avgRHR: number | null;
      sleepNeed: number;         // hours (8)
      recoveryGreenThreshold: number;  // 67
      recoveryYellowThreshold: number; // 34
    };
  };
  body: {
    injuries: Array<{
      area: string;              // "left shoulder"
      type: string;              // "tear"
      avoidMovements: string[];
      painThreshold: number;     // 3/10
    }>;
    workoutTiming: "after-wake";
    workoutTypes: string[];      // ["easy-run", "zone2", "bodyweight", "walk"]
  };
  career: {
    phase: "active-search";
    interviewPrepRotation: Record<string, string>;
    dailyApplicationTarget: number;
    strategy: "quality-targeted";
  };
  schedule: {
    flowBlocks: number;          // 3
    flowBlockMinutes: number;    // 90 (Huberman ultradian)
    breakMinutes: number;        // 15
    shabbatAware: boolean;
  };
  huberman: {
    morningLight: { minMinutes: 5, cloudyMinutes: 20, withinMinutesOfWake: 60 };
    caffeineDelay: { minutesAfterWake: 120 };
    ultradianCycle: { focusMinutes: 90, breakMinutes: 15 };
    nsdr: { durationMinutes: 10, idealTime: "14:00" };
    afternoonLight: { minMinutes: 10, idealTime: "15:00" };
    preSleepNoFood: { hoursBeforeBed: 3 };
    preSleepNoScreens: { hoursBeforeBed: 2 };
    lastCaffeine: { hoursBeforeBed: 10 };
    roomTemp: { celsius: { min: 18, max: 20 } };
    supplements: {
      preSleep: Array<{ name: string; dose: string; minutesBeforeBed: number }>;
    };
  };
  coaching: {
    tone: "direct-casual";
    language: "english";
    neverNag: boolean;
  };
}
```

Initial protocol populated from user's Obsidian notes (Sleep earlier 2, daily-schedule-draft).

---

## Component 3: LLM Coaching Engine

### Location: `packages/coach/src/coaching-engine.ts`

### Input

```typescript
interface CoachingRequest {
  moment: "morning" | "midday" | "evening";
  whoop: {
    recovery: number;
    recoveryColor: "green" | "yellow" | "red";
    hrvTrend: "up" | "stable" | "down";
    sleepPerformance: number;
    sleepHours: number;
    strain: number;
  };
  weather: { cloudCover: number };  // for sunlight duration
  calendar: CalendarEvent[];
  pending: PendingWorkItem[];
  protocol: CoachProtocol;
  dayOfWeek: string;
}
```

### LLM
- Model: Gemini Flash-Lite (free, via `@golems/shared/lib/vercel-llm.ts`)
- Fallback: rule-based coaching (if/else on recovery thresholds)
- Max output: 150 words (Telegram-friendly)
- Cache: don't re-call if data hasn't changed

### Prompt Structure
System prompt = protocol context + Huberman rules
User prompt = live data (Whoop + calendar + pending items)
Output = structured coaching text

---

## Component 4: Enhanced Schedule Engine

### Location: `packages/coach/src/schedule-engine.ts` (upgrade existing)

Current: merges calendar + golem statuses → DailyPlan
New: adds Whoop data + Huberman rules + LLM coaching

### DailyPlan v2

```typescript
interface DailyPlan {
  date: string;
  greeting: string;
  // NEW
  healthSnapshot: {
    recovery: number;
    recoveryColor: "green" | "yellow" | "red";
    sleepHours: number;
    sleepPerformance: number;
    hrvTrend: "up" | "stable" | "down";
  };
  // NEW — LLM-generated
  coachingAdvice: string;
  // EXISTING (enhanced)
  blocks: TimeBlock[];
  pendingItems: string[];
  summary: string;
  // NEW
  workout: {
    type: string;
    duration: string;
    notes: string;  // e.g. "shoulder-safe, skip planks"
  };
  hubermanReminders: string[];  // ["Coffee OK after 12:30pm", "NSDR at 2pm"]
}
```

---

## Component 5: Nudge System

### Touchpoints (3 per day)

| Time | Trigger | Content |
|------|---------|---------|
| Morning (on wake) | Cron or webhook `recovery.updated` | Full daily plan with workout, schedule, coaching |
| Midday (~2-3pm) | Cron | NSDR reminder, afternoon sunlight, strain check |
| Evening (2h before target bed) | Cron | Wind-down reminder, supplement timing, tomorrow preview |

### Telegram Integration
- Morning: replaces current basic `/plan` with rich health-aware plan
- Midday: new nudge via `sendNotification()`
- Evening: enhances existing Bedtime Guardian

---

## Component 6: Weather (for Huberman sunlight rules)

### Source: OpenMeteo API (free, no API key)
- Endpoint: `https://api.open-meteo.com/v1/forecast?latitude=31.89&longitude=34.81&current=cloud_cover`
- Returns cloud cover % for Rehovot
- 0-25% = clear (5min sunlight), 25-75% = cloudy (15min), 75%+ = overcast (20-30min)

---

## Component 7: Huberman Knowledge Base (Phase 2 — Not MVP)

Index 20-30 key Huberman Lab transcripts into Zikaron (separate collection).
Enable `/why` command for science-backed explanations.
Topics: sleep, cannabis, nicotine, dopamine, focus, exercise, hormones, injury.

---

## MVP Scope (Tonight)

1. **Whoop OAuth2 auth flow** — get refresh token stored
2. **Whoop client** — `getLatestRecovery()`, `getLatestSleep()`
3. **Protocol.json** — populated from Obsidian notes
4. **Coaching engine** — LLM generates daily plan from Whoop + protocol
5. **Upgrade `/plan`** — shows health-aware plan via Telegram

### Not in MVP
- MCP server (add after core works)
- Webhooks (polling is fine)
- Weather API (hardcode "cloudy" for now)
- Huberman Knowledge Base (Phase 2)
- Midday/evening nudges (morning plan first)

---

## New MCP Servers Needed

| MCP | Purpose | Priority |
|-----|---------|----------|
| whoop | Health data access | MVP (client), Post-MVP (MCP) |

## New Skills Needed

| Skill | Purpose | Priority |
|-------|---------|----------|
| `/coach plan` | Generate daily plan | MVP |
| `/coach status` | Show recovery/sleep/strain | Post-MVP |
| `/whoop auth` | One-time OAuth2 flow | MVP |
| `/coach why` | Huberman explanations | Phase 2 |
| `/coach protocol` | View/edit protocol | Post-MVP |

## Credentials

- **Whoop Client ID:** stored in 1Password `development/WHOOP Developer API`
- **Whoop Client Secret:** stored in 1Password `development/WHOOP Developer API`
- **Whoop Refresh Token:** to be obtained via OAuth2 flow, then stored in 1Password

---

## Success Criteria

- [ ] Can run `/plan` in Telegram and get a health-aware daily plan
- [ ] Plan includes: recovery score, workout recommendation, flow block schedule, Huberman reminders
- [ ] Coaching advice is personalized (knows about shoulder, sleep phase, career)
- [ ] Plan adjusts based on recovery color (green = push, yellow = moderate, red = rest)
