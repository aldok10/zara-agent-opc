---
type: subskill
title: "Multi-Stage Builds"
---

# Multi-Stage Builds

## Core Concepts
- Multi-stage Dockerfiles use multiple FROM statements to separate build and runtime concerns
- Build stage: includes compilers, dev dependencies, and build tools
- Runtime stage: minimal base image with only production artifacts and runtime deps
- Each stage is independently cacheable; changes in later stages don't invalidate early caches
- Reduces final image size by 50-90% compared to single-stage builds

## Key Practices
- Name stages explicitly (`FROM golang:1.22 AS builder`) for clarity and targeted builds
- Copy only the compiled artifact from builder to runtime stage (`COPY --from=builder`)
- Use distroless or alpine-based images for runtime to minimize attack surface
- Order Dockerfile instructions by change frequency: dependencies before source code
- Use `.dockerignore` to exclude build context bloat (node_modules, .git, docs)

## Common Mistakes
- Installing build tools in the runtime stage, negating size benefits
- Not leveraging build cache due to poor layer ordering (copying all files before dependency install)
- Using `latest` base image tags - pin to specific digest or version for reproducibility

## When to Apply
- Building production container images for any compiled language (Go, Rust, Java, TypeScript)
- Reducing image scan findings by eliminating unnecessary packages from runtime
- Optimizing CI build times through better cache utilization
