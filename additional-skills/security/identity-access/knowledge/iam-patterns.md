---
type: fact
title: "IAM Design Patterns"
---

# IAM Design Patterns

## Authorization Models

### RBAC (Role-Based Access Control)
- Users assigned to roles, roles granted permissions
- Simple mental model, works well for small-medium systems
- Limitations: role explosion as system grows, coarse-grained
- Example: admin, editor, viewer roles per service
- Anti-pattern: creating per-user roles (defeats the purpose)

### ABAC (Attribute-Based Access Control)
- Decisions based on attributes of subject, resource, action, environment
- Fine-grained without role explosion
- Attributes: department, clearance level, resource sensitivity, time of day
- More flexible than RBAC but harder to audit and reason about
- Works well when: permissions depend on context, not just identity
- Example: "engineers in team-X can read resources tagged team-X during business hours"

### ReBAC (Relationship-Based Access Control)
- Authorization derived from relationships between entities
- "Can user X perform action Y on resource Z?" answered by graph traversal
- Natural fit for: document sharing, org hierarchies, social features
- Models ownership, membership, parent-child naturally
- Example: "user can edit doc if they are owner OR member of a group that has editor relation"

### Choosing a Model

| Factor | RBAC | ABAC | ReBAC |
|--------|------|------|-------|
| Simplicity | High | Medium | Medium |
| Granularity | Coarse | Fine | Fine |
| Scalability | Role explosion | Attribute sprawl | Graph complexity |
| Audit clarity | Easy | Hard | Medium |
| Best for | Internal tools | Policy-heavy domains | Collaborative apps |

## Zanzibar / SpiceDB

### Google Zanzibar
- Google's global authorization system (published 2019)
- Stores relationships as tuples: (object#relation@subject)
- Check API: "does this relationship exist?" via graph traversal
- Zookie/ZedToken: ensures consistency (no new enemy problem)
- Handles billions of relations with millisecond latency

### SpiceDB (Open Source Implementation)
- OSS implementation of Zanzibar model by AuthZed
- Schema language defines object types and relations
- gRPC + HTTP APIs for Check, Expand, Lookup, Write
- Supports: intersection, exclusion, computed relations

```
definition document {
    relation owner: user
    relation editor: user | team#member
    relation viewer: user | team#member

    permission edit = owner + editor
    permission view = edit + viewer
}

definition team {
    relation member: user
}
```

### Other Zanzibar Implementations
- OpenFGA (Auth0/Okta): simplified Zanzibar, DSL-based schema
- Ory Keto: part of Ory ecosystem, Zanzibar-inspired
- Warrant: managed ReBAC service

## Policy Engines

### OPA (Open Policy Agent)
- General-purpose policy engine with Rego language
- Decoupled: write policy once, enforce anywhere
- Use as sidecar, library, or centralized service
- Good for: API authorization, Kubernetes admission, data filtering

### Cedar (AWS)
- Policy language by AWS (used in Verified Permissions)
- Strongly typed, analyzable, designed for authorization
- Permit/forbid rules with conditions
- Built-in policy analysis: "can user X ever access resource Y?"

### Casbin
- Library-based policy engine (Go, Java, Node, Python, Rust)
- Supports RBAC, ABAC, ACL models via configuration
- Model + Policy separation: change policy without code changes
- Lightweight, embeddable, good for microservice authorization

## Just-In-Time (JIT) Access

### Concept
- Grant elevated access only when needed, automatically revoke after
- Reduces standing privilege attack surface
- Requires: request workflow, approval, time-bound grant, audit trail

### Implementation Pattern
1. User requests elevated access with justification
2. Approval (automated policy or manual reviewer)
3. Time-bound credential/role granted (15min - 8hr typical)
4. Access automatically revoked at expiry
5. All actions during window logged for audit

### Tools
- AWS: IAM Identity Center with permission sets + session duration
- Azure: Privileged Identity Management (PIM)
- GCP: Privileged Access Manager
- Cross-platform: ConductorOne, Opal, Abbey Labs

## Design Principles

### Least Privilege
- Start with zero access, add what's needed
- Regular access reviews: remove unused permissions
- Separate read vs write vs admin explicitly
- Prefer short-lived credentials over long-lived

### Separation of Duties
- No single person can complete high-risk actions alone
- Implement via: multi-party approval, break-glass procedures
- Example: deploy to production requires different person than code author

### Defense in Depth
- Layer authorization: API gateway + service + database
- Don't rely solely on frontend hiding UI elements
- Backend must enforce, frontend only guides UX

### Centralized Policy, Distributed Enforcement
- Single source of truth for authorization rules
- Enforce at each service boundary
- Cache decisions with appropriate TTL
- Invalidation strategy for permission changes
