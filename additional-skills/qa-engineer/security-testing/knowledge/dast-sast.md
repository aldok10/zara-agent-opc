---
type: fact
title: "DAST vs SAST Tools"
---

# DAST vs SAST Tools

## SAST (Static Application Security Testing)

Analyzes source code without running the application. Finds vulnerabilities by examining code patterns.

### When to Use
- During development (IDE integration)
- In CI on every PR
- Before merge to protected branches
- Security gate in the pipeline

### Key SAST Tools

| Tool | Languages | Approach | Best For |
|------|-----------|----------|----------|
| Semgrep | 30+ languages | Pattern matching rules | Custom rules, speed |
| CodeQL | Java, JS, Python, C++ | Semantic code analysis | Deep dataflow analysis |
| SonarQube | 25+ languages | Rules + quality metrics | All-in-one quality gate |
| Bandit | Python | AST analysis | Python-specific security |
| gosec | Go | AST analysis | Go-specific patterns |
| Brakeman | Ruby | Rails-specific analysis | Ruby on Rails apps |
| SpotBugs + FindSecBugs | Java | Bytecode analysis | Java/JVM apps |
| Snyk Code | Multi-language | ML-powered analysis | Low false positives |

### Semgrep Example
```yaml
# .semgrep.yml
rules:
  - id: sql-injection
    patterns:
      - pattern: |
          $DB.query(f"... {$INPUT} ...")
    message: "Possible SQL injection via f-string"
    severity: ERROR
    languages: [python]

  - id: hardcoded-secret
    patterns:
      - pattern: |
          $VAR = "...$SECRET..."
      - metavariable-regex:
          metavariable: $VAR
          regex: "(password|secret|token|api_key)"
    message: "Hardcoded secret detected"
    severity: WARNING
    languages: [python, javascript, typescript]
```

### SAST Strengths
- Early detection (shift-left)
- Covers all code paths (not just exercised ones)
- Fast feedback (seconds to minutes)
- No running application needed
- Finds hardcoded secrets, unsafe patterns

### SAST Weaknesses
- Higher false positive rate
- Cannot detect runtime issues (misconfigs, auth bypass in deployment)
- Limited understanding of data flow across services
- May miss injection if input source is external

## DAST (Dynamic Application Security Testing)

Tests the running application by sending malicious inputs and observing responses.

### When to Use
- Against staging/QA environments
- Pre-release security gate
- Periodic scans of production
- After deployment changes

### Key DAST Tools

| Tool | Type | Best For |
|------|------|----------|
| OWASP ZAP | Open source, active/passive proxy | General web app scanning |
| Burp Suite Pro | Commercial, manual + automated | Deep manual testing |
| Nuclei | Template-based vulnerability scanner | Known CVEs, misconfigs |
| Nikto | Web server scanner | Server/config issues |
| Arachni | Automated web scanner | Full crawl + attack |
| StackHawk | Developer-friendly DAST | CI integration |

### OWASP ZAP Usage
```bash
# Quick baseline scan
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.example.com \
  -r report.html

# Full scan (active attacks)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t https://staging.example.com \
  -r report.html

# API scan with OpenAPI spec
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t https://staging.example.com/openapi.yaml \
  -f openapi \
  -r report.html
```

### Nuclei Templates
```bash
# Scan for known vulnerabilities
nuclei -u https://target.com -t cves/
nuclei -u https://target.com -t misconfiguration/
nuclei -u https://target.com -t exposures/

# Custom template
nuclei -u https://target.com -t custom-checks/
```

### DAST Strengths
- Finds real exploitable vulnerabilities
- Tests actual deployment config (headers, CORS, TLS)
- Low false positive rate (it actually exploits the issue)
- Tests authentication and authorization in practice
- Finds misconfigurations

### DAST Weaknesses
- Only tests reachable/crawlable code paths
- Slow (minutes to hours per scan)
- Requires running application
- Can miss issues in untriggered code
- May cause side effects (data creation, alerts)

## Comparison Matrix

| Aspect | SAST | DAST |
|--------|------|------|
| Input | Source code | Running application |
| Timing | Development/CI | Staging/Production |
| Speed | Fast (minutes) | Slow (minutes-hours) |
| False positives | Higher | Lower |
| Coverage | All code paths | Reachable paths only |
| Deployment issues | Cannot detect | Detects |
| Secrets in code | Detects | Cannot detect |
| Runtime config | Cannot test | Tests |
| CI integration | Easy | Needs deployed target |

## Combined Strategy (Recommended)

```
Code → SAST (every PR) → Merge → Deploy to Staging → DAST (nightly) → Production
         ↓                                                    ↓
    Block on critical                               Alert + ticket
```

### Pipeline Integration
```yaml
# GitHub Actions example
jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: semgrep scan --config auto --error

  dast:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: 'zap-rules.tsv'
          fail_action: true
```

## When to Escalate to Manual Pentesting

- Before major releases (annually minimum)
- After significant architecture changes
- For compliance requirements (PCI-DSS, SOC 2)
- When automated tools find patterns suggesting deeper issues
- For business logic vulnerabilities (automated tools miss these)
