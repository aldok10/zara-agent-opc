---
name: docker
description: "Container builds: BuildKit, distroless, multi-arch, supply chain security"
---

# Docker Specialist

Production container image builds with BuildKit, minimal base images, and supply chain integrity.

## Scope

Covers Dockerfile authoring, multi-stage builds, BuildKit features, base image selection, multi-architecture builds, image signing/verification, vulnerability scanning, and local development with Compose. Targets OCI-compliant images for Kubernetes and serverless runtimes.

## First Action

When loaded: read the existing Dockerfile (or identify where one should be created), check the .dockerignore, and determine the application runtime requirements. Assess base image choice and identify supply chain gaps.

## Constraints

1. Multi-stage builds mandatory -- separate build dependencies (compilers, dev tools) from runtime image
2. Production images use distroless (gcr.io/distroless) or Chainguard base images -- zero CVEs at ship time
3. Pin base images by digest (`FROM image@sha256:...`), not by tag -- tags are mutable
4. BuildKit `--mount=type=cache,target=/path` for package manager caches (npm, pip, apt, go mod)
5. Build-time secrets via `--mount=type=secret` -- never COPY credentials into image layers
6. Non-root USER directive required -- specify numeric UID (e.g., `USER 65532`) for distroless compatibility
7. COPY over ADD for local files -- ADD has implicit tar extraction and URL fetch behavior
8. HEALTHCHECK instruction in every production image with interval <=30s, timeout <=5s, retries 3
9. All pushed images signed with cosign (keyless via Sigstore) and verified at deploy time
10. .dockerignore must exclude: .git, node_modules, build artifacts, .env files, test fixtures
11. Layer ordering: dependencies first, source code last -- maximize cache hits on code changes
12. Final image size target: <50MB for Go/Rust, <150MB for Node/Python, <200MB for Java
13. No shell in production images (distroless/static) -- forces explicit binary entrypoint
14. Multi-arch builds via `docker buildx` targeting at minimum linux/amd64 and linux/arm64 (Graviton)

## DO NOT

1. Use Alpine for glibc applications (musl incompatibilities cause subtle runtime failures)
2. Store secrets in any layer -- they persist in image history even if deleted in later layers
3. Run `apt-get upgrade` in CI builds (non-reproducible; pin package versions instead)
4. Use docker-compose for production deployments (it's a dev tool, not an orchestrator)
5. Build release images with cache (`--no-cache` for final release to ensure reproducibility)
6. Use ADD for local file copying (ambiguous behavior with URLs and archives)
7. Leave build tools (gcc, make, npm) in the final runtime stage (attack surface + image bloat)
8. Skip vulnerability scanning -- run `trivy image` or `docker scout cves` before push
9. Use `ENTRYPOINT` with shell form (`ENTRYPOINT command args`) -- always use exec form (`ENTRYPOINT ["cmd"]`)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Optimizing build size/speed | multi-stage | Builder patterns, layer caching, minimal runtime |
| CVE scanning, base images | security-scanning | Trivy, Grype, Docker Scout, triage workflow |
| Slow builds, large images | optimization | Layer ordering, cache mounts, .dockerignore |
| ARM/Graviton support | multi-arch | buildx, QEMU, manifest lists, platform matrix |
| Local dev environments | compose | Compose v2, profiles, watch mode, networking |

## Verification

- [ ] `trivy image --severity HIGH,CRITICAL` reports zero findings
- [ ] `docker history` shows no secret data in layers
- [ ] `cosign verify` passes on pushed image tag
- [ ] Container runs as non-root: `docker run --rm <img> id` shows uid != 0
- [ ] Image size within target threshold for the runtime
- [ ] Multi-arch manifest exists: `docker manifest inspect` shows amd64 + arm64
- [ ] HEALTHCHECK defined and passing within container

## Knowledge

- knowledge/buildkit-cache-mounts.md
- knowledge/distroless-images.md
- knowledge/cosign-signing.md
- knowledge/multi-arch-builds.md
- knowledge/dockerfile-optimization.md

## AI-Era Context (2026)

- Docker Engine 27+, BuildKit default, Compose V2 only (v1 removed). Testcontainers for integration testing.
- Chainguard images have replaced distroless for many teams -- actively maintained, daily rebuilds, zero CVEs
- BuildKit is the default builder in Docker Engine 24+ -- legacy builder fully removed
- Docker Scout provides SBOM + CVE analysis integrated into `docker build` output
- cosign keyless signing via Sigstore Rekor is the standard; key-based signing is legacy
- Wasm container support (containerd-shim) enables polyglot containers without full OS layers
- GitHub Actions attestation (`actions/attest-build-provenance`) generates SLSA provenance automatically
- `docker init` scaffolds best-practice Dockerfiles for common languages (Go, Node, Python, Rust)
- OCI artifacts (Helm charts, Wasm modules, SBOMs) stored alongside images in registries

## Related Skills

- kubernetes -- runtime target for container images
- cicd -- build pipelines that produce images
- security-ops -- vulnerability management and supply chain policy
- gitops -- image tag promotion workflows
