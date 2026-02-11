import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  createEmptyState,
  loadState,
  saveState,
  createSession,
  getSession,
  getLatestSession,
  completeSession,
  addPrompt,
  addFinding,
  getAgentCommand,
  getTemplate,
  listTemplates,
  writeFindingsFile,
  formatSessionSummary,
  formatStateOverview,
  EXPLORATION_TEMPLATES,
  type ExplorationState,
  type ExplorationSession,
} from "@golems/shared/lib/exploration";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `exploration-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

describe("state persistence", () => {
  test("createEmptyState returns valid default", () => {
    const s = createEmptyState();
    expect(s.version).toBe(1);
    expect(s.sessions).toEqual([]);
  });

  test("loadState returns empty when file missing", () => {
    const s = loadState(join(testDir, "nonexistent.json"));
    expect(s.sessions).toEqual([]);
  });

  test("saveState and loadState roundtrip", () => {
    const p = join(testDir, "state.json");
    const s = createEmptyState();
    createSession(s, "test-session");
    saveState(s, p);

    const loaded = loadState(p);
    expect(loaded.sessions.length).toBe(1);
    expect(loaded.sessions[0].name).toBe("test-session");
  });

  test("saveState creates directory if needed", () => {
    const p = join(testDir, "sub", "state.json");
    saveState(createEmptyState(), p);
    expect(existsSync(p)).toBe(true);
  });

  test("loadState handles corrupt JSON gracefully", () => {
    const p = join(testDir, "bad.json");
    writeFileSync(p, "not valid json{{{");
    const s = loadState(p);
    expect(s.sessions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

describe("session management", () => {
  test("createSession adds session to state", () => {
    const s = createEmptyState();
    const session = createSession(s, "my-session");
    expect(session.id).toBeTruthy();
    expect(session.name).toBe("my-session");
    expect(session.startedAt).toBeTruthy();
    expect(session.prompts).toEqual([]);
    expect(session.findings).toEqual([]);
    expect(s.sessions.length).toBe(1);
  });

  test("createSession generates unique IDs", () => {
    const s = createEmptyState();
    const a = createSession(s, "a");
    const b = createSession(s, "b");
    expect(a.id).not.toBe(b.id);
  });

  test("getSession finds by id", () => {
    const s = createEmptyState();
    const session = createSession(s, "findme");
    expect(getSession(s, session.id)?.name).toBe("findme");
    expect(getSession(s, "nonexistent")).toBeUndefined();
  });

  test("getLatestSession returns last session", () => {
    const s = createEmptyState();
    createSession(s, "first");
    createSession(s, "second");
    expect(getLatestSession(s)?.name).toBe("second");
  });

  test("getLatestSession returns undefined when empty", () => {
    const s = createEmptyState();
    expect(getLatestSession(s)).toBeUndefined();
  });

  test("completeSession sets completedAt", () => {
    const s = createEmptyState();
    const session = createSession(s, "test");
    expect(session.completedAt).toBeUndefined();
    completeSession(session);
    expect(session.completedAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Prompt and finding management
// ---------------------------------------------------------------------------

describe("prompts and findings", () => {
  test("addPrompt creates prompt with correct fields", () => {
    const s = createEmptyState();
    const session = createSession(s, "test");
    const prompt = addPrompt(session, "gemini", "Analyze the code", "golems");
    expect(prompt.id).toBeTruthy();
    expect(prompt.agent).toBe("gemini");
    expect(prompt.prompt).toBe("Analyze the code");
    expect(prompt.repo).toBe("golems");
    expect(prompt.createdAt).toBeTruthy();
    expect(session.prompts.length).toBe(1);
  });

  test("addFinding creates finding linked to prompt", () => {
    const s = createEmptyState();
    const session = createSession(s, "test");
    const prompt = addPrompt(session, "cursor", "Find bugs", "golems");
    const finding = addFinding(session, prompt.id, "cursor", "golems", "Found 3 bugs", 5000);
    expect(finding.id).toBeTruthy();
    expect(finding.promptId).toBe(prompt.id);
    expect(finding.agent).toBe("cursor");
    expect(finding.content).toBe("Found 3 bugs");
    expect(finding.duration).toBe(5000);
    expect(finding.completedAt).toBeTruthy();
    expect(session.findings.length).toBe(1);
  });

  test("multiple prompts and findings in session", () => {
    const s = createEmptyState();
    const session = createSession(s, "multi");
    const p1 = addPrompt(session, "gemini", "Task 1", "repo1");
    const p2 = addPrompt(session, "cursor", "Task 2", "repo2");
    addFinding(session, p1.id, "gemini", "repo1", "Result 1");
    addFinding(session, p2.id, "cursor", "repo2", "Result 2");
    expect(session.prompts.length).toBe(2);
    expect(session.findings.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Agent commands
// ---------------------------------------------------------------------------

describe("agent commands", () => {
  test("getAgentCommand generates gemini command", () => {
    const cmd = getAgentCommand("gemini", "Analyze this");
    expect(cmd).toContain("gemini");
    expect(cmd).toContain("Analyze this");
  });

  test("getAgentCommand generates cursor command", () => {
    const cmd = getAgentCommand("cursor", "Find bugs");
    expect(cmd).toContain("cursor agent");
    expect(cmd).toContain("Find bugs");
  });

  test("getAgentCommand generates haiku command", () => {
    const cmd = getAgentCommand("haiku", "Review code");
    expect(cmd).toContain("claude");
    expect(cmd).toContain("Review code");
  });

  test("getAgentCommand escapes double quotes", () => {
    const cmd = getAgentCommand("gemini", 'Has "quotes" inside');
    expect(cmd).toContain('\\"quotes\\"');
  });
});

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

describe("templates", () => {
  test("listTemplates returns all template names", () => {
    const names = listTemplates();
    expect(names).toContain("architecture-review");
    expect(names).toContain("dead-code-scan");
    expect(names).toContain("test-gaps");
    expect(names).toContain("security-audit");
    expect(names).toContain("performance-hotspots");
    expect(names.length).toBe(5);
  });

  test("getTemplate finds by name", () => {
    const t = getTemplate("architecture-review");
    expect(t).toBeDefined();
    expect(t!.description).toBeTruthy();
    expect(t!.prompts.length).toBeGreaterThan(0);
  });

  test("getTemplate returns undefined for unknown", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });

  test("all templates have valid agents", () => {
    const validAgents = ["gemini", "cursor", "codex", "kiro", "haiku"];
    for (const t of EXPLORATION_TEMPLATES) {
      for (const p of t.prompts) {
        expect(validAgents).toContain(p.agent);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Findings output
// ---------------------------------------------------------------------------

describe("writeFindingsFile", () => {
  test("writes markdown file with findings", () => {
    const s = createEmptyState();
    const session = createSession(s, "test-output");
    const prompt = addPrompt(session, "gemini", "Analyze architecture", "golems");
    addFinding(session, prompt.id, "gemini", "golems", "# Architecture Analysis\n\nLooks good.", 3000);

    const filepath = writeFindingsFile(session, testDir);
    expect(existsSync(filepath)).toBe(true);

    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("# Exploration: test-output");
    expect(content).toContain("gemini");
    expect(content).toContain("golems");
    expect(content).toContain("Architecture Analysis");
    expect(content).toContain("3000ms");
  });

  test("creates directory if needed", () => {
    const dir = join(testDir, "sub", "findings");
    const s = createEmptyState();
    const session = createSession(s, "test");
    const filepath = writeFindingsFile(session, dir);
    expect(existsSync(filepath)).toBe(true);
  });

  test("handles session with no findings", () => {
    const s = createEmptyState();
    const session = createSession(s, "empty");
    const filepath = writeFindingsFile(session, testDir);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("# Exploration: empty");
    expect(content).toContain("Findings:** 0");
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("formatters", () => {
  test("formatSessionSummary shows session details", () => {
    const s = createEmptyState();
    const session = createSession(s, "test-summary");
    addPrompt(session, "gemini", "Task", "repo");

    const output = formatSessionSummary(session);
    expect(output).toContain("test-summary");
    expect(output).toContain("Prompts: 1");
    expect(output).toContain("In progress");
  });

  test("formatSessionSummary shows findings preview", () => {
    const s = createEmptyState();
    const session = createSession(s, "with-findings");
    const p = addPrompt(session, "cursor", "Find bugs", "golems");
    addFinding(session, p.id, "cursor", "golems", "Found critical bug in auth module");

    const output = formatSessionSummary(session);
    expect(output).toContain("cursor");
    expect(output).toContain("golems");
    expect(output).toContain("Found critical bug");
  });

  test("formatSessionSummary shows complete status", () => {
    const s = createEmptyState();
    const session = createSession(s, "done");
    completeSession(session);
    const output = formatSessionSummary(session);
    expect(output).toContain("Complete");
  });

  test("formatStateOverview shows session count", () => {
    const s = createEmptyState();
    createSession(s, "a");
    createSession(s, "b");
    const output = formatStateOverview(s);
    expect(output).toContain("2");
  });

  test("formatStateOverview shows empty message", () => {
    const s = createEmptyState();
    const output = formatStateOverview(s);
    expect(output).toContain("No explorations yet");
  });

  test("formatStateOverview shows last 5 sessions", () => {
    const s = createEmptyState();
    for (let i = 0; i < 7; i++) {
      createSession(s, `session-${i}`);
    }
    const output = formatStateOverview(s);
    // Should show last 5, not all 7
    expect(output).toContain("session-6");
    expect(output).toContain("session-2");
    expect(output).not.toContain("session-1");
  });
});
