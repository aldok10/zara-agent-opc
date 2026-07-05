---
type: fact
title: "Compliance Frameworks - SOC2, GDPR, PCI DSS, NIST, ISO 27001"
---

# Compliance Frameworks

Practical engineering guide to compliance requirements. Focus on what engineers actually implement.

---

## SOC 2 Type II

### Trust Service Criteria (TSC)

| Category | What Engineers Build |
|---|---|
| Security (CC) | Access controls, encryption, network segmentation, vulnerability management |
| Availability (A) | HA architecture, backups, disaster recovery, monitoring/alerting |
| Processing Integrity (PI) | Data validation, error handling, audit trails, reconciliation |
| Confidentiality (C) | Encryption at rest/transit, data classification, access restrictions |
| Privacy (P) | Consent management, data minimization, retention policies, deletion |

### Key Controls Engineers Own

- **CC6.1**: Logical access controls (RBAC, least privilege, MFA)
- **CC6.2**: User registration and deprovisioning (automated via SCIM/IdP)
- **CC6.3**: Role-based authorization with regular access reviews
- **CC7.2**: Security monitoring and alerting (SIEM, anomaly detection)
- **CC8.1**: Change management (PRs, CI/CD, approvals, rollback capability)

### Type I vs Type II

Type I: controls exist at a point in time. Type II: controls operated effectively over a period (usually 12 months). Type II is what customers care about.

### Audit Evidence (automate these)

- Access logs with timestamps and actor identity
- Change records (git history, deploy logs, infrastructure changes)
- Incident response records and resolution timelines
- Regular access reviews with documented outcomes
- Vulnerability scan results and remediation timelines

---

## GDPR Technical Requirements

### Core Principles for Engineers

| Principle | Technical Implementation |
|---|---|
| Data minimization | Collect only what's needed, validate schemas reject extras |
| Purpose limitation | Tag data with purpose, enforce at query layer |
| Storage limitation | Automated retention policies, TTLs, scheduled deletion jobs |
| Integrity & confidentiality | Encryption, access controls, audit logs |
| Accountability | Document processing activities, maintain records |

### Right to Erasure (Article 17)

```typescript
// Cascade deletion across all systems
async function eraseUser(userId: string): Promise<ErasureReport> {
  const systems = ["primary-db", "analytics", "backups", "search-index", "cdn-cache"];
  const results = await Promise.allSettled(
    systems.map((sys) => deleteUserData(sys, userId)),
  );

  // Log for accountability (but not the deleted data itself)
  await auditLog.record({
    action: "gdpr_erasure",
    userId: hashForAudit(userId), // Pseudonymized reference
    systems: results.map((r, i) => ({ system: systems[i], status: r.status })),
    timestamp: new Date().toISOString(),
  });

  return buildErasureReport(results);
}
```

### Data Protection Impact Assessment (DPIA) Triggers

Required when: large-scale profiling, systematic monitoring of public areas, processing special category data at scale, automated decision-making with legal effects.

### Pseudonymization vs Anonymization

