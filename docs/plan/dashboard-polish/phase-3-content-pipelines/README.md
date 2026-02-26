# Phase 3: Content Pipeline Diagrams

> [Back to main plan](../README.md)

## Goal

Redesign the content page's pipeline flow diagrams to be detailed, self-explanatory, and support circular/looping flows (e.g., Figma gate → retry loop).

## Tools

- **Research:** gemini — best React flow diagram patterns (react-flow vs custom SVG vs CSS-only)
- **Code:** cursor (gpt-5.2-codex-xhigh) — implement FlowDiagram redesign (CSS-heavy, no Edit tool needed)

## Context

### Current State (content/page.tsx)
- `PIPELINE_FLOWS` maps pipeline IDs to `FlowStep[]` arrays
- `FlowStep` type: `{ label, detail, type: "input" | "brain" | "tool" | "gate" | "output" }`
- `FlowDiagram` renders steps horizontally with `FlowConnector` SVG arrows between them
- ALL flows are LINEAR — no loops, no branches
- 6 pipelines defined: remotion, comfyui, dataviz, satori, figma-remotion, text

### User Wants
1. **More detail** — each node should show enough context that the diagram is self-explanatory
2. **Circular flows** — the Figma gate should show "fail → retry" loop back to an earlier step
3. **Better visual distinction** — brain (AI) nodes vs tool nodes vs gates should be instantly recognizable
4. **Real pipeline data** — if `pipeline_runs` table has recent runs, show stats per step

### Implementation Approach
Current `FlowStep[]` array structure can't represent loops. Need to extend:

```typescript
type FlowStep = {
  label: string;
  detail: string;
  type: "input" | "brain" | "tool" | "gate" | "output";
  loopTo?: number; // index to loop back to on gate failure
  loopLabel?: string; // e.g., "Retry (max 3x)"
};
```

`FlowDiagram` needs to render:
1. Horizontal step chain (same as now, but prettier)
2. For steps with `loopTo`: a curved SVG arrow going back from the gate to the target step
3. Gate nodes show pass/fail paths

### Don't Over-Engineer
- Keep it CSS + inline SVG — NO external libraries (react-flow is overkill for 5-8 node diagrams)
- Keep the `PIPELINE_FLOWS` data structure — just extend it with `loopTo`/`loopLabel`
- The flow diagrams live inside collapsible sections, so they can be taller than current

## Steps

1. Extend `FlowStep` type in `lib/types/content.ts` to add `loopTo` and `loopLabel` fields
2. Update `PIPELINE_FLOWS` data — add more detail to each step, add loop annotations:
   - `comfyui`: Quality Gate → loops back to "Generate" on fail (max 3x)
   - `figma-remotion`: Figma Loop → loops back to "Render" on mismatch
   - `text`: Critique Wave → loops back to "Draft" on fail
3. Redesign `FlowNode` — bigger nodes with more info, clearer type distinction:
   - Input: dashed border, subtle bg
   - Brain (AI): colored border matching pipeline, glow effect
   - Tool: solid border, tool icon
   - Gate: diamond shape or hexagonal, pass/fail indicators
   - Output: double border, success color
4. Redesign `FlowConnector` — animated dash pattern, directional arrows
5. Add `FlowLoop` component — curved SVG path from gate back to target step, labeled with loop condition
6. Make the expanded flow section taller (remove height constraints)
7. Build + test all 6 pipeline diagrams

## Depends On

- None (independent — content page is standalone)

## Status

- [ ] Extend FlowStep type
- [ ] Update PIPELINE_FLOWS with loops and details
- [ ] Redesign FlowNode (better type distinction)
- [ ] Redesign FlowConnector (animated arrows)
- [ ] Add FlowLoop (curved back-arrow for gates)
- [ ] Build + local test
