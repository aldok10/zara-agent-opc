# Multi-Stage Build Patterns

Multi-stage builds separate build-time dependencies from runtime, producing minimal production images. Each language has specific patterns for optimal layer caching and minimal final image size.

## Key Concepts

- Each `FROM` starts a new stage; only the final stage (or explicitly targeted stage) ships
- `COPY --from=<stage>` transfers artifacts between stages
- Build tools (compilers, dev dependencies) stay in builder stages
- Final stage should contain ONLY: runtime, application binary/bundle, and runtime config

## Go Pattern

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.23-bookworm AS builder
ARG TARGETARCH TARGETOS

WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -ldflags="-s -w" -trimpath -o /app ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
```

Target: <10MB final image. Static binary means no libc needed.

## Node.js Pattern

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM cgr.dev/chainguard/node:latest
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
USER 65532
EXPOSE 3000
ENTRYPOINT ["node", "dist/index.js"]
```

Separate `deps` (production only) from `builder` (all deps for compilation). Target: <100MB.

## Python Pattern

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.13-slim AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-compile -r requirements.txt
COPY . .
RUN pip install --no-compile .

FROM cgr.dev/chainguard/python:latest
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY --from=builder /app/src ./src
USER 65532
EXPOSE 8000
ENTRYPOINT ["python", "-m", "app.main"]
```

Virtual env as portable artifact. `--no-compile` skips .pyc in build; runtime generates them. Target: <80MB.

## Java Pattern

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN --mount=type=cache,target=/root/.gradle ./gradlew dependencies --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test
RUN java -Djarmode=tools -jar build/libs/*.jar extract --layers --destination extracted

FROM cgr.dev/chainguard/jre:latest
WORKDIR /app
COPY --from=builder /app/extracted/dependencies/ ./
COPY --from=builder /app/extracted/spring-boot-loader/ ./
COPY --from=builder /app/extracted/snapshot-dependencies/ ./
COPY --from=builder /app/extracted/application/ ./
USER 65532
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Spring Boot layer extraction maximizes cache hits -- dependencies change rarely, application changes often. Target: <180MB.

## Common Patterns

### Test Stage (not shipped)

```dockerfile
FROM builder AS test
RUN --mount=type=cache,target=/root/.cache/go-build go test ./...
```

Run with `docker build --target test .` in CI. Test failures stop the build.

### Dev vs Prod Targets

```dockerfile
FROM builder AS dev
CMD ["air"]  # hot reload

FROM distroless AS prod
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

`docker build --target dev` for local, default (last stage) for production.

### Static Assets Stage

```dockerfile
FROM node:22-slim AS frontend
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM builder AS backend
# ...

FROM distroless
COPY --from=backend /server /server
COPY --from=frontend /web/dist /static
```

## Gotchas

1. Every `COPY` in the final stage creates a layer -- combine related copies or use `--link` for independent layers
2. `COPY --from` uses the stage's filesystem at the END of that stage -- order your RUN commands accordingly
3. Build args are NOT inherited across stages -- redeclare `ARG` after each `FROM` if needed
4. `--mount=type=cache` target dirs must match the actual cache location for the tool (check docs)
5. Don't install dev dependencies in the production deps stage -- separate stages prevent accidental inclusion
6. `go mod download` layer is only cached if go.mod AND go.sum haven't changed

## Quick Reference

| Language | Builder Base | Runtime Base | Target Size |
|----------|-------------|--------------|-------------|
| Go | golang:1.23 | distroless/static | <10MB |
| Rust | rust:1.80 | distroless/static | <15MB |
| Node.js | node:22-slim | chainguard/node | <100MB |
| Python | python:3.13-slim | chainguard/python | <80MB |
| Java | eclipse-temurin:21-jdk | chainguard/jre | <180MB |
