/**
 * Color mapping for node types.
 * Enriched nodes get bright colors; unenriched are dim ghostly blue.
 * As enrichment progresses, the graph "lights up".
 */

const TYPE_COLORS: Record<string, string> = {
  implementing: "#22D3EE", // cyan
  debugging: "#FB7185", // rose
  designing: "#8B5CF6", // purple/accent
  reviewing: "#34D399", // emerald
  configuring: "#FBBF24", // amber
  discussing: "#60A5FA", // blue
  deciding: "#F472B6", // pink
};

const DIM_COLOR_HEX = "#1E293B"; // solid dim for unenriched / Three.js materials

export function getNodeColorHex(colorType: string, enriched: boolean): string {
  if (!enriched || colorType === "unknown") return DIM_COLOR_HEX;
  return TYPE_COLORS[colorType] ?? DIM_COLOR_HEX;
}

export function getEmissiveIntensity(
  colorType: string,
  importance: number
): number {
  if (colorType === "unknown") return 0.05;
  // Scale emissive intensity by importance (5-9 range → 0.3-1.0), clamp to safe range
  return Math.max(0.1, Math.min(1.0, 0.3 + ((importance - 5) / 4) * 0.7));
}

export function getNodeSize(size: number, enriched: boolean): number {
  // Enriched nodes are bigger and more prominent
  const base = enriched ? size * 1.5 : size * 0.6;
  return Math.max(1, base);
}

const SOURCE_COLORS: Record<string, string> = {
  claude_code: "#60A5FA", // blue
  whatsapp: "#34D399", // green
  youtube: "#FB7185", // rose
  unknown: "#94A3B8", // gray
};

export { TYPE_COLORS, SOURCE_COLORS, DIM_COLOR_HEX };
