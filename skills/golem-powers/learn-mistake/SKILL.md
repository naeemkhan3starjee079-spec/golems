---
name: learn-mistake
description: Record mistakes for nightly aggregation - similar mistakes get higher priority
---

# /learn-mistake - Record Mistakes for Learning

Record a mistake so the team learns from it. Similar mistakes are clustered using Zikaron embeddings - more occurrences = higher priority for fixing.

## Usage

```
/learn-mistake <description>
```

**Examples:**
```
/learn-mistake forgot to check RTL flex direction on Hebrew UI
/learn-mistake ran tests after commit instead of before
/learn-mistake didn't read the file before editing
/learn-mistake used echo instead of Write tool for file creation
```

## How It Works

1. **Record** - Mistake saved to `~/.golems-zikaron/mistakes/` with timestamp
2. **Embed** - Nightly job embeds using Zikaron (bge-large-en-v1.5)
3. **Cluster** - Similar mistakes grouped by embedding similarity (>0.85 threshold)
4. **Prioritize** - Cluster size = priority (repeated mistakes bubble up)
5. **Report** - Weekly summary shows top mistake patterns

## Storage

```
~/.golems-zikaron/mistakes/
├── raw/                    # Individual mistake records
│   └── 2026-02-03-1430.json
├── embeddings.json         # Cached embeddings
└── clusters.json           # Nightly aggregation results
```

## Mistake Record Format

```json
{
  "id": "mistake-1707066447000",
  "timestamp": "2026-02-03T14:30:00Z",
  "description": "forgot to check RTL flex direction",
  "context": {
    "project": "my-project",
    "file": "src/components/Header.tsx",
    "session": "abc123"
  }
}
```

## Nightly Aggregation

Runs as part of Night Shift (or standalone):

```bash
# Embed and cluster mistakes
bun ~/.claude/commands/golem-powers/learn-mistake/scripts/aggregate.ts

# View top patterns
cat ~/.golems-zikaron/mistakes/clusters.json | jq '.clusters | sort_by(-.count) | .[0:5]'
```

## Integration with CLAUDE.md

High-frequency mistake patterns get added to project CLAUDE.md:

```markdown
## Common Mistakes (Auto-Generated)
- [ ] RTL: Check flex direction for Hebrew/Arabic UIs (seen 5x)
- [ ] Testing: Run tests BEFORE commit (seen 3x)
```

## See Also

- BrainLayer for embeddings: `~/Gits/brainlayer/CLAUDE.md`
- Night Shift for nightly runs: `~/Gits/golems/CLAUDE.md`
