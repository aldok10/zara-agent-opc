---
type: fact
title: "Security Tools"
---
# Security Tools

Technical reference for SAST, DAST, SCA, secret scanning tools -- comparison, integration, and triage workflows.

---

## SAST (Static Application Security Testing)

Analyzes source code without execution. Finds vulnerabilities before deployment.

### Semgrep

Pattern-based. Fast. Custom rules in YAML. Language-aware AST matching.

```yaml
# .semgrep/custom-rules.yml
rules:
  - id: sql-injection-via-format
    patterns:
      - pattern: |
          $QUERY = f"... {$INPUT} ..."
          ...
          $DB.execute($QUERY)
      - pattern-not: |
          $QUERY = f"... {$CONST} ..."
    message: "SQL injection via f-string interpolation"
    severity: ERROR
    languages: [python]
    metadata:
      cwe: CWE-89
      owasp: A03:2021

  - id: hardcoded-secret
    pattern: |
      $KEY = "..."
    metavariable-regex:
      metavariable: $KEY
      regex: (password|secret|api_key|token)
    message: "Potential hardcoded secret"
    severity: WARNING
    languages: [python, javascript, typescript]
```

Run: `semgrep scan --config=auto --config=.semgrep/`

Strengths: fast (<1 min for most repos), easy custom rules, low false-positive rate.
Weaknesses: limited interprocedural analysis, no taint tracking in free tier.

### CodeQL

GitHub's query language for code. Deep semantic analysis. Taint tracking across function boundaries.

```ql
// Find SQL injection in JavaScript
import javascript
import semmle.javascript.security.dataflow.SqlInjection

from SqlInjection::Configuration cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "SQL injection from $@.", source.getNode(), "user input"
```

Run: `codeql database create db --language=javascript && codeql database analyze db`

Strengths: deep interprocedural analysis, taint tracking, GitHub integration.
Weaknesses: slow (10-60 min), complex query language, limited to supported languages.

### SonarQube

Broad language support. Quality + security. Tracks technical debt.

Strengths: UI dashboard, quality gates, IDE integration, broad language coverage.
Weaknesses: higher false-positive rate, paid for advanced security rules, heavier infrastructure.

### Comparison

| Tool | Speed | Depth | Custom Rules | CI Integration | Cost |
|---|---|---|---|---|---|
| Semgrep | Fast | Pattern-based | Easy (YAML) | Native | Free + paid |
| CodeQL | Slow | Deep taint | Complex (QL) | GitHub Actions | Free for OSS |
| SonarQube | Medium | Dataflow | Medium | Plugins | Community + paid |

---

## DAST (Dynamic Application Security Testing)

Tests running applications. Finds runtime vulnerabilities by sending crafted requests.

### OWASP ZAP

Open-source. Active + passive scanning. API scanning support.

```yaml
# zap-automation.yaml
env:
  contexts:
    - name: "target-app"
      urls: ["https://staging.example.com"]
      authentication:
        method: "json"
        parameters:
          loginUrl: "https://staging.example.com/api/auth/login"
          loginRequestData: '{"email":"test@test.com","password":"testpass"}'

jobs:
  - type: spider
    parameters:
      maxDuration: 5
  - type: activeScan
    parameters:
      maxRuleDurationInMins: 5
      policy: "API-Scan"
  - type: report
    parameters:
      template: "sarif-json"
      reportDir: "./reports"
```

Run: `docker run -v $(pwd):/zap/wrk owasp/zap2docker-stable zap.sh -cmd -autorun /zap/wrk/zap-automation.yaml`

### Nuclei

Template-based vulnerability scanner. Huge community template library. Fast.

```yaml
# custom-templates/api-idor-check.yaml
id: idor-user-profile
info:
  name: IDOR Check on User Profile
  severity: high

http:
  - raw:
      - |
        GET /api/users/{{other_user_id}}/profile HTTP/1.1
        Host: {{Hostname}}
        Authorization: Bearer {{token_user_a}}
    matchers:
      - type: status
        status: [200]
      - type: word
        words: ["other_user_email@example.com"]
    matchers-condition: and
```

Run: `nuclei -u https://staging.example.com -t custom-templates/ -t nuclei-templates/`

### Comparison

| Tool | Speed | Coverage | Custom Tests | Best For |
|---|---|---|---|---|
| OWASP ZAP | Slow | Broad | Scripting | Full app scan |
| Nuclei | Fast | Template-based | YAML templates | Known vuln checks |
| Burp Suite | Medium | Deep | Extensions | Manual + automated |

---

