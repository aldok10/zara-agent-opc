---
type: subskill
title: "RBAC Design"
---

# RBAC Design

## Core Concepts
- Role-Based Access Control assigns permissions to roles, then roles to users
- Principle of least privilege: grant minimum permissions required for a function
- Role hierarchy allows inheritance (admin > editor > viewer) reducing duplication
- Separation of duties: critical operations require multiple distinct roles
- Permission granularity spectrum: coarse (module-level) vs fine (resource-level)

## Key Practices
- Define roles from business functions, not technical capabilities
- Use permission-based checks in code (`can:edit_post`), not role-based (`is:admin`)
- Implement role constraints: mutual exclusion, cardinality limits, prerequisite roles
- Audit role assignments periodically; automate detection of unused/overprivileged roles
- Support dynamic scoping (org-level, team-level, resource-level permissions)

## Common Mistakes
- Creating one-off roles per user, turning RBAC into de facto discretionary access control
- Hard-coding role names in business logic instead of checking capabilities
- Ignoring temporal constraints (roles that should expire after project completion)

## When to Apply
- Designing authorization models for multi-tenant applications
- Migrating from ad-hoc permission checks to structured access control
- Reviewing existing systems for privilege escalation paths
