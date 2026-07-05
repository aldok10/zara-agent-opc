# BuildKit Features

BuildKit is the default builder in Docker Engine 24+ (legacy builder removed). It provides cache mounts, secret mounts, SSH forwarding, multi-platform builds, and advanced Dockerfile frontend capabilities.

## Key Concepts

### Cache Mounts

Persist package manager caches between builds without bloating image layers:

```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /app ./cmd/server

RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline
```

Cache mounts are NOT included in the final image. They persist on the builder between invocations. In CI, pair with external cache export for cross-run persistence.

### Secret Mounts

Pass secrets without embedding them in any layer:

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

RUN --mount=type=secret,id=gh_token \
    GITHUB_TOKEN=$(cat /run/secrets/gh_token) go mod download
```

Build invocation: `docker build --secret id=npmrc,src=$HOME/.npmrc .`

Secrets are never written to the image filesystem or layer history. Available only during the RUN instruction that mounts them.

### SSH Forwarding

Forward host SSH agent for private repository access:

```dockerfile
RUN --mount=type=ssh git clone git@github.com:org/private-lib.git
```

Build: `docker build --ssh default .`

### Multi-Platform Builds

```bash
docker buildx create --name multiarch --use
docker buildx build --platform linux/amd64,linux/arm64 \
  --push -t registry.io/app:v1.0.0 .
```

Platform-aware Dockerfiles use `TARGETARCH` and `TARGETOS` build args (auto-injected):

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.23 AS builder
ARG TARGETARCH TARGETOS
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /app ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

### Cache Export/Import

Persist build cache to registry or local directory for CI:

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.io/app:buildcache \
  --cache-to type=registry,ref=registry.io/app:buildcache,mode=max \
  -t registry.io/app:latest .
```

`mode=max` exports all layers (including intermediate). `mode=min` exports only final stage layers.

### Inline Cache

Embed cache metadata in the pushed image itself:

```bash
docker buildx build --cache-to type=inline --push -t registry.io/app:latest .
```

Simpler but less effective than registry cache -- only caches layers present in the final image.

## Common Patterns

### Parallel Build Stages

BuildKit executes independent stages concurrently:

```dockerfile
FROM node:22-slim AS frontend
COPY frontend/ .
RUN npm ci && npm run build

FROM golang:1.23 AS backend
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o /server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend /server /server
COPY --from=frontend /dist /static
ENTRYPOINT ["/server"]
```

Frontend and backend stages build simultaneously.

### Dockerfile Syntax Directive

Enable latest BuildKit features with the syntax directive:

```dockerfile
# syntax=docker/dockerfile:1
```

This pulls the latest stable Dockerfile frontend. Pin to specific version for reproducibility: `docker/dockerfile:1.9`

## Gotchas

1. Cache mounts use builder-local storage -- different CI runners won't share cache unless exported
2. `--mount=type=cache` with `sharing=locked` prevents parallel RUN steps from corrupting the cache
3. Multi-platform builds via QEMU are 5-10x slower than native; use native arm64 runners for production
4. Cache export to registry can add 30-60s to builds -- worth it only if cache hit rate is high
5. `--no-cache` flag ignores ALL cache including mounts; use `--no-cache-filter=<stage>` for selective invalidation
6. Secrets mounted via `--mount=type=secret` are only available during that specific RUN instruction

## Quick Reference

| Feature | Flag/Syntax | Use Case |
|---------|-------------|----------|
| Cache mount | `--mount=type=cache,target=...` | Package manager caches |
| Secret mount | `--mount=type=secret,id=...` | Private registry tokens, API keys |
| SSH mount | `--mount=type=ssh` | Private git repos during build |
| Cache export | `--cache-to type=registry` | CI cache persistence |
| Cache import | `--cache-from type=registry` | CI cache restoration |
| Multi-platform | `--platform linux/amd64,linux/arm64` | Graviton + x86 support |
| Parallel stages | Independent FROM blocks | Faster multi-component builds |
| Syntax pin | `# syntax=docker/dockerfile:1.9` | Reproducible frontend version |
