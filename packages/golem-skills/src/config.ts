import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface GolemConfig {
  reposPath?: string;
  tools?: Record<string, string>;
}

export const DEFAULT_CONFIG_PATH = join(homedir(), ".golems", "config.json");

export async function loadConfig(
  configPath: string = DEFAULT_CONFIG_PATH,
): Promise<GolemConfig | null> {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as GolemConfig;
  } catch {
    return null;
  }
}

export async function createDefaultConfig(
  configPath: string,
  defaults: GolemConfig,
): Promise<void> {
  try {
    await access(configPath);
    return; // already exists
  } catch {
    // create it
  }

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(defaults, null, 2) + "\n");
}

export async function autoDetectTools(): Promise<Record<string, string>> {
  const tools: Record<string, string> = {};
  const candidates: Record<string, string[]> = {
    claude: ["claude"],
    gemini: ["gemini"],
    cursor: ["cursor"],
    codex: ["codex"],
    kiro: ["kiro-cli"],
  };

  for (const [key, names] of Object.entries(candidates)) {
    for (const name of names) {
      const proc = Bun.spawnSync(["which", name]);
      if (proc.exitCode === 0) {
        tools[key] = proc.stdout.toString().trim();
        break;
      }
    }
  }

  return tools;
}
