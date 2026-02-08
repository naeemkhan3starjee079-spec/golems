/**
 * Centralized Golems Configuration
 *
 * Reads from ~/.golems/config.yaml with sensible defaults.
 * All golem services use this instead of scattered hardcoded paths.
 *
 * Config search order:
 * 1. Environment variables (highest priority)
 * 2. ~/.golems/config.yaml
 * 3. Built-in defaults
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";

const HOME = process.env.HOME;
if (!HOME) throw new Error("HOME environment variable is required");
const CONFIG_DIR = join(HOME, ".golems");
const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");

// ─── Types ─────────────────────────────────────────────────────────

export interface GolemsConfig {
  /** Base path for all git repos */
  reposPath: string;

  /** State directory for runtime data */
  stateDir: string;

  /** Tool binary paths (absolute, for launchd compatibility) */
  tools: {
    claude: string;
    gemini: string;
    gh: string;
    cursor: string;
    codex: string;
    kiro: string;
  };

  /** NightShift settings */
  nightshift: {
    /** Repo rotation order */
    rotation: string[];
    /** Claude timeout in ms */
    timeout: number;
    /** Enable Gemini pre-scan */
    geminiPreScan: boolean;
    /** Enable self-healing fix list */
    selfHealing: boolean;
  };

  /** Telegram settings */
  telegram: {
    /** Bot token (prefer env var TELEGRAM_BOT_TOKEN) */
    token?: string;
    /** Notification server port */
    notifyPort: number;
  };

  /** Feature flags */
  features: {
    emailGolem: boolean;
    jobGolem: boolean;
    recruiterGolem: boolean;
    tellerGolem: boolean;
    nightShift: boolean;
    soltome: boolean;
  };
}

// ─── Defaults ──────────────────────────────────────────────────────

const DEFAULTS: GolemsConfig = {
  reposPath: `${HOME}/Gits`,
  stateDir: `${HOME}/.golems-zikaron`,
  tools: {
    claude: `${HOME}/.local/bin/claude`,
    gemini: `${HOME}/.nvm/versions/node/v22.0.0/bin/gemini`,
    gh: "/usr/local/bin/gh",
    cursor: `${HOME}/.local/bin/cursor`,
    codex: `${HOME}/.nvm/versions/node/v22.0.0/bin/npx`,
    kiro: `${HOME}/.local/bin/kiro-cli`,
  },
  nightshift: {
    rotation: ["songscript", "zikaron", "claude-golem"],
    timeout: 300000,
    geminiPreScan: true,
    selfHealing: true,
  },
  telegram: {
    notifyPort: 3847,
  },
  features: {
    emailGolem: true,
    jobGolem: true,
    recruiterGolem: true,
    tellerGolem: true,
    nightShift: true,
    soltome: true,
  },
};

// ─── Loader ────────────────────────────────────────────────────────

let cachedConfig: GolemsConfig | null = null;

export function deepMerge<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T>
): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key];
    if (
      val !== undefined &&
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof defaults[key] === "object" &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(
        defaults[key] as Record<string, unknown>,
        val as Record<string, unknown>
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

/**
 * Load config from ~/.golems/config.yaml merged with defaults.
 * Caches result for the process lifetime.
 */
export function loadConfig(): GolemsConfig {
  if (cachedConfig) return cachedConfig;

  let fileConfig: Partial<GolemsConfig> = {};

  if (existsSync(CONFIG_FILE)) {
    try {
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      fileConfig = parseYaml(raw) || {};
    } catch (err) {
      console.warn(`[Config] Failed to parse ${CONFIG_FILE}:`, err);
    }
  }

  // Environment variable overrides
  const envOverrides: Partial<GolemsConfig> = {};
  if (process.env.REPOS_PATH) envOverrides.reposPath = process.env.REPOS_PATH;
  if (process.env.GOLEMS_STATE_DIR)
    envOverrides.stateDir = process.env.GOLEMS_STATE_DIR;

  cachedConfig = deepMerge(deepMerge(DEFAULTS, fileConfig), envOverrides);
  return cachedConfig;
}

/** Reset cached config (for testing) */
export function resetConfig() {
  cachedConfig = null;
}

/**
 * Generate a default config.yaml if one doesn't exist.
 * Called by `golems wizard` or `golems init`.
 */
export function initConfig(): string {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (existsSync(CONFIG_FILE)) {
    return `Config already exists at ${CONFIG_FILE}`;
  }

  const defaultYaml = `# Golems Configuration
# See: https://etanhey.github.io/golems/docs/configuration

# Base path for git repos
reposPath: "${HOME}/Gits"

# Runtime state directory
stateDir: "${HOME}/.golems-zikaron"

# CLI tool paths (absolute for launchd compatibility)
tools:
  claude: "${HOME}/.local/bin/claude"
  gemini: "${HOME}/.nvm/versions/node/v22.0.0/bin/gemini"
  gh: "/usr/local/bin/gh"
  cursor: "${HOME}/.local/bin/cursor"
  codex: "${HOME}/.nvm/versions/node/v22.0.0/bin/npx"
  kiro: "${HOME}/.local/bin/kiro-cli"

# NightShift configuration
nightshift:
  rotation:
    - songscript
    - zikaron
    - claude-golem
  timeout: 300000     # 5 minutes
  geminiPreScan: true
  selfHealing: true

# Telegram bot
telegram:
  notifyPort: 3847

# Feature flags (enable/disable golems)
features:
  emailGolem: true
  jobGolem: true
  recruiterGolem: true
  tellerGolem: true
  nightShift: true
  soltome: true
`;

  writeFileSync(CONFIG_FILE, defaultYaml);
  return `Created ${CONFIG_FILE}`;
}
