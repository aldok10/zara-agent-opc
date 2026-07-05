---
type: fact
title: "IAM Patterns"
---

# IAM Patterns

## Least Privilege Principles

- Start with zero permissions, add only what's needed
- Use Access Analyzer to identify unused permissions and refine policies
- Prefer managed policies for common patterns, custom policies for specific needs
- Never use `*` in Resource unless absolutely required (and document why)
- Separate read and write permissions into distinct policies
- Use conditions to restrict by source IP, VPC endpoint, time, or MFA

## Permission Boundaries

- Apply to all human-created roles to cap maximum permissions
- Boundary = ceiling, not floor. Role still needs explicit grants
- Pattern: `arn:aws:iam::ACCOUNT:policy/boundary-{team}-{env}`
- Combine with SCPs for defense in depth
- Use for delegation: let teams create roles within boundaries

## OIDC Federation

- Eliminate long-lived credentials for CI/CD (GitHub Actions, GitLab CI)
- Trust policy validates `sub` claim to restrict to specific repos/branches
- Always pin to specific repository and branch/environment in conditions
- Use `StringLike` for wildcard matching on `sub` claim
- Rotate nothing -- tokens are short-lived by design
- Validate `aud` claim matches your expected audience

## Service Control Policies (SCPs)

- Deny-first pattern: explicitly deny dangerous actions org-wide
- Common denies: root user actions, leaving org, disabling CloudTrail/GuardDuty
- Region restriction: deny all actions outside approved regions
- Prevent privilege escalation: deny `iam:CreateUser` with console access
- Exempt break-glass roles via condition keys
- Test in OU sandbox before applying to production OU
- SCPs don't grant -- they only restrict. Still need identity policies

## Access Analyzer

- Enable in every account and region
- External access findings: resources shared outside your org
- Unused access findings: permissions granted but never used (90-day window)
- Policy generation: create least-privilege policy from CloudTrail activity
- Custom policy checks: validate policies against your security standards before deploy
- Integrate into CI/CD: `aws accessanalyzer validate-policy` in pipeline

## Cross-Account Access

- Use resource-based policies where possible (S3, KMS, SNS, SQS)
- For IAM role assumption: require ExternalId for third parties
- Use AWS Organizations `aws:PrincipalOrgID` condition to trust entire org
- Centralized logging account pattern: push from all, pull from none
- Transit/hub account for shared services with role chaining

## Session Policies

- Further restrict assumed role permissions for specific operations
- Use with STS `AssumeRole` for temporary, scoped-down access
- Pattern: CI/CD assumes broad role, each step passes session policy for least privilege
- Maximum effective permissions = role policy AND session policy

## Machine Identity

- EC2: instance profiles with IMDSv2 enforced (`HttpTokens: required`)
- ECS: task roles (not instance roles) for container workloads
- Lambda: execution role per function, not shared
- EKS: Pod Identity (preferred) or IRSA for per-pod credentials
- Never embed credentials in code, env vars, or container images

## Monitoring and Alerting

- CloudTrail: log all IAM/STS events, alert on policy changes
- Alert on: `CreateAccessKey`, `AttachRolePolicy`, `CreateRole` outside CI/CD
- Config rules: `iam-root-access-key-check`, `iam-policy-no-statements-with-admin-access`
- GuardDuty: detect credential exfiltration and unusual API calls
- Regular access reviews: quarterly for humans, monthly for service accounts

## Anti-Patterns

- Inline policies -- use managed policies for reusability and limits visibility
- `AdministratorAccess` on anything except break-glass
- Sharing IAM users across humans or systems
- Not using MFA for console access and sensitive API calls
- Wildcard principals in trust policies
- Long-lived access keys without rotation policy
