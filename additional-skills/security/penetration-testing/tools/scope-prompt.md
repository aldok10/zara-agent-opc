---
type: tool
title: "Pentest Scope Definition Prompt"
---

# Pentest Scope Definition Prompt

## Purpose
Define clear penetration testing scope including targets, exclusions, rules of engagement, and communication protocols.

## When to Use
- Preparing for an internal or external penetration test engagement
- Writing a statement of work for a pentest vendor
- Defining boundaries for a bug bounty program
- Planning red team exercise parameters

## Prompt Template

```
You are a pentest program manager defining engagement scope.

CONTEXT:
- Engagement type: {external_network|internal_network|web_app|mobile_app|api|cloud|physical|social_engineering}
- Conducted by: {internal_team|external_vendor|bug_bounty}
- Duration: {start_date to end_date}
- Business criticality: {production_facing|internal_only|staging}
- Compliance driver: {PCI_requirement|SOC2|regulatory|proactive}

DEFINE THE SCOPE:

1. IN-SCOPE TARGETS
   - IP ranges / CIDR blocks
   - Domains and subdomains
   - Application URLs and API endpoints
   - Cloud accounts/projects
   - Physical locations (if applicable)
   - User roles to test (authenticated, admin, guest)

2. OUT-OF-SCOPE (EXCLUSIONS)
   - Third-party services and shared infrastructure
   - Production databases with real customer data
   - Systems owned by other business units
   - Specific attack types excluded (DoS, social engineering of non-consenting staff)
   - Time restrictions (no testing during peak hours)

3. RULES OF ENGAGEMENT
   - Testing hours: {24x7|business_hours_only|specific_window}
   - Exploitation depth: {identify_only|prove_exploit|full_compromise}
   - Data handling: no exfiltration of real PII, use proof tokens
   - Credential handling: test accounts provided vs credential stuffing allowed
   - Notification triggers: when to alert blue team immediately
   - Physical rules: social engineering limits, tailgating policy

4. COMMUNICATION
   - Primary contact (both sides)
   - Emergency contact (critical finding or system down)
   - Status reporting cadence (daily/weekly)
   - Finding severity that triggers immediate notification
   - Communication channel (encrypted email, secure portal)

5. DELIVERABLES
   - Report format and sections expected
   - Retest included? (after remediation)
   - Raw evidence requirements (screenshots, PoC code, traffic captures)
   - Presentation/debrief session

6. LEGAL AND AUTHORIZATION
   - Written authorization document (get-out-of-jail letter)
   - Who signs: system owner + security team + legal
   - Third-party notification if testing traverses boundaries
   - Data handling and destruction after engagement

RULES:
- Ambiguous scope = tester stops and asks (not assumes)
- Production testing requires explicit approval and monitoring
- Critical findings (RCE, active breach) = immediate notification regardless of schedule
- Tester must verify they're hitting in-scope targets before exploitation
```

## Output Format

```markdown
## Penetration Test Scope Document

### Engagement Overview
- Type: | Duration: | Team:

### In-Scope
| Target | Type | Notes |
|--------|------|-------|

### Exclusions
| Item | Reason |
|------|--------|

### Rules of Engagement
- Testing window:
- Exploitation depth:
- Immediate notification criteria:

### Communication Plan
| Role | Contact | Channel |

### Deliverables
- [ ] Executive summary
- [ ] Technical findings with PoC
- [ ] Retest verification
- [ ] Debrief presentation

### Authorization
- Signed by: | Date: | Valid until:
```
