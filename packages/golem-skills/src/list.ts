import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { listSkills } from "./github";
import { DEFAULT_COMMANDS_DIR } from "./install";

export async function listInstalledSkills(
  commandsDir: string = DEFAULT_COMMANDS_DIR,
): Promise<string[]> {
  try {
    const entries = await readdir(commandsDir);
    const skills: string[] = [];
    for (const entry of entries) {
      const s = await stat(join(commandsDir, entry));
      if (s.isDirectory()) skills.push(entry);
    }
    return skills;
  } catch {
    return [];
  }
}

export async function listRemoteSkills(): Promise<string[]> {
  return listSkills();
}
