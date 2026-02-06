/**
 * JobGolem MCP Server
 *
 * Exposes job data as MCP tools for Claude Code.
 * Tools: getHot, getRecent, search, watchlist, outreachDrafts
 *
 * Reads from local JSON files - no DB connection needed.
 */

import "../lib/load-env";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync, readdirSync } from "fs";
import { loadScrapedJobs, type JobListing } from "./scraper";
import { getActiveCompanies, getOutreachCandidates } from "./watchlist";

const RESULTS_DIR =
  process.env.HOME + "/.golems-zikaron/job-golem/results";
const SEEN_JOBS_PATH =
  process.env.HOME + "/.golems-zikaron/job-golem/seen-jobs.json";

const server = new Server(
  { name: "golems-jobs", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "jobs_getHot",
      description:
        "Get hot job matches (score 8+). These are the best matches for your profile.",
      inputSchema: {
        type: "object" as const,
        properties: {
          minScore: {
            type: "number",
            description: "Minimum score (default: 8)",
            default: 8,
          },
        },
      },
    },
    {
      name: "jobs_getRecent",
      description:
        "Get the most recent batch of scraped and scored jobs.",
      inputSchema: {
        type: "object" as const,
        properties: {
          limit: {
            type: "number",
            description: "Max results (default: 20)",
            default: 20,
          },
        },
      },
    },
    {
      name: "jobs_search",
      description:
        "Search job listings by keyword (company, title, or tech stack).",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search term to match in title, company, or description",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "jobs_watchlist",
      description:
        "Get the company watchlist - companies being tracked for outreach.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "jobs_stats",
      description:
        "Job pipeline stats: total scraped, seen, recent results.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "jobs_getHot":
        return handleGetHot(args);
      case "jobs_getRecent":
        return handleGetRecent(args);
      case "jobs_search":
        return handleSearch(args);
      case "jobs_watchlist":
        return handleWatchlist();
      case "jobs_stats":
        return handleStats();
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        };
    }
  } catch (err: any) {
    return {
      content: [
        { type: "text" as const, text: `Error in ${name}: ${err.message}` },
      ],
      isError: true,
    };
  }
});

interface ScoredJob {
  job: JobListing;
  score: number;
  reason: string;
  highlights: string[];
}

function loadLatestResults(): ScoredJob[] {
  if (!existsSync(RESULTS_DIR)) return [];

  const files = readdirSync(RESULTS_DIR)
    .filter((f) => f.startsWith("jobs-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) return [];

  // Load the most recent results file
  const latest = readFileSync(`${RESULTS_DIR}/${files[0]}`, "utf-8");
  return JSON.parse(latest);
}

function formatJob(j: ScoredJob): string {
  const { job, score, reason, highlights } = j;
  return [
    `- **[${score}/10]** ${job.title} @ ${job.company}`,
    `  ${job.location} | ${job.experience || "N/A"}`,
    highlights.length > 0 ? `  Matches: ${highlights.join(", ")}` : "",
    reason ? `  Why: ${reason}` : "",
    job.url ? `  ${job.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function handleGetHot(args: any) {
  const minScore = args?.minScore ?? 8;
  const results = loadLatestResults();
  const hot = results.filter((r) => r.score >= minScore);

  if (hot.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No jobs scoring ${minScore}+ in the latest batch.`,
        },
      ],
    };
  }

  const lines = [
    `## Hot Jobs (score >= ${minScore})`,
    `**${hot.length} matches**\n`,
    ...hot.map(formatJob),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

function handleGetRecent(args: any) {
  const limit = args?.limit ?? 20;
  const results = loadLatestResults().slice(0, limit);

  if (results.length === 0) {
    return {
      content: [
        { type: "text" as const, text: "No recent job results found." },
      ],
    };
  }

  const lines = [
    `## Recent Job Results (${results.length})`,
    "",
    ...results.map(formatJob),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

function handleSearch(args: any) {
  const query = args?.query?.toLowerCase();
  if (!query) {
    return {
      content: [{ type: "text" as const, text: "Missing required: query" }],
      isError: true,
    };
  }

  // Search both scraped jobs and scored results
  const scraped = loadScrapedJobs();
  const matches = scraped
    .filter(
      (j) =>
        j.title?.toLowerCase().includes(query) ||
        j.company?.toLowerCase().includes(query) ||
        j.description?.toLowerCase().includes(query)
    )
    .slice(0, 20);

  if (matches.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No jobs matching "${args.query}" in scraped data.`,
        },
      ],
    };
  }

  const lines = [
    `## Job Search: "${args.query}"`,
    `**${matches.length} matches**\n`,
    ...matches.map(
      (j) =>
        `- **${j.title}** @ ${j.company} (${j.location}) [${j.source}]\n  ${j.url || ""}`
    ),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

function handleWatchlist() {
  const active = getActiveCompanies();
  const outreach = getOutreachCandidates();

  const lines = [
    "## Company Watchlist",
    `**${active.length} active, ${outreach.length} outreach candidates**\n`,
    "### Active",
    ...active.map(
      (c) =>
        `- ${c.name} (${c.reason}) - last checked: ${c.lastChecked ? new Date(c.lastChecked).toLocaleDateString() : "never"}`
    ),
  ];

  if (outreach.length > 0) {
    lines.push("\n### Outreach Candidates");
    lines.push(
      ...outreach.map(
        (c) => `- ${c.name} - ${c.reason} (${c.outreachStatus || "not started"})`
      )
    );
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

function handleStats() {
  const scraped = loadScrapedJobs();
  const results = loadLatestResults();
  const seenCount = existsSync(SEEN_JOBS_PATH)
    ? JSON.parse(readFileSync(SEEN_JOBS_PATH, "utf-8")).length
    : 0;

  const resultFiles = existsSync(RESULTS_DIR)
    ? readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".json")).length
    : 0;

  const hot = results.filter((r) => r.score >= 8).length;
  const warm = results.filter((r) => r.score >= 6 && r.score < 8).length;

  const lines = [
    "## Job Pipeline Stats",
    `- **Total scraped:** ${scraped.length}`,
    `- **Seen (deduped):** ${seenCount}`,
    `- **Result batches:** ${resultFiles}`,
    `- **Latest batch:** ${results.length} scored`,
    `  - Hot (8+): ${hot}`,
    `  - Warm (6-7): ${warm}`,
    `  - Cold (<6): ${results.length - hot - warm}`,
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[golems-jobs] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[golems-jobs] Fatal:", err);
  process.exit(1);
});
