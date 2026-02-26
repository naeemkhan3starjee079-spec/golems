"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Activity,
  Briefcase,
  Heart,
  KanbanSquare,
  Settings,
} from "lucide-react";

const MOBILE_NAV = [
  { href: "/", label: "Brain", icon: Brain },
  { href: "/ops", label: "Ops", icon: Activity },
  { href: "/coach", label: "Coach", icon: Heart },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/backlog", label: "Board", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-sm z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
