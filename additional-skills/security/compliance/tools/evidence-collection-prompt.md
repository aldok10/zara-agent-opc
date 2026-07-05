---
type: tool
title: "Compliance Evidence Collection Prompt"
---

# Compliance Evidence Collection Prompt

## Purpose
Plan and organize evidence collection for compliance audits (SOC2, ISO 27001, HIPAA, PCI-DSS) with artifact mapping and gap identification.

## When to Use
- Preparing for an upcoming SOC2 Type II audit
- Gathering evidence for a specific control domain
- Identifying gaps in compliance documentation
- Building repeatable evidence collection automation

## Prompt Template

```
You are a compliance specialist preparing audit evidence packages.

CONTEXT:
- Framework: {SOC2_Type_II|ISO_27001|HIPAA|PCI_DSS|multiple}
- Audit period: {start_date to end_date}
- Auditor: {firm_name_if_known}
- Previous findings: {list_prior_audit_gaps}
- GRC tool: {vanta|drata|secureframe|manual}

FOR EACH CONTROL DOMAIN:

1. CONTROL MAPPING
   - Control ID and description
   - Related policies (link to document)
   - Implementation owner
   - Evidence type needed: {screenshot|config_export|log|report|attestation}

2. EVIDENCE ARTIFACTS
   - Artifact name and description
   - Source system (where to pull it from)
   - Collection method (manual|automated|API)
   - Frequency (point-in-time vs continuous)
   - Retention requirement

3. COLLECTION WORKFLOW
   - Who collects (role)
   - When to collect (timeline before audit)
   - Quality check: does evidence actually prove the control works?
   - Reviewer sign-off before submission

4. GAP ANALYSIS
   - Controls with no evidence available
   - Controls with stale evidence (older than audit period)
   - Controls relying on attestation only (no technical proof)
   - Controls with evidence that doesn't match implementation

5. AUTOMATION OPPORTUNITIES
   - Evidence that can be auto-collected via API
   - Continuous monitoring replacing point-in-time snapshots
   - Dashboard screenshots automated on schedule
   - Config drift alerting as real-time evidence

COMMON SOC2 EVIDENCE:
- Access reviews (quarterly user list + removed users)
- Change management (PR approvals, deployment logs)
- Monitoring alerts (incident tickets from alerts)
- Encryption (config showing encryption-at-rest/transit)
- Backup/recovery (backup logs + test restore records)
- Vulnerability management (scan reports + remediation tickets)

RULES:
- Evidence must be from within the audit period
- Screenshots need dates visible or metadata preserved
- Redact sensitive data (PII, secrets) before submission
- Cross-reference: one artifact can satisfy multiple controls
- Flag evidence that "technically exists but won't satisfy auditor"
```

## Output Format

```markdown
## Evidence Collection Plan

### Control Coverage
| Control ID | Description | Evidence | Source | Owner | Status |
|-----------|-------------|----------|--------|-------|--------|

### Collection Timeline
| Week | Activities | Owner |

### Gaps Identified
| Control | Gap | Remediation | Effort |

### Automation Candidates
| Evidence | Current Method | Proposed Automation | Tool |

### Auditor-Ready Checklist
- [ ] All evidence within audit period
- [ ] Access review documentation complete
- [ ] Change management trail unbroken
- [ ] Incident response evidence compiled
- [ ] Risk assessment current
```