- Pseudonymization: reversible with a key (still personal data under GDPR)
- Anonymization: irreversible (no longer personal data, GDPR doesn't apply)
- K-anonymity, l-diversity, differential privacy for analytics datasets

---

## PCI DSS v4.0 Key Changes

### New Requirements (effective March 2025)

| Requirement | What Changed |
|---|---|
| MFA everywhere | MFA required for ALL access to cardholder data environment (not just remote) |
| Targeted risk analysis | Customizable frequency for controls based on risk assessment |
| Script integrity | Monitor payment page scripts for tampering (CSP, SRI, integrity monitoring) |
| Authenticated scanning | Internal vulnerability scans must be authenticated |
| Log review automation | Automated mechanisms to detect anomalies in audit logs |

### Cardholder Data Environment (CDE) Scope Reduction

Best approach: never touch card data. Use tokenization (Stripe, Adyen) so PCI scope is limited to SAQ-A (embed/redirect only).

If you must handle cards:
- Network segmentation (CDE isolated, documented data flows)
- Encrypt PAN at rest with AES-256, mask in logs/displays (show last 4 only)
- TLS 1.2+ for all transmission
- Quarterly ASV scans, annual penetration test

---

## NIST Cybersecurity Framework 2.0

### Six Functions (added "Govern" in 2.0)

| Function | Focus | Engineering Artifacts |
|---|---|---|
| Govern (GV) | Organizational context, risk strategy | Security policies, risk appetite documentation |
| Identify (ID) | Asset inventory, risk assessment | CMDB, data flow diagrams, threat models |
| Protect (PR) | Safeguards | Access controls, encryption, secure SDLC |
| Detect (DE) | Monitoring, anomalies | SIEM rules, alerting, log aggregation |
| Respond (RS) | Incident handling | Runbooks, communication plans, forensics |
| Recover (RC) | Restoration | Backup procedures, DR testing, BCP |

### Supply Chain Risk (new emphasis in 2.0)

- SBOM generation for all deployable artifacts
- Dependency vulnerability monitoring (Dependabot, Snyk)
- Vendor security assessment questionnaires
- Third-party access inventory and review cadence

---

## ISO 27001:2022 Changes

### Annex A Restructured (was 14 domains, now 4 themes)

| Theme | Controls | Examples |
|---|---|---|
| Organizational (37) | Policies, roles, supplier relations | Information security policy, asset management |
| People (8) | Screening, awareness, disciplinary | Security training, termination procedures |
| Physical (14) | Perimeters, equipment, utilities | Clean desk, secure disposal |
| Technological (34) | Access, crypto, operations, comms | MFA, encryption, logging, network security |

### New Controls in 2022

- **A.5.7**: Threat intelligence (consume and act on threat feeds)
- **A.8.9**: Configuration management (hardened baselines, drift detection)
- **A.8.11**: Data masking (in non-production environments)
- **A.8.12**: Data leakage prevention (DLP rules, egress monitoring)
- **A.8.16**: Monitoring activities (centralized security monitoring)
- **A.8.23**: Web filtering (URL categorization, malicious site blocking)
- **A.8.28**: Secure coding (SAST/DAST in pipeline, secure code review)

---

## Compliance-as-Code

### Tools and Approaches

| Tool | Scope | How It Works |
|---|---|---|
| OPA (Rego) | Policy decisions | Decouple policy from code, query at decision points |
| Checkov | IaC scanning | Static analysis of Terraform/CloudFormation/Kubernetes |
| ScoutSuite | Cloud posture | Multi-cloud security auditing |
| Prowler | AWS-specific | CIS benchmarks, PCI, HIPAA checks |
| kube-bench | Kubernetes | CIS Kubernetes benchmark compliance |

```hcl
# Checkov: enforce encryption on S3 buckets
# checkov automatically flags this as non-compliant:
resource "aws_s3_bucket" "bad" {
  bucket = "my-bucket"
  # Missing: server_side_encryption_configuration
}
```

```rego
# OPA: deny pods without resource limits
deny[msg] {
  input.kind == "Pod"
  container := input.spec.containers[_]
  not container.resources.limits
  msg := sprintf("Container %s has no resource limits", [container.name])
}
```

### Audit Trail Requirements (cross-framework)

All frameworks require: who did what, to what, when, from where, and was it successful.

```typescript
interface AuditEntry {
  timestamp: string;       // ISO 8601, UTC
  actor: string;           // Authenticated identity
  action: string;          // Verb (create, read, update, delete, login, export)
  resource: string;        // What was affected
  resourceId: string;      // Specific instance
  outcome: "success" | "failure" | "denied";
  sourceIp: string;        // Origin
  metadata?: Record<string, unknown>; // Framework-specific fields
}
```

Immutable storage (append-only), retained for required period (SOC2: 1yr, PCI: 1yr, GDPR: as needed for accountability), tamper-evident (hash chaining or WORM storage).

---

## Cross-Framework Mapping

| Control Area | SOC2 | GDPR | PCI DSS | NIST CSF | ISO 27001 |
|---|---|---|---|---|---|
| Access control | CC6.1-6.3 | Art. 32 | Req 7-8 | PR.AC | A.8.3-8.5 |
| Encryption | CC6.7 | Art. 32 | Req 3-4 | PR.DS | A.8.24 |
| Logging/monitoring | CC7.1-7.3 | Art. 30 | Req 10 | DE.CM | A.8.15-8.16 |
| Incident response | CC7.4-7.5 | Art. 33-34 | Req 12.10 | RS.* | A.5.24-5.28 |
| Vendor management | CC9.2 | Art. 28 | Req 12.8 | GV.SC | A.5.19-5.22 |
| Change management | CC8.1 | -- | Req 6.5 | PR.IP | A.8.32 |

---

## Implementation Priority Matrix

Start with highest overlap (covers multiple frameworks simultaneously):

1. **Access controls + MFA** - required by all five frameworks
2. **Encryption at rest and in transit** - universal requirement
3. **Audit logging** - universal, hardest to retrofit
4. **Incident response plan** - required by all, tested annually
5. **Vulnerability management** - scanning, patching cadence
6. **Change management** - documented, approved, reversible
7. **Data inventory + classification** - foundation for everything else
8. **Vendor/third-party assessment** - growing requirement across all

Automate evidence collection from day one. Manual evidence gathering for audits is unsustainable and error-prone.
