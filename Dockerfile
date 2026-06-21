# Zara Agent — container for running opencode + the MCP server to audit this project.
# Node 22+ is required for the built-in node:sqlite module used by the memory store.
FROM node:22-bookworm-slim

# Tools commonly needed during audits (git for repo state, ca-certs for fetch).
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install opencode CLI globally.
RUN npm install -g opencode-ai

# Non-root user for safety; mounted volumes keep host ownership.
WORKDIR /workspace

# The project is mounted at runtime (see docker-compose.yml), not copied,
# so the container always audits the live working tree.

# Default: print the self-audit + capability map of the mounted project.
CMD ["node", "-e", "import('/workspace/tools/mcp/domain/audit.mjs').then(async m => console.log(await m.default.zara_self_audit.handler({ map: true })))"]
