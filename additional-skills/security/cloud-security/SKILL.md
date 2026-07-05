---
name: cloud-security
description: "Cloud security posture: CSPM, workload protection, identity federation, zero trust networking"
---

# Cloud Security

Secure cloud infrastructure through identity-centric, least-privilege, continuously-verified architecture.

## Scope

CSPM configuration, cloud workload protection (CWPP), identity federation and cross-account access, zero trust network architecture, service mesh security, Kubernetes security posture, IaC security scanning, cloud-native key management.

## First Action

Determine cloud provider(s), IaC tooling, and existing security controls before recommending posture changes.

## Constraints

1. Zero trust: deny-by-default, verify every request, assume breach
2. Identity is the perimeter -- network controls are defense-in-depth only
3. All IaC scanned for misconfig before apply (tfsec/checkov/trivy)
4. Service accounts use workload identity -- never long-lived keys
5. Cross-account/project access via federation, not shared credentials
6. Encryption at rest and in transit -- customer-managed keys for sensitive data
7. CSPM findings auto-remediated where safe, alerted otherwise
8. Network policies default-deny with explicit allow rules
9. Kubernetes: Pod Security Standards enforced, no privileged containers
10. Secrets in vault/KMS -- never in env vars or configmaps
11. Logging to immutable storage with 90-day minimum retention
12. VPC flow logs and DNS logs enabled for all environments
13. Cloud asset inventory updated continuously -- not quarterly

## DO NOT

- Use IAM admin/owner roles for workloads
- Allow public S3/GCS/Blob unless explicitly approved and monitored
- Skip network segmentation because "it's cloud-native"
- Trust VPC boundaries as security boundaries
- Store terraform state without encryption and access control
- Disable cloud audit logs for any reason
- Use security groups with 0.0.0.0/0 ingress on non-public services
- Ignore cross-region replication for DR without security review
- Deploy without resource tagging for ownership attribution

## Route to Subskill

| Signal | Target |
|--------|--------|
| IAM policy design | identity-access |
| App-level vulns | appsec |
| Threat model for cloud arch | threat-modeling |
| Compliance mapping | compliance |
| Incident in cloud env | incident-forensics |
| IaC secure patterns | secure-code |

## Verification

- [ ] CSPM shows zero critical/high unresolved findings
- [ ] No long-lived service account keys in use
- [ ] Network policies enforce default-deny
- [ ] IaC scanning integrated in PR pipeline
- [ ] Encryption keys rotated per policy
- [ ] Audit logs flowing to SIEM with alerting
- [ ] Kubernetes clusters pass CIS benchmark
- [ ] Public exposure inventory reviewed weekly

## Knowledge

- CIS Benchmarks (AWS/GCP/Azure)
- NIST SP 800-190 (Container Security)
- Kubernetes Pod Security Standards
- AWS Well-Architected Security Pillar
- GCP Security Command Center / Azure Defender

## AI-Era Context (2026)

- AI workloads require GPU node isolation and model artifact integrity verification
- LLM APIs exposed publicly need rate limiting, prompt injection detection, and output filtering
- CSPM tools now detect AI-service misconfigurations (Bedrock, Vertex AI, Azure OpenAI)
- eBPF-based runtime protection replaces traditional agents in serverless/container
- Policy-as-code (OPA/Cedar) enforces authorization decisions at cloud-native speed

## Related Skills

- identity-access
- compliance
- threat-modeling
- secure-code
