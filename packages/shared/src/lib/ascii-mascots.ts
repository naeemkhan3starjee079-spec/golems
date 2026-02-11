/**
 * ASCII Mascots — 5 distinct golem mascot variants for CLI and docs
 *
 * Each variant has a different aesthetic: classic clay, circuit board,
 * minimalist, runic, and ember. All use pure ASCII/Unicode box-drawing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AsciiMascot {
  id: string;
  name: string;
  description: string;
  art: string;
  width: number;
  height: number;
  style: "classic" | "circuit" | "minimal" | "runic" | "ember";
}

// ---------------------------------------------------------------------------
// Mascot definitions
// ---------------------------------------------------------------------------

const CLASSIC_GOLEM: AsciiMascot = {
  id: "classic",
  name: "Classic Golem",
  description: "Traditional clay golem with the aleph on its forehead",
  style: "classic",
  width: 36,
  height: 19,
  art: `
        ┌──────────────────┐
        │   ╔════════════╗ │
        │   ║            ║ │
        │   ║     א      ║ │
        │   ║            ║ │
        │   ╚════════════╝ │
        │                  │
        │  ┌────┐  ┌────┐ │
        │  │ ** │  │ ** │ │
        │  └────┘  └────┘ │
        │                  │
        │    ┌────────┐    │
        │    │ . .. . │    │
        │    └────────┘    │
        └──────┬────┬──────┘
               │    │
        ═══════╧════╧═══════
`.trim(),
};

const CIRCUIT_GOLEM: AsciiMascot = {
  id: "circuit",
  name: "Circuit Golem",
  description: "Digital golem with circuit-board aesthetic",
  style: "circuit",
  width: 40,
  height: 19,
  art: `
     ┌─╥──────────────────────╥─┐
     │ ║  +-+  +-+  +-+  +-+  ║ │
     │ ║  |=|  |=|  |=|  |=|  ║ │
     ╞═╬══════════════════════╬═╡
     │ ║                      ║ │
     │ ║   [  א  ]           ║ │
     │ ║                      ║ │
     │ ║  (o)          (o)    ║ │
     │ ║  /|\\          /|\\    ║ │
     │ ║                      ║ │
     │ ║   >>> GOLEMS v2 <<<  ║ │
     │ ║                      ║ │
     ╞═╬══════════════════════╬═╡
     │ ║  |=|  |=|  |=|  |=|  ║ │
     │ ║  +-+  +-+  +-+  +-+  ║ │
     └─╨──────────────────────╨─┘
         ║║              ║║
         ╚╝              ╚╝
`.trim(),
};

const MINIMAL_GOLEM: AsciiMascot = {
  id: "minimal",
  name: "Minimal Golem",
  description: "Clean, minimalist golem silhouette",
  style: "minimal",
  width: 24,
  height: 15,
  art: `
       .--------.
      /    א     \\
     |            |
     |   o    o   |
     |            |
     |   .----.   |
     |   '----'   |
      \\          /
       '--------'
          |  |
       .--'  '--.
      /          \\
     '============'
`.trim(),
};

const RUNIC_GOLEM: AsciiMascot = {
  id: "runic",
  name: "Runic Golem",
  description: "Ancient runic golem with mystical symbols",
  style: "runic",
  width: 38,
  height: 19,
  art: `
    *  .  *  .  *  .  *  .  *  .  *
       ╔══════════════════════╗
       ║  ~  ~  ~  ~  ~  ~   ║
       ║ ╔══════════════════╗ ║
       ║ ║                  ║ ║
       ║ ║       א          ║ ║
       ║ ║                  ║ ║
       ║ ╚══════════════════╝ ║
       ║                      ║
       ║    ()          ()    ║
       ║    ||          ||    ║
       ║                      ║
       ║   {  emet  }        ║
       ║                      ║
       ╚══════════╤══╤════════╝
    *  .  *  .  * │  │ *  .  *  .  *
       ═══════════╧══╧═══════════
                  ****
`.trim(),
};

const EMBER_GOLEM: AsciiMascot = {
  id: "ember",
  name: "Ember Golem",
  description: "Fiery ember golem with flame-like patterns",
  style: "ember",
  width: 36,
  height: 19,
  art: `
          )  (    )  (    )  (
       .-'    '--'    '--'    '-.
      /  ┌────────────────────┐  \\
     |   │                    │   |
     |   │   ╭──────────╮    │   |
     |   │   │    א      │    │   |
     |   │   ╰──────────╯    │   |
     |   │                    │   |
     |   │  <>          <>    │   |
     |   │                    │   |
     |   │   ╭──────────╮    │   |
     |   │   │  ~ ~~ ~  │    │   |
     |   │   ╰──────────╯    │   |
     |   │                    │   |
      \\  └────────┬──┬────────┘  /
       '-. )  ( ) │  │ ( )  ( .-'
           '------'  '------'
            (    )    (    )
`.trim(),
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const MASCOT_CATALOG: AsciiMascot[] = [
  CLASSIC_GOLEM,
  CIRCUIT_GOLEM,
  MINIMAL_GOLEM,
  RUNIC_GOLEM,
  EMBER_GOLEM,
];

export function getMascot(id: string): AsciiMascot | undefined {
  return MASCOT_CATALOG.find((m) => m.id === id);
}

export function getMascotByStyle(style: AsciiMascot["style"]): AsciiMascot | undefined {
  return MASCOT_CATALOG.find((m) => m.style === style);
}

export function listMascots(): string[] {
  return MASCOT_CATALOG.map((m) => m.id);
}

export function getRandomMascot(): AsciiMascot {
  return MASCOT_CATALOG[Math.floor(Math.random() * MASCOT_CATALOG.length)];
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text;
}

export function addBorder(art: string, char: string = "#"): string {
  const lines = art.split("\n");
  const maxWidth = Math.max(...lines.map((l) => l.length));
  const border = char.repeat(maxWidth + 4);
  const padded = lines.map((l) => `${char} ${l.padEnd(maxWidth)} ${char}`);
  return [border, ...padded, border].join("\n");
}

export function addCaption(mascot: AsciiMascot, caption?: string): string {
  const lines = mascot.art.split("\n");
  const maxWidth = Math.max(...lines.map((l) => l.length));
  const text = caption || mascot.name;
  const centered = centerText(text, maxWidth);
  return mascot.art + "\n" + centered;
}

// ---------------------------------------------------------------------------
// Greeting / splash screen
// ---------------------------------------------------------------------------

export function formatSplash(mascot?: AsciiMascot): string {
  const m = mascot || getRandomMascot();
  const lines: string[] = [];
  lines.push(m.art);
  lines.push("");
  lines.push(centerText(`~ ${m.name} ~`, m.width));
  lines.push(centerText(m.description, m.width));
  return lines.join("\n");
}

export function formatCatalog(): string {
  const lines: string[] = [];
  lines.push("ASCII Mascot Catalog");
  lines.push("====================");
  lines.push("");

  for (const m of MASCOT_CATALOG) {
    lines.push(`[${m.id}] ${m.name} (${m.style})`);
    lines.push(`  ${m.description}`);
    lines.push(`  Size: ${m.width}x${m.height}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatMascotPreview(mascot: AsciiMascot): string {
  const lines: string[] = [];
  lines.push(`Name: ${mascot.name}`);
  lines.push(`Style: ${mascot.style}`);
  lines.push(`Size: ${mascot.width}x${mascot.height}`);
  lines.push(`Description: ${mascot.description}`);
  lines.push("");
  lines.push(mascot.art);
  return lines.join("\n");
}
