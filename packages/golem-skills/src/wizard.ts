import {
  readFile,
  writeFile,
  mkdir,
  access,
  readdir,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import {
  loadConfig,
  autoDetectTools,
  DEFAULT_CONFIG_PATH,
  type GolemConfig,
} from "./config";
import {
  installSkill,
  installAllSkills,
  DEFAULT_COMMANDS_DIR,
} from "./install";
import { listRemoteSkills } from "./list";

const FEATURES = ["proactiveNudges", "nightShift", "telegram"] as const;

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  proactiveNudges: "Coach sends periodic check-ins and reminders",
  nightShift: "Autonomous improvement loop runs at 3am",
  telegram: "Receive notifications via Telegram bot",
};

function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function countInstalledSkills(): Promise<number> {
  try {
    const entries = await readdir(DEFAULT_COMMANDS_DIR);
    return entries.length;
  } catch {
    return 0;
  }
}

export async function runWizard(): Promise<void> {
  console.log("=== Golems Setup Wizard ===\n");

  // Step 1: Check existing config
  const existingConfig = await loadConfig();
  if (existingConfig) {
    console.log("Existing configuration found at ~/.golems/config.json:\n");
    console.log(JSON.stringify(existingConfig, null, 2));
    console.log();

    const choice = await ask(
      "Would you like to (r)econfigure or (s)kip? [s]: ",
    );
    if (
      choice.toLowerCase() !== "r" &&
      choice.toLowerCase() !== "reconfigure"
    ) {
      console.log("Keeping current configuration. Wizard complete.");
      return;
    }
    console.log();
  }

  // Step 2: Detect CLIs
  console.log("Detecting installed AI CLIs...\n");
  const tools = await autoDetectTools();
  const toolCount = Object.keys(tools).length;

  for (const cli of ["claude", "cursor", "gemini", "codex", "kiro-cli"]) {
    const path = tools[cli];
    console.log(`  ${cli.padEnd(10)}: ${path || "not found"}`);
  }
  console.log(`\nFound ${toolCount} of 5 supported CLIs.\n`);

  // Step 3: Ask workspace root
  let reposPath = "";
  while (!reposPath) {
    const input = await ask(
      "Where is your workspace root? (e.g., ~/Gits, ~/Projects): ",
    );
    if (!input) {
      console.log("Workspace root is required.\n");
      continue;
    }

    const expanded = input.replace(/^~/, homedir());
    if (await isDirectory(expanded)) {
      reposPath = input;
    } else {
      console.log(
        `Path "${input}" does not exist or is not a directory. Please provide a valid directory.\n`,
      );
    }
  }
  console.log();

  // Step 4: Ask about opt-in features
  console.log("Opt-in features (all OFF by default):\n");
  for (let i = 0; i < FEATURES.length; i++) {
    const name = FEATURES[i];
    console.log(`  ${i + 1}. ${name} — ${FEATURE_DESCRIPTIONS[name]} — OFF`);
  }
  console.log();

  const featureInput = await ask(
    "Enter numbers to enable (e.g., '1,3') or press Enter to keep all OFF: ",
  );

  const enabledFeatures = new Set<string>();
  if (featureInput) {
    for (const part of featureInput.split(",")) {
      const idx = parseInt(part.trim(), 10);
      if (idx >= 1 && idx <= FEATURES.length) {
        enabledFeatures.add(FEATURES[idx - 1]);
      }
    }
  }

  const features: Record<string, boolean> = {};
  for (const f of FEATURES) {
    features[f] = enabledFeatures.has(f);
  }
  console.log();

  // Step 5: Write config
  const config: GolemConfig & { features?: Record<string, boolean> } = {
    reposPath,
    tools,
    features,
  };

  const configDir = join(homedir(), ".golems");
  await mkdir(configDir, { recursive: true });
  await writeFile(DEFAULT_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");

  console.log("Config written to ~/.golems/config.json:\n");
  console.log(JSON.stringify(config, null, 2));
  console.log();

  // Step 6: Install skills
  const installChoice = await ask(
    "Install skills?\n  (a)ll — install all skills\n  (r)ecommended — install popular skills\n  (s)kip — install later\nChoice [s]: ",
  );

  const recommended = ["commit", "coach", "github", "catchup", "research"];

  const failedInstalls: string[] = [];

  if (
    installChoice.toLowerCase() === "a" ||
    installChoice.toLowerCase() === "all"
  ) {
    console.log("\nInstalling all skills...");
    try {
      const allSkillNames = await listRemoteSkills();
      await installAllSkills(allSkillNames);
      console.log("All skills installed.");
    } catch (err) {
      console.error(`Failed to install all skills: ${(err as Error).message}`);
      failedInstalls.push("all");
    }
  } else if (
    installChoice.toLowerCase() === "r" ||
    installChoice.toLowerCase() === "recommended"
  ) {
    console.log("\nInstalling recommended skills...");
    for (const skill of recommended) {
      try {
        const result = await installSkill(skill);
        if (result?.skipped) {
          console.log(`  ${skill}: already installed (skipping)`);
        } else {
          console.log(`  ${skill}: installed`);
        }
      } catch (err) {
        console.error(`  ${skill}: failed (${(err as Error).message})`);
        failedInstalls.push(skill);
      }
    }
  } else {
    console.log(
      "\nSkipping skill installation. Install later with: npx golems-cli skills install <name>",
    );
  }

  if (failedInstalls.length > 0) {
    console.log(
      `\nNote: ${failedInstalls.length} skill(s) failed to install: ${failedInstalls.join(", ")}`,
    );
    console.log("Retry with: npx golems-cli skills install <name>");
  }
  console.log();

  // Summary
  const skillCount = await countInstalledSkills();
  const enabledList = Object.entries(features)
    .map(([k, v]) => `${k}: ${v ? "ON" : "OFF"}`)
    .join(", ");
  const toolNames = Object.keys(tools).join(", ") || "none";

  console.log("=== Golems Setup Complete ===\n");
  console.log(`Config:     ~/.golems/config.json`);
  console.log(`Workspace:  ${reposPath}`);
  console.log(`Tools:      ${toolNames} (${toolCount} detected)`);
  console.log(`Features:   ${enabledList}`);
  console.log(`Skills:     ${skillCount} installed`);
  console.log();
  console.log("Next steps:");
  console.log("  - Run /wizard again to reconfigure");
  console.log("  - Install more skills: npx golems-cli skills install <name>");
  console.log("  - List available skills: npx golems-cli skills list");
}
