# MCP Server Patterns

> 8 MCP servers in the golems ecosystem. Standard structure and conventions.

## Active Servers

| Server | Command | Tools | Package/Source |
|--------|---------|-------|----------------|
| `brainlayer` | `brainlayer-mcp` | 12 | External repo (`~/Gits/brainlayer`) |
| `golems-email` | `bun run packages/shared/src/email/mcp-server.ts` | 11 | `@golems/shared` |
| `golems-jobs` | `bun run packages/jobs/src/mcp-server.ts` | 12 | `@golems/jobs` |
| `golems-glm` | `bun run packages/shared/src/glm/mcp-server.ts` | 2 | `@golems/shared` |
| `supabase` | `@supabase/mcp-server-supabase` | 20+ | Third-party |
| `exa` | `exa-mcp-server` | 3 | Third-party |
| `sophtron` | `@sophtron/sophtron-mcp-server` | 6 | Third-party |
| `qa-voice` | `bun run ~/Gits/voicelayer/src/mcp-server.ts` | 3 | External: [voicelayer](https://github.com/EtanHey/voicelayer) |
| `playwright` | `@anthropic-ai/mcp-playwright` | 15+ | Third-party |

## Standard Structure (Bun servers)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "golems-<name>", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [/* tool definitions */]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Handle tool calls
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Tool Naming Convention

- **Prefix:** Server name with underscores (e.g., `email_getRecent`, `jobs_search`)
- **Verbs:** `get`, `search`, `list`, `create`, `update`, `delete`, `draft`
- **Consistency:** All tools in a server share the same prefix

## Error Handling

- Return `{ content: [{ type: "text", text: "Error: ..." }], isError: true }` for tool errors
- Never throw — always catch and return structured error response
- Log errors to stderr (MCP uses stdout for protocol)

## Config Location

- **Live:** `.mcp.json` (gitignored)
- **Template:** `.mcp.json.example` (committed, op:// placeholder secrets)
- **Global:** `~/.claude/settings.json` (user-level servers like brainlayer)
