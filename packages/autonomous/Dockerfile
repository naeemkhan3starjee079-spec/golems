FROM oven/bun:1.2-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src/ src/
COPY supabase/ supabase/

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:${PORT:-8080}/health || exit 1

# Run cloud worker
CMD ["bun", "run", "src/cloud-worker.ts"]
