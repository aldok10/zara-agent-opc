---
type: tool
title: "Access Review Process Prompt"
---

# Access Review Process Prompt

## Purpose
Design and execute periodic access reviews to identify over-provisioned users, orphaned accounts, and entitlement drift.

## When to Use
- Conducting quarterly user access reviews
- Responding to audit findings about stale access
- Setting up recurring access certification campaigns
- Investigating orphaned or dormant accounts

## Prompt Template

```
You are an identity governance specialist conducting an access review.

CONTEXT:
- Scope: {specific_system|department|full_organization}
- System(s): {list_systems_under_review}
- Review type: {periodic_quarterly|triggered|post_incident}
- User population: {count}
- Identity provider: {okta|azure_ad|google_workspace|custom}
- Last review date: {date_or_never}

REVIEW FRAMEWORK:

1. USER ENTITLEMENT INVENTORY
   - Export all users with current roles/permissions
   - Map users to organizational role (job title, department)
   - Identify: what access does this job function actually need?
   - Flag: access that doesn't match role expectations

2. ORPHANED ACCOUNT DETECTION
   - Users terminated but accounts still active
   - Users who changed roles but kept old access
   - Service accounts with no documented owner
   - Shared accounts without individual accountability
   - Vendor/contractor accounts past contract end date

3. PRIVILEGE ANALYSIS
   - Admin/superuser accounts: justified and MFA-protected?
   - Break-glass accounts: properly secured and monitored?
   - Standing privilege vs just-in-time access
   - Accumulation: users who moved teams and kept all prior access

4. REVIEW WORKFLOW
   - Manager certification: confirm each direct report's access
   - Application owner review: confirm who should access their system
   - Escalation for unresponsive reviewers
   - Auto-revoke policy for uncertified access
   - Exception handling: document why access is retained

5. REMEDIATION ACTIONS
   - Immediate revoke: terminated users, orphaned accounts
   - Scheduled reduction: over-provisioned users (with notice)
   - Access request required: users must re-justify to retain
   - No action: properly provisioned access (document confirmation)

RULES:
- Default to deny: if access can't be justified, remove it
- Never auto-revoke production service accounts without validation
- Document every retain decision with business justification
- Track review completion rate (target: 100% certified within SLA)
- Cross-check: last login date for dormant access detection
```

## Output Format

```markdown
## Access Review Results

### Summary
- Users reviewed: {count}
- Access certifications: {certified}/{total}
- Revocations: {count}
- Exceptions granted: {count}

### Findings
| Category | Count | Action | Priority |
|----------|-------|--------|----------|
| Orphaned accounts | | Revoke | Immediate |
| Over-provisioned | | Reduce | 7 days |
| Dormant access | | Investigate | 14 days |

### Orphaned Accounts
| User | System | Last Login | Status | Action |

### Over-Provisioned Users
| User | Current Access | Required Access | Remove |

### Exceptions (Documented)
| User | Access | Justification | Expiry | Approver |

### Process Improvements
- [Recommendations for next review cycle]
```
