---
name: compliance
description: "Compliance engineering: SOC2, ISO 27001, GDPR, PCI-DSS, policy-as-code, audit automation"
---

# Compliance Engineering

Translate regulatory requirements into automated, auditable controls -- compliance as continuous verification.

## Scope

SOC 2 Type II control implementation, ISO 27001 ISMS, GDPR data protection engineering, PCI-DSS cardholder data controls, policy-as-code authoring (OPA/Cedar), audit evidence automation, control mapping across frameworks, continuous compliance monitoring.

## First Action

Identify applicable frameworks, current compliance maturity, and existing control inventory before designing automation.

## Constraints

1. Controls must be testable -- if you can't verify it, it's not a control
2. Policy-as-code over documented policies where enforceable
3. Evidence collection automated -- manual evidence is tech debt
4. Single control can satisfy multiple frameworks (control mapping)
5. Data classification drives protection requirements
6. Retention policies enforced technically, not just documented
7. Access reviews automated with periodic attestation
8. Audit trails immutable and tamper-evident
9. Exceptions documented with owner, justification, expiry, and compensating control
10. Third-party risk assessed before vendor onboarding
11. Privacy by design -- GDPR Article 25 applied at architecture level
12. PCI scope minimized through tokenization and network segmentation
13. Changes to compliance-relevant systems trigger re-verification
14. Compliance status visible in real-time dashboard

## DO NOT

- Treat compliance as a point-in-time exercise
- Write policies that cannot be technically enforced
- Accept screenshots as primary audit evidence
- Mix PCI cardholder data environment with general workloads
- Skip data flow mapping for GDPR assessments
- Implement controls without defining failure detection
- Rely on annual audits to catch drift
- Conflate compliance with security -- they overlap but differ
- Store PII without documented legal basis and retention schedule

## Route to Subskill

| Signal | Target |
|--------|--------|
| IAM controls for access review | identity-access |
| Cloud posture compliance | cloud-security |
| Secure coding standards | secure-code |
| Incident response plan | incident-forensics |
| Risk assessment via threat model | threat-modeling |
| Vulnerability management | appsec |

## Verification

- [ ] Control matrix maps requirements to implementations
- [ ] Policy-as-code covers critical controls (access, encryption, logging)
- [ ] Automated evidence collection for SOC 2 / ISO 27001 controls
- [ ] Data flow diagrams current and GDPR-annotated
- [ ] PCI scope documented and validated
- [ ] Exception register reviewed quarterly
- [ ] Continuous compliance dashboard operational
- [ ] Audit readiness achievable within 48h notice

## Knowledge

- SOC 2 Trust Service Criteria (2022)
- ISO 27001:2022 / 27002:2022
- GDPR Articles 25, 30, 32-34
- PCI-DSS v4.0.1
- NIST CSF 2.0
- OPA/Rego policy language

## AI-Era Context (2026)

- EU AI Act requires risk classification and conformity assessment for high-risk AI systems
- AI model governance (training data lineage, bias testing) now part of compliance scope
- Automated compliance platforms (Vanta, Drata, Secureframe) integrate directly with cloud APIs
- SBOM requirements (EO 14028, CRA) mandate software transparency
- Privacy-preserving computation (differential privacy, FHE) emerging as GDPR technical measure

## Related Skills

- cloud-security
- identity-access
- threat-modeling
- incident-forensics
