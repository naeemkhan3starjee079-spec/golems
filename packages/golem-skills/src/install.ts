import { mkdir, writeFile, access, chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { getSkillFiles, downloadFile, validateSkillName } from "./github";

export interface InstallOptions {
  commandsDir?: string;
  force?: boolean;
}

export interface InstallResult {
  name: string;
  installed: boolean;
  skipped: boolean;
  filesWritten: number;
}

export const DEFAULT_COMMANDS_DIR = join(homedir(), ".claude", "commands");

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function installSkill(
  name: string,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const commandsDir = options.commandsDir ?? DEFAULT_COMMANDS_DIR;
  const force = options.force ?? false;
  validateSkillName(name);
  const skillDir = join(commandsDir, name);

  if (!force && (await exists(skillDir))) {
    return { name, installed: false, skipped: true, filesWritten: 0 };
  }

  const files = await getSkillFiles(name);
  let filesWritten = 0;

  for (const file of files) {
    const relPath = file.path.replace(`skills/golem-powers/${name}/`, "");
    const destPath = join(skillDir, relPath);
    await mkdir(dirname(destPath), { recursive: true });
    const content = await downloadFile(file.download_url);
    await writeFile(destPath, content, "utf8");

    // Make shell scripts executable
    if (relPath.endsWith(".sh")) {
      await chmod(destPath, 0o755);
    }

    filesWritten++;
  }

  return { name, installed: true, skipped: false, filesWritten };
}

export async function installAllSkills(
  skillNames: string[],
  options: InstallOptions = {},
): Promise<InstallResult[]> {
  const results: InstallResult[] = [];
  for (const name of skillNames) {
    const result = await installSkill(name, options);
    results.push(result);
  }
  return results;
}
