# SBOM & Supply Chain Audit Prompt

You are helping verify software supply chain integrity: SBOM generation, vulnerability scanning, dependency provenance, and artifact verification.

## Input

**Ecosystem:** {{npm | pypi | maven | go | cargo | docker | multi}}
**CI/CD:** {{github_actions | gitlab_ci | jenkins | circleci}}
**Registry:** {{npm | ghcr | ecr | dockerhub | artifactory}}
**SBOM format:** {{spdx | cyclonedx | both}}
**Compliance need:** {{executive_order_14028 | slsa | ssdf | internal_policy}}

## SBOM Generation

### By Ecosystem

```bash
# Node.js / npm
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
# or SPDX
npx spdx-sbom-generator

# Python
pip install cyclonedx-bom
cyclonedx-py environment --output sbom.json

# Go
cyclonedx-gomod mod -json -output sbom.json

# Docker/OCI images
syft <image> -o cyclonedx-json > sbom.json
# or
docker sbom <image>

# Multi-ecosystem (Syft)
syft dir:. -o spdx-json > sbom.json
```

### SBOM Validation

```bash
# Validate CycloneDX format
cyclonedx validate --input-file sbom.json --input-format json

# Check completeness
# Verify: component count matches expected deps
jq '.components | length' sbom.json
```

### Required SBOM Fields

- [ ] Component name and version (every dependency)
- [ ] Package URL (purl) for each component
- [ ] License information
- [ ] Hash/checksum (SHA-256 minimum)
- [ ] Supplier/author information
- [ ] Dependency relationships (tree structure)
- [ ] SBOM creation timestamp and tool info

## Vulnerability Scanning

### Scan Commands

```bash
# Grype (against SBOM)
grype sbom:./sbom.json --output json

# Trivy (filesystem or image)
trivy fs --format json --output vulns.json .
trivy image --format json <image>

# npm audit
npm audit --json > npm-audit.json

# pip-audit
pip-audit --format json --output pip-audit.json

# govulncheck (Go)
govulncheck ./...

# OSV-Scanner (multi-ecosystem)
osv-scanner --format json --lockfile package-lock.json
```

### Vulnerability Triage Process

1. **Critical/High with exploit available**: Fix immediately (upgrade or patch)
2. **Critical/High without exploit**: Fix within sprint
3. **Medium**: Evaluate reachability -- is the vulnerable code path exercised?
4. **Low/Informational**: Document and track
5. **False positive**: Document VEX statement

### VEX (Vulnerability Exploitability eXchange)

```json
{
  "statements": [{
    "vulnerability": { "name": "CVE-2024-XXXXX" },
    "status": "not_affected",
    "justification": "vulnerable_code_not_in_execute_path",
    "impact_statement": "The vulnerable function is not called in our usage"
  }]
}
```

## Provenance & Integrity

### SLSA Levels

| Level | Requirement | Implementation |
|-------|------------|----------------|
| SLSA 1 | Build process documented | CI/CD pipeline with build script in repo |
| SLSA 2 | Signed provenance, hosted build | GitHub Actions + attestation |
| SLSA 3 | Hardened build, non-falsifiable provenance | Isolated builders, verified source |
| SLSA 4 | Hermetic, reproducible, two-person review | Full isolation, pinned deps, 2+ reviewers |

### Artifact Signing & Verification

```bash
# Sign with cosign (Sigstore)
cosign sign --key cosign.key <image>

# Verify signature
cosign verify --key cosign.pub <image>

# Keyless signing (GitHub Actions OIDC)
cosign sign --yes <image>  # uses ambient OIDC credentials

# npm provenance
npm publish --provenance

# Verify npm provenance
npm audit signatures
```

### Dependency Pinning

```bash
# Lock files (MUST be committed)
package-lock.json    # npm
pnpm-lock.yaml       # pnpm
poetry.lock          # Python
go.sum               # Go
Cargo.lock           # Rust

# Docker: pin by digest, not tag
FROM node:22@sha256:abc123...  # NOT FROM node:22

# GitHub Actions: pin by SHA
uses: actions/checkout@abc123  # NOT uses: actions/checkout@v4
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Supply Chain Security
on: [push]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: anchore/sbom-action@<sha>
        with:
          format: cyclonedx-json
          output-file: sbom.json
      - uses: anchore/scan-action@<sha>
        with:
          sbom: sbom.json
          fail-build: true
          severity-cutoff: high

  provenance:
    needs: [build]
    permissions:
      id-token: write
      attestations: write
    steps:
      - uses: actions/attest-build-provenance@<sha>
        with:
          subject-path: './dist/**'
```

## Audit Checklist

### Dependency Hygiene

- [ ] Lock files committed and reviewed in PRs
- [ ] Automated dependency update PRs (Dependabot/Renovate)
- [ ] Update PRs include changelog review
- [ ] No `*` or `latest` version ranges
- [ ] Typosquat check on new dependencies
- [ ] License compatibility verified
- [ ] Abandoned packages identified (no commits > 2 years)
- [ ] Direct vs transitive vulnerability distinction

### Build Integrity

- [ ] Build runs in isolated environment (container/VM)
- [ ] Build inputs fully determined by source (hermetic)
- [ ] Build outputs signed or attested
- [ ] No network access during build (except registry pulls)
- [ ] Reproducible build verification (same input = same output)

### Registry Security

- [ ] Private registry for internal packages
- [ ] Scoped packages (`@org/`) to prevent namespace confusion
- [ ] Package publishing requires MFA or OIDC
- [ ] Pre-publish hooks for validation
- [ ] Immutable versions (no overwrite after publish)

## Output Format

```
## Supply Chain Assessment

### SBOM Status
- Generated: [yes/no] -- format: [CycloneDX/SPDX]
- Components: [count]
- Coverage: [complete/partial -- what's missing]

### Vulnerability Summary
- Critical: [count] ([fixable count] fixable)
- High: [count]
- Medium: [count]
- Exploitable (confirmed): [count]

### Provenance
- SLSA level: [current] -> [target]
- Signing: [implemented/not]
- Verification: [automated/manual/none]

### Gaps
1. [gap]: [risk] -> [remediation + effort]

### Recommendations (priority order)
1. [action] -- impact: [high/medium] -- effort: [hours/days]
```

## Rules

- SBOM must cover transitive dependencies, not just direct.
- Vulnerability count without reachability analysis is misleading -- always assess exploitability.
- Pinning without update automation creates a different risk (unpatched vulnerabilities).
- Compliance frameworks (EO 14028, SSDF) require evidence retention -- plan for storage.
- Never trust a container tag alone. Always verify by digest in production.
