# syntax=docker/dockerfile:1

# Production Go multi-stage build
# Target: <10MB final image, zero CVEs, multi-arch

FROM --platform=$BUILDPLATFORM golang:1.23-bookworm AS builder
ARG TARGETARCH TARGETOS

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download && go mod verify

COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-s -w -extldflags=-static" -trimpath -o /app ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /app /app

EXPOSE 8080

USER 65532:65532

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/app", "healthcheck"]

ENTRYPOINT ["/app"]
