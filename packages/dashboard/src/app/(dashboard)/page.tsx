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

function BrainViewContent() {
  const [graph, setGraph] = useState<BrainGraphType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const graphRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const nodeParam = searchParams.get("node");

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
          Make sure the Zikaron daemon is running: <code className="bg-surface px-1.5 py-0.5 rounded">zikaron daemon --http 8787</code>
        </p>
      </div>
    );
  }

  if (!graph) return <PageSkeleton />;

  return (
    <div className="relative w-full h-full -m-6 overflow-hidden">
      {/* Search overlay */}
      <BrainSearch
        value={searchQuery}
        onChange={setSearchQuery}
        matchCount={matchCount}
        totalNodes={graph.nodes.length}
      />

      {/* Stats overlay */}
      <BrainStats graph={graph} />

      {/* 3D Graph */}
      <BrainGraph3D
        ref={graphRef}
        graph={graph}
        searchQuery={searchQuery}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNode?.id ?? null}
      />

      {/* Minimap */}
      <BrainMinimap graph={graph} graphRef={graphRef} />

      {/* Side panel */}
      {selectedNode && (
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
