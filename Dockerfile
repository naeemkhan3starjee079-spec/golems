FROM oven/bun:1.2-alpine

WORKDIR /app

# Copy root workspace config
COPY package.json bun.lockb ./

# Copy all package.json files for dependency resolution
COPY packages/shared/package.json packages/shared/
COPY packages/services/package.json packages/services/
COPY packages/jobs/package.json packages/jobs/
COPY packages/recruiter/package.json packages/recruiter/
COPY packages/teller/package.json packages/teller/
COPY packages/coach/package.json packages/coach/
COPY packages/claude/package.json packages/claude/
COPY packages/content/package.json packages/content/
COPY packages/autonomous/package.json packages/autonomous/

# Install workspace dependencies
RUN bun install --frozen-lockfile --production

# Copy source code (only packages needed for cloud worker)
COPY packages/shared/ packages/shared/
COPY packages/services/ packages/services/
COPY packages/jobs/ packages/jobs/
COPY packages/recruiter/ packages/recruiter/
COPY packages/teller/ packages/teller/
COPY packages/coach/ packages/coach/
COPY packages/claude/ packages/claude/
COPY packages/content/ packages/content/
COPY packages/autonomous/ packages/autonomous/
COPY supabase/ supabase/

# Run cloud worker
CMD ["bun", "run", "packages/services/src/cloud-worker.ts"]
