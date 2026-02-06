#!/usr/bin/env bun
/**
 * Golems Setup Wizard
 *
 * Interactive setup tool for new users/machines.
 * Run: bun run src/wizard.ts  OR  golems setup
 */

import * as readline from "readline";
import { existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrereqResult {
  name: string;
  found: boolean;
  version?: string;
  installCmd?: string;
}

interface ServiceOption {
  key: string;
  name: string;
  description: string;
  envVars: string[];
  diskImpact: string;
}

interface SetupLogEntry {
  phase: string;
  item: string;
  status: "ok" | "skipped" | "failed" | "warning";
  detail?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOLEMS_HOME =
  process.env.GOLEMS_HOME ||
  join(process.env.HOME || "~", "Gits/golems/packages/autonomous");
const STATE_DIR = join(process.env.HOME || "~", ".golems-zikaron");
const ENV_PATH = join(GOLEMS_HOME, ".env");

const SERVICES: ServiceOption[] = [
  {
    key: "email",
    name: "Email Golem",
    description:
      "Polls Gmail every 10 min, scores/routes emails, alerts on urgent items",
    envVars: [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
    ],
    diskImpact: "~5 MB (SQLite cache + offline queue)",
  },
  {
    key: "job",
    name: "Job Golem",
    description:
      "Scrapes job boards, scores matches, notifies on high-scoring jobs",
    envVars: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
    diskImpact: "~10 MB (job database)",
  },
  {
    key: "telegram",
    name: "Telegram Bot",
    description:
      "Chat interface + notification server on port 3847. Central hub for all golems.",
    envVars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    diskImpact: "~2 MB (logs)",
  },
  {
    key: "nightshift",
    name: "Night Shift",
    description:
      "Autonomous Claude sessions at 4am - scans repos, implements improvements, creates PRs",
    envVars: [],
    diskImpact: "~1 MB (session logs)",
  },
  {
    key: "cloud",
    name: "Cloud (Railway)",
    description:
      "Deploy cloud worker to Railway. Runs email/job/briefing/soltome on a schedule remotely.",
    envVars: [
      "ANTHROPIC_API_KEY",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "TELEGRAM_CHAT_ID",
      "TELEGRAM_BOT_TOKEN",
    ],
    diskImpact: "0 MB local (runs on Railway)",
  },
];

const OP_SECRET_MAP: Record<string, string> = {
  TELEGRAM_BOT_TOKEN:
    "op://development/GolemsZikaron Telegram Bot/credential",
  ANTHROPIC_API_KEY:
    "op://development/ANTHROPIC_GOLEMS_API_KEY/credential",
  GMAIL_CLIENT_ID: "op://development/Gmail OAuth Golems/client_id",
  GMAIL_CLIENT_SECRET: "op://development/Gmail OAuth Golems/client_secret",
  GMAIL_REFRESH_TOKEN: "op://development/Gmail OAuth Golems/refresh_token",
  SUPABASE_URL: "op://development/Supabase Golems/url",
  SUPABASE_ANON_KEY: "op://development/Supabase Golems/anon_key",
  TELEGRAM_CHAT_ID: "op://development/GolemsZikaron Telegram Bot/chat_id",
};

// ---------------------------------------------------------------------------
// Readline helpers
// ---------------------------------------------------------------------------

let rl: readline.Interface;

function createRL(): readline.Interface {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return rl;
}

export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

export async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} [y/N] `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function print(msg: string) {
  console.log(msg);
}

function header(title: string) {
  print("");
  print("=".repeat(60));
  print(`  ${title}`);
  print("=".repeat(60));
  print("");
}

function success(msg: string) {
  print(`  [OK] ${msg}`);
}

function warn(msg: string) {
  print(`  [!!] ${msg}`);
}

function fail(msg: string) {
  print(`  [FAIL] ${msg}`);
}

function info(msg: string) {
  print(`  [..] ${msg}`);
}

export function shellExec(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf8", timeout: 15000 }).trim();
    return { ok: true, output };
  } catch {
    return { ok: false, output: "" };
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Pre-flight
// ---------------------------------------------------------------------------

export function checkPrerequisite(name: string, versionFlag: string, installCmd: string): PrereqResult {
  const result = shellExec(`${name} ${versionFlag} 2>&1`);
  return {
    name,
    found: result.ok,
    version: result.ok ? result.output.split("\n")[0] : undefined,
    installCmd: result.ok ? undefined : installCmd,
  };
}

export async function phasePreflight(log: SetupLogEntry[]): Promise<boolean> {
  header("Phase 1: Pre-flight Checks");

  const prereqs: PrereqResult[] = [
    checkPrerequisite("bun", "--version", "curl -fsSL https://bun.sh/install | bash"),
    checkPrerequisite("git", "--version", "brew install git"),
    checkPrerequisite("op", "--version", "brew install --cask 1password-cli"),
    checkPrerequisite("railway", "--version", "npm i -g @railway/cli"),
  ];

  let allGood = true;
  for (const p of prereqs) {
    if (p.found) {
      success(`${p.name} found: ${p.version}`);
      log.push({ phase: "preflight", item: p.name, status: "ok", detail: p.version });
    } else {
      warn(`${p.name} not found. Install: ${p.installCmd}`);
      log.push({ phase: "preflight", item: p.name, status: "warning", detail: `Missing. ${p.installCmd}` });
      allGood = false;
    }
  }

  // Disk space
  const df = shellExec("df -h . | tail -1");
  if (df.ok) {
    const parts = df.output.split(/\s+/);
    const avail = parts[3] || "unknown";
    info(`Available disk space: ${avail}`);
    log.push({ phase: "preflight", item: "disk_space", status: "ok", detail: avail });
  }

  if (!allGood) {
    print("");
    warn("Some prerequisites are missing. You can continue but some phases may fail.");
    const cont = await confirm("Continue anyway?");
    if (!cont) {
      log.push({ phase: "preflight", item: "abort", status: "failed", detail: "User chose to stop" });
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Phase 2: Core Setup
// ---------------------------------------------------------------------------

export async function phaseCoreSetup(log: SetupLogEntry[]): Promise<boolean> {
  header("Phase 2: Core Setup");

  // Check repo
  if (existsSync(join(GOLEMS_HOME, "package.json"))) {
    success(`Repo found at ${GOLEMS_HOME}`);
    log.push({ phase: "core", item: "repo", status: "ok" });
  } else {
    fail(`Repo not found at ${GOLEMS_HOME}`);
    log.push({ phase: "core", item: "repo", status: "failed", detail: "package.json missing" });
    return false;
  }

  // Check branch
  const branch = shellExec(`git -C "${GOLEMS_HOME}" rev-parse --abbrev-ref HEAD`);
  if (branch.ok) {
    info(`Current branch: ${branch.output}`);
    log.push({ phase: "core", item: "branch", status: "ok", detail: branch.output });
  }

  // bun install
  if (await confirm("Run bun install?")) {
    info("Running bun install...");
    const install = shellExec(`cd "${GOLEMS_HOME}" && bun install`);
    if (install.ok) {
      success("Dependencies installed");
      log.push({ phase: "core", item: "bun_install", status: "ok" });
    } else {
      fail("bun install failed");
      log.push({ phase: "core", item: "bun_install", status: "failed" });
    }
  } else {
    log.push({ phase: "core", item: "bun_install", status: "skipped" });
  }

  // .env
  if (existsSync(ENV_PATH)) {
    success(`.env exists at ${ENV_PATH}`);
    log.push({ phase: "core", item: "env_file", status: "ok" });
  } else {
    warn(`.env not found at ${ENV_PATH}`);
    info("You'll need to create one. Phase 4 (Secrets) will help with this.");
    log.push({ phase: "core", item: "env_file", status: "warning", detail: "Will create in Phase 4" });
  }

  // State dir
  if (!existsSync(STATE_DIR)) {
    info(`Creating state dir: ${STATE_DIR}`);
    mkdirSync(STATE_DIR, { recursive: true });
  }
  success(`State dir: ${STATE_DIR}`);
  log.push({ phase: "core", item: "state_dir", status: "ok" });

  return true;
}

// ---------------------------------------------------------------------------
// Phase 3: Service Selection
// ---------------------------------------------------------------------------

export async function phaseServiceSelection(log: SetupLogEntry[]): Promise<string[]> {
  header("Phase 3: Service Selection");

  print("Select which services to enable:\n");

  const selected: string[] = [];

  for (const svc of SERVICES) {
    print(`--- ${svc.name} ---`);
    print(`  What: ${svc.description}`);
    print(`  Needs: ${svc.envVars.length > 0 ? svc.envVars.join(", ") : "no special env vars"}`);
    print(`  Disk: ${svc.diskImpact}`);
    print("");

    if (await confirm(`  Enable ${svc.name}?`)) {
      selected.push(svc.key);
      success(`${svc.name} selected`);
      log.push({ phase: "services", item: svc.key, status: "ok", detail: "selected" });
    } else {
      info(`${svc.name} skipped`);
      log.push({ phase: "services", item: svc.key, status: "skipped" });
    }
    print("");
  }

  print(`\nSelected: ${selected.length > 0 ? selected.join(", ") : "none"}`);
  return selected;
}

// ---------------------------------------------------------------------------
// Phase 4: Secrets
// ---------------------------------------------------------------------------

export function getRequiredEnvVars(selectedServices: string[]): string[] {
  const vars = new Set<string>();
  for (const key of selectedServices) {
    const svc = SERVICES.find((s) => s.key === key);
    if (svc) {
      for (const v of svc.envVars) {
        vars.add(v);
      }
    }
  }
  return [...vars];
}

export async function phaseSecrets(
  selectedServices: string[],
  log: SetupLogEntry[]
): Promise<void> {
  header("Phase 4: Secrets");

  const required = getRequiredEnvVars(selectedServices);
  if (required.length === 0) {
    info("No secrets needed for selected services.");
    return;
  }

  print(`Required env vars: ${required.join(", ")}\n`);

  const hasOp = shellExec("op --version").ok;

  for (const varName of required) {
    // Check if already in environment
    if (process.env[varName]) {
      success(`${varName} - already set in environment`);
      log.push({ phase: "secrets", item: varName, status: "ok", detail: "in environment" });
      continue;
    }

    // Try 1Password
    const opRef = OP_SECRET_MAP[varName];
    if (hasOp && opRef) {
      info(`Trying op read for ${varName}...`);
      const opResult = shellExec(`op read "${opRef}" 2>/dev/null`);
      if (opResult.ok && opResult.output.length > 0) {
        success(`${varName} - available in 1Password`);
        log.push({ phase: "secrets", item: varName, status: "ok", detail: "from 1Password" });
        continue;
      }
    }

    // Not found
    warn(`${varName} - NOT FOUND`);
    if (opRef) {
      info(`  1Password ref: ${opRef}`);
      info(`  Create item in 1Password or add to .env manually`);
    } else {
      info(`  Add to ${ENV_PATH} manually`);
    }
    log.push({ phase: "secrets", item: varName, status: "warning", detail: "missing" });
  }
}

// ---------------------------------------------------------------------------
// Phase 5: Deploy
// ---------------------------------------------------------------------------

export async function phaseDeploy(
  selectedServices: string[],
  log: SetupLogEntry[]
): Promise<void> {
  header("Phase 5: Deploy");

  // Railway
  if (selectedServices.includes("cloud")) {
    print("--- Railway Deployment ---");
    if (await confirm("Run railway login?")) {
      const login = shellExec("railway login");
      if (login.ok) {
        success("Railway login successful");
        log.push({ phase: "deploy", item: "railway_login", status: "ok" });
      } else {
        fail("Railway login failed (run manually: railway login)");
        log.push({ phase: "deploy", item: "railway_login", status: "failed" });
      }
    } else {
      log.push({ phase: "deploy", item: "railway_login", status: "skipped" });
    }

    if (await confirm("Run railway link?")) {
      const link = shellExec(`cd "${GOLEMS_HOME}" && railway link`);
      if (link.ok) {
        success("Railway project linked");
        log.push({ phase: "deploy", item: "railway_link", status: "ok" });
      } else {
        fail("Railway link failed");
        log.push({ phase: "deploy", item: "railway_link", status: "failed" });
      }
    } else {
      log.push({ phase: "deploy", item: "railway_link", status: "skipped" });
    }
  }

  // Local launchd services
  const launchdServices = selectedServices.filter((s) => s !== "cloud");
  if (launchdServices.length > 0) {
    print("\n--- Local launchd Services ---");
    const plistDir = join(process.env.HOME || "~", "Library/LaunchAgents");

    for (const svc of launchdServices) {
      const plistName = `com.golemszikaron.${svc === "job" ? "job-golem" : svc === "email" ? "email-golem" : svc}.plist`;
      const plistPath = join(plistDir, plistName);

      if (existsSync(plistPath)) {
        success(`${plistName} exists`);
        log.push({ phase: "deploy", item: plistName, status: "ok" });
      } else {
        warn(`${plistName} not found at ${plistPath}`);
        info(`Check launchd/ directory for template plists`);
        log.push({ phase: "deploy", item: plistName, status: "warning", detail: "plist not found" });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 6: Verify
// ---------------------------------------------------------------------------

export async function phaseVerify(
  selectedServices: string[],
  log: SetupLogEntry[]
): Promise<void> {
  header("Phase 6: Verify");

  for (const svc of selectedServices) {
    switch (svc) {
      case "telegram": {
        info("Checking Telegram bot (port 3847)...");
        const health = shellExec("curl -s --max-time 3 http://localhost:3847/health");
        if (health.ok) {
          success("Telegram bot is responding");
          log.push({ phase: "verify", item: "telegram", status: "ok" });
        } else {
          warn("Telegram bot not responding (is it running?)");
          log.push({ phase: "verify", item: "telegram", status: "warning", detail: "not responding" });
        }
        break;
      }
      case "cloud": {
        const url = process.env.RAILWAY_URL || "https://golems-cloud.up.railway.app";
        info(`Checking Railway cloud (${url})...`);
        const health = shellExec(`curl -s --max-time 5 "${url}/health"`);
        if (health.ok && health.output.includes("ok")) {
          success("Railway cloud worker is healthy");
          log.push({ phase: "verify", item: "cloud", status: "ok" });
        } else {
          warn("Railway cloud not responding");
          log.push({ phase: "verify", item: "cloud", status: "warning", detail: "not responding" });
        }
        break;
      }
      case "email":
      case "job":
      case "nightshift": {
        const label = `com.golemszikaron.${svc === "job" ? "job-golem" : svc === "email" ? "email-golem" : svc}`;
        const check = shellExec(`launchctl list 2>/dev/null | grep "${label}"`);
        if (check.ok && check.output.length > 0) {
          success(`${svc} launchd service is loaded`);
          log.push({ phase: "verify", item: svc, status: "ok" });
        } else {
          warn(`${svc} launchd service not loaded`);
          log.push({ phase: "verify", item: svc, status: "warning", detail: "not loaded" });
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 7: Post-flight (SETUP_LOG.md generation)
// ---------------------------------------------------------------------------

export function generateSetupLog(
  log: SetupLogEntry[],
  selectedServices: string[]
): string {
  const now = new Date().toISOString();
  const lines: string[] = [
    "# Golems Setup Log",
    "",
    `**Generated:** ${now}`,
    `**Machine:** ${shellExec("hostname").output || "unknown"}`,
    `**Selected Services:** ${selectedServices.join(", ") || "none"}`,
    "",
    "---",
    "",
  ];

  // Group by phase
  const phases = ["preflight", "core", "services", "secrets", "deploy", "verify"];
  for (const phase of phases) {
    const entries = log.filter((e) => e.phase === phase);
    if (entries.length === 0) continue;

    lines.push(`## Phase: ${phase}`);
    lines.push("");
    lines.push("| Item | Status | Detail |");
    lines.push("|------|--------|--------|");
    for (const e of entries) {
      const icon =
        e.status === "ok"
          ? "OK"
          : e.status === "skipped"
            ? "SKIP"
            : e.status === "warning"
              ? "WARN"
              : "FAIL";
      lines.push(`| ${e.item} | ${icon} | ${e.detail || "-"} |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  lines.push("- Run `golems status` to check all services");
  lines.push("- Run `golems on` to start enabled services");
  lines.push("- Review any WARN/FAIL items above");
  lines.push("");

  return lines.join("\n");
}

export async function phasePostflight(
  log: SetupLogEntry[],
  selectedServices: string[]
): Promise<void> {
  header("Phase 7: Post-flight");

  const content = generateSetupLog(log, selectedServices);
  const logPath = join(GOLEMS_HOME, "SETUP_LOG.md");
  writeFileSync(logPath, content);
  success(`Setup log written to ${logPath}`);

  print("");
  print("Suggested next steps:");
  print("  golems status          # Check service health");
  print("  golems on              # Start all selected services");
  print("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runWizard(): Promise<void> {
  createRL();

  print("");
  print("  GOLEMS SETUP WIZARD");
  print("  Interactive setup for the Golem ecosystem");
  print("");

  const log: SetupLogEntry[] = [];

  try {
    // Phase 1
    const preflight = await phasePreflight(log);
    if (!preflight) {
      print("\nSetup aborted.");
      rl.close();
      return;
    }

    // Phase 2
    const core = await phaseCoreSetup(log);
    if (!core) {
      print("\nCore setup failed. Fix issues and re-run.");
      rl.close();
      return;
    }

    // Phase 3
    const selected = await phaseServiceSelection(log);

    // Phase 4
    await phaseSecrets(selected, log);

    // Phase 5
    await phaseDeploy(selected, log);

    // Phase 6
    await phaseVerify(selected, log);

    // Phase 7
    await phasePostflight(log, selected);

    print("Setup complete!");
  } finally {
    rl.close();
  }
}

// Run if executed directly
if (import.meta.main) {
  runWizard().catch((err) => {
    console.error("Wizard error:", err);
    process.exit(1);
  });
}
