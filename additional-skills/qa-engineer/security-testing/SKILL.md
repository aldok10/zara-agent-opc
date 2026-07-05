# Subskill: Security Testing

> Activate when: SAST, DAST, IAST, Semgrep, CodeQL, ZAP, Nuclei, secrets scan, dependency scan, SCA, SBOM, IaC scan, container security, supply chain, fuzzing, vulnerability, CVE, license compliance
>
> Shift-left: SAST on every PR. Defense in depth: multiple tools, multiple layers. Fix critical within 72h.

## Golden Rules

1. SAST on every PR (Semgrep for speed + cross-file taint, CodeQL for depth)
2. DAST on staging after deploy (ZAP + Nuclei for known CVEs)
3. IAST in staging runtime (Contrast/Datadog) — fills SAST/DAST gap with real execution paths
4. Dependency scanning every build with reachability analysis (Trivy, Snyk reachability, Endor Labs)
5. Secrets scanning: pre-commit hook + CI (gitleaks, truffleHog)
6. SBOM generation every release (CycloneDX/SPDX) — legally required (EU CRA, US EO 14028)
7. IaC scanning on every infra PR (Checkov, Trivy config)
8. Container: distroless base images, image signing (cosign/Sigstore), admission controllers
9. Supply chain: SLSA L2+ provenance, artifact attestation, lock files committed
10. Critical/High findings fail CI. Triage 24h, fix critical 72h.
11. License compliance: block GPL contamination, flag SSPL risk (FOSSA, Mend)
12. Never suppress findings without documented justification

## Tool Landscape

| Category | Primary | Depth/Alt | Notes |
|----------|---------|-----------|-------|
| SAST | Semgrep (Pro: cross-file taint) | CodeQL | Semgrep Pro for inter-procedural |
| DAST | ZAP | Nuclei | Nuclei for CVE templates at scale |
| IAST | Contrast Security | Datadog IAST | Runtime instrumentation in staging |
| SCA+Container+IaC+SBOM | **Trivy** (unified) | Snyk, Grype | Trivy covers 4 categories in one |
| Secrets | gitleaks | truffleHog | Pre-commit + CI |
| IaC | Checkov | Trivy config | Terraform, Helm, CloudFormation, K8s |
| Fuzzing | RESTler, schemathesis | AFL++ | API/protocol fuzzing |
| Reachability | Endor Labs | Snyk reachability | Prune non-reachable vulns |
| Supply Chain | SLSA framework | cosign, Sigstore | L1-L4 maturity levels |
| License | FOSSA | Mend | GPL/SSPL contamination detection |

## Pipeline Integration

```yaml
# PR level (fast, every push)
pr-security:
  - semgrep ci --config=auto  # SAST (cross-file with Pro)
  - gitleaks git --log-opts="HEAD~1..HEAD"
  - trivy fs --severity HIGH,CRITICAL --scanners vuln,misconfig .
  - checkov -d . --framework terraform,helm  # IaC

# Staging deploy (after merge)
staging-security:
  - zap-baseline.py -t $STAGING_URL
  - nuclei -u $STAGING_URL -t cves/ -t exposures/
  - trivy image --sbom-sources rekor $IMAGE  # container + SBOM

# Nightly (comprehensive)
nightly-security:
  - codeql-analyze  # deep SAST
  - zap-full-scan.py -t $STAGING_URL  # DAST deep
  - trivy sbom --format cyclonedx $IMAGE > sbom.json  # SBOM gen
  - trufflehog git file://. --only-verified
  - fossa analyze && fossa test  # license compliance

# Release gate
release-security:
  - cosign sign --key $KEY $IMAGE  # image signing
  - slsa-verifier verify-artifact $ARTIFACT  # provenance check
  - trivy sbom --format spdx-json $IMAGE > sbom-spdx.json  # regulatory SBOM
```

## IAST (Instrumented Testing)

