---
type: subskill
title: "Secrets Management"
---

# Secrets Management

## Core Concepts
- Secrets: API keys, database credentials, signing keys, certificates, tokens
- Secrets must never exist in source code, logs, error messages, or client bundles
- Rotation capability: every secret should be replaceable without code deployment
- Envelope encryption: data keys encrypt secrets, master keys encrypt data keys
- Access to secrets follows least privilege with audit logging

## Key Practices
- Use a dedicated vault (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager)
- Inject secrets via environment variables or mounted files at runtime, not build time
- Implement automated rotation with zero-downtime dual-key overlap periods
- Scan commits with pre-commit hooks (gitleaks, truffleHog) to catch accidental exposure
- Encrypt secrets at rest and in transit; restrict decryption to specific service identities

## Common Mistakes
- Committing `.env` files or hardcoding secrets in Docker images / CI configs
- Sharing one secret across multiple environments (dev/staging/prod)
- Logging full request/response bodies that contain auth tokens or credentials

## When to Apply
- Setting up new services that require external credentials
- Designing CI/CD pipelines that deploy to cloud environments
- Responding to a secret exposure incident (rotation + revocation)
