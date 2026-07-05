# SOC 2 Controls

Trust Service Criteria mapping, control implementation, and evidence collection for SOC 2 Type II audits.

## Trust Service Criteria (TSC) Overview

SOC 2 evaluates controls across five categories (Common Criteria apply to all):

| Category | Code | Focus |
|----------|------|-------|
| Security | CC | Protection against unauthorized access |
| Availability | A | System uptime and performance |
| Processing Integrity | PI | Accurate, complete, timely processing |
| Confidentiality | C | Protection of confidential information |
| Privacy | P | Collection, use, retention of personal information |

Most organizations start with Security (required) + Availability.

## Common Criteria (CC) -- Security Controls

### CC1: Control Environment
- **CC1.1**: Board/management oversight of security
- **CC1.2**: Organizational structure with defined authority
- **CC1.3**: Personnel competence (training, certifications)
- **CC1.4**: Accountability for security responsibilities

**Evidence**: Org chart, security team charter, role descriptions, training records.

### CC2: Communication and Information
- **CC2.1**: Internal security communication (policies published, accessible)
- **CC2.2**: External communication (security page, incident notification)
- **CC2.3**: Communication of control objectives and responsibilities

**Evidence**: Security policy docs, employee handbook, customer security portal.

### CC3: Risk Assessment
- **CC3.1**: Risk assessment process defined
- **CC3.2**: Risks identified and analyzed (threat modeling)
- **CC3.3**: Fraud risk considered
- **CC3.4**: Changes that could impact controls identified

**Evidence**: Risk register, threat models, quarterly risk reviews, change log.

### CC4: Monitoring Activities
- **CC4.1**: Ongoing monitoring of controls effectiveness
- **CC4.2**: Deficiencies communicated and remediated

**Evidence**: Monitoring dashboards, alert runbooks, deficiency tracking, monthly control reviews.

### CC5: Control Activities
- **CC5.1**: Controls selected and developed to mitigate risk
- **CC5.2**: Technology general controls (ITGC)
- **CC5.3**: Controls deployed through policies and procedures

**Evidence**: Control matrix, procedure documents, automated controls list.

### CC6: Logical and Physical Access
- **CC6.1**: Logical access provisioned via identity management
- **CC6.2**: Access authenticated before granting (MFA, SSO)
- **CC6.3**: Access authorized per role (RBAC/ABAC)
- **CC6.4**: Physical access restricted to authorized personnel
- **CC6.5**: Access removed upon termination (deprovisioning)
- **CC6.6**: Restrictions on system components (network segmentation)
- **CC6.7**: Data classification and protection
- **CC6.8**: Malicious software prevented, detected, removed

**Evidence**: IAM screenshots, access reviews, onboarding/offboarding tickets, network diagrams, EDR deployment.

### CC7: System Operations
- **CC7.1**: Infrastructure monitored for anomalies
- **CC7.2**: Security events detected and escalated
- **CC7.3**: Incident response process executed
- **CC7.4**: Incidents resolved and lessons learned applied
- **CC7.5**: Recovery from incidents (disaster recovery)

**Evidence**: SIEM alerts, incident tickets, post-mortems, DR test results.

### CC8: Change Management
- **CC8.1**: Changes authorized, tested, approved before production

**Evidence**: PR approvals, CI/CD pipeline logs, deployment records, change advisory board minutes.

### CC9: Risk Mitigation
- **CC9.1**: Risk mitigation activities performed
- **CC9.2**: Vendor risk management

**Evidence**: Vendor assessments, risk treatment plans, third-party SOC reports.

## Evidence Collection Automation

### Continuous Evidence Sources

| Control Area | Automated Source | Tool |
|-------------|-----------------|------|
| Access control | IAM policy snapshots | AWS Config, terraform state |
| Change management | PR/deploy logs | GitHub API, CI/CD audit trail |
| Encryption | KMS key inventory | Cloud APIs, Prowler |
| Monitoring | Alert configuration | PagerDuty API, SIEM export |
| Vulnerability mgmt | Scan results | Snyk, Trivy exports |
| Training | Completion records | LMS API exports |
| Incident response | Ticket history | Jira/Linear export |

### Evidence Collection Cadence

- **Real-time**: Access logs, change records, alert firing
- **Daily**: Vulnerability scan results, compliance dashboard
- **Weekly**: Access review reports, metric summaries
- **Monthly**: Control effectiveness review, exception report
- **Quarterly**: Risk assessment update, vendor review
- **Annually**: Policy review, penetration test, full audit prep

## Audit Preparation Timeline

| Weeks Before | Action |
|-------------|--------|
| 12 | Gap assessment against TSC criteria |
| 10 | Remediate gaps, document new controls |
| 8 | Pre-audit evidence review with internal team |
| 6 | Finalize policies and procedures |
| 4 | Mock audit (readiness assessment) |
| 2 | Evidence package prepared, stakeholders briefed |
| 0 | Audit fieldwork begins |

## 2026 Context

- GRC platforms (Vanta, Drata, Secureframe) automate 70%+ evidence collection
- AI usage policies now expected by auditors (acceptable use, data handling, model governance)
- Continuous compliance replaces point-in-time snapshots -- auditors check automation reliability
- Supply chain controls (SBOM, artifact signing) increasingly in scope
- Cloud-native organizations use IaC drift detection as change management evidence
