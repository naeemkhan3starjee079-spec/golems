const RAILWAY_URL = import.meta.env.VITE_RAILWAY_URL as string;

export interface HealthResponse {
  status: string;
  uptime: number;
  llmBackend: string;
}

export interface UsageResponse {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  bySource: Record<
    string,
    {
      calls: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }
  >;
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${RAILWAY_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchApi("/health");
}

export function fetchUsage(): Promise<UsageResponse> {
  return fetchApi("/usage");
}
