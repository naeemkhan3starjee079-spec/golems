"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { BrainGraph as BrainGraphType, GraphNode } from "@/lib/types";
import { BrainGraph3D } from "@/components/brain-graph";
import { BrainMinimap } from "@/components/brain-minimap";
import { NodePanel } from "@/components/node-panel";
import { BrainSearch } from "@/components/brain-search";
import { BrainStats } from "@/components/brain-stats";
import { PageSkeleton } from "@/components/skeleton";
import { downloadGraph } from "@/lib/supabase/graph";
import { Camera, Maximize2, Minimize2 } from "lucide-react";

function BrainViewContent() {
  const [graph, setGraph] = useState<BrainGraphType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [presenting, setPresenting] = useState(false);
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const nodeParam = searchParams.get("node");

  // Toggle fullscreen presentation mode
  const togglePresentation = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => setPresenting(true));
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setPresenting(false));
    }
  }, []);

  // Export brain view as PNG
  const exportPng = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `brain-view-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // Sync state when user exits fullscreen via Escape
  useEffect(() => {
    function onFsChange() {
      setPresenting(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Fetch graph data: try Supabase Storage first, fall back to daemon API
  useEffect(() => {
    async function loadGraph() {
      // Try Supabase Storage (multi-tenant, user-uploaded graph)
      const { data, error: storageErr } = await downloadGraph();
      if (data && !storageErr) {
        setGraph(data as BrainGraphType);
        return;
      }
      // Fall back to local Zikaron daemon
      try {
        const r = await fetch("/api/brain/graph");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        setGraph(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load graph");
      }
    }
    loadGraph();
  }, []);

  // Auto-select node from URL param
  useEffect(() => {
    if (graph && nodeParam) {
      const node = graph.nodes.find(
        (n) => n.id === nodeParam || n.session_id === nodeParam
      );
      setSelectedNode(node ?? null);
    }
  }, [graph, nodeParam]);

  const handleNodeClick = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
  }, []);

  // Search match count
  const matchCount = useMemo(() => {
    if (!graph || !searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return graph.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.project.toLowerCase().includes(q) ||
        n.branch.toLowerCase().includes(q) ||
        n.plan.toLowerCase().includes(q)
    ).length;
  }, [graph, searchQuery]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
        <p className="text-sm">
          Failed to load brain graph: {error}
        </p>
        <p className="text-xs text-muted/60">
          Upload a <code className="bg-surface px-1.5 py-0.5 rounded">graph.json</code> via Settings, or run <code className="bg-surface px-1.5 py-0.5 rounded">zikaron brain-export</code> locally and upload the result.
        </p>
      </div>
    );
  }

  if (!graph) return <PageSkeleton />;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${presenting ? "bg-background" : "-m-4 md:-m-6"}`}
    >
      {/* Controls: export + presentation */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={exportPng}
          className="p-2 bg-surface/80 backdrop-blur-sm border border-border/50 rounded-lg text-muted hover:text-foreground transition-colors"
          title="Export as PNG"
        >
          <Camera className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={togglePresentation}
          className="p-2 bg-surface/80 backdrop-blur-sm border border-border/50 rounded-lg text-muted hover:text-foreground transition-colors"
          title={presenting ? "Exit presentation" : "Presentation mode"}
        >
          {presenting ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Search overlay — hidden in presentation mode */}
      {!presenting && (
        <BrainSearch
          value={searchQuery}
          onChange={setSearchQuery}
          matchCount={matchCount}
          totalNodes={graph.nodes.length}
        />
      )}

      {/* Stats overlay — hidden in presentation mode */}
      {!presenting && <BrainStats graph={graph} />}

      {/* 3D Graph */}
      <BrainGraph3D
        ref={graphRef}
        graph={graph}
        searchQuery={presenting ? "" : searchQuery}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNode?.id ?? null}
      />

      {/* Minimap — hidden in presentation mode */}
      {!presenting && <BrainMinimap graph={graph} graphRef={graphRef} />}

      {/* Side panel — hidden in presentation mode */}
      {!presenting && selectedNode && (
        <NodePanel
          node={selectedNode}
          edges={graph.edges}
          allNodes={graph.nodes}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export default function BrainViewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BrainViewContent />
    </Suspense>
  );
}
