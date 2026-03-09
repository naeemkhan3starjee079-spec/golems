/**
 * Whoop token auth flow tests.
 *
 * Bug 1: auth-server.ts has wrong import path for supabase-factory
 * Bug 2: client.ts getBestRefreshToken() doesn't check local file fallback
 * Bug 3: auth-server.ts doesn't handle port 3000 already in use
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, rmSync } from "fs";
import { join } from "path";

// --- Bug 1: auth-server Supabase import path ---

describe("auth-server Supabase import path", () => {
  it("uses correct relative path to supabase-factory", () => {
    // auth-server.ts is at packages/shared/src/whoop/auth-server.ts
    // supabase-factory is at packages/shared/src/lib/supabase-factory.ts
    // Correct: ../lib/supabase-factory (one dir up from whoop/ to src/, then into lib/)
    // Wrong:  ../../lib/supabase-factory (goes up to packages/shared/, no lib/ there)
    const source = readFileSync(
      join(__dirname, "../whoop/auth-server.ts"),
      "utf-8",
    );
    expect(source).not.toContain("../../lib/supabase-factory");
    expect(source).toContain("../lib/supabase-factory");
  });
});

// --- Bug 2: client.ts file-based refresh token fallback ---

describe("client refresh token from file fallback", () => {
  const TEST_DIR = join(
    process.env.HOME!,
    ".config/golems/test-whoop-auth-flow",
  );
  const TEST_TOKEN_PATH = join(TEST_DIR, "test-tokens.json");

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      unlinkSync(TEST_TOKEN_PATH);
    } catch {}
  });

  afterAll(() => {
    try {
      rmSync(TEST_DIR, { recursive: true });
    } catch {}
  });

  it("exports loadRefreshTokenFromFile function", async () => {
    const mod = await import("../whoop/client");
    expect(typeof mod.loadRefreshTokenFromFile).toBe("function");
  });

  it("loadRefreshTokenFromFile returns refresh token from expired cache file", async () => {
    // File has expired access token but a valid refresh token
    const expiredTokens = {
      access_token: "expired_access",
      refresh_token: "valid_refresh_from_file",
      expires_at: Date.now() - 60_000, // expired 1 min ago
    };
    writeFileSync(TEST_TOKEN_PATH, JSON.stringify(expiredTokens));

    const { loadRefreshTokenFromFile } = await import("../whoop/client");
    const token = loadRefreshTokenFromFile(TEST_TOKEN_PATH);
    expect(token).toBe("valid_refresh_from_file");
  });

  it("loadRefreshTokenFromFile returns null for missing file", async () => {
    const { loadRefreshTokenFromFile } = await import("../whoop/client");
    const token = loadRefreshTokenFromFile("/nonexistent/path/tokens.json");
    expect(token).toBeNull();
  });

  it("loadRefreshTokenFromFile returns null for file without refresh_token", async () => {
    writeFileSync(
      TEST_TOKEN_PATH,
      JSON.stringify({ access_token: "only_access" }),
    );

    const { loadRefreshTokenFromFile } = await import("../whoop/client");
    const token = loadRefreshTokenFromFile(TEST_TOKEN_PATH);
    expect(token).toBeNull();
  });
});

// --- Bug 3: auth-server port cleanup ---

describe("auth-server port cleanup", () => {
  it("exports killPort utility", async () => {
    const mod = await import("../whoop/auth-server");
    expect(typeof mod.killPort).toBe("function");
  });

  it("killPort does not throw for unused ports", async () => {
    const { killPort } = await import("../whoop/auth-server");
    // Port 19999 is almost certainly not in use
    expect(() => killPort(19999)).not.toThrow();
  });

  it("auth-server source calls killPort before Bun.serve", () => {
    const source = readFileSync(
      join(__dirname, "../whoop/auth-server.ts"),
      "utf-8",
    );
    // Find the call site (e.g. "killPort(AUTH_PORT)"), not the function definition
    const defIdx = source.indexOf("export function killPort");
    const callIdx = source.indexOf("killPort(", defIdx + 1);
    const serveIdx = source.indexOf("Bun.serve");
    expect(callIdx).toBeGreaterThan(-1);
    expect(serveIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeLessThan(serveIdx);
  });
});
