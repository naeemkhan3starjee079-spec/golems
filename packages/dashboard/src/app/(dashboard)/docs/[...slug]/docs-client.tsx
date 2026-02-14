"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  List,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { DocNavItem, TocItem } from "@/lib/docs";

/** Walk up the DOM to find the nearest scrollable ancestor */
function getScrollParent(el: HTMLElement | null): HTMLElement {
  if (!el) return document.documentElement;
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return document.documentElement;
}

type Props = {
  html: string;
  title: string;
  nav: DocNavItem[];
  currentSlug: string;
  toc: TocItem[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

// --- Sidebar Nav ---

function NavItem({
  item,
  currentSlug,
  depth = 0,
}: {
  item: DocNavItem;
  currentSlug: string;
  depth?: number;
}) {
  const isChildActive =
    item.children?.some(
      (c) =>
        c.slug === currentSlug ||
        currentSlug.startsWith(c.slug + "/") ||
        c.children?.some(
          (gc) =>
            gc.slug === currentSlug ||
            currentSlug.startsWith(gc.slug + "/"),
        ),
    ) ?? false;

  const [open, setOpen] = useState(isChildActive);
  const isActive = item.slug === currentSlug;

  // Auto-expand when navigating to a child
  useEffect(() => {
    if (isChildActive && !open) setOpen(true);
  }, [isChildActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
            isChildActive
              ? "text-foreground"
              : "text-muted hover:text-foreground"
          }`}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-muted" />
          )}
          {item.title}
        </button>
        {open && (
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 w-px bg-border/40"
              style={{ marginLeft: `${18 + depth * 14}px` }}
            />
            {item.children.map((child) => (
              <NavItem
                key={child.slug}
                item={child}
                currentSlug={currentSlug}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={`/docs/${item.slug}`}
      className={`flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-r-md transition-colors ${
        isActive
          ? "text-accent bg-accent/10 font-medium border-l-2 border-accent"
          : "text-muted hover:text-foreground hover:bg-surface-hover"
      }`}
      style={{ paddingLeft: `${12 + depth * 14}px` }}
    >
      <FileText className="w-3 h-3 shrink-0 opacity-50" />
      {item.title}
    </Link>
  );
}

// --- Right-side Table of Contents ---

function TableOfContents({
  toc,
  activeId,
}: {
  toc: TocItem[];
  activeId: string;
}) {
  if (toc.length === 0) return null;

  return (
    <nav className="space-y-0.5">
      <div className="flex items-center gap-2 px-2 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
        <List className="w-3.5 h-3.5" />
        On this page
      </div>
      {toc.map((item) => {
        const isActive = activeId === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                // Update URL hash without jump
                window.history.replaceState(null, "", `#${item.id}`);
              }
            }}
            className={`block text-[12px] py-1 transition-colors border-l-2 ${
              isActive
                ? "text-accent border-accent font-medium"
                : "text-muted hover:text-foreground border-transparent hover:border-border"
            }`}
            style={{ paddingLeft: `${item.level === 3 ? 20 : 10}px` }}
          >
            {item.text}
          </a>
        );
      })}
    </nav>
  );
}

// --- Prev/Next Footer ---

