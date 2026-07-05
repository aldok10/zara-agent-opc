---
type: example
title: "Custom Semgrep Rules for Common Vulnerabilities"
---

# Custom Semgrep Rules for Common Vulnerabilities

## Context
When your team has domain-specific security patterns that generic SAST tools miss. Custom Semgrep rules encode institutional knowledge—preventing the same class of vulnerability from recurring across repos.

## Code/Template

```yaml
# .semgrep/custom-rules.yml
rules:
  # SQL Injection via string concatenation
  - id: sql-injection-string-concat
    patterns:
      - pattern-either:
          - pattern: |
              $QUERY = $PREFIX + $INPUT + ...
              ...
              $DB.query($QUERY, ...)
          - pattern: |
              $QUERY = f"...{$INPUT}..."
              ...
              $DB.execute($QUERY, ...)
          - pattern: |
              $DB.query(`...${$INPUT}...`)
    message: |
      Possible SQL injection via string concatenation. Use parameterized
      queries instead: db.query("SELECT * FROM users WHERE id = $1", [userId])
    severity: ERROR
    languages: [typescript, javascript, python]
    metadata:
      cwe: CWE-89
      owasp: A03:2021
      confidence: HIGH
      fix: Use parameterized queries or prepared statements

  # Hardcoded secrets in source
  - id: hardcoded-api-key
    patterns:
      - pattern-either:
          - pattern: |
              $KEY = "sk_live_..."
          - pattern: |
              $KEY = "AKIA..."
          - pattern: |
              $VAR = "ghp_..."
          - pattern: |
              apiKey: "..."
      - pattern-not: |
          $KEY = "sk_live_test..."
      - pattern-not: |
          $KEY = "AKIAEXAMPLE..."
    message: |
      Hardcoded API key detected. Move secrets to environment variables
      or a secrets manager (AWS Secrets Manager, Vault).
    severity: ERROR
    languages: [typescript, javascript, python, go]
    metadata:
      cwe: CWE-798
      confidence: MEDIUM

  # Missing authentication check in Express route
  - id: unprotected-api-route
    patterns:
      - pattern: |
          $APP.$METHOD($PATH, async (req, res) => { ... })
      - pattern-not: |
          $APP.$METHOD($PATH, $AUTH, async (req, res) => { ... })
      - metavariable-regex:
          metavariable: $PATH
          regex: ".*/api/.*"
      - metavariable-regex:
          metavariable: $METHOD
          regex: (post|put|patch|delete)
    message: |
      API mutation endpoint without authentication middleware.
      Add auth middleware: app.post("/api/...", requireAuth, handler)
    severity: WARNING
    languages: [typescript, javascript]
    metadata:
      cwe: CWE-306
      confidence: MEDIUM

  # Unsafe deserialization
  - id: unsafe-json-parse-no-validation
    patterns:
      - pattern: |
          const $DATA = JSON.parse($INPUT);
          ...
          $DB.$METHOD(..., $DATA, ...);
      - pattern-not-inside: |
          const $VALIDATED = $SCHEMA.parse($DATA);
    message: |
      Parsed JSON passed directly to database without schema validation.
      Validate with Zod/Joi before using: const validated = schema.parse(data)
    severity: WARNING
    languages: [typescript, javascript]
    metadata:
      cwe: CWE-502
      confidence: MEDIUM

  # Open redirect
  - id: open-redirect
    patterns:
      - pattern-either:
          - pattern: res.redirect($USER_INPUT)
          - pattern: res.redirect(req.query.$PARAM)
          - pattern: res.redirect(req.body.$PARAM)
    message: |
      User-controlled redirect URL enables open redirect attacks.
      Validate the URL against an allowlist of permitted hosts.
    severity: WARNING
    languages: [typescript, javascript]
    metadata:
      cwe: CWE-601
      owasp: A01:2021
      confidence: HIGH

  # Timing-safe comparison for secrets
  - id: unsafe-secret-comparison
    patterns:
      - pattern-either:
          - pattern: |
              if ($TOKEN === $SECRET) { ... }
          - pattern: |
              if ($TOKEN == $SECRET) { ... }
      - metavariable-regex:
          metavariable: $TOKEN
          regex: ".*(token|secret|key|signature|hmac|hash).*"
    message: |
      Use timing-safe comparison for secrets to prevent timing attacks:
      crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
    severity: WARNING
    languages: [typescript, javascript]
    metadata:
      cwe: CWE-208
      confidence: HIGH
```

```yaml
# .github/workflows/semgrep.yml
name: Semgrep Security Scan

on:
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          semgrep scan \
            --config .semgrep/custom-rules.yml \
            --config "p/owasp-top-ten" \
            --config "p/typescript" \
            --error \
            --sarif \
            --output results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
        if: always()
```

## Key Points
- Use `pattern-not` and `pattern-not-inside` to reduce false positives—exclude patterns where the fix is already applied
- Attach CWE and OWASP metadata to each rule so developers understand the real-world impact, not just the code pattern
- Start with ERROR severity for proven exploitable patterns; use WARNING for "likely vulnerable but needs context"
