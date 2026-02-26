import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import GithubSlugger from "github-slugger";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

export type DocMeta = {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  sidebarPosition?: number;
};

export type DocPage = DocMeta & {
  content: string;
};

/**
 * Get all doc slugs (for generateStaticParams).
 */
export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = [];

  function walk(dir: string, prefix: string[]) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), [...prefix, entry.name]);
      } else if (entry.name.endsWith(".md")) {
        const slug = entry.name.replace(/\.md$/, "");
        slugs.push([...prefix, slug]);
      }
    }
  }

  walk(DOCS_DIR, []);
  return slugs;
}

/**
 * Load a single doc by slug segments.
 */
export function getDoc(slugParts: string[]): DocPage | null {
  // Validate slug segments — no path traversal
  for (const part of slugParts) {
    if (part === ".." || part === "." || part.includes("/") || part.includes("\\")) {
      return null;
    }
  }

  const filePath = path.join(DOCS_DIR, ...slugParts) + ".md";

  // Ensure resolved path stays within DOCS_DIR
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(DOCS_DIR)) return null;

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  // Extract title from frontmatter or first H1
  let title = data.title;
  if (!title) {
    const h1Match = content.match(/^#\s+(.+)/m);
    title = h1Match ? h1Match[1] : slugParts[slugParts.length - 1];
  }

  // Strip first H1 from content to avoid duplicate title rendering
  // Use /m flag since content after frontmatter often starts with \n
  const strippedContent = content.replace(/^#\s+.+\n?/m, "");

  return {
    slug: slugParts.join("/"),
    title,
    description: data.description,
    category: slugParts.length > 1 ? slugParts[0] : undefined,
    sidebarPosition: data.sidebar_position,
    content: strippedContent,
  };
}

/**
 * Configure marked to rewrite .md links to dashboard routes.
 */
const renderer = new marked.Renderer();
renderer.link = ({ href, text }) => {
  let resolvedHref = href;
  if (resolvedHref && resolvedHref.endsWith(".md")) {
    resolvedHref = resolvedHref.replace(/\.md$/, "");
  }
  // Convert relative ./foo or ../foo to /docs/foo
  if (resolvedHref && !resolvedHref.startsWith("http") && !resolvedHref.startsWith("/")) {
    resolvedHref = `/docs/${resolvedHref.replace(/^\.\//, "")}`;
  }
  return `<a href="${resolvedHref}">${text}</a>`;
};

marked.use({ renderer });

let highlighter: Highlighter | null = null;

const SHIKI_LANGS = [
  "typescript", "javascript", "bash", "json", "python",
  "tsx", "jsx", "sql", "yaml", "markdown", "html", "css",
  "shell", "diff", "toml", "ini", "zsh",
] as const;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighter;
}

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export async function renderMarkdown(content: string): Promise<{ html: string; toc: TocItem[] }> {
  const hl = await getHighlighter();
  const loadedLangs = new Set(hl.getLoadedLanguages());

  const rawHtml = await marked.parse(content);

  // Post-process: replace <code> blocks inside <pre> with shiki-highlighted versions
  // Mermaid blocks get a special wrapper for client-side rendering
  let html = rawHtml.replace(
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string, code: string) => {
      const raw = code
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      if (lang === "mermaid") {
        return `<div class="mermaid-block" data-mermaid="${encodeURIComponent(raw.trim())}">${raw.trim()}</div>`;
      }

      if (loadedLangs.has(lang)) {
        return hl.codeToHtml(raw, { lang, theme: "github-dark" });
      }
      return `<pre class="shiki github-dark"><code>${code}</code></pre>`;
    },
  );

  // Post-process: add IDs to h2/h3 headings and extract TOC
  // Uses github-slugger for compatibility with rehype-slug (used in etanheyman.com)
  const toc: TocItem[] = [];
  const slugger = new GithubSlugger();

  html = html.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (_match, level: string, text: string) => {
      const plainText = text.replace(/<[^>]+>/g, "").trim();
      const id = slugger.slug(plainText);
      toc.push({ id, text: plainText, level: parseInt(level) });
      return `<h${level} id="${id}">${text}</h${level}>`;
    },
  );

  return { html, toc };
}

/**
 * Read _category_.json for a directory if it exists.
 */
function readCategory(dir: string): { label: string; position: number } | null {
  const catFile = path.join(dir, "_category_.json");
  if (!fs.existsSync(catFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(catFile, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Build the docs navigation tree.
 */
export type DocNavItem = {
  slug: string;
  title: string;
  position?: number;
  children?: DocNavItem[];
};

/**
 * Flatten nav items into ordered list of leaf pages (for prev/next).
 */
export function flattenNav(items: DocNavItem[]): { slug: string; title: string }[] {
  const result: { slug: string; title: string }[] = [];
  for (const item of items) {
    if (item.children) {
      result.push(...flattenNav(item.children));
    } else {
      result.push({ slug: item.slug, title: item.title });
    }
  }
  return result;
}

export function getDocsNav(): DocNavItem[] {
  const topLevel: DocNavItem[] = [];
  const categories: Record<string, { label: string; position: number; children: DocNavItem[] }> = {};

  const slugs = getAllDocSlugs();

  for (const parts of slugs) {
    const doc = getDoc(parts);
    if (!doc) continue;

    const item: DocNavItem = {
      slug: parts.join("/"),
      title: doc.title,
      position: doc.sidebarPosition,
    };

    if (parts.length === 1) {
      topLevel.push(item);
    } else {
      const cat = parts[0];
      if (!categories[cat]) {
        const catMeta = readCategory(path.join(DOCS_DIR, cat));
        categories[cat] = {
          label: catMeta?.label ?? cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          position: catMeta?.position ?? 999,
          children: [],
        };
      }
      categories[cat].children.push(item);
    }
  }

  // Sort top-level by position then title
  topLevel.sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.title.localeCompare(b.title));

  // Sort category children
  for (const cat of Object.values(categories)) {
    cat.children.sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.title.localeCompare(b.title));
  }

  // Build final nav: top-level items first, then categories sorted by position
  const sortedCats = Object.entries(categories).sort(([, a], [, b]) => a.position - b.position);

  const navItems: DocNavItem[] = [...topLevel];
  for (const [cat, { label, children }] of sortedCats) {
    navItems.push({ slug: cat, title: label, children });
  }

  return navItems;
}
