---
type: subskill
title: "Container Optimization"
---

# Container Optimization

## Core Concepts
- Image size directly impacts pull time, storage cost, and attack surface
- Layer caching: Docker caches unchanged layers; instruction order determines cache efficiency
- Runtime optimization: resource limits, health checks, graceful shutdown handling
- Build context: everything sent to the daemon; minimize with `.dockerignore`
- Image composition: choose base images aligned with actual runtime needs

## Key Practices
- Pin base image versions and rebuild regularly to pick up security patches
- Combine RUN commands with `&&` to reduce layer count; clean package manager caches in same layer
- Set `USER` to non-root; create dedicated application user with minimal permissions
- Define `HEALTHCHECK` for orchestrator integration (readiness/liveness signaling)
- Use `COPY --chown` instead of separate `RUN chown` to avoid extra layer

## Common Mistakes
- Running `apt-get update` and `apt-get install` in separate RUN instructions (stale cache)
- Not cleaning up in the same layer (`rm -rf /var/lib/apt/lists/*` must follow install)
- Using `ADD` when `COPY` suffices (ADD has implicit tar extraction and URL fetch behavior)

## When to Apply
- Reducing CI/CD pipeline times caused by large image pushes/pulls
- Meeting container size requirements for edge deployments or serverless platforms
- Hardening images for production security posture
