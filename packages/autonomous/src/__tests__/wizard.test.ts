import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { join } from "path";

// Mock execSync before importing
const mockExecSync = mock(() => "");
mock.module("child_process", () => ({
  execSync: mockExecSync,
}));

// Mock fs
const mockExistsSync = mock(() => true);
const mockWriteFileSync = mock(() => {});
const mockMkdirSync = mock(() => {});
mock.module("fs", () => ({
  existsSync: mockExistsSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  statSync: mock(() => ({ size: 1000 })),
}));

import {
  checkPrerequisite,
  getRequiredEnvVars,
  generateSetupLog,
  shellExec,
} from "../wizard";
import type { SetupLogEntry } from "../wizard" with { type: "macro" };

describe("wizard", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExistsSync.mockReset();
    mockWriteFileSync.mockReset();
  });

  describe("checkPrerequisite", () => {
    it("detects installed tool and returns version", () => {
      mockExecSync.mockImplementation(() => "1.1.42\n");
      const result = checkPrerequisite("bun", "--version", "curl install");

      expect(result.name).toBe("bun");
      expect(result.found).toBe(true);
      expect(result.version).toBe("1.1.42");
      expect(result.installCmd).toBeUndefined();
    });

    it("detects missing tool and returns install command", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("not found");
      });
      const result = checkPrerequisite("railway", "--version", "npm i -g @railway/cli");

      expect(result.name).toBe("railway");
      expect(result.found).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.installCmd).toBe("npm i -g @railway/cli");
    });
  });

  describe("getRequiredEnvVars", () => {
    it("returns unique env vars for selected services", () => {
      const vars = getRequiredEnvVars(["email", "job"]);

      expect(vars).toContain("GMAIL_CLIENT_ID");
      expect(vars).toContain("SUPABASE_URL");
      expect(vars).toContain("SUPABASE_ANON_KEY");
      // SUPABASE_URL appears in both but should be deduplicated
      const supabaseCount = vars.filter((v) => v === "SUPABASE_URL").length;
      expect(supabaseCount).toBe(1);
    });

    it("returns empty array when no services selected", () => {
      const vars = getRequiredEnvVars([]);
      expect(vars).toEqual([]);
    });

    it("returns telegram vars for telegram service", () => {
      const vars = getRequiredEnvVars(["telegram"]);
      expect(vars).toContain("TELEGRAM_BOT_TOKEN");
      expect(vars).toContain("TELEGRAM_CHAT_ID");
      expect(vars).not.toContain("SUPABASE_URL");
    });
  });

  describe("generateSetupLog", () => {
    it("generates valid markdown with all phases", () => {
      const log: Array<{
        phase: string;
        item: string;
        status: "ok" | "skipped" | "failed" | "warning";
        detail?: string;
      }> = [
        { phase: "preflight", item: "bun", status: "ok", detail: "1.1.42" },
        { phase: "preflight", item: "git", status: "ok", detail: "git version 2.43" },
        { phase: "core", item: "repo", status: "ok" },
        { phase: "services", item: "telegram", status: "ok", detail: "selected" },
        { phase: "services", item: "email", status: "skipped" },
        { phase: "secrets", item: "TELEGRAM_BOT_TOKEN", status: "warning", detail: "missing" },
      ];

      mockExecSync.mockImplementation(() => "test-machine");
      const md = generateSetupLog(log, ["telegram"]);

      expect(md).toContain("# Golems Setup Log");
      expect(md).toContain("**Selected Services:** telegram");
      expect(md).toContain("## Phase: preflight");
      expect(md).toContain("## Phase: core");
      expect(md).toContain("## Phase: services");
      expect(md).toContain("## Phase: secrets");
      expect(md).toContain("| bun | OK | 1.1.42 |");
      expect(md).toContain("| TELEGRAM_BOT_TOKEN | WARN | missing |");
      expect(md).toContain("## Next Steps");
    });

    it("handles empty log gracefully", () => {
      mockExecSync.mockImplementation(() => "host");
      const md = generateSetupLog([], []);

      expect(md).toContain("# Golems Setup Log");
      expect(md).toContain("**Selected Services:** none");
      expect(md).toContain("## Next Steps");
    });
  });

  describe("shellExec", () => {
    it("returns ok true on successful command", () => {
      mockExecSync.mockImplementation(() => "hello world\n");
      const result = shellExec("echo hello");

      expect(result.ok).toBe(true);
      expect(result.output).toBe("hello world");
    });

    it("returns ok false on failed command", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("command not found");
      });
      const result = shellExec("nonexistent-cmd");

      expect(result.ok).toBe(false);
      expect(result.output).toBe("");
    });
  });
});
