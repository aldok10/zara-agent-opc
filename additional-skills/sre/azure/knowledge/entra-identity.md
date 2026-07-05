---
type: fact
title: "Azure Entra ID (formerly Azure AD)"
---

# Azure Entra ID (formerly Azure AD)

## Core Concepts

Entra ID is the identity control plane for Azure. Every resource access decision flows through it.

### Identity Types

- **User identities** -- human accounts with MFA, conditional access
- **Service principals** -- application identities (legacy approach for automation)
- **Managed identities** -- Azure-assigned identities attached to resources (preferred)
  - System-assigned: lifecycle tied to the resource
  - User-assigned: independent lifecycle, shareable across resources

### When to Use What

| Scenario | Identity Type |
|----------|--------------|
| App accessing Key Vault | Managed Identity (system-assigned) |
| Shared identity across services | Managed Identity (user-assigned) |
| CI/CD from GitHub Actions | Workload Identity Federation |
| External SaaS integration | Service Principal + certificate |
| Human admin access | User + PIM + Conditional Access |

## RBAC (Role-Based Access Control)

### Principles

1. Least privilege always -- use built-in roles before custom
2. Assign at narrowest scope (resource > resource group > subscription)
3. Use PIM (Privileged Identity Management) for just-in-time elevation
4. Deny assignments override allow -- use sparingly

### Common Built-in Roles

- Reader: view only
- Contributor: full resource management, no IAM changes
- Owner: full control including IAM (avoid in production)
- User Access Administrator: manage role assignments only

### Custom Roles

Create only when built-in roles are too broad. Define with `actions`, `notActions`, `dataActions`, `notDataActions`. Scope to management group, subscription, or resource group.

## Conditional Access

Policies that enforce controls based on signals:

### Signal Types

- User/group membership
- Location (named locations, IP ranges)
- Device state (compliant, hybrid-joined)
- Application being accessed
- Risk level (from Identity Protection)
- Authentication context

### Common Policies

1. Require MFA for all users accessing Azure portal
2. Block legacy authentication protocols
3. Require compliant device for sensitive apps
4. Restrict access from untrusted locations
5. Step-up authentication for privileged actions

### Policy Design Rules

- Start in report-only mode, monitor impact
- Always have break-glass accounts excluded
- Layer policies -- don't try to do everything in one
- Use authentication strengths (phishing-resistant MFA)

## Workload Identity Federation

Replaces service principal secrets for external CI/CD:

- GitHub Actions: federated credential with repo/branch filter
- Kubernetes: AKS Workload Identity projects tokens to pods
- Other clouds: trust relationship via OIDC

### Setup Pattern

1. Create App Registration in Entra ID
2. Add federated credential (issuer + subject)
3. Assign RBAC roles to the service principal
4. No secrets to rotate -- token exchange at runtime

## Managed Identity Best Practices

- Prefer system-assigned for single-purpose resources
- Use user-assigned when multiple resources need same permissions
- Grant Key Vault access via RBAC (not access policies) -- RBAC is the modern model
- Token caching is automatic via IMDS endpoint
- Test locally with `DefaultAzureCredential` chain (VS Code > CLI > Managed Identity)

## Security Defaults vs Conditional Access

- Security defaults: good for small orgs, enables MFA baseline
- Conditional access: enterprise -- mutually exclusive with security defaults
- Migrate to conditional access when you need granular control

## Monitoring

- Sign-in logs: who authenticated, from where, which app
- Audit logs: directory changes, role assignments
- Identity Protection: risky users, risky sign-ins
- Export to Log Analytics for long-term retention and alerting
