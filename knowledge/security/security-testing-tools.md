# Security Testing Tools

## Tool Categories

| Category | What It Does | When to Run | False Positive Rate |
|----------|-------------|-------------|-------------------|
| SAST | Scans source code statically | Every commit/PR | High |
| DAST | Attacks running application | Pre-deploy, nightly | Low |
| SCA | Scans dependencies for CVEs | Every commit/PR | Medium |
| IAST | Agent inside app during tests | Integration tests | Low |
| Secret Scanning | Finds leaked credentials | Pre-commit, CI | Low |
| Container Scanning | Scans images and layers | Build time, registry | Medium |

## SAST (Static Application Security Testing)

Analyzes source code without executing it. Finds bugs early but produces noise.

| Tool | Language | Notes |
|------|----------|-------|
| Semgrep | Multi-language | Fast, custom rules, OSS |
| CodeQL | Multi-language | GitHub-native, powerful queries |
| SonarQube | Multi-language | Quality + security, self-hosted |
| Bandit | Python | Lightweight, focused |
| gosec | Go | Go-specific patterns |
| PHPStan (+ security rules) | PHP | Type-aware analysis |
| ESLint security plugins | JS/TS | eslint-plugin-security |

```yaml
# GitHub Actions example
- name: Semgrep
  run: semgrep scan --config auto --error
```

Limitations: can't understand runtime state, business logic, or auth flows.

## DAST (Dynamic Application Security Testing)

Sends real attacks to a running app. Proves exploitability.

| Tool | Type | Notes |
|------|------|-------|
| OWASP ZAP | Full scanner | OSS, CI-friendly, active/passive |
| Burp Suite Pro | Full scanner | Manual + automated, extensions |
| Nuclei | Template-based | Fast, community templates, targeted |

```bash
# ZAP baseline scan in CI
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.example.com -r report.html
```

```bash
# Nuclei against staging
nuclei -u https://staging.example.com -t cves/ -t misconfigurations/
```

Requires a running environment. Best against staging, never production without approval.

## SCA (Software Composition Analysis)

Scans your dependency tree for known vulnerabilities. Generates SBOMs.

| Tool | Ecosystem | Notes |
|------|-----------|-------|
| Snyk | Multi | SaaS, fix PRs, license checks |
| Trivy | Multi | OSS, containers + fs + IaC |
| Grype | Multi | OSS, pairs with Syft for SBOMs |
| npm audit | Node.js | Built-in, basic |
| govulncheck | Go | Official, call-graph aware |
| pip-audit | Python | Checks installed packages |

```bash
# Trivy filesystem scan
trivy fs --severity HIGH,CRITICAL --exit-code 1 .

# Generate SBOM
syft . -o spdx-json > sbom.json
grype sbom:sbom.json
```

```bash
# Go
govulncheck ./...
```

## IAST (Interactive Application Security Testing)

Agent instruments the app during test execution. Sees actual data flow.

| Tool | How It Works |
|------|-------------|
| Contrast Security | Java/.NET/Node agent, real-time |
| Datadog IAST | Part of APM agent |

Best for: teams with good integration test coverage. Low false positives because it observes real execution paths.

## Secret Scanning

| Tool | Where | Notes |
|------|-------|-------|
| gitleaks | Pre-commit + CI | Regex-based, fast |
| trufflehog | CI + repo history | Entropy + regex, verifies secrets |
| GitGuardian | SaaS + CI | Real-time alerts, remediation |

```bash
# Pre-commit hook
gitleaks protect --staged

# Scan full history
trufflehog git file://. --only-verified
```

## Container Scanning

| Tool | Notes |
|------|-------|
| Trivy | Image + fs + config, OSS |
| Docker Scout | Docker Desktop native |
| Snyk Container | Base image recommendations |

```bash
# Scan before push
trivy image --severity HIGH,CRITICAL myapp:latest
```

Scan both base images and your application layer. Pin base image digests.

## CI/CD Integration Map

| Pipeline Stage | Tools |
|---------------|-------|
| Pre-commit | gitleaks, semgrep (fast rules) |
| PR / commit | SAST (semgrep/codeql), SCA (trivy/snyk), secret scan |
| Build | Container scan, SBOM generation |
| Pre-deploy (staging) | DAST (ZAP baseline), IAST during e2e |
| Nightly | Full DAST scan, full SCA with low severity |
| Release gate | All critical/high findings resolved |

## Decision Guide

- Starting from zero? Semgrep + Trivy + gitleaks. Free, fast, covers most ground.
- Have budget? Add Snyk (SCA + container) or Burp Suite Pro (DAST).
- Mature team? Add CodeQL queries, IAST, custom Nuclei templates.
- Compliance required? Ensure SBOM generation, audit trail, policy gates.
