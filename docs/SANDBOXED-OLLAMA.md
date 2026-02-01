# Sandboxed Ollama System

> Run Ollama in Docker isolation with Claude as a validation gatekeeper.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mac Host                              │
│                                                              │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │ Job Golem    │    │     Docker Container            │   │
│  │ Moltbook     │───▶│  ┌─────────┐  ┌─────────────┐  │   │
│  │ Night Shift  │    │  │ Ollama  │──│ nginx proxy │  │   │
│  └──────────────┘    │  │ (6 CPU) │  │ :11434      │  │   │
│         │            │  │ (25GB)  │  └─────────────┘  │   │
│         ▼            │  └─────────┘                    │   │
│  ┌──────────────┐    │  Read: zikaron, claude-golem   │   │
│  │ Validation   │    │  Write: songscript only        │   │
│  │ Queue        │    └─────────────────────────────────┘   │
│  └──────────────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ Claude API   │── Reviews outputs for safety             │
│  │ Validator    │── Approves or rejects                    │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Docker Sandbox

```bash
cd ~/Gits/golems-zikaron/docker/ollama
docker-compose up -d
```

### 2. Enable Sandboxed Mode

```bash
export OLLAMA_SANDBOXED=1
```

### 3. Pull Model (first time)

```bash
docker exec ollama-sandbox ollama pull qwen3-coder
```

## Files

| File | Purpose |
|------|---------|
| `docker/ollama/Dockerfile` | Ollama container with non-root user |
| `docker/ollama/docker-compose.yml` | Resource limits, volume mounts |
| `docker/ollama/nginx.conf` | Request logging proxy |
| `src/ollama-sandboxed.ts` | Client → validation queue |
| `src/validation-service.ts` | Claude reviews pending outputs |
| `src/ollama-wrapper.ts` | Switch between direct/sandboxed modes |

## Validation Queue

```
~/.golems-zikaron/validation-queue/
├── pending/     # Awaiting Claude review
├── approved/    # Safe to use
├── rejected/    # Blocked (logged for review)
└── config.json  # Blocklist patterns, thresholds
```

## Security Layers

1. **Docker Isolation** - No network egress, resource limits
2. **Blocklist** - Regex patterns catch obvious attacks
3. **Claude Review** - AI validates for subtle issues
4. **Trusted Sources** - Auto-approve known-safe patterns

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_SANDBOXED` | `0` | Set to `1` to enable validation |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Docker Ollama endpoint |
| `OLLAMA_MODEL` | `qwen3-coder` | Default model |
| `VALIDATION_DIR` | `~/.golems-zikaron/validation-queue` | Queue location |

## Songscript Workflow (Night Shift)

When Ollama writes to songscript:
1. Always create a new worktree (never master)
2. Push to branch only
3. Create normal PR (not draft)
4. Never push directly to master

## Testing

```bash
bun test src/__tests__/ollama-sandboxed.test.ts
```

## Moltbook Status

As of Jan 31, 2026, Moltbook is offline due to a security breach. The validation layer protects us when it returns:
- All outputs queue before posting
- Claude reviews content before public visibility
- Rejected content is logged but never posted
