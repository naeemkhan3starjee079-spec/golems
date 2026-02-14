"use client";

import {
  ArrowRight,
  Archive,
  CheckCircle2,
  Circle,
  FileText,
  KanbanSquare,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/skeleton";
import {
  fetchBacklogItems,
  createBacklogItem,
  updateBacklogItem,
  deleteBacklogItem as removeBacklogItem,
} from "@/lib/supabase/queries";

type BacklogItem = {
  id: string;
  project: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  plan_name: string | null;
  phase: string | null;
};

const COLUMNS = [
  { key: "ideas", label: "Ideas", icon: Lightbulb, color: "text-yellow-400" },
  { key: "backlog", label: "Backlog", icon: Circle, color: "text-muted" },
  { key: "in_progress", label: "In Progress", icon: Loader2, color: "text-accent" },
  { key: "done", label: "Done", icon: CheckCircle2, color: "text-emerald" },
  { key: "archived", label: "Archived", icon: Archive, color: "text-muted/50" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose/20 text-rose border-rose/30",
  high: "bg-amber/20 text-amber border-amber/30",
  medium: "bg-accent/20 text-accent border-accent/30",
  low: "bg-muted/20 text-muted border-muted/30",
};

const NEXT_STATUS: Record<string, string> = {
  ideas: "backlog",
  backlog: "in_progress",
  in_progress: "done",
  done: "archived",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("golems");
  const [newPriority, setNewPriority] = useState("medium");
  const [filterProject, setFilterProject] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchBacklogItems(
        filterProject || undefined,
        filterPlan || undefined,
      );
      setItems(data as BacklogItem[]);
    } catch {
      setItems((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [filterProject, filterPlan]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const item = await createBacklogItem({
        title: newTitle.trim(),
        project: newProject,
        priority: newPriority,
        status: "ideas",
      });
      if ((!filterProject || item.project === filterProject) && !filterPlan) {
        setItems((prev) => (prev ? [item as BacklogItem, ...prev] : [item as BacklogItem]));
      }
      setNewTitle("");
      inputRef.current?.focus();
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  }, [newTitle, newProject, newPriority, filterProject, filterPlan]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    setItems((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, status } : i)) : prev
    );
    try {
      await updateBacklogItem(id, { status });
    } catch {
      fetchItems(); // revert on error
    }
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    try {
      await removeBacklogItem(id);
    } catch {
      fetchItems(); // revert on error
    }
  }, [fetchItems]);

  if (!items) return <PageSkeleton />;

  // Get unique projects and plans for filters
  const projects = [...new Set(items.map((i) => i.project))].sort();
  const plans = [...new Set(items.map((i) => i.plan_name).filter(Boolean))].sort() as string[];

  // Group items by status
  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: items.filter((i) => i.status === col.key),
  }));

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <KanbanSquare className="w-5 h-5 text-accent" />
          Backlog
          <span className="text-sm font-normal text-muted">
            ({items.length} items)
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {/* Plan filter */}
          {plans.length > 0 && (
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-muted focus:text-foreground outline-none"
            >
              <option value="">All plans</option>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
          {/* Project filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-muted focus:text-foreground outline-none"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchItems}
            className="text-muted hover:text-foreground transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Quick add — defaults to Ideas column */}
      <div className="flex gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
          placeholder="Add idea... (Enter to submit)"
          className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted/50 focus:border-accent outline-none"
        />
        <select
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 outline-none"
        >
          {["golems", "songscript", "domica", "taba", "union", "rudy"].map(
            (p) => (
              <option key={p} value={p}>
                {p}
              </option>
            )
          )}
        </select>
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 outline-none"
        >
          {["urgent", "high", "medium", "low"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addItem}
          disabled={adding || !newTitle.trim()}
          className="bg-accent text-background px-3 py-2 rounded-md text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1 min-h-0">
        {grouped.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              className="flex flex-col rounded-lg border border-border bg-surface/50 overflow-hidden"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 shrink-0">
                <Icon className={`w-3.5 h-3.5 ${col.color}`} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  {col.label}
                </span>
                <span className="text-[10px] text-muted/50 ml-auto">
                  {col.items.length}
                </span>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                {col.items.length === 0 && (
                  <p className="text-[10px] text-muted/30 text-center py-4">
                    No items
                  </p>
                )}
                {col.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border/50 bg-surface p-2.5 space-y-1.5 group hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-medium leading-tight">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {NEXT_STATUS[item.status] && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(item.id, NEXT_STATUS[item.status])
                            }
                            title={`Move to ${NEXT_STATUS[item.status]}`}
                            className="p-0.5 hover:text-accent transition-colors"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          title="Delete"
                          className="p-0.5 hover:text-rose transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority] ?? "bg-muted/10 text-muted"}`}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[9px] text-muted/50 font-mono">
                        {item.project}
                      </span>
                      {item.plan_name && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center gap-0.5">
                          <FileText className="w-2.5 h-2.5" />
                          {item.plan_name}
                          {item.phase && <span className="text-muted/60">/{item.phase}</span>}
                        </span>
                      )}
                      <span className="text-[9px] text-muted/30 ml-auto">
                        {timeAgo(item.updated_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
