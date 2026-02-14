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

  // Scroll spy — track which heading is currently visible
  const handleScroll = useCallback(() => {
    if (toc.length === 0) return;

    const headings = toc
      .map((item) => ({
        id: item.id,
        el: document.getElementById(item.id),
      }))
      .filter((h) => h.el !== null);

    if (headings.length === 0) return;

    // Find the heading closest to top of viewport (with offset)
    const scrollTop = window.scrollY;
    const offset = 100;
    let current = headings[0].id;

    for (const heading of headings) {
      if (heading.el!.offsetTop <= scrollTop + offset) {
        current = heading.id;
      }
    }

    setActiveId(current);
  }, [toc]);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Set active from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setActiveId(hash);
      // Scroll to hash after a brief delay for render
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, []);

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
              [&_.shiki]:rounded-lg [&_.shiki]:border [&_.shiki]:border-border/40 [&_.shiki]:p-4 [&_.shiki]:overflow-x-auto [&_.shiki]:text-[13px] [&_.shiki]:leading-relaxed
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
