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
