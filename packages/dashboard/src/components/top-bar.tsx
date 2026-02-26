"use client";

import { Circle, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TopBar() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          setStatus("connected");
          setLastUpdated(new Date().toLocaleTimeString());
        } else {
          setStatus("disconnected");
        }
      } catch {
        setStatus("disconnected");
      }
    }

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    }

    checkHealth();
    getUser();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
      <h1 className="text-sm font-medium text-muted">Dashboard</h1>

      <button
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted/60 bg-background border border-border/50 rounded-lg hover:text-muted hover:border-border transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="text-[10px] bg-surface px-1 py-0.5 rounded border border-border/30 ml-1">
            ⌘K
          </kbd>
        </button>

      <div className="flex items-center gap-4 text-xs text-muted">
        {lastUpdated && <span>Updated {lastUpdated}</span>}
        <div className="flex items-center gap-1.5">
          <Circle
            className={`w-2 h-2 fill-current ${
              status === "connected"
                ? "text-emerald"
                : status === "disconnected"
                ? "text-rose"
                : "text-amber"
            }`}
          />
          <span className="capitalize">{status}</span>
        </div>
        {userEmail && (
          <>
            <span className="text-muted/60">{userEmail}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1 text-muted/60 hover:text-rose transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
