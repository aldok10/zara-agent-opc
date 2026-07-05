---
type: tool
title: "Security Incident Playbook Prompt"
---

# Security Incident Playbook Prompt

## Purpose
Create structured security incident response playbooks covering detection, containment, eradication, recovery, and lessons learned.

## When to Use
- Building incident response playbooks for specific attack types
- Training SOC/SRE teams on response procedures
- After an incident to formalize what was learned
- Compliance requirement for documented IR procedures

## Prompt Template

```
You are a security operations lead writing an incident response playbook.

CONTEXT:
- Incident type: {ransomware|data_breach|account_compromise|ddos|insider_threat|supply_chain|phishing}
- Environment: {cloud_provider|on_prem|hybrid}
- Team structure: {soc|sre_on_call|combined|outsourced_mdr}
- SIEM/SOAR: {splunk|sentinel|chronicle|panther|custom}
- Communication tool: {pagerduty|opsgenie|slack|teams}
- Escalation path: {describe_chain_of_command}

PLAYBOOK STRUCTURE:

1. DETECTION
   - Alert sources that trigger this playbook
   - Indicators: what patterns suggest this incident type
   - Triage criteria: is this a true positive?
   - Severity classification (P1-P4)
   - Auto-enrichment queries to run immediately

2. INITIAL RESPONSE (first 15 minutes)
   - Declare incident, assign incident commander
   - Open communication channel (war room)
   - Preserve volatile evidence before it's lost
   - Notify stakeholders per severity level
   - Document: start time, reporter, initial observations

3. CONTAINMENT (stop the bleeding)
   - Short-term: isolate affected systems
   - Network segmentation actions
   - Account suspension / credential rotation
   - Block IOCs (IPs, domains, hashes)
   - Verify containment worked (attacker no longer active)
   - Document: what was contained, method, time

4. ERADICATION (remove the threat)
   - Identify root cause and all affected systems
   - Remove malware, backdoors, unauthorized accounts
   - Patch exploited vulnerabilities
   - Verify: no remaining persistence mechanisms
   - Document: what was removed, from where

5. RECOVERY (return to normal)
   - Restore from known-good backups (verify integrity)
   - Rebuild compromised systems (don't just patch)
   - Gradual service restoration (monitor closely)
   - Validate: service health, data integrity
   - Remove temporary containment measures
   - Document: recovery steps, verification results

6. POST-INCIDENT
   - Timeline reconstruction (within 48h)
   - Blameless retrospective (within 1 week)
   - Improvement actions with owners and deadlines
   - Detection gap analysis: why wasn't this caught sooner?
   - Update playbook with lessons learned
   - Compliance notifications if required (72h GDPR, etc)

COMMUNICATION TEMPLATES:
- Internal status update
- Executive briefing
- Customer notification (if required)
- Regulatory notification (if required)

RULES:
- Every step must have a specific owner (role, not person)
- Include "if unsure" guidance (when to escalate vs proceed)
- Time-bound: SLA for each phase based on severity
- Evidence preservation takes priority over rapid containment
- Document everything: assume it will be read by lawyers/regulators
- Never pay ransom without executive and legal approval
```

## Output Format

```markdown
## Incident Playbook: {Incident Type}

### Detection Triggers
| Source | Alert/Pattern | Severity | Auto-Actions |

### Response Timeline
| Phase | SLA (P1) | SLA (P2) | Owner |
|-------|----------|----------|-------|
| Triage | 15 min | 1 hr | On-call |
| Contain | 1 hr | 4 hr | IR Lead |
| Eradicate | 4 hr | 24 hr | IR Team |
| Recover | 8 hr | 48 hr | SRE + IR |

### Step-by-Step Actions
#### Phase 1: Detection & Triage
- [ ] [Action with specific command/tool]

### Escalation Matrix
| Condition | Escalate To | Method |

### Communication Templates
[Pre-written messages for each stakeholder group]

### Runbook Commands
[Specific CLI/console commands for common actions]
```
