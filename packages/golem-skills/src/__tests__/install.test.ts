import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installSkill } from "../install";

describe("installSkill()", () => {
  let tmpDir: string;
  let commandsDir: string;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "golem-skills-install-test-"));
    commandsDir = join(tmpDir, "commands");
    await mkdir(commandsDir, { recursive: true });
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    global.fetch = originalFetch;
  });

  function mockGitHub(
    skillName: string,
    files: { path: string; content: string }[],
  ) {
    global.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === "string" ? url : url.toString();
      // Contents API listing
      if (
        u.includes(`contents/skills/golem-powers/${skillName}`) &&
        !u.includes("raw.githubusercontent")
      ) {
        const entries = files.map((f) => ({
          name: f.path.split("/").pop(),
          type: "file",
          path: `skills/golem-powers/${skillName}/${f.path}`,
          download_url: `https://raw.githubusercontent.com/EtanHey/golems/master/skills/golem-powers/${skillName}/${f.path}`,
          url: "",
        }));
        return new Response(JSON.stringify(entries), { status: 200 });
      }
      // Raw file download
      const matchedFile = files.find((f) => u.includes(f.path));
      if (matchedFile) {
        return new Response(matchedFile.content, { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;
  }

  test("creates skill directory and writes SKILL.md", async () => {
    mockGitHub("cmux", [{ path: "SKILL.md", content: "# cmux skill" }]);

    await installSkill("cmux", { commandsDir });

    const content = await readFile(
      join(commandsDir, "cmux", "SKILL.md"),
      "utf8",
    );
    expect(content).toBe("# cmux skill");
  });

  test("skips install if skill already exists (no force)", async () => {
    const skillDir = join(commandsDir, "cmux");
    await mkdir(skillDir);
    await writeFile(join(skillDir, "SKILL.md"), "existing content");

    let fetchCalled = false;
    global.fetch = mock(async () => {
      fetchCalled = true;
      return new Response("", { status: 200 });
    }) as typeof fetch;

    await installSkill("cmux", { commandsDir, force: false });

    expect(fetchCalled).toBe(false);
    const content = await readFile(join(skillDir, "SKILL.md"), "utf8");
    expect(content).toBe("existing content");
  });

  test("overwrites existing skill with force: true", async () => {
    const skillDir = join(commandsDir, "cmux");
    await mkdir(skillDir);
    await writeFile(join(skillDir, "SKILL.md"), "old content");

    mockGitHub("cmux", [{ path: "SKILL.md", content: "new content" }]);

    await installSkill("cmux", { commandsDir, force: true });

    const content = await readFile(join(skillDir, "SKILL.md"), "utf8");
    expect(content).toBe("new content");
  });

  test("returns install result with skill name", async () => {
    mockGitHub("commit", [{ path: "SKILL.md", content: "# commit" }]);

    const result = await installSkill("commit", { commandsDir });

    expect(result.name).toBe("commit");
    expect(result.installed).toBe(true);
  });

  test("returns skipped result when already installed", async () => {
    await mkdir(join(commandsDir, "cmux"));

    const result = await installSkill("cmux", {
      commandsDir,
      force: false,
    });

    expect(result.name).toBe("cmux");
    expect(result.installed).toBe(false);
    expect(result.skipped).toBe(true);
  });
});
