import type { NextConfig } from "next";

const DAEMON_URL = process.env.ZIKARON_DAEMON_URL;

const nextConfig: NextConfig = {
  // Only proxy /api/* to Zikaron daemon when explicitly configured.
  // On Vercel (production), pages query Supabase directly — no daemon needed.
  // For local dev, set ZIKARON_DAEMON_URL=http://localhost:8787 in .env.local
  // to enable daemon proxy for enrichment and session pages.
  async rewrites() {
    if (!DAEMON_URL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${DAEMON_URL}/:path*`,
      },
    ];
  },
  // Vercel deployment: output standalone for smaller builds
  output: process.env.VERCEL ? "standalone" : undefined,
};

export default nextConfig;
