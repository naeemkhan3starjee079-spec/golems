# Phase 7: Backlog + PRD Integration

> [Back to main plan](../README.md)

## Goal
Connect the backlog Kanban to PRDs and large-plans so items are created/updated automatically when plans are scaffolded or phases complete.

## Tools
- **Research:** gemini — backlog sync patterns
- **Code:** opus — plan scaffold hook + dashboard UI
- **Design:** `/frontend-design` skill — for ideas column, quick-add UI, plan filter
- **MCPs:** supabase (backlog_items table)

## Steps

1. **Add "ideas" column to backlog** — New status column before "Backlog": raw ideas that haven't been planned yet. User can say "add this idea" and it lands here. **USE `/frontend-design` SKILL.**
2. **Auto-create backlog items from `/large-plan`** — When a plan is scaffolded, create one backlog item per phase with `project: plan-name`, `status: backlog`.
3. **Auto-update on PR merge** — When a phase PR is merged, move its backlog item to "Done". Use GitHub webhook or manual trigger.
4. **Link backlog items to plans** — Add `plan_name` and `phase` columns to `backlog_items`. Show link to plan phase README in the card detail.
5. **Quick-add from dashboard** — Floating "+" button or keyboard shortcut to quickly add ideas. Title + project + optional priority. **USE `/frontend-design` SKILL.**
6. **Filter by plan** — Add plan filter to Kanban board. Show all items for a specific plan. **USE `/frontend-design` SKILL.**

## Depends On
- Nothing (standalone, backlog page already exists)

## Status
- [ ] Ideas column
- [ ] Auto-create from /large-plan
- [ ] Auto-update on PR merge
- [ ] Link items to plans
- [ ] Quick-add UI
- [ ] Plan filter
