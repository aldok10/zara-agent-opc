---
name: appsec
description: "Application security: OWASP Top 10 2025, SAST/DAST/SCA, secure SDLC integration"
---

# Application Security

Embed security into the development lifecycle -- shift left without slowing delivery.

## Scope

OWASP Top 10 2025 remediation, SAST/DAST/SCA pipeline integration, dependency vulnerability management, secrets detection, API security testing, secure defaults enforcement, security gate design.

## First Action

Identify the application type (web, API, mobile, serverless) and current security tooling in CI/CD before recommending controls.

## Constraints

1. OWASP Top 10 2025 is the minimum baseline -- never skip categories
2. SAST must run pre-merge; DAST post-deploy to staging
3. SCA scans pinned to lockfile -- not manifest alone
4. Secrets scanning blocks merge on any detection
5. False positive rate target: <5% after tuning
6. Every finding needs severity, exploitability, and fix guidance
7. Security gates must not block >2% of legitimate PRs
8. Dependency updates within 72h for critical CVEs
9. API endpoints validated against OpenAPI spec
10. Session management follows OWASP Session Management Cheat Sheet
11. All auth boundaries tested with DAST
12. Third-party JS/WASM audited before inclusion
13. Container images scanned at build and runtime
14. Findings tracked in issue tracker -- not just reports
15. Security headers mandatory: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
16. Target ASVS Level 2 for production applications
17. Input validation at trust boundaries, output encoding at render
18. Security regression tests for every fixed vulnerability

## DO NOT

- Rely on WAF as sole mitigation for code-level vulns
- Skip DAST because SAST exists
- Accept vendor "security score" without CVE mapping
- Ignore transitive dependency vulnerabilities
- Treat compliance checkbox as security proof
- Disable security gates for release pressure
- Store scan results only in CI logs
- Recommend deprecated crypto or auth patterns
- Suppress SAST findings without documented justification
- Ship without CSP header
- Rely solely on automated scanning -- manual review for logic flaws
- Use allowlists without strict sanitization

## Route to Subskill

| Signal | Target |
|--------|--------|
| Threat model needed | threat-modeling |
| IAM/auth architecture | identity-access |
| Secure coding patterns | secure-code |
| Cloud infra hardening | cloud-security |
| Pen test scoping | penetration-testing |
| Incident triage | incident-forensics |

## Verification

- [ ] OWASP Top 10 2025 categories mapped to controls
- [ ] SAST/DAST/SCA integrated in pipeline with defined gates
- [ ] Secrets scanner active with zero unresolved alerts
- [ ] Dependency vulnerabilities triaged within SLA
- [ ] API security tests cover auth, injection, broken access control
- [ ] Security findings have clear remediation path
- [ ] False positive suppression documented and reviewed

## Knowledge

- OWASP Top 10 2025
- OWASP ASVS v5
- CWE/SANS Top 25
- NIST SSDF (SP 800-218)
- OpenSSF Scorecard
- Semgrep, CodeQL, SonarQube, Snyk, Nuclei, Dependabot, Trivy
- Bug Bounty programs for crowd-sourced coverage post-launch
- Header Hardening: CSP policies, HSTS preload, framing protection
- Mozilla Observatory for header validation
- OWASP Cheat Sheet Series for implementation guidance

## AI-Era Context (2026)

- AI-generated code has higher density of injection and logic flaws -- SAST rules must cover LLM-typical patterns
- Supply chain attacks target AI/ML model registries and pip/npm packages
- DAST tools now support GraphQL and gRPC natively
- SBOM (CycloneDX/SPDX) required by regulation in US and EU
- Runtime application self-protection (RASP) integrated in eBPF-based agents
- Supply chain verification: SLSA L2+ provenance for dependencies, artifact attestation for releases

## Related Skills

- secure-code
- threat-modeling
- penetration-testing
- cloud-security