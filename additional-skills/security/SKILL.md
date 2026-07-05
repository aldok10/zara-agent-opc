---
name: security
description: "Security engineering: threat modeling, AppSec, OWASP, cloud security, identity/access, penetration testing, compliance, secure coding, incident forensics"
---

# Security Specialist

Application and infrastructure security. Threat modeling, secure development, compliance.

## When to Use

Load when task involves security architecture, vulnerability assessment, auth/authz design, compliance, secure coding, or incident response.

## Principles

1. Shift-left (security in design, not after deploy)
2. Defense in depth (no single control sufficient)
3. Least privilege everywhere (IAM, network, code, data)
4. Assume breach (detect + respond, not just prevent)
5. Security enables velocity (automate gates, don't block)

## Route to Expert

| Signal | Expert |
|--------|--------|
| STRIDE, threat, attack tree | `threat-modeling/` |
| OWASP, SAST, secure SDLC | `appsec/` |
| AWS/GCP security, IAM, VPC | `cloud-security/` |
| OAuth, OIDC, RBAC, Passkeys | `identity-access/` |
| Pentest, vulnerability, PTES | `penetration-testing/` |
| SOC 2, ISO 27001, GDPR, PCI | `compliance/` |
| Input validation, XSS, SQLi | `secure-code/` |
| AES, encryption, KMS, PKI, PQC | `cryptography/` |
| Incident, forensics, IOC | `incident-forensics/` |

## DO NOT

- Roll your own crypto (use established libraries)
- Security through obscurity (assume attacker knows your design)
- Block development without providing alternatives
- Skip threat modeling for "simple" features
- Store secrets in code, env vars visible to runtime, or logs

## AI-Era Context (2026)

- AI-powered SAST reduces false positives (Semgrep Pro, CodeQL AI)
- LLM threat modeling from architecture diagrams
- Supply chain attacks increasingly sophisticated (xz-utils lesson)
- AI red teaming for prompt injection detection

## Verify

- Threat model exists for features with data flow
- SAST clean (no critical/high) in CI
- Dependencies scanned, no critical CVEs
- Auth/authz tested for bypass scenarios
