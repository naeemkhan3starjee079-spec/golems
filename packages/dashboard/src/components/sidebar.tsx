"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Brain,
  Briefcase,
  Activity,
  Coins,
  Database,
  KanbanSquare,
  Mail,
  Palette,
  Search,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof Brain };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Brain View", icon: Brain },
      { href: "/ops", label: "Services", icon: Activity },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/tokens", label: "Tokens", icon: Coins },
      { href: "/enrichment", label: "Enrichment", icon: Database },
    ],
  },
  {
    label: "Golems",
    items: [
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/emails", label: "Emails", icon: Mail },
      { href: "/recruiter", label: "Recruiter", icon: Users },
      { href: "/teller", label: "Teller", icon: Wallet },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/backlog", label: "Backlog", icon: KanbanSquare },
      { href: "/content", label: "Content", icon: Palette },
      { href: "/docs", label: "Docs", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Search is handled via Cmd+K overlay, not a nav link
const SEARCH_ACTION = { label: "Search", icon: Search };

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
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <div className="h-px bg-border/40 mx-3 my-1.5" />}
            <div className="px-4 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-bold text-muted/50 uppercase tracking-widest">
                {section.label}
              </span>
            </div>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
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
          </div>
        ))}

        {/* Search action (opens Cmd+K overlay) */}
        <div className="h-px bg-border/40 mx-3 my-1.5" />
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            )
          }
          className="flex items-center gap-3 px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors w-full"
        >
          <SEARCH_ACTION.icon className="w-5 h-5 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {SEARCH_ACTION.label}
          </span>
        </button>
      </nav>

    </aside>
  );
}
