import { useEffect, useState } from "react";
import { fetchUsage, type UsageResponse } from "../lib/api";

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  marginTop: 24,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #333",
  color: "#888",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #222",
  color: "#ccc",
};

const statBox: React.CSSProperties = {
  background: "#16213e",
  borderRadius: 8,
  padding: 20,
  flex: 1,
  minWidth: 150,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 8,
};

const valueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#fff",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function UsageStats() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage()
      .then(setUsage)
      .catch(() => setError("Could not fetch usage data"));
  }, []);

  if (error) return <div style={{ color: "#f87171" }}>{error}</div>;
  if (!usage) return <div style={{ color: "#888" }}>Loading...</div>;

  const sources = Object.entries(usage.bySource);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={statBox}>
          <div style={labelStyle}>Total Calls</div>
          <div style={valueStyle}>{usage.totalCalls}</div>
        </div>
        <div style={statBox}>
          <div style={labelStyle}>Input Tokens</div>
          <div style={valueStyle}>{formatTokens(usage.totalInputTokens)}</div>
        </div>
        <div style={statBox}>
          <div style={labelStyle}>Output Tokens</div>
          <div style={valueStyle}>{formatTokens(usage.totalOutputTokens)}</div>
        </div>
        <div style={statBox}>
          <div style={labelStyle}>Total Cost</div>
          <div style={valueStyle}>${usage.totalCostUsd.toFixed(4)}</div>
        </div>
      </div>

      {sources.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Calls</th>
              <th style={thStyle}>Input</th>
              <th style={thStyle}>Output</th>
              <th style={thStyle}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(([source, data]) => (
              <tr key={source}>
                <td style={tdStyle}>{source}</td>
                <td style={tdStyle}>{data.calls}</td>
                <td style={tdStyle}>{formatTokens(data.inputTokens)}</td>
                <td style={tdStyle}>{formatTokens(data.outputTokens)}</td>
                <td style={tdStyle}>${data.costUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
