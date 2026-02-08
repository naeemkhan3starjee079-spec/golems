FROM oven/bun:1.2-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src/ src/
COPY supabase/ supabase/

# Run cloud worker
CMD ["bun", "run", "src/cloud-worker.ts"]
