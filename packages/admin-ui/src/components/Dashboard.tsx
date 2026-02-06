import { useEffect, useState } from "react";
import {
  fetchHealth,
  fetchUsage,
  type HealthResponse,
  type UsageResponse,
} from "../lib/api";
import { supabase } from "../lib/supabase";

const cardStyle: React.CSSProperties = {
  background: "#16213e",
  borderRadius: 8,
  padding: 20,
  minWidth: 200,
  flex: 1,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 8,
};

const valueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#fff",
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setError("Cloud worker unreachable"));
    fetchUsage().then(setUsage).catch(() => {});

    supabase
      .from("golem_events")
      .select("*", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      )
      .then(({ count }) => setEventCount(count ?? 0));
  }, []);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Cloud Worker</div>
        <div style={{ ...valueStyle, color: health ? "#4ade80" : error ? "#f87171" : "#888" }}>
          {health ? "Online" : error ? "Offline" : "..."}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Uptime</div>
        <div style={valueStyle}>
          {health ? formatUptime(health.uptime) : "--"}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>LLM Backend</div>
        <div style={{ ...valueStyle, fontSize: 20 }}>
          {health?.llmBackend ?? "--"}
        </div>
        {usage && (
          <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
            ${usage.totalCostUsd.toFixed(4)} total
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Events (24h)</div>
        <div style={valueStyle}>{eventCount ?? "--"}</div>
      </div>
    </div>
  );
}
