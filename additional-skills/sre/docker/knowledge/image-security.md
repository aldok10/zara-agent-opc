---
type: fact
title: "Image Security"
---

# Image Security

Production container images must minimize attack surface, ship with zero known critical CVEs, and provide verifiable provenance. This covers base image selection, vulnerability scanning, image signing, and CVE triage workflows.

## Key Concepts

### Distroless and Chainguard Images

**Distroless** (gcr.io/distroless): Google-maintained minimal images with no shell, package manager, or OS utilities. Only the application runtime and its dependencies.

**Chainguard** (cgr.dev/chainguard): Actively maintained with daily rebuilds and zero-CVE SLA. Based on Wolfi OS (glibc, apk-based, built for containers). Preferred over distroless in 2026 for most teams.

```dockerfile
# Go/Rust -- static binary, no libc needed
FROM gcr.io/distroless/static-debian12:nonroot

# Node.js
FROM cgr.dev/chainguard/node:latest

# Python
FROM cgr.dev/chainguard/python:latest-dev AS builder
# ... install deps ...
FROM cgr.dev/chainguard/python:latest
COPY --from=builder /app /app

# Java
FROM cgr.dev/chainguard/jre:latest
```

### Image Signing with cosign

Keyless signing via Sigstore (no key management required):

```bash
cosign sign --yes registry.io/app@sha256:abc123...

cosign verify \
  --certificate-identity "https://github.com/org/repo/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  registry.io/app@sha256:abc123...
```

In CI (GitHub Actions):

```yaml
- uses: sigstore/cosign-installer@v3
- run: cosign sign --yes ${{ env.IMAGE }}@${{ steps.build.outputs.digest }}
```

### Vulnerability Scanning

**Trivy** (recommended):
```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 registry.io/app:latest
trivy image --format sarif -o results.sarif registry.io/app:latest
```

**Docker Scout** (integrated with Docker CLI):
```bash
docker scout cves registry.io/app:latest
docker scout recommendations registry.io/app:latest
```

**Grype** (Anchore):
```bash
grype registry.io/app:latest --fail-on high
```

### SBOM Generation

```bash
# Trivy SBOM
trivy image --format spdx-json -o sbom.spdx.json registry.io/app:latest

# syft (standalone)
syft registry.io/app:latest -o spdx-json > sbom.spdx.json

# Attach SBOM to image
cosign attach sbom --sbom sbom.spdx.json registry.io/app@sha256:abc123...
```

## Configuration Examples

### Pin Base Images by Digest

```dockerfile
FROM node:22-slim@sha256:a1b2c3d4e5f6... AS builder
```

Automate digest updates with Renovate:
```json
{
  "dockerfile": {
    "pinDigests": true
  }
}
```

### Non-root Execution

```dockerfile
USER 65532:65532
```

UID 65532 is the `nonroot` user in distroless/Chainguard images. Using numeric UIDs ensures compatibility across base images.

### Read-only Filesystem

```dockerfile
# At runtime
# docker run --read-only --tmpfs /tmp:rw,noexec,nosuid registry.io/app:latest
```

Application must write only to designated tmpfs mounts or volumes.

## Common Patterns

### CVE Triage Workflow

1. Scanner reports vulnerability in base image layer
2. Check if the vulnerable package is reachable from your application code
3. If unreachable: suppress with `.trivyignore` or VEX statement, document reason
4. If reachable: update base image, rebuild, rescan
5. If no fix available: evaluate compensating controls (network policy, WAF rule)

### VEX (Vulnerability Exploitability eXchange)

```json
{
  "vulnerability": "CVE-2024-1234",
  "status": "not_affected",
  "justification": "vulnerable_code_not_in_execute_path",
  "statement": "libfoo is present but the vulnerable function is never called"
}
```

### Admission Control

Enforce image policies at deploy time (Kubernetes):
- Kyverno: ClusterPolicy requiring cosign signature verification
- Sigstore Policy Controller: native cosign verification as admission webhook
- OPA/Gatekeeper: rego policies for allowed registries and required labels

## Gotchas

1. Distroless images have no shell -- you cannot exec into them for debugging. Use ephemeral debug containers (`kubectl debug`) instead
2. Chainguard `:latest` tags rebuild daily -- pin by digest for reproducibility
3. Trivy DB updates can cause scan result inconsistency -- pin DB version in CI for deterministic results
4. Alpine CVE counts appear low because musl bugs often aren't tracked in NVD
5. Multi-stage builds still expose secrets in intermediate layers if pushed -- only push the final stage
6. cosign signatures are tied to the image digest, not the tag -- retagging doesn't invalidate signatures

## Quick Reference

| Tool | Purpose | Command |
|------|---------|---------|
| cosign | Sign/verify images | `cosign sign --yes <image>@<digest>` |
| trivy | Scan for CVEs | `trivy image --severity HIGH,CRITICAL <image>` |
| syft | Generate SBOM | `syft <image> -o spdx-json` |
| grype | Alternative scanner | `grype <image> --fail-on high` |
| docker scout | Docker-native scanning | `docker scout cves <image>` |
| crane | Image inspection | `crane manifest <image>` |

| Base Image | Use Case | Size |
|------------|----------|------|
| distroless/static | Go, Rust (static binary) | ~2MB |
| distroless/base | C/C++ (glibc needed) | ~20MB |
| chainguard/node | Node.js apps | ~50MB |
| chainguard/python | Python apps | ~45MB |
| chainguard/jre | Java apps | ~90MB |
