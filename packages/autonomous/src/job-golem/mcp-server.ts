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
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadScrapedJobs, type JobListing } from "./scraper";
import { getActiveCompanies, getOutreachCandidates } from "./watchlist";
import { matchJobsToConnections } from "./connection-matcher";
import { createAndSaveDraft, getOutreachDrafts, updateDraftStatus } from "../recruiter-golem/draft-outreach";

// Lazy Supabase client for dashboard-integrated tools
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

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
    {
      name: "jobs_dailyDigest",
      description:
        "Daily job search digest: new matches, high-score jobs, follow-ups due, top matches. Perfect for morning check-in.",
      inputSchema: {
        type: "object" as const,
        properties: {
          hours: {
            type: "number",
            description: "Look back period in hours (default: 24)",
            default: 24,
          },
        },
      },
    },
    {
      name: "jobs_updateStatus",
      description:
        "Update a job's status in the pipeline. Tracks status history with timestamps.",
      inputSchema: {
        type: "object" as const,
        properties: {
          jobId: {
            type: "string",
            description: "Job ID (UUID from golem_jobs table)",
          },
          status: {
            type: "string",
            description: "New status",
            enum: ["new", "viewed", "saved", "applied", "interviewing", "offer", "rejected", "archived"],
          },
        },
        required: ["jobId", "status"],
      },
    },
    {
      name: "jobs_draftCoverLetter",
      description:
        "Draft a cover letter for a job listing using AI. Returns draft text for review.",
      inputSchema: {
        type: "object" as const,
        properties: {
          jobId: {
            type: "string",
            description: "Job ID (UUID from golem_jobs table)",
          },
          style: {
            type: "string",
            description: "Writing style (default: professional)",
            enum: ["professional", "casual", "technical"],
            default: "professional",
          },
        },
        required: ["jobId"],
      },
    },
    {
      name: "jobs_connectionMatches",
      description:
        "Find jobs where you have LinkedIn connections at the company. Shows warm leads for better applications.",
      inputSchema: {
        type: "object" as const,
        properties: {
          days: {
            type: "number",
            description: "Look back period in days (default: 7)",
            default: 7,
          },
        },
      },
    },
    {
      name: "linkedin_searchConnections",
      description:
        "Search your LinkedIn connections by name, company, or position.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search term to match in name, company, or position",
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
      name: "outreach_draftForMatch",
      description:
        "Generate a personalized outreach draft for a LinkedIn connection-job match. Creates approach angle, message draft, follow-up plan, and saves to dashboard.",
      inputSchema: {
        type: "object" as const,
        properties: {
          jobId: {
            type: "string",
            description: "Job ID (UUID from golem_jobs table)",
          },
          connectionId: {
            type: "string",
            description: "Connection ID (UUID from linkedin_connections table)",
          },
        },
        required: ["jobId", "connectionId"],
      },
    },
    {
      name: "outreach_getDrafts",
      description:
        "Get outreach drafts with their associated job and connection data. Filter by status (pending/approved/sent/replied/skipped).",
      inputSchema: {
        type: "object" as const,
        properties: {
          status: {
            type: "string",
            description: "Filter by draft status (default: all)",
            enum: ["pending", "approved", "sent", "replied", "skipped"],
          },
        },
      },
    },
    {
      name: "outreach_updateDraft",
      description:
        "Update the status of an outreach draft (approve, mark as sent, skip, etc).",
      inputSchema: {
        type: "object" as const,
        properties: {
          draftId: {
            type: "string",
            description: "Draft ID (UUID from outreach_drafts table)",
          },
          status: {
            type: "string",
            description: "New status",
            enum: ["approved", "sent", "replied", "skipped"],
          },
        },
        required: ["draftId", "status"],
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
      case "jobs_dailyDigest":
        return handleDailyDigest(args);
      case "jobs_updateStatus":
        return handleUpdateStatus(args);
      case "jobs_draftCoverLetter":
        return handleDraftCoverLetter(args);
      case "jobs_connectionMatches":
        return handleConnectionMatches(args);
      case "linkedin_searchConnections":
        return handleSearchConnections(args);
      case "outreach_draftForMatch":
        return handleDraftForMatch(args);
      case "outreach_getDrafts":
        return handleGetDrafts(args);
      case "outreach_updateDraft":
        return handleUpdateDraft(args);
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

// --- Supabase-powered handlers ---

async function handleDailyDigest(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY." }], isError: true };
  }

  const hours = args?.hours ?? 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [recentRes, highScoreRes, statusRes, totalRes] = await Promise.all([
    sb.from("golem_jobs").select("*").gte("scraped_at", since).order("match_score", { ascending: false }).limit(50),
    sb.from("golem_jobs").select("*").gte("match_score", 8).gte("scraped_at", since).order("match_score", { ascending: false }),
    sb.from("golem_jobs").select("status").not("status", "in", "(archived,rejected)"),
    sb.from("golem_jobs").select("id", { count: "exact", head: true }),
  ]);

  const recent = recentRes.data || [];
  const highScore = highScoreRes.data || [];
  const statuses = statusRes.data || [];
  const total = totalRes.count || 0;

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const s of statuses) {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  }

  const topMatches = recent.slice(0, 5);

  const lines = [
    `## Daily Job Digest (last ${hours}h)`,
    "",
    `**${recent.length} new matches** | **${highScore.length} high-score (8+)** | **${total} total in DB**`,
    "",
    "### Pipeline",
    `- New: ${statusCounts["new"] || 0}`,
    `- Viewed: ${statusCounts["viewed"] || 0}`,
    `- Saved: ${statusCounts["saved"] || 0}`,
    `- Applied: ${statusCounts["applied"] || 0}`,
    `- Interviewing: ${statusCounts["interviewing"] || 0}`,
    `- Offers: ${statusCounts["offer"] || 0}`,
    "",
  ];

  if (topMatches.length > 0) {
    lines.push("### Top Matches");
    for (const j of topMatches) {
      const reasons = j.match_reasons?.length > 0 ? ` (${j.match_reasons.join(", ")})` : "";
      lines.push(`- **[${j.match_score || "?"}]** ${j.title} @ ${j.company}${reasons}`);
      if (j.url) lines.push(`  ${j.url}`);
    }
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleUpdateStatus(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const { jobId, status } = args || {};
  if (!jobId || !status) {
    return { content: [{ type: "text" as const, text: "Missing required: jobId, status" }], isError: true };
  }

  // Get current job to record status transition
  const { data: job } = await sb.from("golem_jobs").select("status, status_history").eq("id", jobId).single();
  if (!job) {
    return { content: [{ type: "text" as const, text: `Job not found: ${jobId}` }], isError: true };
  }

  const history = Array.isArray(job.status_history) ? job.status_history : [];
  history.push({ from: job.status, to: status, at: new Date().toISOString() });

  const update: Record<string, any> = { status, status_history: history };
  if (status === "applied") {
    update.applied_at = new Date().toISOString();
  }

  const { error } = await sb.from("golem_jobs").update(update).eq("id", jobId);

  if (error) {
    return { content: [{ type: "text" as const, text: `Failed: ${error.message}` }], isError: true };
  }

  return { content: [{ type: "text" as const, text: `Job ${jobId} status: ${job.status} → ${status}` }] };
}

async function handleDraftCoverLetter(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const { jobId, style = "professional" } = args || {};
  if (!jobId) {
    return { content: [{ type: "text" as const, text: "Missing required: jobId" }], isError: true };
  }

  // Get job details
  const { data: job } = await sb.from("golem_jobs").select("*").eq("id", jobId).single();
  if (!job) {
    return { content: [{ type: "text" as const, text: `Job not found: ${jobId}` }], isError: true };
  }

  // Load profile for cover letter context
  const profilePath = process.env.HOME + "/Gits/golems/packages/autonomous/src/job-golem/profile.json";
  let profile: any = {};
  try {
    if (existsSync(profilePath)) {
      profile = JSON.parse(readFileSync(profilePath, "utf-8"));
    }
  } catch {}

  // Use Haiku to generate the cover letter
  const { runHaiku } = await import("../lib/cloud-llm");

  const prompt = `Write a ${style} cover letter for this job application.

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || "N/A"}
- Description: ${(job.description || "").slice(0, 2000)}

CANDIDATE:
- Name: Etan Heyman
- Experience: ${profile.yearsExperience || 3}+ years
- Skills: ${(profile.primarySkills || []).join(", ")}
- Roles: ${(profile.roles || []).join(", ")}

Match reasons: ${(job.match_reasons || job.tags || []).join(", ")}

Keep it concise (200-300 words). Focus on why this is a great mutual fit.
Use a ${style} tone. No generic filler. Be specific about matching skills.`;

  const draft = await runHaiku(prompt, "cover-letter");

  if (!draft) {
    return { content: [{ type: "text" as const, text: "Failed to generate cover letter. Check Anthropic API key." }], isError: true };
  }

  // Save to database
  const { error } = await sb.from("job_cover_letters").insert({
    job_id: jobId,
    content: draft,
    style,
    generated_by: "haiku",
  });

  if (error) {
    console.error("[CoverLetter] Save error:", error.message);
  }

  const lines = [
    `## Cover Letter Draft — ${job.title} @ ${job.company}`,
    `*Style: ${style} | Generated by Haiku*`,
    "",
    draft,
    "",
    error ? `(Note: failed to save to DB: ${error.message})` : "(Saved to job_cover_letters table)",
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleConnectionMatches(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const matches = await matchJobsToConnections(sb);

  if (matches.length === 0) {
    return { content: [{ type: "text" as const, text: "No warm leads found. Import connections first with `bun scripts/import-linkedin-connections.ts`." }] };
  }

  // Group by job
  const byJob = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = `${m.jobTitle} @ ${m.jobCompany}`;
    const existing = byJob.get(key) || [];
    existing.push(m);
    byJob.set(key, existing);
  }

  const lines = [`## Warm Leads (${matches.length} connections at hiring companies)\n`];

  for (const [job, conns] of byJob) {
    lines.push(`### ${job}`);
    for (const c of conns) {
      const badge = c.matchType === "exact" ? "EXACT" : c.matchType === "substring" ? "PARTIAL" : "FUZZY";
      lines.push(`- **${c.connectionName}** — ${c.connectionPosition} at ${c.connectionCompany} [${badge}]`);
    }
    lines.push("");
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleSearchConnections(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const query = args?.query?.toLowerCase();
  const limit = args?.limit ?? 20;
  if (!query) {
    return { content: [{ type: "text" as const, text: "Missing required: query" }], isError: true };
  }

  const { data, error } = await sb
    .from("linkedin_connections")
    .select("*")
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,company.ilike.%${query}%,position.ilike.%${query}%`)
    .limit(limit);

  if (error || !data || data.length === 0) {
    return { content: [{ type: "text" as const, text: `No connections matching "${query}".` }] };
  }

  const lines = [
    `## LinkedIn Connections: "${query}" (${data.length})\n`,
    ...data.map((c: any) =>
      `- **${c.first_name} ${c.last_name}** — ${c.position || "N/A"} at ${c.company || "N/A"}${c.has_messages ? " (has messages)" : ""}${c.linkedin_url ? `\n  ${c.linkedin_url}` : ""}`
    ),
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

// --- Outreach Drafts ---

async function handleDraftForMatch(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const jobId = args?.jobId;
  const connectionId = args?.connectionId;
  if (!jobId || !connectionId) {
    return { content: [{ type: "text" as const, text: "Missing required: jobId and connectionId" }], isError: true };
  }

  const result = await createAndSaveDraft(sb, jobId, connectionId);

  if ("error" in result) {
    return { content: [{ type: "text" as const, text: `Draft failed: ${result.error}` }], isError: true };
  }

  const lines = [
    "## Outreach Draft Created\n",
    `**Approach:** ${result.draft.approachAngle}\n`,
    "**Message:**",
    "```",
    result.draft.messageDraft,
    "```\n",
    `**Follow-up:** ${result.draft.followupPlan}\n`,
    `**Notes:**\n${result.draft.notes}\n`,
    `Draft ID: ${result.id}`,
    "Use outreach_updateDraft to approve/skip.",
  ];

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleGetDrafts(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const drafts = await getOutreachDrafts(sb, args?.status);

  if (drafts.length === 0) {
    return { content: [{ type: "text" as const, text: `No outreach drafts${args?.status ? ` with status "${args.status}"` : ""}.` }] };
  }

  const lines = [`## Outreach Drafts (${drafts.length})\n`];
  for (const d of drafts) {
    const job = d.golem_jobs;
    const conn = d.linkedin_connections;
    const statusBadge = d.status === "pending" ? "Pending" :
      d.status === "approved" ? "Approved" :
      d.status === "sent" ? "Sent" : d.status;

    lines.push(`### ${conn?.full_name || "Unknown"} → ${job?.title || "Unknown"} at ${job?.company || "Unknown"}`);
    lines.push(`Status: **${statusBadge}** | Score: ${job?.match_score || "N/A"}/10`);
    lines.push(`Angle: ${d.approach_angle}`);
    lines.push(`Message: ${d.message_draft.slice(0, 100)}...`);
    lines.push(`ID: ${d.id}`);
    lines.push("");
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

async function handleUpdateDraft(args: any) {
  const sb = getSupabase();
  if (!sb) {
    return { content: [{ type: "text" as const, text: "Supabase not configured." }], isError: true };
  }

  const draftId = args?.draftId;
  const status = args?.status;
  if (!draftId || !status) {
    return { content: [{ type: "text" as const, text: "Missing required: draftId and status" }], isError: true };
  }

  const ok = await updateDraftStatus(sb, draftId, status);
  return {
    content: [{
      type: "text" as const,
      text: ok ? `Draft ${draftId} updated to "${status}".` : `Failed to update draft ${draftId}.`,
    }],
    isError: !ok,
  };
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