function PrevNextNav({
  prev,
  next,
}: {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="flex items-stretch gap-4 mt-12 pt-6 border-t border-border/40">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="group flex-1 flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 hover:border-accent/40 hover:bg-accent/5 transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-muted group-hover:text-accent shrink-0 transition-colors" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
              Previous
            </p>
            <p className="text-sm font-medium text-foreground group-hover:text-accent truncate transition-colors">
              {prev.title}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group flex-1 flex items-center justify-end gap-3 rounded-lg border border-border/50 px-4 py-3 hover:border-accent/40 hover:bg-accent/5 transition-all text-right"
        >
          <div className="min-w-0">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
              Next
            </p>
            <p className="text-sm font-medium text-foreground group-hover:text-accent truncate transition-colors">
              {next.title}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent shrink-0 transition-colors" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

// --- Main Layout ---

export function DocsClient({
  html,
  title,
  nav,
  currentSlug,
  toc,
  prev,
  next,
}: Props) {
  const [activeId, setActiveId] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement | null>(null);

  // Scroll spy — track which heading is currently visible
  const handleScroll = useCallback(() => {
    if (toc.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const offset = 100; // px from top of scroll container
    let current = toc[0].id;

    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      // Heading is above the offset threshold → it's the active one
      if (rect.top - containerRect.top <= offset) {
        current = item.id;
      }
    }

    setActiveId(current);
  }, [toc]);

  // Attach scroll listener to the real scroll container (<main>), not window
  useEffect(() => {
    const container = getScrollParent(contentRef.current);
    scrollRef.current = container;
    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Set active from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setActiveId(hash);
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, []);

  // Render mermaid diagrams client-side
  useEffect(() => {
    const blocks = contentRef.current?.querySelectorAll(".mermaid-block");
    if (!blocks || blocks.length === 0) return;

    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          darkMode: true,
          background: "transparent",
          primaryColor: "#3b82f6",
          primaryTextColor: "#e4e4e7",
          primaryBorderColor: "#52525b",
          lineColor: "#71717a",
          secondaryColor: "#27272a",
          tertiaryColor: "#18181b",
          fontFamily: "ui-monospace, monospace",
          fontSize: "13px",
        },
      });
      if (cancelled) return;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i] as HTMLElement;
        const source = decodeURIComponent(block.dataset.mermaid ?? "");
        if (!source) continue;
        try {
          const id = `mermaid-${currentSlug.replace(/\//g, "-")}-${i}`;
          const { svg } = await mermaid.render(id, source);
          if (!cancelled) {
            block.innerHTML = svg;
            block.classList.add("mermaid-rendered");
          }
        } catch {
          // Leave raw text visible on render failure
          block.classList.add("mermaid-error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [html, currentSlug]);

  return (
    <div className="flex gap-0 -mx-2">
      {/* Left sidebar nav */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-border/40 pr-2">
        <div className="sticky top-4 py-2 space-y-0.5 max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin">
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation
          </div>
          {nav.map((item) => (
            <NavItem
              key={item.slug}
              item={item}
              currentSlug={currentSlug}
            />
          ))}
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 px-6 lg:px-10">
        <article ref={contentRef} className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-foreground">
            {title}
          </h1>
          <div
            className="prose prose-invert prose-sm max-w-none
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:scroll-mt-20
              prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-2
              prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-muted prose-p:leading-relaxed
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-code:text-accent prose-code:bg-accent/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px]
              prose-pre:bg-transparent prose-pre:border-0 prose-pre:p-0 prose-pre:rounded-lg prose-pre:text-[13px]
              [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:rounded-none [&_pre>code]:text-inherit [&_pre>code]:before:content-none [&_pre>code]:after:content-none
              [&_.shiki]:rounded-lg [&_.shiki]:border [&_.shiki]:border-border/40 [&_.shiki]:p-4 [&_.shiki]:overflow-x-auto [&_.shiki]:text-[13px] [&_.shiki]:leading-relaxed
              [&_.mermaid-block]:my-6 [&_.mermaid-block]:rounded-lg [&_.mermaid-block]:border [&_.mermaid-block]:border-border/40 [&_.mermaid-block]:p-4 [&_.mermaid-block]:overflow-x-auto [&_.mermaid-block]:bg-zinc-900/50
              [&_.mermaid-rendered]:text-center [&_.mermaid-rendered_svg]:mx-auto [&_.mermaid-rendered_svg]:max-w-full
              [&_.mermaid-error]:text-[13px] [&_.mermaid-error]:font-mono [&_.mermaid-error]:text-muted [&_.mermaid-error]:whitespace-pre-wrap
              prose-table:text-sm prose-th:text-foreground prose-th:font-medium prose-td:text-muted
              prose-li:text-muted prose-strong:text-foreground
              prose-blockquote:border-accent/30 prose-blockquote:text-muted/80"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Prev/Next footer */}
          <PrevNextNav prev={prev} next={next} />
        </article>
      </div>

      {/* Right-side TOC */}
      {toc.length > 0 && (
        <aside className="hidden xl:block w-48 shrink-0 pl-2">
          <div className="sticky top-4 max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin">
            <TableOfContents toc={toc} activeId={activeId} />
          </div>
        </aside>
      )}
    </div>
  );
}
