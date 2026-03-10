import { writeFile, mkdir, readdir, stat } from "node:fs/promises";
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

const SKILL_CATEGORIES: Record<string, string[]> = {
  Development: [
    "commit",
    "github",
    "pr-loop",
    "test-plan",
    "code-review",
    "simplify",
  ],
  Research: ["research", "youtube-pipeline", "call-debrief"],
  Operations: ["coach", "catchup", "ecosystem-health", "orchestrator-status"],
  Infrastructure: ["1password", "railway", "convex"],
  Voice: ["voice-sessions"],
  Content: ["video-showcase", "presentation-builder"],
};

async function listInstalledSkillNames(): Promise<Set<string>> {
  try {
    const entries = await readdir(DEFAULT_COMMANDS_DIR);
    return new Set(entries);
  } catch {
    return new Set();
  }
}

async function installSkillsInteractive(): Promise<void> {
  const installChoice = await ask(
    "Install skills?\n  (a)ll — install all skills\n  (r)ecommended — install popular skills\n  (b)rowse — browse by category\n  (s)kip — install later\nChoice [s]: ",
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
  } else if (
    installChoice.toLowerCase() === "b" ||
    installChoice.toLowerCase() === "browse"
  ) {
    const installed = await listInstalledSkillNames();
    console.log("\nAvailable skills by category:\n");
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      console.log(`  ${category}:`);
      for (const skill of skills) {
        const status = installed.has(skill) ? " [installed]" : "";
        console.log(`    - ${skill}${status}`);
      }
    }
    console.log();
    const picks = await ask(
      "Enter skill names to install (comma-separated), or press Enter to skip: ",
    );
    if (picks) {
      for (const name of picks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        try {
          const result = await installSkill(name);
          if (result?.skipped) {
            console.log(`  ${name}: already installed (skipping)`);
          } else {
            console.log(`  ${name}: installed`);
          }
        } catch (err) {
          console.error(`  ${name}: failed (${(err as Error).message})`);
          failedInstalls.push(name);
        }
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
      "Would you like to (r)econfigure, (a)dd skills, or (s)kip? [s]: ",
    );
    if (
      choice.toLowerCase() === "a" ||
      choice.toLowerCase() === "add" ||
      choice.toLowerCase() === "add skills"
    ) {
      // Jump to skill installation
      await installSkillsInteractive();
      return;
    }
    if (
      choice.toLowerCase() !== "r" &&
      choice.toLowerCase() !== "reconfigure"
    ) {
      console.log("Keeping current configuration. Wizard complete.");
      return;
    }
    console.log();
  }

  // Step 2: Detect platform and CLIs
  const platform = process.platform;
  console.log(`Platform: ${platform}\n`);
  console.log("Detecting installed AI CLIs...\n");
  const tools = await autoDetectTools();
  const toolCount = Object.keys(tools).length;

  const allClis = [
    "claude",
    "cursor",
    "gemini",
    "codex",
    "kiro-cli",
    "windsurf",
    "aider",
    "copilot",
    "cline",
  ];
  for (const cli of allClis) {
    const path = tools[cli];
    console.log(`  ${cli.padEnd(10)}: ${path || "not found"}`);
  }
  console.log(`\nFound ${toolCount} of ${allClis.length} supported CLIs.\n`);

  // Claude Code gate — skills require Claude Code
  if (!tools.claude) {
    console.log(
      "Claude Code CLI is required for golem skills.\n" +
        "Skills are SKILL.md files in ~/.claude/commands/ — they only work with Claude Code.\n\n" +
        "To install Claude Code:\n" +
        "  brew install claude          # macOS (recommended)\n" +
        "  npm install -g @anthropic-ai/claude-code  # any platform\n\n" +
        "Then run this wizard again.",
    );

    const proceed = await ask(
      "\nWould you like to continue setup anyway (config only, no skills)? [n]: ",
    );
    if (proceed.toLowerCase() !== "y" && proceed.toLowerCase() !== "yes") {
      console.log("Install Claude Code first, then re-run the wizard.");
      return;
    }
    console.log(
      "\nContinuing with config-only setup (skills will not be available until Claude Code is installed).\n",
    );
  }

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
  if (tools.claude) {
    await installSkillsInteractive();
  } else {
    console.log(
      "Skipping skill installation (Claude Code not detected).\n" +
        "Install Claude Code first, then run: npx golems-cli skills install <name>\n",
    );
  }

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
