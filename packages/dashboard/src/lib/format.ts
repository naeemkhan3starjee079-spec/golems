/**
 * Clean project path for display.
 * Converts raw Zikaron project paths like "-Users-etanheyman-Gits-golems"
 * into human-readable forms like "~/golems".
 */
export function cleanProject(project: string): string {
  return project
    .replace(/^-Users-etanheyman-Gits-/, "~/")
    .replace(/^-Users-etanheyman-Desktop-Gits-/, "~/old/")
    .replace(/^-Users-etanheyman-/, "~/")
    .replace(/^-$/, "global");
}

/**
 * Clean file path for display.
 * Shortens absolute paths to relative-like form.
 */
export function cleanPath(path: string): string {
  return path
    .replace(/^\/Users\/etanheyman\/Gits\//, "~/")
    .replace(/^\/Users\/etanheyman\//, "~/");
}

import {
  Code,
  FileCode,
  Hash,
  MessageSquare,
  Terminal,
} from "lucide-react";

/** Content type → text color class only */
export const TYPE_COLORS: Record<string, string> = {
  ai_code: "text-cyan",
  user_message: "text-accent",
  assistant_text: "text-emerald",
  file_read: "text-muted",
  git_diff: "text-amber",
  stack_trace: "text-rose",
  build_log: "text-muted",
  dir_listing: "text-muted",
};

/** Content type → border-left + text color classes (for session chunks) */
export const TYPE_BORDER_COLORS: Record<string, string> = {
  ai_code: "border-l-cyan text-cyan",
  user_message: "border-l-accent text-accent",
  assistant_text: "border-l-emerald text-emerald",
  file_read: "border-l-muted text-muted",
  git_diff: "border-l-amber text-amber",
  stack_trace: "border-l-rose text-rose",
  build_log: "border-l-muted text-muted",
  dir_listing: "border-l-muted text-muted",
};

/** Content type → lucide icon component */
export const TYPE_ICONS: Record<string, typeof Code> = {
  ai_code: Code,
  user_message: MessageSquare,
  assistant_text: MessageSquare,
  file_read: FileCode,
  git_diff: Hash,
  stack_trace: Terminal,
};

/**
 * Sanitize an FTS5 snippet for safe HTML rendering.
 * FTS5 snippet() wraps matches in <mark>...</mark> but does NOT escape
 * the surrounding content, which may contain arbitrary HTML from code chunks.
 * This function escapes everything except <mark> and </mark> tags.
 */
export function sanitizeSnippet(raw: string): string {
  // First, escape all HTML
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // Then restore only <mark> and </mark> tags
  return escaped
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
