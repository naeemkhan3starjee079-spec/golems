---
title: "Interview Practice"
description: "7-mode interview practice system with Elo tracking. Practice behavioral, technical, system design, and more."
---

# Interview Practice

> 7 interview modes with Elo-rated skill tracking. Practice until your rating says you're ready.

## How It Works

RecruiterGolem runs interactive interview practice sessions via Telegram. An AI interviewer asks you questions, scores your responses, and tracks your skill progression using an Elo rating system — the same system used in chess to measure relative skill.

## The 7 Modes

| Mode | What It Tests | Example Question |
|------|--------------|-----------------|
| **Behavioral** | STAR stories, communication | "Tell me about a time you disagreed with a teammate" |
| **Technical Deep Dive** | System knowledge, architecture decisions | "Walk me through how you'd design an email routing system" |
| **System Design** | Scalability, trade-offs | "Design a job scraping pipeline that handles 10K listings/day" |
| **Code Review** | Code quality, bug detection | "Review this function — what would you change?" |
| **Debugging** | Problem-solving, systematic thinking | "This API returns 500 intermittently — how do you investigate?" |
| **Optimization** | Performance, complexity analysis | "This query takes 30s — how would you speed it up?" |
| **Rapid-Fire** | Quick thinking, breadth | Short questions across topics, 60s per answer |

## Elo Rating System

Your Elo rating starts at 1200 and adjusts after each practice session:

| Rating Range | What It Means |
|-------------|---------------|
| < 1200 | Getting started — keep practicing |
| 1200-1350 | Building foundations — patterns emerging |
| 1350-1450 | Solid — handling most questions well |
| **1450+** | **Interview ready** — consistent, structured, confident |

Elo is tracked **per mode**, so you can see exactly where you're strong and where to focus.

## Practice Flow

```
1. Start:     /practice (Telegram) or /interview-practice (Claude Code)
2. Select:    Choose mode (behavioral, technical, etc.)
3. Question:  AI interviewer asks a question
4. Respond:   You answer naturally
5. Feedback:  Score (1-10) + specific improvement suggestions
6. Elo:       Rating adjusts based on performance
7. Next:      Continue or switch modes
```

## Scoring Criteria

Each response is scored 1-10 based on:

- **Structure** — Clear framework (STAR, trade-off analysis, etc.)
- **Depth** — Technical accuracy and detail
- **Relevance** — Answers the actual question asked
- **Communication** — Clear, concise, professional delivery
- **Examples** — Concrete, specific illustrations

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/practice` | Start a new practice session |
| `/stats` | View Elo ratings and practice history |

## Data Storage

Practice sessions are stored in Supabase for cross-device continuity:

| Table | Purpose |
|-------|---------|
| `practice_sessions` | Session recordings, scores, Elo changes |
| `practice_questions` | Question bank with difficulty ratings |

## Tips

- **Start with behavioral** — builds confidence for all other modes
- **Practice the mode you're weakest in** — that's where Elo gains are biggest
- **Aim for 1450** before real interviews — you'll have consistent, structured responses
- **Review feedback** — the AI gives specific, actionable suggestions after each answer
