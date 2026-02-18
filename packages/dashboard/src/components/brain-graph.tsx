"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrainGraph, GraphNode, GraphFilters } from "@/lib/types";
import {
  getNodeColorHex,
  getEmissiveIntensity,
  getNodeSize,
  DIM_COLOR_HEX,
} from "@/lib/graph-colors";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

type Props = {
  graph: BrainGraph;
  searchQuery: string;
  filters: GraphFilters;
  onNodeClick: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
};

// Zoom levels based on camera distance from origin
const ZOOM_FAR = 400;
const ZOOM_MID_MAX = 400;
const ZOOM_MID_MIN = 150;
const ZOOM_CLOSE = 150;
const TRANSITION_ZONE = 40;

type ZoomLevel = "FAR" | "MID" | "CLOSE";

// Super-node type for coarse community aggregation
type SuperNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  memberCount: number;
  isSuperNode: true;
  fx: number;
  fy: number;
  fz: number;
};

// Precompute enrichment status per node
function isEnriched(node: GraphNode): boolean {
  return node.color_type !== "unknown";
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export const BrainGraph3D = forwardRef<any, Props>(function BrainGraph3D({
  graph,
  searchQuery,
  filters,
  onNodeClick,
  selectedNodeId,
}, ref) {
  const internalRef = useRef<any>(null);
  const fgRef = internalRef;
  // Sync parent ref when provided (ForceGraph3D only accepts RefObject)
  useEffect(() => {
    if (!ref) return;
    const instance = internalRef.current;
    if (typeof ref === "function") ref(instance);
    else (ref as React.MutableRefObject<any>).current = instance;
    return () => {
      if (typeof ref === "function") (ref as (i: any) => void)(null);
      else if (ref) (ref as React.MutableRefObject<any>).current = null;
    };
  });
  const composerRef = useRef<InstanceType<typeof EffectComposer> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraDistance, setCameraDistance] = useState(300);
  const cameraDistRef = useRef(300);

  // EffectComposer + UnrealBloomPass post-processing
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let renderer: THREE.WebGLRenderer | null = null;

    const setup = () => {
      if (cancelled) return;
      const fg = fgRef.current;
      if (!fg) {
        rafId = requestAnimationFrame(setup);
        return;
      }
      const r = fg.renderer();
      const scene = fg.scene();
      const camera = fg.camera();
      if (!r || !scene || !camera) {
        rafId = requestAnimationFrame(setup);
        return;
      }
      renderer = r;

      const resolution = new THREE.Vector2(dimensions.width, dimensions.height);
      const composer = new EffectComposer(r);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(resolution, 1.5, 0.4, 0.8));
      composerRef.current = composer;

      r.setAnimationLoop(() => composer.render());
    };
    rafId = requestAnimationFrame(setup);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      const composer = composerRef.current;
      if (composer && renderer) {
        renderer.setAnimationLoop(null);
        composer.dispose();
        composerRef.current = null;
      }
    };
  }, []);

  // Update composer size when dimensions change
  useEffect(() => {
    const composer = composerRef.current;
    if (composer) {
      composer.setSize(dimensions.width, dimensions.height);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const bloomPass = composer.passes[1] as InstanceType<typeof UnrealBloomPass>;
      if (bloomPass && bloomPass.resolution) {
        bloomPass.resolution.set(dimensions.width, dimensions.height);
      }
    }
  }, [dimensions]);

  // Add ambient lighting for MeshStandardMaterial
  useEffect(() => {
    if (!fgRef.current) return;
    const scene = fgRef.current.scene();
    if (scene) {
      // Check if we already added lights
      const existingLight = scene.children.find(
        (c: any) => c.type === "AmbientLight"
      );
      if (!existingLight) {
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        scene.add(new THREE.PointLight(0x8B5CF6, 0.8, 0));
      }
    }
  });

  // Track dimensions
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Track camera distance from origin (for semantic zoom)
  // Uses ref to avoid re-renders; only updates state when crossing zoom thresholds
  useEffect(() => {
    let rafId: number;
    function tick() {
      const fg = fgRef.current;
      if (fg) {
        const camera = fg.camera();
        const controls = fg.controls();
        if (camera && controls?.target) {
          const target = controls.target as THREE.Vector3;
          const dist = camera.position.distanceTo(target);
          cameraDistRef.current = dist;
          // Only trigger re-render when distance changes significantly (>5 units)
          if (Math.abs(dist - cameraDistance) > 5) {
            setCameraDistance(dist);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraDistance]);

  // Build search-matching set
  const matchingIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      if (
        node.label.toLowerCase().includes(q) ||
        node.project.toLowerCase().includes(q) ||
        node.branch.toLowerCase().includes(q) ||
        node.plan.toLowerCase().includes(q)
      ) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [graph.nodes, searchQuery]);

  // Build filter-matching set
  const filteredIds = useMemo(() => {
    const hasFilters = filters.projects.length > 0 || filters.sources.length > 0 || filters.intents.length > 0;
    if (!hasFilters) return null;
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      if (filters.projects.length > 0 && !filters.projects.includes(node.project)) continue;
      if (filters.sources.length > 0 && !filters.sources.includes(node.source ?? "unknown")) continue;
      if (filters.intents.length > 0 && !filters.intents.includes(node.color_type)) continue;
      ids.add(node.id);
    }
    return ids;
  }, [graph.nodes, filters]);

  // Build neighbor set for selected node (1-hop)
  const neighborIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    for (const edge of graph.edges) {
      const src =
        typeof edge.source === "object"
          ? (edge.source as any).id
          : edge.source;
      const tgt =
        typeof edge.target === "object"
          ? (edge.target as any).id
          : edge.target;
      if (src === selectedNodeId) ids.add(tgt);
      if (tgt === selectedNodeId) ids.add(src);
    }
    return ids;
  }, [selectedNodeId, graph.edges]);

  // Super-nodes from hierarchy.coarse (centroid + member count)
  const superNodes = useMemo((): SuperNode[] => {
    const coarse = graph.hierarchy?.coarse;
    if (!coarse || typeof coarse !== "object") return [];
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    return Object.entries(coarse).map(([commId, info]) => {
      const members = info.members ?? [];
      const nodes = members
        .map((id) => nodeById.get(id))
        .filter((n): n is GraphNode => n != null);
      if (nodes.length === 0) {
        return {
          id: `super-${commId}`,
          label: info.label ?? `cluster-${commId}`,
          x: 0,
          y: 0,
          z: 0,
          memberCount: 0,
          isSuperNode: true,
          fx: 0,
          fy: 0,
          fz: 0,
        };
      }
      const cx =
        nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
      const cy =
        nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
      const cz =
        nodes.reduce((s, n) => s + n.z, 0) / nodes.length;
      return {
        id: `super-${commId}`,
        label: info.label ?? `cluster-${commId}`,
        x: cx,
        y: cy,
        z: cz,
        memberCount: nodes.length,
        isSuperNode: true,
        fx: cx,
        fy: cy,
        fz: cz,
      };
    });
  }, [graph.nodes, graph.hierarchy]);

  // Zoom blend factors for smooth transitions (0–1)
  const { zoomLevel, farBlend, midBlend, closeBlend } = useMemo(() => {
    const d = cameraDistance;
    const farBlend = smoothstep((d - (ZOOM_FAR - TRANSITION_ZONE)) / TRANSITION_ZONE);
    const closeBlend = smoothstep((ZOOM_MID_MIN + TRANSITION_ZONE - d) / TRANSITION_ZONE);
    const midBlend = 1 - farBlend - closeBlend;
    let zoomLevel: ZoomLevel =
      farBlend > 0.5 ? "FAR" : closeBlend > 0.5 ? "CLOSE" : "MID";
    return { zoomLevel, farBlend, midBlend, closeBlend };
  }, [cameraDistance]);

  // At MID with selection: only nodes in selected node's medium community
  const focusedMediumIds = useMemo(() => {
    if (!selectedNodeId || zoomLevel !== "MID") return null;
    const sel = graph.nodes.find((n) => n.id === selectedNodeId);
    if (!sel) return null;
    const commId = String(sel.community.medium);
    const info = graph.hierarchy?.medium?.[commId];
    if (!info?.members) return null;
    return new Set(info.members);
  }, [selectedNodeId, zoomLevel, graph.nodes, graph.hierarchy]);

  // Graph data: super-nodes + all real nodes (visibility filtered per zoom level)
  const graphData = useMemo(() => ({
    nodes: [
      ...superNodes,
      ...graph.nodes.map((n) => ({
        ...n,
        fx: n.x,
        fy: n.y,
        fz: n.z,
      })),
    ] as (SuperNode | GraphNode)[],
    links: graph.edges.map((e) => ({ ...e })),
  }), [graph, superNodes]);

  // Node visibility by zoom level (FAR=super only, MID/CLOSE=real; MID filters by community when focused)
  const nodeVisibility = useCallback(
    (node: any) => {
      if (node.isSuperNode) {
        return farBlend > 0.01;
      }
      const n = node as GraphNode;
      const realVisible = midBlend > 0.01 || closeBlend > 0.01;
      if (!realVisible) return false;
      if (focusedMediumIds && zoomLevel === "MID") {
        return focusedMediumIds.has(n.id);
      }
      return true;
    },
    [farBlend, midBlend, closeBlend, zoomLevel, focusedMediumIds]
  );

  // Link visibility: only at MID/CLOSE
  const linkVisibility = useCallback(
    () => midBlend > 0.01 || closeBlend > 0.01,
    [midBlend, closeBlend]
  );

  // Node color with search/filter/selection highlighting
  const nodeColor = useCallback(
    (node: any) => {
      if (node.isSuperNode) {
        return "#8B5CF6"; // accent for super-nodes
      }
      const n = node as GraphNode;
      const enriched = isEnriched(n);

      // Filter: dim non-matching nodes
      if (filteredIds && !filteredIds.has(n.id)) {
        return "rgba(30, 41, 59, 0.1)";
      }

      // Search filtering: dim non-matching nodes
      if (matchingIds && !matchingIds.has(n.id)) {
        return "rgba(30, 41, 59, 0.1)";
      }

      // Selection: dim non-neighbor nodes
      if (neighborIds && !neighborIds.has(n.id)) {
        return "rgba(30, 41, 59, 0.15)";
      }

      return getNodeColorHex(n.color_type, enriched);
    },
    [filteredIds, matchingIds, neighborIds]
  );

  // Node size (super-nodes: member count; real: composite score)
  const nodeVal = useCallback(
    (node: any) => {
      if (node.isSuperNode) {
        return Math.max(8, Math.min(25, node.memberCount * 0.5));
      }
      const n = node as GraphNode;
      const enriched = isEnriched(n);
      let size = getNodeSize(n.size, enriched);

      // Shrink filtered-out nodes
      if (filteredIds && !filteredIds.has(n.id)) size *= 0.3;
      // Boost matched search results
      else if (matchingIds?.has(n.id)) size *= 1.5;
      // Boost selected node
      if (n.id === selectedNodeId) size *= 2;

      return size;
    },
    [filteredIds, matchingIds, selectedNodeId]
  );

  // Edge color
  const linkColor = useCallback(
    (link: any) => {
      const src =
        typeof link.source === "object" ? link.source.id : link.source;
      const tgt =
        typeof link.target === "object" ? link.target.id : link.target;

      if (neighborIds) {
        if (neighborIds.has(src) && neighborIds.has(tgt)) {
          return "rgba(139, 92, 246, 0.5)"; // accent purple for connected edges
        }
        return "rgba(30, 41, 59, 0.03)";
      }

      // Check if endpoints pass both filters and search
      const srcPassesFilter = !filteredIds || filteredIds.has(src);
      const tgtPassesFilter = !filteredIds || filteredIds.has(tgt);
      const srcPassesSearch = !matchingIds || matchingIds.has(src);
      const tgtPassesSearch = !matchingIds || matchingIds.has(tgt);

      const srcVisible = srcPassesFilter && srcPassesSearch;
      const tgtVisible = tgtPassesFilter && tgtPassesSearch;

      if (srcVisible && tgtVisible) {
        return (filteredIds || matchingIds) ? "rgba(148, 163, 184, 0.1)" : "rgba(148, 163, 184, 0.06)";
      }
      if (srcVisible || tgtVisible) {
        return "rgba(30, 41, 59, 0.03)";
      }
      return "rgba(30, 41, 59, 0.01)";
    },
    [filteredIds, matchingIds, neighborIds]
  );

  // Edge width
  const linkWidth = useCallback(
    (link: any) => {
      const src =
        typeof link.source === "object" ? link.source.id : link.source;
      const tgt =
        typeof link.target === "object" ? link.target.id : link.target;
      if (neighborIds && neighborIds.has(src) && neighborIds.has(tgt)) {
        return 1.5;
      }
      return 0.2;
    },
    [neighborIds]
  );

  // Edge particles (only on connected edges)
  const linkParticles = useCallback(
    (link: any) => {
      const src =
        typeof link.source === "object" ? link.source.id : link.source;
      const tgt =
        typeof link.target === "object" ? link.target.id : link.target;
      if (neighborIds && neighborIds.has(src) && neighborIds.has(tgt)) {
        return Math.ceil(link.weight * 4);
      }
      return 0;
    },
    [neighborIds]
  );

  // Click handler with fly-to (super-node click zooms in to MID)
  const handleNodeClick = useCallback(
    (node: any) => {
      if (node.isSuperNode) {
        if (fgRef.current) {
          const dist = 250;
          const pos = { x: node.x + dist * 0.3, y: node.y + dist * 0.3, z: node.z + dist };
          fgRef.current.cameraPosition(pos, { x: node.x, y: node.y, z: node.z }, 800);
        }
        return;
      }
      const n = node as GraphNode;
      onNodeClick(n.id === selectedNodeId ? null : n);

      if (fgRef.current && n.id !== selectedNodeId) {
        const distance = 120;
        const pos = { x: node.x, y: node.y, z: node.z + distance };
        fgRef.current.cameraPosition(pos, { x: node.x, y: node.y, z: node.z }, 1000);
      }
    },
    [onNodeClick, selectedNodeId]
  );

  // Hover handler (cursor style only — tooltip handled by react-force-graph-3d)
  const handleNodeHover = useCallback((node: any) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  // Custom node object — stable callback (no search/selection deps).
  // Opacity is handled per-frame in nodePositionUpdate to avoid recreating all 2500+ meshes on every keystroke.
  const nodeThreeObject = useCallback(
    (node: any) => {
      const isSuper = node.isSuperNode;
      const radius = isSuper
        ? Math.max(4, Math.min(12, (node.memberCount ?? 1) * 0.3))
        : Math.max(0.5, getNodeSize((node as GraphNode).size, isEnriched(node as GraphNode)) * 0.4);

      const color = isSuper ? "#8B5CF6" : getNodeColorHex((node as GraphNode).color_type, isEnriched(node as GraphNode));
      const emissive = isSuper ? 0.4 : getEmissiveIntensity((node as GraphNode).color_type, (node as GraphNode).importance);

      const geometry = new THREE.SphereGeometry(radius, 16, 12);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: isSuper ? color : (isEnriched(node as GraphNode) ? color : DIM_COLOR_HEX),
        emissiveIntensity: emissive,
        toneMapped: false,
        transparent: true,
        opacity: 1,
        roughness: 0.4,
        metalness: 0.3,
      });

      return new THREE.Mesh(geometry, material);
    },
    [] // Stable — opacity handled in nodePositionUpdate
  );

  // Update node opacity each frame for smooth zoom transitions
  const nodePositionUpdate = useCallback(
    (nodeObj: THREE.Object3D, coords: { x: number; y: number; z: number }, node: any) => {
      const mesh = nodeObj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.transparent) return;

      const isSuper = node.isSuperNode;
      let targetOpacity = 1;
      if (isSuper) {
        targetOpacity = farBlend;
      } else {
        targetOpacity = Math.max(midBlend, closeBlend);
        if (filteredIds && !filteredIds.has(node.id)) targetOpacity *= 0.06;
        else if (matchingIds && !matchingIds.has(node.id)) targetOpacity *= 0.08;
        else if (neighborIds && !neighborIds.has(node.id)) targetOpacity *= 0.1;
      }
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.08);
    },
    [farBlend, midBlend, closeBlend, filteredIds, matchingIds, neighborIds]
  );

  // Node label: FAR=all super-nodes, MID=importance>7, CLOSE=hover only
  const nodeLabel = useCallback(
    (node: any) => {
      if (node.isSuperNode) {
        return `<div style="background:rgba(10,14,26,0.9);padding:8px 12px;border-radius:6px;border:1px solid rgba(139,92,246,0.3);font-size:12px;color:#e2e8f0">${node.label}<br/><span style="opacity:0.7">${node.memberCount} sessions</span></div>`;
      }
      const n = node as GraphNode;
      // CLOSE: hover only (label shown by library on hover)
      // MID: show for importance > 7 — use nodeLabelVisibility if available; otherwise same as CLOSE
      const enriched = isEnriched(n);
      const parts = [
        `<b>${n.label}</b>`,
        n.project ? `Project: ${n.project}` : null,
        n.branch ? `Branch: ${n.branch}` : null,
        enriched ? `Type: ${n.color_type}` : null,
        `Importance: ${n.importance.toFixed(1)}`,
        `Chunks: ${n.chunk_count.toLocaleString()}`,
      ].filter(Boolean);
      return `<div style="background:rgba(10,14,26,0.9);padding:8px 12px;border-radius:6px;border:1px solid rgba(139,92,246,0.3);font-size:12px;line-height:1.6;color:#e2e8f0;max-width:250px">${parts.join("<br/>")}</div>`;
    },
    []
  );

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <ForceGraph3D
        ref={internalRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#0A0E1A"
        nodeVisibility={nodeVisibility}
        nodeColor={nodeColor}
        nodeVal={nodeVal}
        nodeLabel={nodeLabel}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        nodePositionUpdate={nodePositionUpdate}
        linkVisibility={linkVisibility}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.6}
        linkDirectionalParticles={linkParticles}
        linkDirectionalParticleWidth={0.8}
        linkDirectionalParticleColor={() => "#8B5CF6"}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        enableNodeDrag={false}
        cooldownTicks={0}
        warmupTicks={0}
        d3AlphaDecay={1}
        d3VelocityDecay={1}
      />
    </div>
  );
});
