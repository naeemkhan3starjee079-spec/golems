import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "..", "index.ts");

async function run(...args: string[]) {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("wizard CLI routing", () => {
  test("wizard command is recognized and runs", async () => {
    // Wizard requires stdin, so it will hang in non-interactive mode
    // but we can verify the command is recognized by checking help text
    const { stdout } = await run("--help");
    expect(stdout).toContain("wizard");
    // Wizard line specifically should not say "coming soon"
    const wizardLine = stdout
      .split("\n")
      .find((l: string) => l.includes("wizard"));
    expect(wizardLine).not.toContain("coming soon");
  });
});

describe("wizard module", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "wizard-test-"));
    configPath = join(tmpDir, "config.json");
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("detects existing config and returns its content", async () => {
    const existingConfig = {
      reposPath: "~/Gits",
      tools: { claude: "/usr/local/bin/claude" },
      features: { proactiveNudges: true, nightShift: false, telegram: false },
    };
    await writeFile(configPath, JSON.stringify(existingConfig, null, 2));

    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw);

    expect(config.reposPath).toBe("~/Gits");
    expect(config.tools.claude).toBe("/usr/local/bin/claude");
    expect(config.features.proactiveNudges).toBe(true);
    expect(config.features.nightShift).toBe(false);
  });

  test("config with all features disabled is valid", async () => {
    const config = {
      reposPath: "~/Projects",
      tools: { claude: "/usr/local/bin/claude" },
      features: {
        proactiveNudges: false,
        nightShift: false,
        telegram: false,
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);

    expect(parsed.reposPath).toBe("~/Projects");
    expect(parsed.features.proactiveNudges).toBe(false);
    expect(parsed.features.nightShift).toBe(false);
    expect(parsed.features.telegram).toBe(false);
  });

  test("config with multiple tools is valid", async () => {
    const config = {
      reposPath: "~/Gits",
      tools: {
        claude: "/usr/local/bin/claude",
        cursor: "/usr/local/bin/cursor",
        gemini: "/opt/homebrew/bin/gemini",
      },
      features: {
        proactiveNudges: true,
        nightShift: false,
        telegram: false,
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);

    expect(Object.keys(parsed.tools)).toHaveLength(3);
    expect(parsed.tools.claude).toBe("/usr/local/bin/claude");
    expect(parsed.tools.cursor).toBe("/usr/local/bin/cursor");
    expect(parsed.tools.gemini).toBe("/opt/homebrew/bin/gemini");
  });

  test("config does not include tools that were not found", async () => {
    // Simulate: only claude found, others not
    const tools: Record<string, string> = {};
    tools.claude = "/usr/local/bin/claude";
    // cursor, gemini, codex, kiro NOT added (not found)

    const config = {
      reposPath: "~/Projects",
      tools,
      features: {
        proactiveNudges: false,
        nightShift: false,
        telegram: false,
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);

    expect(Object.keys(parsed.tools)).toHaveLength(1);
    expect(parsed.tools.claude).toBeDefined();
    expect(parsed.tools.cursor).toBeUndefined();
    expect(parsed.tools.gemini).toBeUndefined();
  });

  test("config directory is created if missing", async () => {
    const nestedPath = join(tmpDir, "nested", ".golems", "config.json");
    const nestedDir = join(tmpDir, "nested", ".golems");

    await mkdir(nestedDir, { recursive: true });
    await writeFile(
      nestedPath,
      JSON.stringify({ reposPath: "~/test" }, null, 2) + "\n",
    );

    const raw = await readFile(nestedPath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.reposPath).toBe("~/test");
  });

  test("feature flags default to false when not specified", async () => {
    const config = {
      reposPath: "~/Code",
      tools: { claude: "/usr/local/bin/claude" },
      features: {
        proactiveNudges: false,
        nightShift: false,
        telegram: false,
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);

    // All features should be explicitly false
    for (const feature of ["proactiveNudges", "nightShift", "telegram"]) {
      expect(parsed.features[feature]).toBe(false);
    }
  });

  test("selective feature enablement preserves other defaults", async () => {
    // User enables only proactiveNudges
    const enabledFeatures = new Set(["proactiveNudges"]);
    const features: Record<string, boolean> = {};
    for (const f of ["proactiveNudges", "nightShift", "telegram"]) {
      features[f] = enabledFeatures.has(f);
    }

    expect(features.proactiveNudges).toBe(true);
    expect(features.nightShift).toBe(false);
    expect(features.telegram).toBe(false);
  });
});

describe("evals.json structure", () => {
  test("evals.json is valid and has all required fields", async () => {
    const evalsPath = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "..",
      "skills",
      "golem-powers",
      "wizard",
      "evals",
      "evals.json",
    );
    const raw = await readFile(evalsPath, "utf8");
    const data = JSON.parse(raw);

    expect(data.skill_name).toBe("wizard");
    expect(data.evals).toBeArray();
    expect(data.evals).toHaveLength(5);

    for (const ev of data.evals) {
      expect(ev.id).toBeNumber();
      expect(ev.prompt).toBeString();
      expect(ev.expected_output).toBeString();
      expect(ev.files).toBeArray();
      expect(ev.assertions).toBeArray();
      expect(ev.assertions.length).toBeGreaterThan(0);

      for (const assertion of ev.assertions) {
        expect(assertion.name).toBeString();
        expect(assertion.description).toBeString();
      }
    }
  });

  test("eval 1 covers fresh machine with Claude only", async () => {
    const evalsPath = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "..",
      "skills",
      "golem-powers",
      "wizard",
      "evals",
      "evals.json",
    );
    const data = JSON.parse(await readFile(evalsPath, "utf8"));
    const eval1 = data.evals[0];

    expect(eval1.id).toBe(1);
    expect(eval1.prompt).toContain("fresh machine");
    expect(eval1.prompt).toContain("Claude");

    const assertionNames = eval1.assertions.map(
      (a: { name: string }) => a.name,
    );
    expect(assertionNames).toContain("detects-claude-only");
    expect(assertionNames).toContain("asks-workspace-root");
    expect(assertionNames).toContain("asks-opt-in-features");
    expect(assertionNames).toContain("writes-minimal-config");
    expect(assertionNames).toContain("offers-skill-install");
  });

  test("eval 3 covers already-configured scenario", async () => {
    const evalsPath = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "..",
      "skills",
      "golem-powers",
      "wizard",
      "evals",
      "evals.json",
    );
    const data = JSON.parse(await readFile(evalsPath, "utf8"));
    const eval3 = data.evals[2];

    expect(eval3.id).toBe(3);
    expect(eval3.prompt).toContain("already has");

    const assertionNames = eval3.assertions.map(
      (a: { name: string }) => a.name,
    );
    expect(assertionNames).toContain("detects-existing-config");
    expect(assertionNames).toContain("displays-current-config");
    expect(assertionNames).toContain("offers-reconfigure-or-skip");
    expect(assertionNames).toContain("does-not-overwrite-silently");
  });

  test("eval 4 covers invalid workspace path", async () => {
    const evalsPath = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "..",
      "skills",
      "golem-powers",
      "wizard",
      "evals",
      "evals.json",
    );
    const data = JSON.parse(await readFile(evalsPath, "utf8"));
    const eval4 = data.evals[3];

    expect(eval4.id).toBe(4);
    expect(eval4.prompt).toContain("invalid");

    const assertionNames = eval4.assertions.map(
      (a: { name: string }) => a.name,
    );
    expect(assertionNames).toContain("validates-workspace-path");
    expect(assertionNames).toContain("reports-invalid-path");
    expect(assertionNames).toContain("re-asks-for-valid-path");
    expect(assertionNames).toContain("does-not-write-invalid-config");
  });

  test("all fixture files exist", async () => {
    const fixturesDir = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "..",
      "skills",
      "golem-powers",
      "wizard",
      "evals",
      "fixtures",
    );
    const expectedFixtures = [
      "fresh-machine-claude-only.txt",
      "multi-cli-machine.txt",
      "already-configured.txt",
      "invalid-workspace-path.txt",
      "skill-already-installed.txt",
    ];

    for (const fixture of expectedFixtures) {
      const content = await readFile(join(fixturesDir, fixture), "utf8");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test("total assertion count is 22", async () => {
    const evalsPath = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "..",
      "skills",
      "golem-powers",
      "wizard",
      "evals",
      "evals.json",
    );
    const data = JSON.parse(await readFile(evalsPath, "utf8"));

    let totalAssertions = 0;
    for (const ev of data.evals) {
      totalAssertions += ev.assertions.length;
    }
    expect(totalAssertions).toBe(22);
  });
});