## SCA (Software Composition Analysis)

Identifies vulnerabilities in dependencies.

### Trivy

All-in-one: container images, filesystems, repos, IaC. Fast.

```bash
# Scan project dependencies
trivy fs --severity HIGH,CRITICAL --format sarif -o trivy.sarif .

# Scan container image
trivy image --ignore-unfixed myapp:latest

# Scan IaC (Terraform, CloudFormation)
trivy config --severity HIGH,CRITICAL ./infrastructure/
```

### Snyk

Developer-focused. Auto-fix PRs. License compliance.

```bash
# Test and monitor
snyk test --severity-threshold=high
snyk monitor

# Container scanning
snyk container test myapp:latest --file=Dockerfile
```

### Dependabot / Renovate

Automated dependency updates via PRs.

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      production:
        dependency-type: "production"
      development:
        dependency-type: "development"
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

### Comparison

| Tool | Ecosystem | Auto-Fix | License Check | Container Scan |
|---|---|---|---|---|
| Trivy | All | No | Yes | Yes |
| Snyk | All | Yes (PRs) | Yes | Yes |
| Dependabot | GitHub | Yes (PRs) | No | No |
| Renovate | All platforms | Yes (PRs) | No | No |

---

## Secret Scanning

### Tools

| Tool | Approach | Pre-commit | CI | Remediation |
|---|---|---|---|---|
| git-secrets | Regex patterns | Yes | Yes | Block commit |
| truffleHog | Entropy + regex | Yes | Yes | Historical scan |
| GitHub Secret Scanning | Platform-native | N/A | Auto | Alert + revoke |
| gitleaks | Regex + entropy | Yes | Yes | SARIF output |

### gitleaks Configuration

```toml
# .gitleaks.toml
[allowlist]
paths = [
  "test/fixtures/",
  "docs/examples/",
]

[[rules]]
id = "custom-internal-token"
description = "Internal service token"
regex = '''INTERNAL_[A-Z]+_TOKEN_[a-zA-Z0-9]{32}'''
tags = ["token", "internal"]
```

Run: `gitleaks detect --source . --report-format sarif --report-path gitleaks.sarif`

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

## CI/CD Integration Patterns

### Pipeline Architecture

```yaml
# .github/workflows/security.yml
name: Security Checks
on: [push, pull_request]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/default
            p/owasp-top-ten
            .semgrep/

  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          severity: HIGH,CRITICAL
          format: sarif
          output: trivy.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy.sarif

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2

  dast:
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    steps:
      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.7.0
        with:
          target: https://staging.example.com/api/openapi.json
```

### Tool Integration by Phase

| Phase | Tools | Gate Action |
|---|---|---|
| Pre-commit | gitleaks, Semgrep (fast rules) | Block commit |
| PR | Semgrep, Trivy, CodeQL | Block merge on CRITICAL |
| Build | Container scan (Trivy) | Fail build on HIGH+ |
| Staging | DAST (ZAP/Nuclei) | Alert, block deploy if CRITICAL |
| Production | Runtime monitoring, WAF | Alert + auto-response |

---

## Triage Workflow

### Severity Assessment

| Factor | Question | Impact on Priority |
|---|---|---|
| Exploitability | Is there a public exploit? | High if yes |
| Attack vector | Network-accessible? | Higher for remote |
| Data at risk | What does attacker gain? | Scales with sensitivity |
| Blast radius | How many users affected? | Scales with reach |
| Fix complexity | Simple patch or rewrite? | Affects timeline |

### Priority Matrix

| Severity | Exploitable | SLA |
|---|---|---|
| Critical | Yes | 24 hours |
| Critical | No | 7 days |
| High | Yes | 7 days |
| High | No | 30 days |
| Medium | Any | 90 days |
| Low | Any | Next sprint/backlog |

### Triage Decision Tree

```
Is it a false positive?
  Yes -> Suppress with documented reason
  No -> Continue

Is the vulnerable code reachable?
  No -> Deprioritize (but don't ignore)
  Yes -> Continue

Is there a public exploit?
  Yes -> Critical SLA
  No -> Standard SLA for severity

Can we mitigate without patching?
  Yes -> Apply mitigation, schedule patch
  No -> Patch immediately per SLA
```

### Suppression Documentation

```yaml
# .semgrep/ignore.yml
- id: sql-injection-via-format
  path: tests/test_sql.py
  reason: "Test file with intentional vulnerable patterns for testing detection"
  reviewer: "security-team"
  expires: "2025-12-31"
```

Never suppress without: reason, reviewer, and expiration date.
