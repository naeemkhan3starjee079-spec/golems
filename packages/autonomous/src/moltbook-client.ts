#!/usr/bin/env bun
/**
 * Moltbook Client - Agent Identity Verification
 *
 * IMPORTANT: Moltbook is an IDENTITY platform, not a social network API.
 * - It verifies agent identity for third-party services
 * - It does NOT have a posts/content API
 * - The "submolts" and post browsing are only accessible via the website
 *
 * For content/posts, use Soltome (soltome-client.ts) instead.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// State file for credentials
function getStateFile(): string {
  const home = homedir() || process.env.HOME || process.env.USERPROFILE;
  if (!home || home === "/" || home.length < 2) {
    throw new Error("Cannot determine valid home directory for state file. Set HOME environment variable.");
  }
  return join(home, ".golems-zikaron/state.json");
}
const STATE_FILE = getStateFile();

// Moltbook API base URL
const API_BASE = "https://www.moltbook.com/api/v1";

/**
 * Load Moltbook credentials from state file
 */
function loadCredentials(): { apiKey: string; agentId: string } | null {
  if (existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      if (state.moltbookApiKey && state.moltbookAgentId) {
        return {
          apiKey: state.moltbookApiKey,
          agentId: state.moltbookAgentId,
        };
      }
    } catch (err) {
      console.error("[Moltbook] Failed to read state file:", err);
    }
  }
  return null;
}

/**
 * Generate an identity token for third-party authentication
 * This token can be verified by other services to confirm agent identity
 */
export async function generateIdentityToken(): Promise<string | null> {
  const creds = loadCredentials();
  if (!creds) {
    console.error("[Moltbook] No credentials found in state file");
    return null;
  }

  try {
    const resp = await fetch(`${API_BASE}/agents/me/identity-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      console.error(`[Moltbook] Token generation failed: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    return data.token || null;
  } catch (err) {
    console.error("[Moltbook] Token generation error:", err);
    return null;
  }
}

/**
 * Check if we have valid Moltbook credentials
 */
export function hasCredentials(): boolean {
  const creds = loadCredentials();
  return creds !== null;
}

/**
 * Get current Moltbook status from state
 */
export function getMoltbookStatus(): {
  verified: boolean;
  agentId?: string;
} {
  if (!existsSync(STATE_FILE)) {
    return { verified: false };
  }

  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    return {
      verified: state.moltbookStatus === "verified",
      agentId: state.moltbookAgentId,
    };
  } catch {
    return { verified: false };
  }
}

/**
 * Check Moltbook website availability (not API health)
 */
export async function checkMoltbookHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch("https://www.moltbook.com/", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (resp.ok) {
      return { healthy: true };
    }
    return { healthy: false, error: `HTTP ${resp.status}` };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { healthy: false, error: "Timeout" };
    }
    return { healthy: false, error: err.message || "Unknown error" };
  }
}

// CLI test
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args[0] === "health") {
    console.log("Checking Moltbook website...");
    const result = await checkMoltbookHealth();
    console.log(result.healthy ? "Moltbook is UP" : `Moltbook is DOWN: ${result.error}`);
  } else if (args[0] === "status") {
    const status = getMoltbookStatus();
    console.log("Moltbook Status:");
    console.log(`  Verified: ${status.verified}`);
    console.log(`  Agent ID: ${status.agentId || "not set"}`);
  } else if (args[0] === "token") {
    console.log("Generating identity token...");
    const token = await generateIdentityToken();
    if (token) {
      // Only show partial token with --show flag for security
      if (args.includes("--show")) {
        console.log(`Token: ${token.slice(0, 20)}...`);
      } else {
        console.log("Token generated successfully (use --show to display)");
      }
    } else {
      console.log("Failed to generate token");
    }
  } else {
    console.log("Moltbook Client - Agent Identity Platform");
    console.log("");
    console.log("NOTE: Moltbook is for identity verification only.");
    console.log("      For content/posts, use Soltome (soltome-client.ts)");
    console.log("");
    console.log("Usage:");
    console.log("  bun moltbook-client.ts health  - Check if Moltbook website is up");
    console.log("  bun moltbook-client.ts status  - Show current verification status");
    console.log("  bun moltbook-client.ts token   - Generate identity token");
  }
}
