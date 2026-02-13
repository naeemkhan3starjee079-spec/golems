"use client";

import { Activity, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";

type ServiceStatus = {
  services: Record<string, { status: string; chunks?: number }>;
};

export default function OpsPage() {
  const [data, setData] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    fetch("/api/health/services")
      .then((r) => { if (r.ok) return r.json(); })
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent" />
        Service Health
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.services).map(([name, info]) => (
          <div
            key={name}
            className="rounded-lg border border-border bg-surface p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">
                {name.replace(/_/g, " ")}
              </span>
              <Circle
                className={`w-3 h-3 fill-current ${
                  info.status === "up" ? "text-emerald" : "text-rose"
                }`}
              />
            </div>
            <p className="text-xs text-muted capitalize">{info.status}</p>
            {info.chunks !== undefined && (
              <p className="text-xs text-muted">{info.chunks.toLocaleString()} chunks</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
