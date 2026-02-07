/**
 * WhatsApp Indexer - Send WhatsApp chats to Zikaron for semantic search
 *
 * Converts WhatsApp exports to JSONL format and indexes them using
 * Zikaron's CLI (zikaron index-fast).
 */

import { parseWhatsAppExport, groupMessages } from './whatsapp-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

/**
 * Index WhatsApp chat export in Zikaron
 *
 * @param exportPath - Path to WhatsApp .txt export file
 * @param chatName - Display name for the chat (e.g., "Family Group", "John Doe")
 * @param options - Optional configuration
 */
export async function indexWhatsAppChat(
  exportPath: string,
  chatName: string,
  options: {
    groupGapMinutes?: number;
  } = {}
): Promise<void> {
  const { groupGapMinutes = 5 } = options;

  console.log(`Parsing WhatsApp export: ${exportPath}`);
  const messages = parseWhatsAppExport(exportPath);
  console.log(`Found ${messages.length} messages`);

  console.log(`Grouping messages (${groupGapMinutes}min window)...`);
  const grouped = groupMessages(messages, groupGapMinutes);
  console.log(`Grouped into ${grouped.length} chunks`);

  // Filter out media-only messages
  const textMessages = grouped.filter(msg => !msg.isMedia && msg.content.trim());
  console.log(`${textMessages.length} text messages to index`);

  // Create temporary JSONL file for Zikaron
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whatsapp-index-'));
  const jsonlPath = path.join(tempDir, 'whatsapp-messages.jsonl');

  try {
    // Convert to JSONL format (similar to Claude Code conversation format)
    const jsonlLines = textMessages.map(msg => {
      const entry = {
        type: 'whatsapp_message',
        timestamp: msg.timestamp.toISOString(),
        sender: msg.sender,
        content: msg.content,
        metadata: {
          source: 'whatsapp',
          chat: chatName,
          sender: msg.sender,
          content_type: 'whatsapp_message',
          value_type: 'high'
        }
      };
      return JSON.stringify(entry);
    });

    fs.writeFileSync(jsonlPath, jsonlLines.join('\n'));
    console.log(`Created JSONL file: ${jsonlPath}`);

    // Call Zikaron CLI to index
    console.log('Indexing with Zikaron...');
    const zikaronPath = findZikaronCli();

    if (!zikaronPath) {
      throw new Error('Zikaron CLI not found. Install: cd ~/Gits/golems/packages/zikaron && pip install -e ".[dev]"');
    }

    const result = spawnSync(
      zikaronPath,
      ['index-fast', jsonlPath, '--project', `whatsapp-${sanitizeChatName(chatName)}`],
      { stdio: 'inherit' }
    );

    if (result.status !== 0) {
      throw new Error(`Zikaron indexing failed with exit code ${result.status}`);
    }

    console.log(`✓ Indexed ${textMessages.length} messages from "${chatName}"`);
  } finally {
    // Clean up temp file
    fs.rmSync(tempDir, { recursive: true });
  }
}

/**
 * Find Zikaron CLI executable
 */
function findZikaronCli(): string | null {
  // Try common paths
  const paths = [
    // Zikaron venv in golems monorepo
    `${process.env.HOME}/Gits/golems/packages/zikaron/.venv/bin/zikaron`,
    // System-wide installation
    '/usr/local/bin/zikaron',
    `${process.env.HOME}/.local/bin/zikaron`
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Try PATH
  const which = spawnSync('which', ['zikaron'], { encoding: 'utf-8' });
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim();
  }

  return null;
}

/**
 * Sanitize chat name for use as project name
 */
function sanitizeChatName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
