import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface GolemEvent {
  id: string;
  actor: string;
  type: string;
  created_at: string;
  data: Record<string, unknown>;
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
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

export default function EventLog() {
  const [events, setEvents] = useState<GolemEvent[]>([]);
  const [actorFilter, setActorFilter] = useState("");
  const [actors, setActors] = useState<string[]>([]);

  useEffect(() => {
    let query = supabase
      .from("golem_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (actorFilter) {
      query = query.eq("actor", actorFilter);
    }

    query.then(({ data }) => {
      if (data) setEvents(data as GolemEvent[]);
    });
  }, [actorFilter]);

  useEffect(() => {
    supabase
      .from("golem_events")
      .select("actor")
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.actor))].sort();
          setActors(unique);
        }
      });
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          style={{
            background: "#16213e",
            color: "#ccc",
            border: "1px solid #333",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 14,
          }}
        >
          <option value="">All actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Actor</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Data</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td style={tdStyle}>{ev.actor}</td>
              <td style={tdStyle}>{ev.type}</td>
              <td style={tdStyle}>
                {new Date(ev.created_at).toLocaleString()}
              </td>
              <td style={{ ...tdStyle, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {JSON.stringify(ev.data).slice(0, 80)}
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={4}>
                No events found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
