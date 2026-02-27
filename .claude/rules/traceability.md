# Knowledge Traceability Convention

> Every brain_store call must be traceable: who stored it, when, why, and what inspired it.

## Required Fields

Every `brain_store` call MUST include:

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `content` | YES | Include date in text | `"[2026-02-26] Built entity migration..."` |
| `tags` | YES | Must include `agent:<name>` | `["brainlayer", "agent:brainClaude"]` |
| `project` | YES | Package/repo name | `"brainlayer"`, `"golems"`, `"voicelayer"` |
| `importance` | YES | 1-10 scale | `7` |

## Recommended Fields

| Field | When | Format | Example |
|-------|------|--------|---------|
| `type` | Architecture decisions | `"decision"` | `type: "decision"` |
| Source tag | Always if traceable | `source:<type>` in tags | `"source:pr-255"` |

## Source Types

| Tag | Meaning | Example |
|-----|---------|---------|
| `source:pr-NNN` | From a specific PR | `source:pr-255` |
| `source:session-YYYY-MM-DD` | From a specific session | `source:session-2026-02-26` |
| `source:youtube-ID` | From a video | `source:youtube-3CSi8QAoN-s` |
| `source:avi-trial` | 6PM exercise | `source:avi-trial` |
| `source:bug` | Bug discovery | `source:bug` |
| `source:research` | Web research | `source:research` |

## Agent Names

| Tag | Who |
|-----|-----|
| `agent:brainClaude` | BrainLayer development |
| `agent:voiceClaude` | VoiceLayer development |
| `agent:coachClaude` | Coach/orchestration |
| `agent:golemsClaude` | General golems monorepo |
| `agent:orcClaude` | Orchestrator |

## Anti-Patterns

- Storing without `agent:*` tag — impossible to trace who stored it
- Storing without date in content — timestamps exist but are harder to query
- One brain_store per git commit — too granular. Group by feature/PR
- Storing the same thing twice — check `brain_search(tag="agent:<you>")` first
