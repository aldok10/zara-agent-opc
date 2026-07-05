---
type: subskill
title: "Secrets Detection"
---

# Secrets Detection

## gitleaks

### Pre-Commit Hook

```bash
# Install
brew install gitleaks

# Setup pre-commit (.pre-commit-config.yaml)
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks
```

### CI Integration

```bash
# Scan current commit range (PR only) - gitleaks v8.19+ uses 'git' subcommand
gitleaks git --log-opts="origin/main..HEAD" --report-format=json --report-path=gitleaks.json

# Exit code: 0 = clean, 1 = leaks found
```

### Baseline Creation

```bash
# Generate baseline of known/accepted findings
gitleaks git --report-format=json --report-path=.gitleaks-baseline.json

# Subsequent scans ignore baselined findings
gitleaks git --baseline-path=.gitleaks-baseline.json
```

## truffleHog

### Verified Secrets

```bash
# Scan repo with verification (confirms secrets are live)
trufflehog git file://. --only-verified --json

# Scan GitHub org
trufflehog github --org=myorg --only-verified
```

Key advantage: truffleHog tests if detected secrets are actually valid (e.g., makes API call with found AWS key). Reduces false positives to near-zero for verified findings.

### Entropy Detection

- High entropy strings flagged as potential secrets
- Combine with regex patterns for precision
- Entropy alone has high false positive rate; use as secondary signal

## Allowlists

### When to Suppress

- Test fixtures with fake/example keys (document as fake)
- Documentation containing example tokens (clearly marked)
- Hash values that match secret patterns but aren't secrets

### How to Suppress

```toml
# .gitleaks.toml
[[allowlist]]
description = "Test fixture AWS key (fake)"
paths = ["tests/fixtures/"]

[[allowlist]]
description = "Example in docs"
regexTarget = "string"
regexes = ["AKIAIOSFODNN7EXAMPLE"]
```

Requirement: every allowlist entry MUST have a description explaining why it's safe.

## Historical Scan

```bash
# Full git history audit
gitleaks git --log-opts="--all" --report-format=json --report-path=full-history.json

# truffleHog full history
trufflehog git file://. --since-commit="" --json > full-history.json
```

Run on: initial adoption, before open-sourcing, after suspected compromise. Historical secrets must be rotated even if removed in later commits (they exist in git history).

## Rotation Workflow

1. **Detect**: secret found in scan output
2. **Rotate**: generate new credential in provider (AWS IAM, DB, etc.)
3. **Update**: deploy new secret via vault/secrets manager (never re-commit to repo)
4. **Verify**: confirm old secret is invalidated (attempt use, expect 403/401)
5. **Commit**: remove secret from code, add to `.gitignore` or vault reference
6. **Audit**: log rotation event, notify affected teams

## Secrets Manager Integration

```bash
# Reference pattern (instead of hardcoding)
DATABASE_URL=vault://secret/data/myapp/db#connection_string
AWS_ACCESS_KEY_ID=aws-ssm:///myapp/prod/aws-key

# At runtime, inject from vault/SSM/GCP Secret Manager
# Never store actual values in repo, .env files, or CI variables visible in logs
```

## Common Patterns Detected

| Pattern | Regex Example | Risk |
|---------|---------------|------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | Account compromise |
| JWT Secret | `jwt[_-]?secret.*=.*[A-Za-z0-9+/]{20,}` | Token forgery |
| Database URI | `(postgres\|mysql\|mongodb)://[^:]+:[^@]+@` | Data breach |
| GitHub PAT | `ghp_[A-Za-z0-9]{36}` | Repo/org access |
| Slack webhook | `https://hooks.slack.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+` | Channel spam/phishing |
| Private key | `-----BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY-----` | Identity impersonation |
