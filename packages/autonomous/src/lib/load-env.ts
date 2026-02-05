/**
 * Environment Variable Loader
 *
 * Ensures .env is loaded regardless of current working directory.
 * This fixes launchd jobs which run from / instead of the package root.
 *
 * USAGE: Import this at the TOP of any entry point that needs env vars:
 *   import "@/lib/load-env";
 *
 * Or call loadEnv() explicitly if you need to verify it loaded:
 *   import { loadEnv } from "@/lib/load-env";
 *   loadEnv();
 */

import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

// Find package root by looking for package.json
function findPackageRoot(startPath: string): string {
  let dir = startPath;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to known location
  return join(process.env.HOME || "", "Gits/golems/packages/autonomous");
}

let _loaded = false;

export function loadEnv(): boolean {
  if (_loaded) return true;

  const packageRoot = findPackageRoot(dirname(import.meta.path));
  const envFile = join(packageRoot, ".env");

  if (!existsSync(envFile)) {
    console.warn(`[load-env] No .env file found at ${envFile}`);
    return false;
  }

  const content = readFileSync(envFile, "utf-8");
  let count = 0;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex);
    let value = trimmed.slice(eqIndex + 1);

    // Strip surrounding quotes (single or double)
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Don't override existing env vars (launchd or shell might set them)
    if (!process.env[key]) {
      process.env[key] = value;
      count++;
    }
  }

  _loaded = true;
  return true;
}

// Auto-load on import
loadEnv();
