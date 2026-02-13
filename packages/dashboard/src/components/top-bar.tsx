"use client";

import { Circle } from "lucide-react";
import { useEffect, useState } from "react";

export function TopBar() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [lastUpdated, setLastUpdated] = useState<string>("");

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

    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
      <h1 className="text-sm font-medium text-muted">Dashboard</h1>

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
      </div>
    </header>
  );
}
