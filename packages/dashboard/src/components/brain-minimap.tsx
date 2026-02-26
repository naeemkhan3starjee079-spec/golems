"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BrainGraph, GraphNode } from "@/lib/types";
import { getNodeColorHex } from "@/lib/graph-colors";

const WIDTH = 200;
const HEIGHT = 150;
const PADDING = 4;

function isEnriched(node: GraphNode): boolean {
  return node.color_type !== "unknown";
}

type Props = {
  graph: BrainGraph;
  graphRef: React.RefObject<{ cameraPosition: (pos: { x: number; y: number; z: number }, lookAt?: { x: number; y: number; z: number }, transitionMs?: number) => void; camera: () => { position: { x: number; y: number; z: number } }; controls: () => { target: { x: number; y: number; z: number } } } | null>;
};

export function BrainMinimap({ graph, graphRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Compute bounds and mapping from graph coords to canvas pixels
  const { minX, maxX, minY, maxY, mapX, mapY } = (() => {
    const nodes = graph.nodes;
    if (nodes.length === 0) {
      return {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        mapX: (x: number) => (x - 0) / 1 * (WIDTH - 2 * PADDING) + PADDING,
        mapY: (y: number) => HEIGHT - PADDING - (y - 0) / 1 * (HEIGHT - 2 * PADDING),
      };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }
    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);
    const pad = PADDING;
    const w = WIDTH - 2 * pad;
    const h = HEIGHT - 2 * pad;
    return {
      minX,
      maxX,
      minY,
      maxY,
      mapX: (x: number) => pad + ((x - minX) / rangeX) * w,
      mapY: (y: number) => HEIGHT - pad - ((y - minY) / rangeY) * h,
    };
  })();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fg = graphRef.current;
    let viewport: { x: number; y: number; w: number; h: number } | null = null;

    if (fg) {
      try {
        const camera = fg.camera();
        const controls = fg.controls();
        if (camera && controls?.target) {
          const cam = camera as { position: { x: number; y: number; z: number }; fov?: number; aspect?: number };
          const target = controls.target as { x: number; y: number; z: number };
          const dx = cam.position.x - target.x;
          const dy = cam.position.y - target.y;
          const dz = cam.position.z - target.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const fov = (cam.fov ?? 75) * (Math.PI / 180);
          const aspect = cam.aspect ?? 16 / 9;
          const hAtTarget = 2 * dist * Math.tan(fov / 2);
          const wAtTarget = hAtTarget * aspect;
          viewport = {
            x: target.x - wAtTarget / 2,
            y: target.y - hAtTarget / 2,
            w: wAtTarget,
            h: hAtTarget,
          };
        }
      } catch {
        // Ignore if graph not ready
      }
    }

    // Clear and fill background
    ctx.fillStyle = "rgba(10, 14, 26, 0.8)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw nodes as dots
    for (const node of graph.nodes) {
      const enriched = isEnriched(node);
      const color = getNodeColorHex(node.color_type, enriched);
      ctx.fillStyle = enriched ? color : "#64748B";
      ctx.globalAlpha = enriched ? 0.9 : 0.35;
      const px = mapX(node.x);
      const py = mapY(node.y);
      ctx.beginPath();
      ctx.arc(px, py, enriched ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw viewport rectangle
    if (viewport) {
      const rx = mapX(viewport.x);
      const ry = mapY(viewport.y + viewport.h);
      const rw = (viewport.w / (maxX - minX || 1)) * (WIDTH - 2 * PADDING);
      const rh = (viewport.h / (maxY - minY || 1)) * (HEIGHT - 2 * PADDING);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    }
  }, [graph, graphRef, mapX, mapY, minX, maxX, minY, maxY]);

  // Inverse: canvas pixel to graph coords
  const canvasToGraph = useCallback(
    (canvasX: number, canvasY: number) => {
      const pad = PADDING;
      const w = WIDTH - 2 * pad;
      const h = HEIGHT - 2 * pad;
      const rangeX = Math.max(maxX - minX, 1);
      const rangeY = Math.max(maxY - minY, 1);
      const x = minX + ((canvasX - pad) / w) * rangeX;
      const y = minY + ((HEIGHT - pad - canvasY) / h) * rangeY;
      return { x, y };
    },
    [minX, maxX, minY, maxY]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const fg = graphRef.current;
      if (!canvas || !fg) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      const { x, y } = canvasToGraph(canvasX, canvasY);

      // Compute z from graph center (use average z of nodes)
      const avgZ = graph.nodes.length > 0
        ? graph.nodes.reduce((s, n) => s + n.z, 0) / graph.nodes.length
        : 0;

      const distance = 120;
      const pos = { x, y, z: avgZ + distance };
      const lookAt = { x, y, z: avgZ };
      fg.cameraPosition(pos, lookAt, 800);
    },
    [graphRef, canvasToGraph, graph.nodes]
  );

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <div
      className="absolute bottom-4 right-4 z-10 rounded overflow-hidden"
      style={{
        width: WIDTH,
        height: HEIGHT,
        background: "rgba(10, 14, 26, 0.8)",
        border: "1px solid var(--border)",
      }}
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="w-full h-full cursor-pointer block"
        onClick={handleClick}
        style={{ display: "block" }}
      />
    </div>
  );
}
