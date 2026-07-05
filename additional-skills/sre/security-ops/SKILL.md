---
name: security-ops
description: "Security operations: runtime security, vulnerability management, RBAC, audit, compliance scanning"
---

# Security Operations

Runtime security enforcement, vulnerability lifecycle management, and compliance-as-code for production infrastructure.

## Scope

Covers container runtime security (Falco, Tetragon), vulnerability scanning and patching workflows, Kubernetes RBAC design, audit log analysis, compliance frameworks (SOC2, PCI-DSS, HIPAA) automated scanning, and supply chain security (SBOM, Sigstore). Bridges security policy with operational reality.

## First Action

When loaded: check runtime security agents (`kubectl get pods -n falco-system`), review RBAC bindings (`kubectl get clusterrolebindings`), and identify vulnerability scanner reports (Trivy, Grype output).

## Constraints

1. Tetragon (eBPF) is the primary runtime enforcement; Falco for detection/alerting
2. Container images scanned at build (CI gate) and runtime (admission controller)
3. Critical CVEs (CVSS >= 9.0) patched within 72 hours; High (7.0-8.9) within 14 days
4. RBAC follows namespace isolation: no cluster-admin for application teams
5. All Kubernetes API audit logs shipped to SIEM with 90-day retention
6. Pod Security Standards enforced: restricted profile for app namespaces
7. Image signatures verified via Sigstore/cosign at admission (Kyverno/OPA Gatekeeper)
8. Network segmentation enforced by Cilium policies -- not just RBAC
9. Secrets encrypted at rest (KMS) and accessed via CSI driver, not env vars
10. SBOM generated for every production image; stored in OCI registry
11. Compliance scans (kube-bench, Prowler) run weekly; results tracked as tickets
12. Service accounts bound to single workload; no shared service accounts
13. Break-glass procedure documented: temporary elevated access with audit trail
14. Vulnerability exceptions require security team sign-off with expiry date

## DO NOT

1. Grant cluster-admin to CI/CD pipelines (use scoped roles per namespace)
2. Allow privileged containers outside kube-system
3. Trust base image tags (latest, stable) -- pin to digest
4. Suppress vulnerability findings without documented exception and expiry
5. Store audit logs in the same cluster they monitor
6. Use Kubernetes secrets without KMS encryption (default base64 is not encryption)
7. Deploy admission controllers without failure-mode bypass (prevent cluster lockout)
8. Skip RBAC review when onboarding new teams or services
9. Rely solely on image scanning -- runtime detection catches zero-days

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Active security incident | sre-incident-response | Containment, forensics timeline |
| Network policy gaps found | sre-networking | Cilium policy enforcement |
| GCP IAM audit finding | sre-gcp | IAM Recommender, org policies |
| Vulnerability in shared library | sre-platform-engineering | Base image update path |
| Security tool resource cost | sre-cost-optimization | Agent resource right-sizing |

## Verification

- [ ] Tetragon/Falco agents running on all nodes
- [ ] Pod Security Standards enforced (no privileged pods outside system)
- [ ] Image signature verification active at admission
- [ ] Critical CVE count is zero in production workloads
- [ ] RBAC audit shows no over-permissioned bindings
- [ ] Audit logs flowing to SIEM (check last 1h)
- [ ] Compliance scan passing (kube-bench score > 80%)
- [ ] SBOM exists for all running production images

## Knowledge

- knowledge/tetragon-runtime-policies.md
- knowledge/vulnerability-lifecycle.md
- knowledge/rbac-namespace-patterns.md
- knowledge/compliance-scanning-setup.md
- knowledge/supply-chain-security.md

## AI-Era Context (2026)

- Tetragon (eBPF) replaces ptrace-based tools for runtime enforcement with zero overhead
- Sigstore keyless signing is industry standard; long-lived signing keys eliminated
- VEX (Vulnerability Exploitability eXchange) reduces noise in CVE triage
- AI-generated SBOM analysis identifies transitive dependency risk automatically
- GUAC (Graph for Understanding Artifact Composition) maps supply chain relationships
- Runtime eBPF policies detect cryptomining, reverse shells, and container escapes in kernel
- Kubernetes 1.32 built-in audit webhook supports structured OTel log format

## Related Skills

- sre-incident-response
- sre-networking
- sre-gcp
- sre-platform-engineering
