"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import type { DocNavItem } from "@/lib/docs";

type Props = {
  html: string;
  title: string;
  nav: DocNavItem[];
  currentSlug: string;
};

function NavItem({ item, currentSlug, depth = 0 }: { item: DocNavItem; currentSlug: string; depth?: number }) {
  const [open, setOpen] = useState(
    item.children?.some((c) => c.slug === currentSlug || currentSlug.startsWith(c.slug + "/")) ?? false
  );
  const isActive = item.slug === currentSlug;

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-medium text-muted hover:text-foreground transition-colors"
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          {item.title}
        </button>
        {open && (
          <div>
            {item.children.map((child) => (
              <NavItem key={child.slug} item={child} currentSlug={currentSlug} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={`/docs/${item.slug}`}
      className={`flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${
        isActive
          ? "text-accent bg-accent/10 font-medium"
          : "text-muted hover:text-foreground hover:bg-surface-hover"
      }`}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      <FileText className="w-3 h-3 shrink-0" />
      {item.title}
    </Link>
  );
}

export function DocsClient({ html, title, nav, currentSlug }: Props) {
  return (
    <div className="flex gap-6 -mx-2">
      {/* Docs sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-border/40 pr-4">
        <div className="sticky top-0 py-2 space-y-0.5 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            Docs
          </div>
          {nav.map((item) => (
            <NavItem key={item.slug} item={item} currentSlug={currentSlug} />
          ))}
        </div>
      </aside>

      {/* Content */}
      <article className="flex-1 min-w-0 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        <div
          className="prose prose-invert prose-sm max-w-none
            prose-headings:text-foreground prose-headings:font-semibold
            prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-2
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-muted prose-p:leading-relaxed
            prose-a:text-accent prose-a:no-underline hover:prose-a:underline
            prose-code:text-accent prose-code:bg-accent/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px]
            prose-pre:bg-background/80 prose-pre:border prose-pre:border-border/40 prose-pre:rounded-lg prose-pre:text-[13px]
            prose-table:text-sm prose-th:text-foreground prose-th:font-medium prose-td:text-muted
            prose-li:text-muted prose-strong:text-foreground
            prose-blockquote:border-accent/30 prose-blockquote:text-muted/80"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
}
