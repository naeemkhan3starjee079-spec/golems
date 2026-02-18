/**
 * Input module — file watcher pattern for receiving user voice responses.
 *
 * The MCP server can't read the terminal's stdin (it communicates with
 * Claude Code via its own stdio pipe). Instead, a companion script (mic.sh)
 * runs in a second terminal tab where Wispr Flow types transcriptions.
 * When the user hits Enter, mic.sh writes the text to an input file.
 * This module polls that file for content.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const POLL_INTERVAL_MS = 200;

/**
 * Wait for user input by polling the input file.
 * Returns the text content, or null on timeout.
 */
export async function waitForInput(
  inputFile: string,
  timeoutMs: number
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (existsSync(inputFile)) {
      const content = readFileSync(inputFile, "utf-8").trim();
      if (content) {
        // Clear the file after reading
        writeFileSync(inputFile, "");
        return content;
      }
    }
    await Bun.sleep(POLL_INTERVAL_MS);
  }

  return null;
}

/**
 * Clear any stale input from the file.
 */
export function clearInput(inputFile: string): void {
  writeFileSync(inputFile, "");
}
