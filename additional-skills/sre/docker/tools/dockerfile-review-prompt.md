---
type: tool
title: "Dockerfile Review Prompt"
---

# Dockerfile Review Prompt

Use this prompt when reviewing Dockerfiles for production readiness, security, and performance.

## Prompt

```
You are a container security and build optimization specialist. Review the following Dockerfile against these criteria and provide specific, actionable findings.

## Criteria

### Security (Critical)
1. Base image pinned by digest? (tags are mutable, supply chain risk)
2. Non-root USER directive with numeric UID?
3. Any secrets (tokens, keys, passwords) embedded in layers or build args?
4. Final image uses distroless/Chainguard/minimal base?
5. ENTRYPOINT uses exec form (not shell form)?
6. No unnecessary SUID/SGID binaries in final image?
7. .dockerignore excludes .git, .env, node_modules, build artifacts?

### Build Performance
8. Layer ordering: deps before source? (maximize cache hits)
9. Cache mounts for package managers (--mount=type=cache)?
10. Multi-stage build separates build tools from runtime?
11. Independent stages can build in parallel?
12. COPY uses specific paths (not COPY . . early in the file)?

### Image Size
13. Final image contains NO build tools (gcc, make, npm, pip)?
14. Production deps installed separately from dev deps?
15. No unnecessary files (docs, tests, examples) in final image?
16. Expected size range for the runtime? (Go <10MB, Node <100MB, Python <80MB, Java <180MB)

### Runtime Correctness
17. HEALTHCHECK defined with reasonable intervals?
18. EXPOSE matches actual application port?
19. ENV vars for runtime config (not hardcoded values)?
20. Signal handling: PID 1 properly handles SIGTERM?

### Supply Chain
21. Vulnerability scanner integrated (trivy/grype/scout)?
22. cosign signing configured for pushed images?
23. SBOM generation included in build pipeline?
24. Base image update automation (Renovate/Dependabot)?

## Response Format

For each finding:
- **Line**: Dockerfile line number
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Issue**: What's wrong
- **Fix**: Specific code change

End with:
- **Score**: X/10 production readiness
- **Top 3 Actions**: Prioritized fixes for immediate improvement
```

## Usage

Feed the Dockerfile content after the prompt. For automated reviews in CI, combine with `hadolint` for static analysis and this prompt for semantic review.

## Complementary Tools

- `hadolint Dockerfile` -- static linting (DL3000-series rules)
- `docker scout recommendations <image>` -- base image suggestions
- `trivy config .` -- IaC scanning including Dockerfiles
- `dockle <image>` -- CIS benchmark compliance checking
