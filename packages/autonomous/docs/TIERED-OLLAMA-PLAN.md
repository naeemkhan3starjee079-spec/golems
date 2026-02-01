# Tiered AI System Plan

> Ollama handles simple tasks, escalates complex ones to Claude Code

## Architecture

```
User message (Telegram bot)
    ↓
┌─────────────────────────────────────────┐
│           Router (Ollama 8B)            │
│  Classifies: simple | tools | complex   │
└─────────────────────────────────────────┘
    │
    ├─── SIMPLE ──→ Ollama responds directly
    │                (job queries, chat, summaries)
    │
    ├─── TOOLS ───→ Ollama + MCP
    │                (web fetch, docs lookup, verification)
    │
    └─── COMPLEX ─→ Spawn Claude Code
                     (like Night Shift pattern)
```

## Routing Logic

| Query Type | Handler | Example |
|------------|---------|---------|
| Simple filter | Ollama | "What jobs in Tel Aviv?" |
| Summarize | Ollama | "Tell me about this job" |
| Web research | Ollama + MCP | "Check company reviews" |
| Multi-source | Ollama + MCP | "Compare salary data" |
| Strategic | Claude Code | "Should I apply? Analyze fit" |
| Implementation | Claude Code | "Build feature X" |
| Debugging | Claude Code | "Fix this complex bug" |

## MCP Tools for Ollama

| Tool | MCP Server | Purpose |
|------|------------|---------|
| Web browsing | mcp-server-playwright | Fetch pages, research |
| File access | filesystem MCP | Read local docs |
| Search | brave-search MCP | Web search |

## Implementation Steps

1. **Router model** - Fine-tune small model to classify queries
2. **MCP setup** - Install playwright + filesystem MCP servers
3. **Integration** - Connect to telegram bot
4. **Claude Code spawning** - Use Night Shift pattern for complex tasks

## Multi-Model Critique (Optional)

For important answers:
1. qwen3-coder generates answer
2. llama3 critiques it
3. Combine for final response

## Files to Create

- `src/ai-router.ts` - Query classification
- `src/ollama-mcp.ts` - Ollama with MCP tools
- `src/escalate-to-claude.ts` - Claude Code spawning
- `mcp/` - MCP server configs

## References

- [Ollama Tool Calling](https://docs.ollama.com/capabilities/tool-calling)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
