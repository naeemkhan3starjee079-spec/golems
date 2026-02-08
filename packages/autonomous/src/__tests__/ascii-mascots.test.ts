import { describe, test, expect } from "bun:test";
import {
  MASCOT_CATALOG,
  getMascot,
  getMascotByStyle,
  listMascots,
  getRandomMascot,
  centerText,
  addBorder,
  addCaption,
  formatSplash,
  formatCatalog,
  formatMascotPreview,
} from "../lib/ascii-mascots";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

describe("catalog", () => {
  test("has exactly 5 mascots", () => {
    expect(MASCOT_CATALOG.length).toBe(5);
  });

  test("all mascots have unique IDs", () => {
    const ids = MASCOT_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(5);
  });

  test("all mascots have unique styles", () => {
    const styles = MASCOT_CATALOG.map((m) => m.style);
    expect(new Set(styles).size).toBe(5);
  });

  test("all mascots have non-empty art", () => {
    for (const m of MASCOT_CATALOG) {
      expect(m.art.length).toBeGreaterThan(50);
    }
  });

  test("all mascots have aleph character", () => {
    for (const m of MASCOT_CATALOG) {
      expect(m.art).toContain("א");
    }
  });

  test("all mascots have name and description", () => {
    for (const m of MASCOT_CATALOG) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });

  test("all mascots have positive dimensions", () => {
    for (const m of MASCOT_CATALOG) {
      expect(m.width).toBeGreaterThan(0);
      expect(m.height).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Lookup functions
// ---------------------------------------------------------------------------

describe("lookup", () => {
  test("getMascot finds by id", () => {
    expect(getMascot("classic")?.name).toBe("Classic Golem");
    expect(getMascot("circuit")?.style).toBe("circuit");
    expect(getMascot("minimal")?.style).toBe("minimal");
    expect(getMascot("runic")?.style).toBe("runic");
    expect(getMascot("ember")?.style).toBe("ember");
  });

  test("getMascot returns undefined for unknown", () => {
    expect(getMascot("nonexistent")).toBeUndefined();
  });

  test("getMascotByStyle finds by style", () => {
    expect(getMascotByStyle("classic")?.id).toBe("classic");
    expect(getMascotByStyle("circuit")?.id).toBe("circuit");
  });

  test("listMascots returns all IDs", () => {
    const ids = listMascots();
    expect(ids).toContain("classic");
    expect(ids).toContain("circuit");
    expect(ids).toContain("minimal");
    expect(ids).toContain("runic");
    expect(ids).toContain("ember");
    expect(ids.length).toBe(5);
  });

  test("getRandomMascot returns a valid mascot", () => {
    const m = getRandomMascot();
    expect(m.id).toBeTruthy();
    expect(m.art).toBeTruthy();
    expect(MASCOT_CATALOG).toContain(m);
  });
});

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

describe("display helpers", () => {
  test("centerText centers text in width", () => {
    const result = centerText("Hello", 20);
    // padding = floor((20 - 5) / 2) = 7, so result is 7 spaces + "Hello" = 12 chars
    expect(result.trim()).toBe("Hello");
    expect(result.startsWith("       ")).toBe(true);
    expect(result.length).toBe(12);
  });

  test("centerText returns text if wider than width", () => {
    const result = centerText("Hello World", 5);
    expect(result).toBe("Hello World");
  });

  test("addBorder wraps art in border", () => {
    const result = addBorder("Hello\nWorld");
    expect(result.startsWith("#")).toBe(true);
    expect(result).toContain("# Hello #");
    expect(result).toContain("# World #");
  });

  test("addBorder uses custom character", () => {
    const result = addBorder("Hi", "*");
    expect(result).toContain("* Hi *");
  });

  test("addCaption adds text below mascot", () => {
    const mascot = getMascot("minimal")!;
    const result = addCaption(mascot, "Test Caption");
    expect(result).toContain(mascot.art);
    expect(result).toContain("Test Caption");
  });

  test("addCaption uses mascot name by default", () => {
    const mascot = getMascot("classic")!;
    const result = addCaption(mascot);
    expect(result).toContain("Classic Golem");
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("formatters", () => {
  test("formatSplash includes art and name", () => {
    const mascot = getMascot("ember")!;
    const output = formatSplash(mascot);
    expect(output).toContain(mascot.art);
    expect(output).toContain("Ember Golem");
    expect(output).toContain(mascot.description);
  });

  test("formatSplash works without arg (random)", () => {
    const output = formatSplash();
    expect(output.length).toBeGreaterThan(50);
    expect(output).toContain("~");
  });

  test("formatCatalog lists all mascots", () => {
    const output = formatCatalog();
    expect(output).toContain("ASCII Mascot Catalog");
    expect(output).toContain("classic");
    expect(output).toContain("circuit");
    expect(output).toContain("minimal");
    expect(output).toContain("runic");
    expect(output).toContain("ember");
  });

  test("formatMascotPreview shows full details", () => {
    const mascot = getMascot("runic")!;
    const output = formatMascotPreview(mascot);
    expect(output).toContain("Runic Golem");
    expect(output).toContain("runic");
    expect(output).toContain(mascot.art);
    expect(output).toContain("Description:");
  });
});
