/**
 * Security: Whoop token cache must NOT use /tmp paths.
 *
 * /tmp is world-writable. A local attacker can pre-create a symlink at the
 * predictable path, causing writeFileSync to follow the symlink and overwrite
 * an arbitrary file (e.g. ~/.bashrc). Tokens must be stored under a
 * user-owned config directory with 0o600 permissions.
 */

import { describe, it, expect, afterEach } from "bun:test";
import {
  existsSync,
  unlinkSync,
  symlinkSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  lstatSync,
  statSync,
  chmodSync,
} from "fs";
import { join } from "path";

describe("Whoop token cache path security", () => {
  it("TOKEN_CACHE_PATH must not be under /tmp", async () => {
    // Dynamic import to get the module's constant
    const mod = await import("../whoop/client");
    const path: string = (mod as Record<string, string>).TOKEN_CACHE_PATH;
    expect(path).toBeDefined();
    expect(path.startsWith("/tmp")).toBe(false);
    expect(path).toContain(".config/golems");
  });
});

describe("Whoop token file write safety", () => {
  const TEST_DIR = join(process.env.HOME!, ".config/golems/test-whoop-safety");
  const TARGET_FILE = join(TEST_DIR, "target.txt");
  const SYMLINK_PATH = join(TEST_DIR, "evil-symlink.json");
  const NORMAL_PATH = join(TEST_DIR, "normal-tokens.json");

  function cleanup() {
    for (const f of [TARGET_FILE, SYMLINK_PATH, NORMAL_PATH]) {
      try {
        lstatSync(f);
        unlinkSync(f);
      } catch {}
    }
  }

  afterEach(cleanup);

  it("saveTokensToFile refuses to write to a symlink", async () => {
    cleanup();
    mkdirSync(TEST_DIR, { recursive: true });

    // Create a target file (simulates sensitive file like ~/.bashrc)
    writeFileSync(TARGET_FILE, "original content");

    // Attacker creates symlink at the token path
    symlinkSync(TARGET_FILE, SYMLINK_PATH);

    // Import the safe write function
    const { safeWriteTokens } = await import("../whoop/client");
    safeWriteTokens(SYMLINK_PATH, JSON.stringify({ access_token: "evil" }));

    // Target must be untouched
    expect(readFileSync(TARGET_FILE, "utf-8")).toBe("original content");
  });

  it("saveTokensToFile sets 0o600 permissions on new files", async () => {
    mkdirSync(TEST_DIR, { recursive: true });

    const { safeWriteTokens } = await import("../whoop/client");
    safeWriteTokens(NORMAL_PATH, JSON.stringify({ access_token: "test" }));

    expect(existsSync(NORMAL_PATH)).toBe(true);
    const stat = statSync(NORMAL_PATH);
    // 0o600 = owner read/write only (octal 33152 on some systems, mask with 0o777)
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("saveTokensToFile tightens permissions on existing permissive files", async () => {
    mkdirSync(TEST_DIR, { recursive: true });

    // Pre-create file with permissive 0o644
    writeFileSync(NORMAL_PATH, "old data", { mode: 0o644 });
    chmodSync(NORMAL_PATH, 0o644);
    expect(statSync(NORMAL_PATH).mode & 0o777).toBe(0o644);

    // safeWriteTokens should tighten to 0o600
    const { safeWriteTokens } = await import("../whoop/client");
    safeWriteTokens(NORMAL_PATH, JSON.stringify({ access_token: "new" }));

    expect(statSync(NORMAL_PATH).mode & 0o777).toBe(0o600);
    expect(readFileSync(NORMAL_PATH, "utf-8")).toContain("new");
  });

  it("auth-server must not write tokens to /tmp", async () => {
    // Verify the auth-server source doesn't contain /tmp/whoop-tokens
    const source = readFileSync(
      join(__dirname, "../whoop/auth-server.ts"),
      "utf-8",
    );
    expect(source).not.toContain("/tmp/whoop-tokens");
  });
});
