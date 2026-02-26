# zikaron

> Legacy bridge package for BrainLayer integration scripts and data backfill tooling.

## What it does

Zikaron ("memory" in Hebrew) was the original name for the memory layer before it became [BrainLayer](https://github.com/EtanHey/brainlayer). This package now holds migration scripts and backfill utilities that bridge the golems monorepo with the external BrainLayer repo.

## Structure

```
packages/zikaron/
├── scripts/
│   └── backfill_data/    # Data migration and backfill scripts
└── docs.local/           # Local research and audit notes
```

## Related

- **BrainLayer** — The external repo (`~/Gits/brainlayer`) with the actual memory layer: 328K+ indexed chunks, 7 MCP tools, knowledge graph
- **@golems/shared** — Provides Supabase client used by some backfill scripts

## Note

Most active BrainLayer development happens in the external repo. This package exists for golems-specific tooling that needs access to both the monorepo workspace and BrainLayer's data.
