import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface PipelineStats {
  contacts: number;
  messages: number;
  companies: number;
}

const cardStyle: React.CSSProperties = {
  background: "#16213e",
  borderRadius: 8,
  padding: 20,
  flex: 1,
  minWidth: 200,
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

export default function OutreachPipeline() {
  const [stats, setStats] = useState<PipelineStats | null>(null);

  useEffect(() => {
    Promise.all([
      supabase
        .from("outreach_contacts")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("outreach_messages")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("outreach_companies")
        .select("*", { count: "exact", head: true }),
    ]).then(([contacts, messages, companies]) => {
      setStats({
        contacts: contacts.count ?? 0,
        messages: messages.count ?? 0,
        companies: companies.count ?? 0,
      });
    });
  }, []);

  if (!stats) return <div style={{ color: "#888" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Contacts</div>
        <div style={valueStyle}>{stats.contacts}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Messages</div>
        <div style={valueStyle}>{stats.messages}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Companies</div>
        <div style={valueStyle}>{stats.companies}</div>
      </div>
    </div>
  );
}
