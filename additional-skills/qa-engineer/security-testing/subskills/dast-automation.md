---
type: subskill
title: "DAST Automation"
---

# DAST Automation

## ZAP Automation

### Scan Types

```bash
# Baseline scan (passive only, fast, safe for prod)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.example.com -J report.json

# Full scan (active + passive, destructive potential)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t https://staging.example.com -J report.json

# API scan (OpenAPI/GraphQL/SOAP)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t https://staging.example.com/openapi.json -f openapi -J report.json
```

### Authentication

**Form-based:**
```yaml
# zap-automation.yaml
authentication:
  method: form
  parameters:
    loginUrl: "https://staging.example.com/login"
    loginRequestData: "username={%username%}&password={%password%}"
  verification:
    method: response
    loggedInRegex: "\\QWelcome\\E"
```

**Token-based (Bearer):**
```yaml
authentication:
  method: script
  parameters:
    scriptName: "jwt-auth.js"
  verification:
    method: response
    loggedInRegex: "\\Q\"authenticated\":true\\E"
```

**OAuth:** Use ZAP's script-based auth to perform OAuth flow, extract access token, inject into Authorization header for subsequent requests.

## Nuclei

### Template-Based Scanning

```bash
# Run all templates
nuclei -u https://staging.example.com -t nuclei-templates/

# CVE detection only
nuclei -u https://staging.example.com -t nuclei-templates/cves/ -severity critical,high

# Custom template
nuclei -u https://staging.example.com -t ./custom-templates/
```

### Custom Template Example

```yaml
id: custom-open-redirect
info:
  name: Open Redirect Check
  severity: medium
requests:
  - method: GET
    path:
      - "{{BaseURL}}/redirect?url=https://evil.com"
    matchers:
      - type: regex
        part: header
        regex:
          - "(?i)location:.*evil\\.com"
```

## CI Integration (Docker-Based)

```yaml
- name: DAST Scan
  run: |
    docker run --rm --network host \
      -v $(pwd)/reports:/zap/wrk:rw \
      ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
      -t $STAGING_URL -J report.json -r report.html
    # Parse and gate
    python scripts/parse-zap-report.py reports/report.json --fail-on high
```

## Report Parsing and Severity Filtering

- Parse JSON output programmatically
- Gate on risk levels: HIGH/CRITICAL = fail pipeline, MEDIUM = warn, LOW/INFO = log
- Deduplicate by CWE + endpoint to reduce noise
- Track delta between scans (new findings only trigger alerts)

## DAST vs IAST

| Aspect | DAST | IAST |
|--------|------|------|
| Access | Black-box, no source needed | Instrumented runtime agent |
| Coverage | Routes exercised by crawler/tests | Code paths hit during test execution |
| False positives | Higher (no code context) | Lower (runtime confirmation) |
| Setup | External scanner, minimal config | Agent in app runtime, language-specific |
| Best for | Pre-prod validation, compliance | Dev/test with existing functional tests |

Use DAST for external attack surface validation. Use IAST when you have good functional test coverage and want deeper runtime analysis without separate scan infrastructure.
