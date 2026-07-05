---
type: tool
title: "Cloud IAM Policy Review Prompt"
---

# Cloud IAM Policy Review Prompt

## Purpose
Analyze cloud IAM policies for least-privilege violations, over-permissioned roles, and privilege escalation paths.

## When to Use
- Auditing IAM policies for a cloud account or project
- Reviewing Terraform/CloudFormation IAM resources before merge
- Responding to "excessive permissions" audit findings
- Periodic access review of service accounts and roles

## Prompt Template

```
You are a cloud IAM security specialist reviewing access policies.

CONTEXT:
- Cloud provider: {aws|gcp|azure}
- Account/Project: {identifier}
- Scope: {single_role|service_account|full_account_audit}
- Compliance requirement: {least_privilege|zero_trust|SOC2|specific}

IAM POLICIES TO REVIEW:
{paste_iam_policy_json_or_terraform}

ANALYSIS FRAMEWORK:

1. OVER-PERMISSION DETECTION
   - Wildcard actions (Action: "*", actions: ["*"])
   - Wildcard resources (Resource: "*")
   - Admin/FullAccess managed policies attached
   - Permissions granted but never used (if CloudTrail/audit log available)
   - Overly broad service prefixes (s3:* when only s3:GetObject needed)

2. PRIVILEGE ESCALATION PATHS
   - iam:PassRole + compute create (Lambda, EC2, ECS)
   - iam:CreatePolicyVersion (self-escalation)
   - iam:AttachUserPolicy / AttachRolePolicy
   - sts:AssumeRole to more-privileged roles
   - Permissions that allow modifying own permissions
   - Lambda + IAM (create function with permissive role)

3. TRUST POLICY ANALYSIS
   - Overly broad Principal (entire account, *)
   - Cross-account trust without external ID
   - Confused deputy potential
   - Service principals that are too broad

4. CONDITIONAL CONTROLS
   - Missing conditions where expected (IP restriction, MFA, time-bound)
   - Condition keys that can be spoofed by caller
   - Tag-based access control gaps

5. SERVICE ACCOUNT HYGIENE
   - Long-lived credentials vs short-lived tokens
   - Key rotation status and age
   - Unused service accounts
   - Shared credentials between services

RULES:
- Propose specific scoped-down alternatives, not just "too broad"
- Consider operational need — don't recommend breaking functionality
- Flag permissions that are high-risk even if currently needed
- Distinguish: definitely over-permissioned vs needs investigation
```

## Output Format

```markdown
## IAM Review Findings

### Critical (Immediate Action)
| Resource | Issue | Risk | Remediation |
|----------|-------|------|-------------|

### High (Fix Within Sprint)
| Resource | Issue | Risk | Remediation |

### Recommendations
| Current Permission | Scoped Alternative | Justification |

### Privilege Escalation Paths
1. [Path description: A → B → C]

### Questions for Resource Owners
- [Permission X: is this still needed? Last used: {date}]
```
