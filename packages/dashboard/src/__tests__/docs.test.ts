/**
 * Dashboard Docs — Path Traversal, Markdown Rendering, Navigation
 *
 * Tests getDoc() security, renderMarkdown() TOC extraction, flattenNav() ordering.
 */

import { describe, it, expect } from "bun:test";
import {
  getDoc,
  renderMarkdown,
  flattenNav,
  type DocNavItem,
} from "../lib/docs/index";

describe("getDoc — path traversal rejection", () => {
  it("rejects '..' segments", () => {
    expect(getDoc([".."])).toBeNull();
    expect(getDoc(["..", "etc", "passwd"])).toBeNull();
  });

  it("rejects '.' segments", () => {
    expect(getDoc(["."])).toBeNull();
    expect(getDoc([".", "secret"])).toBeNull();
  });

  it("rejects segments with forward slashes", () => {
    expect(getDoc(["foo/bar"])).toBeNull();
    expect(getDoc(["a/b/c"])).toBeNull();
  });

  it("rejects segments with backslashes", () => {
    expect(getDoc(["foo\\bar"])).toBeNull();
    expect(getDoc(["a\\b"])).toBeNull();
  });

  it("returns null for non-existent files", () => {
    expect(getDoc(["nonexistent-file-xyz-12345"])).toBeNull();
  });
});

describe("renderMarkdown", () => {
  it("extracts h2/h3 headings into TOC", async () => {
    const content = `
## Getting Started

Some intro text.

### Installation

Install steps.

### Configuration

Config steps.

## Advanced Usage

More content.
`;
    const { toc, html } = await renderMarkdown(content);

    expect(toc).toHaveLength(4);
    expect(toc[0]).toEqual({
      id: "getting-started",
      text: "Getting Started",
      level: 2,
    });
    expect(toc[1]).toEqual({
      id: "installation",
      text: "Installation",
      level: 3,
    });
    expect(toc[2]).toEqual({
      id: "configuration",
      text: "Configuration",
      level: 3,
    });
    expect(toc[3]).toEqual({
      id: "advanced-usage",
      text: "Advanced Usage",
      level: 2,
    });

    // Headings should have IDs in the HTML
    expect(html).toContain('id="getting-started"');
    expect(html).toContain('id="installation"');
  });

  it("returns empty TOC for content without headings", async () => {
    const { toc } = await renderMarkdown("Just a paragraph.");
    expect(toc).toHaveLength(0);
  });

  it("handles empty content", async () => {
    const { html, toc } = await renderMarkdown("");
    expect(toc).toHaveLength(0);
    expect(html).toBeDefined();
  });

  it("wraps mermaid blocks for client-side rendering", async () => {
    const content = "```mermaid\ngraph TD;\n  A-->B;\n```";
    const { html } = await renderMarkdown(content);
    expect(html).toContain("mermaid-block");
    expect(html).toContain("data-mermaid");
  });

  it("rewrites .md links to dashboard routes", async () => {
    const content = "[link](./getting-started.md)";
    const { html } = await renderMarkdown(content);
    expect(html).toContain('href="/docs/getting-started"');
    expect(html).not.toContain(".md");
  });
});

describe("flattenNav", () => {
  it("flattens nested navigation into ordered list", () => {
    const nav: DocNavItem[] = [
      { slug: "intro", title: "Introduction" },
      {
        slug: "guides",
        title: "Guides",
        children: [
          { slug: "guides/setup", title: "Setup" },
          { slug: "guides/config", title: "Configuration" },
        ],
      },
      { slug: "faq", title: "FAQ" },
    ];

    const flat = flattenNav(nav);

    expect(flat).toEqual([
      { slug: "intro", title: "Introduction" },
      { slug: "guides/setup", title: "Setup" },
      { slug: "guides/config", title: "Configuration" },
      { slug: "faq", title: "FAQ" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(flattenNav([])).toEqual([]);
  });

  it("handles deeply nested structures", () => {
    const nav: DocNavItem[] = [
      {
        slug: "a",
        title: "A",
        children: [
          {
            slug: "a/b",
            title: "B",
            children: [{ slug: "a/b/c", title: "C" }],
          },
        ],
      },
    ];

    const flat = flattenNav(nav);
    expect(flat).toEqual([{ slug: "a/b/c", title: "C" }]);
  });
});
