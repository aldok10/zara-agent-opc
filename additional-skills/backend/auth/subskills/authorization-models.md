---
type: subskill
title: "Authorization Models"
---

# Authorization Models

## Context

Authorization determines what an authenticated identity can do. Models range from simple RBAC to graph-based ReBAC. Externalize decisions from business logic into policy engines for auditability and maintainability.

## Rules

1. RBAC for coarse-grained access (admin, editor, viewer); ABAC for fine-grained (resource owner, time-based, geo-restricted)
2. Combine models: RBAC gates entry, ABAC/ReBAC refines within  -  never choose one as universal solution
3. Policy-as-code: store authorization rules in version-controlled, testable policy files (Rego, Cedar, DSL)
4. Evaluate policies at enforcement point closest to data  -  API gateway for route-level, service for resource-level, database for row-level
5. Deny by default: every request unauthorized unless explicitly permitted by policy
6. Permission boundaries: maximum permission set per role, even if individual policies grant more (like AWS SCPs)
7. Avoid negation in policies where possible  -  explicit allow lists over deny-except patterns
8. Pre-compute expensive authorization decisions where latency matters (cache grants, materialize views)
9. Separation of duties: define incompatible roles that cannot coexist on same identity
10. Audit every authorization decision: who, what resource, what action, policy evaluated, result, timestamp

## Models Comparison

| Model | Best For | Drawback |
|-------|----------|----------|
| RBAC | Static org structures, simple apps | Role explosion, no context awareness |
| ABAC | Dynamic, attribute-rich decisions | Complex policy authoring, testing burden |
| ReBAC | Social/collaboration (docs, repos) | Graph complexity, eventual consistency |
| ACL | Simple file/resource ownership | Doesn't scale, no inheritance |
| PBAC | Regulated industries, audit-heavy | Engine dependency, latency |

## Policy Engines

### OPA (Open Policy Agent)
- Language: Rego (declarative, Datalog-inspired)
- Deployment: sidecar, library, or centralized service
- Strength: general-purpose, Kubernetes-native, wide ecosystem
- Weakness: Rego learning curve, no built-in relationship support

### Cedar (AWS)
- Language: Cedar (purpose-built for authorization)
- Deployment: library (Rust/Java), or via Amazon Verified Permissions
- Strength: formal verification, human-readable, fast evaluation
- Weakness: newer ecosystem, fewer integrations outside AWS

### SpiceDB (Zanzibar-inspired)
- Model: relationship-based (ReBAC), Google Zanzibar design
- Deployment: standalone service, gRPC API
- Strength: graph-native, handles complex sharing/nesting, global consistency
- Weakness: operational complexity, requires relationship writes on every mutation

## Patterns

### RBAC with Hierarchy
```
roles:
  admin: [manage_users, manage_billing, view_reports, edit_content]
  editor: [edit_content, view_reports]
  viewer: [view_reports]
  
hierarchy:
  admin > editor > viewer  # inherits lower role permissions
```

### ABAC Policy (Cedar-style)
```
permit(
  principal in Group::"engineering",
  action == Action::"deploy",
  resource in Environment::"staging"
) when {
  context.time.hour >= 9 && context.time.hour <= 17 &&
  context.approvals >= 1
};
```

### ReBAC (SpiceDB schema)
```
definition user {}
definition organization {
  relation admin: user
  relation member: user
  permission manage = admin
  permission view = admin + member
}
definition document {
  relation org: organization
  relation owner: user
  permission edit = owner + org->admin
  permission view = edit + org->member
}
```

## Anti-Patterns

- Roles as feature flags (use feature flags for features, roles for access)
- God roles with ALL permissions (create bounded admin roles per domain)
- Checking permissions in UI only without server enforcement
- Hardcoded role checks in every handler (`if user.role == "admin"`)
- Role assignment without expiry or review cadence
- Implicit permissions through data access (can read DB = authorized)

## Verification

- Deny-by-default: unauthenticated request returns 401, authenticated without permission returns 403
- Role hierarchy: lower role cannot access higher role's resources
- ABAC conditions enforced: expired time window = denied
- Policy change deploys without downtime (hot reload or gradual rollout)
- Audit log captures policy version that made each decision
- Cross-tenant access impossible regardless of role
