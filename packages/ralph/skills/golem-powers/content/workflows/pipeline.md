---
name: pipeline
description: AI-powered routing from creative idea to best pipeline
---

# Pipeline Intelligence — AI Content Router

> Describe an idea, get the best pipeline(s) to produce it. CC uses LLM to classify intent and pick the optimal pipeline.

## Step 1: Route via CLI

```bash
cd ~/Gits/golems/packages/content

# Route an idea to the best pipeline
bun run pipeline route "Weekly job market bar chart"

# Route + execute in one command
bun run pipeline route "Animated code demo of the auth system" --execute

# Show pipeline performance stats
bun run pipeline stats

# List all available pipelines
bun run pipeline list
```

## Step 2: Route Programmatically

```typescript
import { routeIdea, executePlan } from "@golems/content/pipeline";

// Route an idea
const plan = await routeIdea({
  idea: "Create a Soviet propaganda poster satirizing NYC collectivism",
  project: "political-merch",
});

console.log(plan.steps[0].pipelineId); // "comfyui"
console.log(plan.reasoning);

// Execute the plan
const result = await executePlan(plan, {
  project: "political-merch",
  trackRun: true, // Log to pipeline_runs Supabase table
});
```

## Step 3: Route via HTTP API

```bash
# Just route (get recommendation)
curl -X POST http://127.0.0.1:3001/api/pipeline/route \
  -H "Content-Type: application/json" \
  -d '{"idea": "Weekly job market infographic for LinkedIn"}'

# Route + execute
curl -X POST http://127.0.0.1:3001/api/pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{
    "idea": "Animated architecture diagram of golems system",
    "project": "golems-showcase"
  }'

# View stats
curl http://127.0.0.1:3001/api/pipeline/stats
```

## How Routing Works

1. CC receives creative idea as text
2. Pipeline registry provides available pipelines with capabilities
3. LLM classifies the idea type and matches to best pipeline(s)
4. Multi-pipeline chaining for complex ideas:
   - ComfyUI background -> Remotion text overlay
   - DataViz chart -> Remotion animated version
   - Multiple charts -> infographic template

## Available Pipelines

| ID | Speed | Quality | Best For |
|----|-------|---------|----------|
| `remotion` | 4/10 | 9/10 | Animations, code demos, data stories |
| `comfyui` | 3/10 | 8/10 | AI images, merch, social visuals |
| `dataviz` | 9/10 | 7/10 | Charts, infographics, reports |
| `satori` | 10/10 | 6/10 | Branded cards, templates (planned) |

## Vision Feedback Loop

For high-quality output, CC can use a generate -> review -> refine loop:

1. **Generate** — Use pipeline to create content
2. **Review** — CC examines the output (via screenshot or file read)
3. **Feedback** — CC identifies issues ("text too small", "colors clash", "composition off-center")
4. **Refine** — Re-generate with adjusted prompt/params
5. **Approve** — CC confirms quality or sends to user for final approval

This loop works because CC can see images (multimodal) and provide structured JSON feedback to the pipeline.

## Performance Tracking

Pipeline runs log to `pipeline_runs` Supabase table:
- Pipeline ID, idea text, idea type
- Success/failure, duration, quality score
- User feedback (1-5 via Telegram reactions)
- Used by learning loop to improve routing