Fills the SAST/DAST gap — instruments running app to detect vulnerabilities during functional tests:
- Deploy instrumented agent to staging (Contrast, Datadog IAST)
- Run functional/integration test suite → IAST reports real exploitable paths
- Zero extra test authoring — piggybacks on existing tests
- Catches: SQL injection, SSRF, path traversal with actual runtime context

## API Security (OWASP API Top 10 2023)

Priority focus areas:
- **BOLA** (Broken Object Level Auth): test ID enumeration across users
- **BFLA** (Broken Function Level Auth): verify role-based endpoint access
- **Unrestricted Resource Consumption**: rate limiting, pagination bounds
- **SSRF**: validate outbound request destinations
- **Mass Assignment**: verify field-level write permissions

```bash
# API fuzzing with schemathesis (OpenAPI spec required)
schemathesis run https://staging.example.com/openapi.json \
  --checks all --stateful=links --hypothesis-max-examples=500

# RESTler for stateful API fuzzing
restler compile --api_spec openapi.json
restler fuzz-lean --grammar_file grammar.py --token_refresh_cmd ./get-token.sh
```

## Container & Runtime Security

```bash
# Build: distroless enforcement
FROM gcr.io/distroless/static-debian12:nonroot  # no shell, minimal attack surface

# CI: image scanning + signing
trivy image --severity CRITICAL --exit-code 1 $IMAGE
cosign sign --yes $IMAGE  # keyless with Sigstore/Fulcio

# Admission control (OPA Gatekeeper / Kyverno)
# Block unsigned images, non-distroless bases, privileged containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
spec:
  rules:
    - name: verify-image-signature
      verifyImages:
        - imageReferences: ["registry.example.com/*"]
          attestors:
            - entries:
                - keyless:
                    issuer: "https://accounts.google.com"
```

## Supply Chain (SLSA Framework)

| Level | Requirement | Implementation |
|-------|-------------|----------------|
| L1 | Build process documented | CI/CD config in repo |
| L2 | Signed provenance | GitHub Attestations / slsa-github-generator |
| L3 | Hardened build platform | Isolated, ephemeral builders |
| L4 | Two-person review + hermetic | Enforced code review + reproducible builds |

## Reachability Analysis

Don't patch everything — prioritize what's actually callable:
- Endor Labs / Snyk reachability: static analysis of call graphs to vulnerable functions
- Reduces noise 60-80% — only alert on reachable vulnerable paths
- Integrate post-SCA: `trivy fs .` → feed results to reachability filter
- Non-reachable: downgrade severity, schedule for next maintenance window

## SBOM & License Compliance

```bash
# Generate SBOM (required for EU CRA, US EO 14028)
trivy sbom --format cyclonedx --output sbom.cdx.json .
syft . -o spdx-json > sbom.spdx.json

# License compliance
fossa analyze  # detect GPL/SSPL contamination
fossa test     # fail CI on policy violations

# Risk licenses to block/flag:
# - GPL-2.0/3.0 in proprietary projects (copyleft contamination)
# - SSPL (MongoDB license) — not OSI-approved, cloud service risk
# - AGPL — network copyleft, triggers on SaaS usage
```

## Triage Workflow

1. Finding detected → auto-create issue with severity/CVSS + reachability status
2. Critical + reachable: P1, assign immediately, 72h SLA
3. Critical + non-reachable: P2, next sprint
4. High: P2, 2-week SLA
5. Medium: backlog, quarterly review
6. False positive: document justification, add to allowlist

## Anti-Patterns

- Single tool reliance (defense in depth — SAST+DAST+IAST+SCA)
- Patching all CVEs equally (use reachability to prioritize)
- Suppressing findings without justification
- Running DAST against production without approval
- No SBOM = non-compliant with EU CRA (2024+)
- Unsigned images in production (supply chain risk)
- "Internal only" as excuse to skip security testing
- Ignoring license risk in transitive dependencies

## Delegates To

- **security-engineering** for threat modeling and architecture review
- **code-review** for security-focused PR review
