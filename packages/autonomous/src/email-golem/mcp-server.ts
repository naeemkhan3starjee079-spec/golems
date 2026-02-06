/**
 * EmailGolem MCP Server
 *
 * Exposes email data as MCP tools for Claude Code.
 * Tools: getRecent, search, subscriptions, urgent, stats
 *
 * Usage in .mcp.json:
 * {
 *   "golems-email": {
 *     "command": "bun",
 *     "args": ["run", "packages/autonomous/src/email-golem/mcp-server.ts"]
 *   }
 * }
 */

// Load env first (launchd runs from /)
import "../lib/load-env";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createDbClient,
  getRecentEmails,
  getSubscriptionSummary,
  getUnnotifiedUrgentEmails,
} from "./db-client";
import type { Email } from "./types";

const server = new Server(
  { name: "golems-email", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Lazy DB client (only connect when first tool is called)
let db: ReturnType<typeof createDbClient> | null = null;
function getDb() {
  if (!db) {
    db = createDbClient();
  }
  return db;
}

// --- Tool definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "email_getRecent",
      description:
        "Get recent emails from the last N hours, optionally filtered by minimum score. Returns subject, sender, score, category, and time.",
      inputSchema: {
        type: "object" as const,
        properties: {
          hours: {
            type: "number",
            description: "How many hours back to look (default: 24)",
            default: 24,
          },
          minScore: {
            type: "number",
            description:
              "Minimum score to include (default: 0). Use 5 for notable, 7 for important, 10 for urgent.",
            default: 0,
          },
        },
      },
    },
    {
      name: "email_search",
      description:
        "Search emails by keyword in subject or sender address. Returns matching emails with scores.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search term to match in subject or sender",
          },
          limit: {
            type: "number",
            description: "Max results (default: 20)",
            default: 20,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "email_subscriptions",
      description:
        "Get subscription summary: monthly total spend, active services, new/cancelled this month.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "email_urgent",
      description:
        "Get urgent emails (score 10) that haven't been notified yet. These need immediate attention.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "email_stats",
      description:
        "Quick email stats: total in last 24h, urgent count, category breakdown.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ],
}));

// --- Tool handlers ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "email_getRecent":
        return handleGetRecent(args);
      case "email_search":
        return handleSearch(args);
      case "email_subscriptions":
        return handleSubscriptions();
      case "email_urgent":
        return handleUrgent();
      case "email_stats":
        return handleStats();
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        };
    }
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error in ${name}: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

function formatEmail(e: Email): string {
  const score = e.score ?? "?";
  const cat = e.category ?? "unknown";
  const date = e.received_at
    ? new Date(e.received_at).toLocaleString()
    : "unknown";
  return `- [${score}/10 ${cat}] **${e.subject || "(no subject)"}** from ${e.from_address || "unknown"} (${date})`;
}

async function handleGetRecent(args: any) {
  const hours = args?.hours ?? 24;
  const minScore = args?.minScore ?? 0;
  const emails = await getRecentEmails(getDb(), hours, minScore);

  if (emails.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No emails found in the last ${hours}h with score >= ${minScore}.`,
        },
      ],
    };
  }

  const lines = [
    `## Recent Emails (last ${hours}h, score >= ${minScore})`,
    `**${emails.length} emails found**\n`,
    ...emails.map(formatEmail),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleSearch(args: any) {
  const query = args?.query?.toLowerCase();
  const limit = args?.limit ?? 20;

  if (!query) {
    return {
      content: [{ type: "text" as const, text: "Missing required: query" }],
      isError: true,
    };
  }

  // Get last 7 days of emails and filter client-side
  // (Supabase free tier doesn't support full-text search)
  const emails = await getRecentEmails(getDb(), 7 * 24, 0);
  const matches = emails
    .filter(
      (e) =>
        e.subject?.toLowerCase().includes(query) ||
        e.from_address?.toLowerCase().includes(query)
    )
    .slice(0, limit);

  if (matches.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No emails matching "${args.query}" in the last 7 days.`,
        },
      ],
    };
  }

  const lines = [
    `## Email Search: "${args.query}"`,
    `**${matches.length} matches**\n`,
    ...matches.map(formatEmail),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleSubscriptions() {
  const summary = await getSubscriptionSummary(getDb());

  const lines = [
    "## Subscription Summary",
    `**Monthly total: $${summary.totalMonthly.toFixed(2)}**\n`,
    "### Active Services",
    ...summary.services.map(
      (s) => `- ${s.name}: ${s.currency} ${s.amount} (${s.status})`
    ),
  ];

  if (summary.newThisMonth.length > 0) {
    lines.push("\n### New This Month");
    lines.push(...summary.newThisMonth.map((s) => `- ${s}`));
  }

  if (summary.cancelledThisMonth.length > 0) {
    lines.push("\n### Cancelled This Month");
    lines.push(...summary.cancelledThisMonth.map((s) => `- ${s}`));
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleUrgent() {
  const urgent = await getUnnotifiedUrgentEmails(getDb());

  if (urgent.length === 0) {
    return {
      content: [
        { type: "text" as const, text: "No unnotified urgent emails." },
      ],
    };
  }

  const lines = [
    `## Urgent Emails (${urgent.length} unnotified)`,
    "",
    ...urgent.map(formatEmail),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleStats() {
  const last24h = await getRecentEmails(getDb(), 24, 0);
  const urgent = last24h.filter((e) => (e.score ?? 0) >= 10);
  const important = last24h.filter(
    (e) => (e.score ?? 0) >= 7 && (e.score ?? 0) < 10
  );

  // Category breakdown
  const categories: Record<string, number> = {};
  for (const e of last24h) {
    const cat = e.category || "unknown";
    categories[cat] = (categories[cat] || 0) + 1;
  }

  const lines = [
    "## Email Stats (last 24h)",
    `- **Total:** ${last24h.length}`,
    `- **Urgent (10):** ${urgent.length}`,
    `- **Important (7-9):** ${important.length}`,
    "",
    "### Categories",
    ...Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => `- ${cat}: ${count}`),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[golems-email] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[golems-email] Fatal:", err);
  process.exit(1);
});
