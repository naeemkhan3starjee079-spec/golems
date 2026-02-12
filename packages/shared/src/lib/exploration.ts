/**
 * Exploration — Background codebase exploration with CLI helper agents
 *
 * Dispatches exploration prompts to external CLI agents (Gemini, Cursor, etc.)
 * and collects structured findings in markdown files.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExplorationAgent = "gemini" | "cursor" | "codex" | "kiro" | "glm" | "haiku";

export interface ExplorationPrompt {
  id: string;
  agent: ExplorationAgent;
  prompt: string;
  repo: string;
  createdAt: string;
}

export interface ExplorationFinding {
  id: string;
  promptId: string;
  agent: ExplorationAgent;
  repo: string;
  content: string;
  completedAt: string;
  duration?: number;
}

export interface ExplorationSession {
  id: string;
  name: string;
  startedAt: string;
  completedAt?: string;
  prompts: ExplorationPrompt[];
  findings: ExplorationFinding[];
}

export interface ExplorationState {
  version: number;
  sessions: ExplorationSession[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_STATE_PATH = join(
  process.env.HOME || "~",
  ".golems",
  "exploration-state.json"
);

const DEFAULT_FINDINGS_DIR = join(
  process.env.HOME || "~",
  ".golems",
  "explorations"
);

// Agent command templates
const AGENT_COMMANDS: Record<ExplorationAgent, string> = {
  gemini: 'gemini -p "{prompt}" 2>/dev/null',
  cursor: 'cursor agent "{prompt}" --output-format text 2>/dev/null',
  codex: '~/.nvm/versions/node/v22.22.0/bin/codex exec --full-auto "{prompt}" 2>/dev/null',
  kiro: 'kiro agent "{prompt}" 2>/dev/null',
  glm: 'curl -s http://127.0.0.1:11434/api/generate -d \'{"model":"glm-4.7-flash","prompt":"{prompt}","stream":false}\' | jq -r .response 2>/dev/null',
  haiku: 'echo "{prompt}" | claude --model claude-haiku-4-5-20251001 --print 2>/dev/null',
};

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

export function createEmptyState(): ExplorationState {
  return { version: 1, sessions: [] };
}

export function loadState(statePath?: string): ExplorationState {
  const p = statePath || DEFAULT_STATE_PATH;
  if (!existsSync(p)) return createEmptyState();
  try {
    const data = JSON.parse(readFileSync(p, "utf-8"));
    return {
      version: data.version || 1,
      sessions: data.sessions || [],
    };
  } catch {
    return createEmptyState();
  }
}

export function saveState(state: ExplorationState, statePath?: string): void {
  const p = statePath || DEFAULT_STATE_PATH;
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(p, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createSession(state: ExplorationState, name: string): ExplorationSession {
  const session: ExplorationSession = {
    id: generateId("exp"),
    name,
    startedAt: new Date().toISOString(),
    prompts: [],
    findings: [],
  };
  state.sessions.push(session);
  return session;
}

export function getSession(state: ExplorationState, id: string): ExplorationSession | undefined {
  return state.sessions.find((s) => s.id === id);
}

export function getLatestSession(state: ExplorationState): ExplorationSession | undefined {
  if (state.sessions.length === 0) return undefined;
  return state.sessions[state.sessions.length - 1];
}

export function completeSession(session: ExplorationSession): void {
  session.completedAt = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Prompt management
// ---------------------------------------------------------------------------

export function addPrompt(
  session: ExplorationSession,
  agent: ExplorationAgent,
  prompt: string,
  repo: string
): ExplorationPrompt {
  const p: ExplorationPrompt = {
    id: generateId("prm"),
    agent,
    prompt,
    repo,
    createdAt: new Date().toISOString(),
  };
  session.prompts.push(p);
  return p;
}

export function addFinding(
  session: ExplorationSession,
  promptId: string,
  agent: ExplorationAgent,
  repo: string,
  content: string,
  duration?: number
): ExplorationFinding {
  const finding: ExplorationFinding = {
    id: generateId("fnd"),
    promptId,
    agent,
    repo,
    content,
    completedAt: new Date().toISOString(),
    duration,
  };
  session.findings.push(finding);
  return finding;
}

// ---------------------------------------------------------------------------
// Agent execution
// ---------------------------------------------------------------------------

export function getAgentCommand(agent: ExplorationAgent, prompt: string): string {
  const template = AGENT_COMMANDS[agent];
  return template.replace("{prompt}", prompt.replace(/"/g, '\\"'));
}

export function isAgentAvailable(agent: ExplorationAgent): boolean {
  const checkCmd: Record<ExplorationAgent, string> = {
    gemini: "which gemini 2>/dev/null",
    cursor: "which cursor 2>/dev/null",
    codex: "ls ~/.nvm/versions/node/v22.22.0/bin/codex 2>/dev/null",
    kiro: "which kiro 2>/dev/null",
    glm: "curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1",
    haiku: "which claude 2>/dev/null",
  };
  try {
    execSync(checkCmd[agent], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function getAvailableAgents(): ExplorationAgent[] {
  const agents: ExplorationAgent[] = ["gemini", "cursor", "codex", "kiro", "glm", "haiku"];
  return agents.filter(isAgentAvailable);
}

// ---------------------------------------------------------------------------
// Findings output
// ---------------------------------------------------------------------------

export function writeFindingsFile(
  session: ExplorationSession,
  findingsDir?: string
): string {
  const dir = findingsDir || DEFAULT_FINDINGS_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filename = `${session.id}-${session.name.replace(/[^a-z0-9-]/gi, "-")}.md`;
  const filepath = join(dir, filename);

  const lines: string[] = [
    `# Exploration: ${session.name}`,
    "",
    `**Started:** ${session.startedAt}`,
    session.completedAt ? `**Completed:** ${session.completedAt}` : "**Status:** In progress",
    `**Findings:** ${session.findings.length}`,
    "",
    "---",
    "",
  ];

  for (const finding of session.findings) {
    const prompt = session.prompts.find((p) => p.id === finding.promptId);
    lines.push(`## ${finding.agent} — ${finding.repo}`);
    if (prompt) {
      lines.push(`> Prompt: ${prompt.prompt.slice(0, 100)}${prompt.prompt.length > 100 ? "..." : ""}`);
    }
    if (finding.duration) {
      lines.push(`> Duration: ${finding.duration}ms`);
    }
    lines.push("");
    lines.push(finding.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  writeFileSync(filepath, lines.join("\n"));
  return filepath;
}

// ---------------------------------------------------------------------------
// Pre-built exploration prompts
// ---------------------------------------------------------------------------

export interface ExplorationTemplate {
  name: string;
  description: string;
  agents: ExplorationAgent[];
  prompts: { agent: ExplorationAgent; prompt: string }[];
}

export const EXPLORATION_TEMPLATES: ExplorationTemplate[] = [
  {
    name: "architecture-review",
    description: "Review codebase architecture and suggest improvements",
    agents: ["gemini", "cursor"],
    prompts: [
      {
        agent: "gemini",
        prompt:
          "Analyze the overall architecture of this codebase. What patterns are used? What could be improved? Focus on module boundaries, dependency flow, and separation of concerns.",
      },
      {
        agent: "cursor",
        prompt:
          "Review the codebase for architectural issues: circular dependencies, tight coupling, missing abstractions. Suggest concrete refactoring opportunities.",
      },
    ],
  },
  {
    name: "dead-code-scan",
    description: "Find unused code, unreachable paths, and dead exports",
    agents: ["cursor"],
    prompts: [
      {
        agent: "cursor",
        prompt:
          "Scan the codebase for dead code: unused exports, unreachable code paths, unused imports, files that nothing references. List each with its file path.",
      },
    ],
  },
  {
    name: "test-gaps",
    description: "Identify untested code paths and suggest test priorities",
    agents: ["gemini", "cursor"],
    prompts: [
      {
        agent: "gemini",
        prompt:
          "Analyze the test coverage of this project. Which modules have tests and which don't? What are the highest-risk untested areas? Prioritize what should be tested next.",
      },
      {
        agent: "cursor",
        prompt:
          "Find all source files that lack corresponding test files. For each, describe what the file does and what tests would be most valuable.",
      },
    ],
  },
  {
    name: "security-audit",
    description: "Check for common security vulnerabilities",
    agents: ["gemini"],
    prompts: [
      {
        agent: "gemini",
        prompt:
          "Audit this codebase for security issues: hardcoded secrets, SQL injection, XSS, insecure dependencies, missing input validation, exposed APIs without auth. Be specific about file locations.",
      },
    ],
  },
  {
    name: "performance-hotspots",
    description: "Identify performance bottlenecks and optimization opportunities",
    agents: ["cursor"],
    prompts: [
      {
        agent: "cursor",
        prompt:
          "Identify performance hotspots in this codebase: N+1 queries, unnecessary re-renders, large bundle sizes, synchronous file I/O in hot paths, missing caching opportunities. Be specific.",
      },
    ],
  },
];

export function getTemplate(name: string): ExplorationTemplate | undefined {
  return EXPLORATION_TEMPLATES.find((t) => t.name === name);
}

export function listTemplates(): string[] {
  return EXPLORATION_TEMPLATES.map((t) => t.name);
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatSessionSummary(session: ExplorationSession): string {
  const lines: string[] = [];
  lines.push(`Exploration: ${session.name}`);
  lines.push(`  ID: ${session.id}`);
  lines.push(`  Started: ${session.startedAt}`);
  lines.push(`  Status: ${session.completedAt ? "Complete" : "In progress"}`);
  lines.push(`  Prompts: ${session.prompts.length}  |  Findings: ${session.findings.length}`);

  if (session.findings.length > 0) {
    lines.push("");
    lines.push("  Findings:");
    for (const f of session.findings) {
      const preview = f.content.split("\n")[0].slice(0, 60);
      lines.push(`    ${f.agent} (${f.repo}): ${preview}...`);
    }
  }

  return lines.join("\n");
}

export function formatStateOverview(state: ExplorationState): string {
  const lines: string[] = [];
  lines.push(`Exploration Sessions: ${state.sessions.length}`);

  if (state.sessions.length === 0) {
    lines.push("  No explorations yet. Run: golems explore <template>");
    return lines.join("\n");
  }

  lines.push("");
  for (const s of state.sessions.slice(-5)) {
    const status = s.completedAt ? "done" : "active";
    lines.push(`  [${status}] ${s.name} (${s.findings.length} findings)`);
  }

  return lines.join("\n");
}
