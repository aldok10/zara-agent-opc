# Secrets Management

## Never in Source Code

Secrets leak through: git history, error logs, crash dumps, process environment inheritance, Docker layer inspection, client-side bundles, CI build logs.

```bash
# This stays in git history FOREVER, even after deletion
git log --all -p -- .env
git log --all -p -S "API_KEY"
```

Even "private" repos get cloned to laptops, forked, mirrored, or compromised.

## Environment Variables

Acceptable for **injection** (12-factor app), not for **storage** or **source of truth**.

Limitations:
- Visible via `/proc/<pid>/environ` or `ps eww`
- Inherited by child processes (unintended exposure)
- No access control, audit trail, or rotation mechanism
- No encryption at rest

```dockerfile
# Don't bake secrets into images
ENV API_KEY=secret  # WRONG - visible in docker history

# Inject at runtime
docker run --env-file .env app  # Better
```

## Secrets Managers

| Tool | Best for |
|------|----------|
| HashiCorp Vault | Self-hosted, dynamic secrets, PKI, multi-cloud |
| AWS Secrets Manager | AWS-native, auto-rotation for RDS/Redshift |
| GCP Secret Manager | GCP-native, IAM integration, versioning |
| Infisical | Open-source, developer-friendly, self-hostable |
| Doppler | Multi-environment sync, team-friendly UI |

Use a secrets manager when you have: >3 secrets, >1 environment, >1 developer, or any production system.

```bash
# Vault: dynamic database credentials (short-lived, auto-revoked)
vault read database/creds/readonly
# Returns: username + password valid for 1 hour
```

## Rotation

Principles:
- Automate rotation. Manual = forgotten.
- Short-lived > long-lived. Dynamic secrets > static secrets.
- Rotate immediately on: employee departure, suspected breach, accidental exposure.

```yaml
# AWS Secrets Manager auto-rotation (Terraform)
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotator.arn
  rotation_rules {
    automatically_after_days = 30
  }
}
```

## CI/CD Secrets

```yaml
# GitHub Actions - secrets never in logs
- name: Deploy
  env:
    DB_URL: ${{ secrets.DATABASE_URL }}
  run: ./deploy.sh
  # Never: echo $DB_URL, printenv, or set -x with secrets
```

Rules:
- Use OIDC federation over long-lived credentials (GitHub → AWS/GCP)
- Least-privilege service accounts per workflow
- Pin actions to SHA, not tags (supply chain attacks)
- Never pass secrets as command-line arguments (visible in `ps`)

```yaml
# OIDC federation (no stored AWS keys)
permissions:
  id-token: write
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123:role/deploy
      aws-region: us-east-1
```

## Detection

| Tool | Type | Use |
|------|------|-----|
| gitleaks | Pre-commit + CI | Scan commits for secrets |
| trufflehog | Deep scan | Entropy + pattern detection across git history |
| GitGuardian | SaaS | Real-time monitoring of public/private repos |

```bash
# Pre-commit hook (.pre-commit-config.yaml)
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

## Quick Rules

1. Never commit secrets. Use `.gitignore` + pre-commit scanning.
2. Use a secrets manager for anything beyond local dev.
3. Rotate credentials on schedule AND on incident.
4. Prefer short-lived/dynamic secrets over static ones.
5. OIDC federation over stored cloud credentials in CI.
6. Least privilege: each service gets only what it needs.
7. Audit access: know who accessed what and when.
8. Encrypt at rest and in transit. Always.
9. No secrets in Docker images, CLI args, or URL params.
10. Assume breach: design so one leaked secret has limited blast radius.
