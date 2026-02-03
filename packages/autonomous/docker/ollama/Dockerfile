FROM ollama/ollama:latest

# NOTE: Running as root for local dev simplicity.
# The ollama base image changed and non-root setup was failing.
# For production, consider adding non-root user with proper volume mounts.

# Environment for model storage
ENV OLLAMA_HOME=/root/.ollama
ENV OLLAMA_MODELS=/root/.ollama/models

# Expose the API port
EXPOSE 11434

# Health check - use ollama binary directly (no curl needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ollama list || exit 1

# Default command
CMD ["serve"]
