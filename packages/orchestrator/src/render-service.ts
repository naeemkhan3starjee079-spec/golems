/**
 * Bun HTTP microservice for content render backends.
 *
 * Runs on port 3001, called by n8n workflows via HTTP Request nodes.
 * Wraps existing TypeScript code from Phase 2 (Remotion) and Phase 3 (ComfyUI).
 *
 * Routes:
 *   POST /api/comfyui/generate     → Queue Flux generation + quality scoring
 *   GET  /api/comfyui/status       → Check ComfyUI server status
 *   POST /api/remotion/render      → Render Remotion composition
 *   POST /api/remotion/still       → Render single frame
 *   GET  /api/health               → Health check
 *   GET  /api/pipelines            → List available pipelines
 */

import { readFile } from "fs/promises";
import {
  generate,
  isServerReady as isComfyReady,
  type GenerateOptions,
} from "@golems/content/comfyui";
import type { FluxWorkflowStyle } from "@golems/content/comfyui/workflows/flux-base";
import type { QualityPreset } from "@golems/content/quality";

const PORT = parseInt(process.env.RENDER_SERVICE_PORT ?? "3001", 10);

// --- Route Handlers ---

async function handleComfyGenerate(body: Record<string, unknown>): Promise<Response> {
  const opts: GenerateOptions = {
    prompt: body.prompt as string,
    style: (body.style as FluxWorkflowStyle) ?? "base",
    quality: (body.quality as QualityPreset) ?? "social",
    quick: (body.quick as boolean) ?? false,
    maxRetries: (body.maxRetries as number) ?? 3,
  };

  if (!opts.prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const result = await generate(opts);

    // Read the image file for binary response
    const imageBuffer = await readFile(result.imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    return Response.json({
      imagePath: result.imagePath,
      imageBase64,
      scores: result.scores,
      scoreSummary: result.scoreSummary,
      durationMs: result.durationMs,
      attempts: result.attempts,
      qualityPassed: result.qualityPassed,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

async function handleComfyStatus(): Promise<Response> {
  const ready = await isComfyReady();
  return Response.json({
    comfyui: ready ? "ready" : "offline",
    host: "127.0.0.1:8188",
  });
}

async function handleRemotionRender(body: Record<string, unknown>): Promise<Response> {
  // Dynamic import to avoid loading Remotion deps if not needed
  try {
    const { renderVideo } = await import("@golems/content/render");

    const compositionId = body.compositionId as string;
    if (!compositionId) {
      return Response.json({ error: "compositionId is required" }, { status: 400 });
    }

    const job = await renderVideo({
      compositionId,
      inputProps: (body.inputProps as Record<string, unknown>) ?? {},
      outputPath: body.outputPath as string | undefined,
    });

    return Response.json(job);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

async function handleRemotionStill(body: Record<string, unknown>): Promise<Response> {
  try {
    const { renderThumbnail } = await import("@golems/content/render");

    const compositionId = body.compositionId as string;
    if (!compositionId) {
      return Response.json({ error: "compositionId is required" }, { status: 400 });
    }

    const job = await renderThumbnail({
      compositionId,
      inputProps: (body.inputProps as Record<string, unknown>) ?? {},
      frame: (body.frame as number) ?? 0,
      outputPath: body.outputPath as string | undefined,
    });

    return Response.json(job);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

function handleHealth(): Response {
  return Response.json({
    status: "ok",
    service: "golems-render-service",
    port: PORT,
    timestamp: new Date().toISOString(),
    pipelines: ["comfyui", "remotion"],
  });
}

function handlePipelines(): Response {
  return Response.json({
    pipelines: [
      {
        id: "comfyui",
        name: "Flux Image Generation",
        description: "AI image generation via ComfyUI + Flux.1 Dev Q6_K GGUF",
        endpoint: "/api/comfyui/generate",
        styles: ["base", "social", "merch", "meme"],
      },
      {
        id: "remotion",
        name: "Video Rendering",
        description: "Programmatic video rendering via Remotion",
        endpoint: "/api/remotion/render",
        compositions: [
          "CodeShowcase", "ArchDiagram", "MetricsDashboard",
          "ProductHero", "DomicaHero",
          "WeeklyJobs", "MonthlyFinance", "BrainGrowth",
        ],
      },
      {
        id: "dataviz",
        name: "Data Visualization",
        description: "Generate branded infographics from golem data",
        endpoint: "/api/dataviz/render",
        types: ["jobs", "finance", "brain", "activity"],
        formats: ["linkedin", "instagram", "story"],
      },
    ],
  });
}

async function handleDataVizRender(body: Record<string, unknown>): Promise<Response> {
  const type = body.type as string ?? "jobs";
  const format = body.format as string ?? "linkedin";

  // Dynamic import to avoid loading dataviz deps at startup
  const { fetchJobMarketData } = await import("@golems/content/dataviz/fetchers/jobs");
  const { fetchFinanceData } = await import("@golems/content/dataviz/fetchers/finance");
  const { fetchBrainData } = await import("@golems/content/dataviz/fetchers/brain");
  const { fetchActivityData } = await import("@golems/content/dataviz/fetchers/activity");
  const { renderBarChart } = await import("@golems/content/dataviz/charts/bar");
  const { renderDonutChart } = await import("@golems/content/dataviz/charts/donut");
  const { renderLineChart } = await import("@golems/content/dataviz/charts/line");
  const { renderStatCards } = await import("@golems/content/dataviz/charts/stat-card");
  const { renderLinkedInCard } = await import("@golems/content/dataviz/templates/linkedin-card");
  const { renderSvgToBuffer } = await import("@golems/content/dataviz/renderer");

  let chartSvg: string;
  let title: string;
  let statsSvg: string | undefined;

  switch (type) {
    case "jobs": {
      const data = await fetchJobMarketData();
      title = "Job Market Overview";
      chartSvg = renderBarChart({
        title: "Top Tags", data: data.topTags.map((t) => ({ label: t.tag, value: t.count })),
        horizontal: true, maxBars: 8,
      });
      statsSvg = renderStatCards({
        stats: [
          { label: "Total Jobs", value: data.totalJobs },
          { label: "Sources", value: data.scrapeStats.length },
        ],
        columns: 2, width: 600,
      });
      break;
    }
    case "finance": {
      const data = await fetchFinanceData();
      title = "Monthly Finance";
      chartSvg = renderDonutChart({
        data: data.llmCostsByModel.filter((m) => m.totalCost > 0)
          .map((m) => ({ label: m.model, value: m.totalCost })),
        centerValue: `$${data.totalLLMCost.toFixed(2)}`, centerLabel: "Total",
      });
      break;
    }
    case "brain": {
      const data = await fetchBrainData();
      title = "Brain Growth";
      chartSvg = renderLineChart({
        data: data.monthlyGrowth.map((g) => ({ date: g.month, value: g.chunks })),
        showArea: true,
      });
      statsSvg = renderStatCards({
        stats: [
          { label: "Chunks", value: data.totalChunks },
          { label: "Enriched", value: `${data.enrichmentPercent}%` },
        ],
        columns: 2, width: 600,
      });
      break;
    }
    case "activity": {
      const data = await fetchActivityData();
      title = "Golem Activity";
      chartSvg = renderBarChart({
        data: data.golemActivity.slice(0, 6).map((g) => ({ label: g.actor, value: g.eventCount })),
        horizontal: true,
      });
      break;
    }
    default:
      return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }

  const svg = renderLinkedInCard({ title, chartSvg, statsSvg });
  const imageBuffer = await renderSvgToBuffer(svg, "png");
  const imageBase64 = imageBuffer.toString("base64");

  return Response.json({
    success: true,
    type,
    format,
    imageBase64,
    mimeType: "image/png",
  });
}

// --- Server ---

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers for n8n
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response: Response;

      switch (true) {
        case method === "POST" && path === "/api/comfyui/generate": {
          const body = await req.json() as Record<string, unknown>;
          response = await handleComfyGenerate(body);
          break;
        }
        case method === "GET" && path === "/api/comfyui/status":
          response = await handleComfyStatus();
          break;
        case method === "POST" && path === "/api/remotion/render": {
          const body = await req.json() as Record<string, unknown>;
          response = await handleRemotionRender(body);
          break;
        }
        case method === "POST" && path === "/api/remotion/still": {
          const body = await req.json() as Record<string, unknown>;
          response = await handleRemotionStill(body);
          break;
        }
        case method === "GET" && path === "/api/health":
          response = handleHealth();
          break;
        case method === "POST" && path === "/api/dataviz/render": {
          const body = await req.json() as Record<string, unknown>;
          response = await handleDataVizRender(body);
          break;
        }
        case method === "GET" && path === "/api/pipelines":
          response = handlePipelines();
          break;
        default:
          response = Response.json(
            { error: "Not found", path },
            { status: 404 },
          );
      }

      // Add CORS headers to all responses
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    } catch (err) {
      return Response.json(
        { error: "Internal server error", message: (err as Error).message },
        { status: 500, headers: corsHeaders },
      );
    }
  },
});

console.log(`Render service running on http://localhost:${PORT}`);
console.log("Routes:");
console.log("  POST /api/comfyui/generate  — Flux image generation");
console.log("  GET  /api/comfyui/status    — ComfyUI server status");
console.log("  POST /api/remotion/render   — Video rendering");
console.log("  POST /api/remotion/still    — Single frame capture");
console.log("  GET  /api/health            — Health check");
console.log("  POST /api/dataviz/render    — Data visualization");
console.log("  GET  /api/pipelines         — List pipelines");
