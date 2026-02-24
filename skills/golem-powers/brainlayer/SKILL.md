---
name: brainlayer
description: Use when searching past solutions, file history, or debugging patterns across indexed conversation chunks. Covers brain_search, brain_store, brain_recall MCP tools. NOT for: current session context (use brain_recall directly).
---

# BrainLayer — Knowledge Pipeline

> **External repo:** [github.com/EtanHey/brainlayer](https://github.com/EtanHey/brainlayer)

MCP tools: `brain_search`, `brain_store`, `brain_recall` (old `brainlayer_*` names still work).

## CLI Quick Reference

```bash
brainlayer search "how did I implement authentication"
brainlayer index                    # Index conversations
brainlayer enrich                   # Local LLM metadata extraction
brainlayer stats                    # Database stats
brainlayer dashboard                # Interactive dashboard
```

## When to Use

- **Finding past solutions**: "How did I handle that API rate limiting before?"
- **File history**: "What sessions touched this file?"
- **Regression detection**: "What changed since this file last worked?"
- **Storing decisions**: After making an important choice, `brain_store` it
