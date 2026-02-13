"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Activity,
  Coins,
  Database,
  KanbanSquare,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Brain View", icon: Brain },
  { href: "/ops", label: "Services", icon: Activity },
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/enrichment", label: "Enrichment", icon: Database },
  { href: "/backlog", label: "Backlog", icon: KanbanSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-16 hover:w-48 transition-all duration-200 flex-col border-r border-border bg-surface group overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Brain className="w-6 h-6 text-accent shrink-0" />
        <span className="text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Golems
        </span>
      </div>

      <nav className="flex-1 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "text-accent bg-accent/10"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
