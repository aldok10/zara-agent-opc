---
type: subskill
title: "Dependency Scanning"
---

# Dependency Scanning

## Trivy (Unified Scanner)

```bash
# SCA: filesystem vulnerabilities
trivy fs --severity HIGH,CRITICAL --exit-code 1 .

# Container image scan
trivy image --severity HIGH,CRITICAL myapp:latest

# IaC misconfigurations (trivy config is deprecated, use fs --scanners misconfig)
trivy fs --scanners misconfig --severity HIGH,CRITICAL ./terraform/

# SBOM generation
trivy fs --format cyclonedx --output sbom.json .
```

### Unified Approach

Trivy covers SCA + container + IaC + secrets + SBOM in one tool. Reduces toolchain complexity. Single binary, no daemon, offline DB support.

## SBOM Generation

### CycloneDX vs SPDX

| Aspect | CycloneDX | SPDX |
|--------|-----------|------|
| Focus | Security/vulnerability | License compliance |
| Format | JSON/XML | JSON/tag-value/RDF |
| Ecosystem | OWASP, security tooling | Linux Foundation, legal |
| VEX support | Native (built-in) | Separate document |

Recommendation: CycloneDX for security workflows, SPDX when license compliance is primary concern. Many orgs generate both.

```bash
# CycloneDX SBOM
trivy fs --format cyclonedx --output sbom-cdx.json .

# SPDX SBOM
trivy fs --format spdx-json --output sbom-spdx.json .
```

## Reachability Analysis

- Not all vulnerabilities in dependencies are exploitable
- Reachability analysis checks if vulnerable code path is actually called
- Tools: Trivy (experimental), Endor Labs, Snyk reachability
- Filter strategy: suppress non-reachable findings, prioritize reachable ones
- Reduces noise by 60-80% in typical projects

## License Compliance

```bash
# Trivy license scan
trivy fs --scanners license --severity HIGH .
```

### Policy Enforcement

- **Block**: GPL-3.0, AGPL-3.0, SSPL (copyleft in proprietary code)
- **Review**: LGPL-2.1, MPL-2.0 (conditional copyleft)
- **Allow**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC

Automate: fail CI if blocked license detected. Generate license report for legal review on UNKNOWN.

## Auto-Update (Renovate/Dependabot)

```json
// renovate.json
{
  "extends": ["config:recommended"],
  "vulnerabilityAlerts": { "enabled": true },
  "packageRules": [
    { "matchUpdateTypes": ["patch"], "automerge": true },
    { "matchUpdateTypes": ["minor"], "automerge": true, "requiredStatusChecks": ["ci"] },
    { "matchUpdateTypes": ["major"], "automerge": false }
  ],
  "schedule": ["before 7am on Monday"]
}
```

Policy: patch/minor auto-merge with passing CI. Major requires manual review. Security updates bypass schedule.

## Container Scanning

### Base Image Selection

- **Distroless**: minimal attack surface, no shell, no package manager
- **Alpine**: small but has musl (compatibility issues), apk for debugging
- **Slim variants**: debian-slim, node-slim as middle ground

```dockerfile
# Multi-stage: build with full image, run with distroless
FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm ci --production

FROM gcr.io/distroless/nodejs22-debian12
COPY --from=builder /app /app
CMD ["app/server.js"]
```

Scan both base image and final image. Pin base image digests for reproducibility.

## Supply Chain Security

### SLSA Levels

- **Level 1**: Documented build process, provenance exists
- **Level 2**: Hosted build, signed provenance
- **Level 3**: Hardened build platform, non-falsifiable provenance

### Signing and Verification

```bash
# Sign container image with cosign
cosign sign --key cosign.key myregistry.io/myapp:v1.2.3

# Verify before deploy
cosign verify --key cosign.pub myregistry.io/myapp:v1.2.3

# Attach SBOM to image
cosign attach sbom --sbom sbom-cdx.json myregistry.io/myapp:v1.2.3
```

### Provenance Attestation

- Generate build provenance (who built, from what source, with what tools)
- Attach to artifact via in-toto attestation format
- Verify provenance in deployment pipeline before rollout
- GitHub Actions: `actions/attest-build-provenance` for automatic SLSA L2
