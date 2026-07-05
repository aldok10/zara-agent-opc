# SAST, DAST, and SCA Integration

Comparison of static, dynamic, and composition analysis tools with CI/CD integration patterns.

## Tool Categories

### SAST (Static Application Security Testing)

Analyzes source code or bytecode without executing it.

| Tool | Languages | Strengths | Weaknesses |
|------|-----------|-----------|------------|
| Semgrep | 30+ languages | Custom rules, fast, low FP | No data flow by default (Pro has it) |
| CodeQL | 10 languages | Deep data flow, GitHub-native | Slow on large repos, complex rule authoring |
| SonarQube | 30+ languages | IDE integration, quality+security | High FP rate without tuning |
| Checkmarx | 25+ languages | Enterprise, compliance mapping | Expensive, slow scans |
| Snyk Code | 10+ languages | Real-time IDE, ML-based | Limited custom rules |

**Best fit:** Semgrep for speed and custom rules in CI. CodeQL for deep analysis on critical repos.

### DAST (Dynamic Application Security Testing)

Tests running application by sending crafted requests.

| Tool | Type | Strengths | Weaknesses |
|------|------|-----------|------------|
| ZAP (OWASP) | Full DAST | Free, scriptable, API support | Manual tuning needed |
| Nuclei | Template-based | Fast, community templates, CI-friendly | Not a crawler |
| Burp Suite Pro | Full DAST | Best manual+auto, extensions | Expensive, not fully CI-native |
| DAST in GitLab | Integrated | Pipeline-native, easy setup | Limited customization |
| Akto | API-focused | API discovery, business logic | Newer, smaller community |

**Best fit:** Nuclei for known-vuln scanning in CI. ZAP for comprehensive API testing post-deploy.

### SCA (Software Composition Analysis)

Identifies vulnerabilities in dependencies.

| Tool | Ecosystem | Strengths | Weaknesses |
|------|-----------|-----------|------------|
| Snyk | All major | Rich fix guidance, PR patches | Cost at scale |
| Trivy | All + containers | Fast, containers+IaC+SBOM | No auto-fix PRs |
| Grype/Syft | All | SBOM-first, Anchore ecosystem | Less enterprise support |
| Dependabot | GitHub ecosystems | Native, auto-PRs | Limited policy control |
| Socket.dev | npm/PyPI | Supply chain focus, behavior detection | Limited languages |

**Best fit:** Trivy for breadth (containers + code). Socket.dev for npm supply chain.

## CI/CD Integration Patterns

### Pre-commit (Developer Workstation)
```
pre-commit hooks:
  - Secrets scanning (gitleaks/trufflehog)
  - SAST quick scan (Semgrep --config=auto)
  - Dependency check (lockfile audit)
```

### Pull Request (Merge Gate)
```
on: pull_request
jobs:
  sast:        Semgrep with custom + community rules
  sca:         Trivy fs scan against lockfile
  secrets:     gitleaks --no-git (diff-only)
  gate:        Block on HIGH/CRITICAL with confirmed exploitability
```

### Post-Merge (Main Branch)
```
on: push (main)
jobs:
  deep-sast:   CodeQL full analysis
  sbom:        Syft generate CycloneDX
  container:   Trivy image scan
  sign:        cosign sign artifacts
```

### Staging Deploy (DAST)
```
on: deployment (staging)
jobs:
  dast:        ZAP API scan against OpenAPI spec
  nuclei:      Template scan for known CVEs
  smoke:       Auth boundary tests (authenticated vs. unauthenticated)
```

## Tuning False Positives

1. Start with default rules, measure FP rate over 2 weeks
2. Suppress with inline comments only when reviewed and documented
3. Create custom rules matching project patterns (not generic suppressions)
4. Track suppression ratio -- if >10%, rules need tuning
5. Review suppressions quarterly (threats evolve)

## Metrics to Track

- Mean time to remediate (MTTR) by severity
- False positive rate per tool
- Coverage: % of repos with active scanning
- SLA compliance: critical <72h, high <7d, medium <30d
- Vulnerability reopen rate (fixes that regress)

## 2026 Considerations

- SBOM now legally required (US EO 14028, EU CRA) -- CycloneDX or SPDX
- AI-generated code has 40% higher vulnerability density -- increase SAST sensitivity for AI-authored files
- Supply chain attacks target build systems -- sign and verify all pipeline artifacts
- Reachability analysis reduces noise: only alert on vulnerabilities in called code paths
- VEX (Vulnerability Exploitability eXchange) documents contextualize CVE relevance
