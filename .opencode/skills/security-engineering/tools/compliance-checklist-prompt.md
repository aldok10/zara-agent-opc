# Compliance Mapping Checklist Prompt

You are helping a tech team map their systems to compliance requirements (SOC 2, GDPR, PCI DSS). Focus on actionable technical controls, not legal interpretation.

## Input

**Framework(s):** {{soc2 | gdpr | pci_dss | hipaa | iso27001}}
**System type:** {{saas | api_platform | data_pipeline | internal_tool}}
**Cloud provider:** {{aws | gcp | azure | multi}}
**Data types handled:** {{pii | phi | payment_cards | credentials | business_data}}
**Current state:** {{greenfield | existing_system | pre_audit}}

## SOC 2 Trust Service Criteria (Technical Controls)

### CC6: Logical & Physical Access

| Control | Implementation | Evidence |
|---------|---------------|----------|
| CC6.1 Access provisioning | SSO + RBAC, JIT access for prod | IAM policies, access logs |
| CC6.2 Access removal | Automated deprovisioning on offboarding | SCIM sync, deactivation logs |
| CC6.3 Access review | Quarterly access review, excess permissions revoked | Review records, before/after |
| CC6.6 System boundaries | Network segmentation, WAF, API gateway | VPC configs, firewall rules |
| CC6.7 Data restrictions | Encryption at rest (AES-256) + transit (TLS 1.2+) | KMS config, cert inventory |
| CC6.8 Malicious software | Endpoint protection, container scanning | Scan results, policy config |

### CC7: System Operations

| Control | Implementation | Evidence |
|---------|---------------|----------|
| CC7.1 Detection mechanisms | SIEM, alerting, anomaly detection | Alert rules, dashboard |
| CC7.2 Monitoring | Centralized logging, audit trails | Log retention policy, sample |
| CC7.3 Incident response | Runbooks, on-call rotation, post-mortems | IR plan, incident history |
| CC7.4 Response execution | Automated containment, escalation paths | Playbooks, response time SLA |

### CC8: Change Management

| Control | Implementation | Evidence |
|---------|---------------|----------|
| CC8.1 Change control | PR reviews, CI/CD gates, approval workflows | Git history, pipeline config |

## GDPR Technical Controls

### Data Subject Rights (Implementation)

| Right | Technical Requirement | Implementation |
|-------|----------------------|----------------|
| Access (Art 15) | Export all data for a user | API endpoint or admin tool |
| Erasure (Art 17) | Delete all PII, cascade to backups | Deletion service + backup purge job |
| Portability (Art 20) | Machine-readable export (JSON/CSV) | Export API with standard format |
| Rectification (Art 16) | Update personal data | Standard CRUD + audit trail |
| Restriction (Art 18) | Freeze processing without deletion | Status flag + processing filter |

### Data Protection by Design (Art 25)

- [ ] Data minimization: only collect what is needed
- [ ] Purpose limitation: tag data with processing purpose
- [ ] Storage limitation: TTL/retention policies with auto-deletion
- [ ] Pseudonymization: separate identifiers from data where possible
- [ ] Encryption: at rest and in transit for all PII

### Data Processing Inventory

```
| Data Category | Source | Purpose | Legal Basis | Retention | Recipients |
|--------------|--------|---------|-------------|-----------|------------|
| Email        | User   | Auth    | Contract    | Account life + 30d | Auth service |
| IP Address   | Auto   | Security| Legitimate interest | 90 days | SIEM |
```

## PCI DSS v4.0 (Key Technical Requirements)

### Network Security (Req 1-2)

- [ ] Cardholder data environment (CDE) segmented from general network
- [ ] Firewall rules reviewed every 6 months
- [ ] No direct public access to CDE
- [ ] Default credentials changed on all systems

### Data Protection (Req 3-4)

- [ ] PAN masked when displayed (show only last 4)
- [ ] PAN encrypted at rest (or tokenized)
- [ ] Encryption keys rotated annually
- [ ] TLS 1.2+ for all transmission of card data
- [ ] No PAN in logs, caches, or temp files

### Vulnerability Management (Req 5-6)

- [ ] Antivirus on all systems in CDE
- [ ] Critical patches applied within 30 days
- [ ] Secure coding practices (OWASP Top 10)
- [ ] Code review or SAST before deployment
- [ ] Web application firewall (WAF) for public-facing apps

### Access Control (Req 7-9)

- [ ] Least privilege access to CDE
- [ ] Unique IDs for all users (no shared accounts)
- [ ] MFA for administrative access
- [ ] Access logged and monitored

### Monitoring (Req 10-11)

- [ ] Audit logs for all CDE access
- [ ] Log retention: minimum 12 months (3 months immediately available)
- [ ] Quarterly vulnerability scans (ASV for external)
- [ ] Annual penetration test
- [ ] File integrity monitoring on critical files

## Implementation Priority Matrix

```
| Priority | Category | Effort | Risk if Missing |
|----------|----------|--------|-----------------|
| P0 | Encryption (rest + transit) | Medium | Breach = maximum penalty |
| P0 | Access control + MFA | Low | Unauthorized access |
| P0 | Audit logging | Medium | Cannot prove compliance |
| P1 | Automated provisioning/deprovisioning | Medium | Orphaned accounts |
| P1 | Vulnerability scanning | Low | Known exploits |
| P1 | Incident response plan | Medium | Slow response = escalation |
| P2 | Data classification | High | Over/under protection |
| P2 | Backup + recovery testing | Medium | Data loss |
| P3 | Formal change management | Low | Audit finding |
```

## Output Format

```
## Applicable Frameworks
- [framework]: [scope/reason]

## Current Gaps
### Critical (must fix before audit)
- [gap]: [what's missing] -> [remediation]

### High (should fix)
- [gap]: [what's missing] -> [remediation]

### Medium (nice to have for audit)
- [gap]: [what's missing] -> [remediation]

## Implementation Roadmap
### Week 1-2: [focus area]
- [ ] [specific task]
### Week 3-4: [focus area]
- [ ] [specific task]

## Evidence Collection Plan
| Control | Evidence Type | Where to Find | Frequency |
|---------|--------------|---------------|-----------|

## Out of Scope (needs legal/business input)
- [item requiring non-technical decision]
```

## Rules

- Technical controls only. Do not provide legal advice or interpret regulations.
- Map controls to specific cloud services where possible (e.g., "Use AWS KMS" not "encrypt data").
- Every control needs: what to implement + how to prove it (evidence).
- Compliance is continuous, not one-time. Include monitoring and review cadences.
- If a control overlaps multiple frameworks, note that -- implement once, map to many.
