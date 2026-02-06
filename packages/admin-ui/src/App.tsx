import { useState } from "react";
import Dashboard from "./components/Dashboard";
import EventLog from "./components/EventLog";
import UsageStats from "./components/UsageStats";
import OutreachPipeline from "./components/OutreachPipeline";

const tabs = ["Dashboard", "Events", "Usage", "Outreach"] as const;
type Tab = (typeof tabs)[number];

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
    color: "#e0e0e0",
    backgroundColor: "#1a1a2e",
    minHeight: "100vh",
  },
  header: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 16,
    color: "#fff",
  },
  tabBar: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid #333",
    marginBottom: 24,
  },
  tab: {
    padding: "10px 20px",
    cursor: "pointer",
    border: "none",
    background: "none",
    color: "#888",
    fontSize: 14,
    fontWeight: 500,
    borderBottom: "2px solid transparent",
  },
  activeTab: {
    color: "#7c3aed",
    borderBottom: "2px solid #7c3aed",
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  return (
    <div style={styles.container}>
      <div style={styles.header}>Golems Admin</div>
      <div style={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === "Dashboard" && <Dashboard />}
      {activeTab === "Events" && <EventLog />}
      {activeTab === "Usage" && <UsageStats />}
      {activeTab === "Outreach" && <OutreachPipeline />}
    </div>
  );
}
