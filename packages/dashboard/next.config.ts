import type { NextConfig } from "next";

const DAEMON_URL = process.env.ZIKARON_DAEMON_URL || "http://localhost:8787";

const nextConfig: NextConfig = {
  // Proxy /api/* to Zikaron daemon (local dev or self-hosted)
  async rewrites() {
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
