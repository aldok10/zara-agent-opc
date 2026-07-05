---
type: fact
title: "Policy Engines Comparison"
---

# Policy Engines Comparison

## Overview

| Engine | Model | Language | Deployment | License |
|--------|-------|----------|------------|---------|
| OPA | General policy | Rego | Sidecar, daemon, library | Apache 2.0 |
| Cedar | AuthZ-specific | Cedar | Library (Rust/Java), AVP | Apache 2.0 |
| SpiceDB | ReBAC (Zanzibar) | Schema + API | Standalone service | Apache 2.0 |

## OPA (Open Policy Agent)

### Strengths
- General-purpose: works for authZ, admission control, network, data filtering
- Kubernetes-native (Gatekeeper)
- Partial evaluation for query push-down
- Large community, extensive tooling

### Weaknesses
- Rego learning curve (Datalog-style, not imperative)
- No built-in relationship/graph model
- Performance: large policy bundles can be slow to load
- Testing requires dedicated framework (OPA test)

### Rego Pattern
```rego
package authz

default allow := false

allow if {
    input.method == "GET"
    input.path == ["api", "public"]
}

allow if {
    input.user.roles[_] == "admin"
}

allow if {
    input.method == "GET"
    input.path = ["api", "users", user_id]
    input.user.sub == user_id
}
```

### Deployment
- Sidecar: per-service OPA instance, policy bundles synced from registry
- Library: embed OPA in Go services (no network hop)
- Centralized: OPA as shared service (not recommended for latency-sensitive paths)
- Decision logs: shipped to central collector for audit

## Cedar

### Strengths
- Purpose-built for authorization (not overloaded)
- Formally verified evaluation engine (soundness guarantees)
- Human-readable policies, easy to audit
- Fast: compiled policy evaluation in microseconds
- Request-level analysis: "what can this user access?"

### Weaknesses
- Newer ecosystem (fewer integrations)
- Tightly coupled to entity model (requires data modeling upfront)
- AWS-oriented (Amazon Verified Permissions as managed option)
- Limited community tooling compared to OPA

### Cedar Pattern
```cedar
// Allow editors to update articles in their department
permit(
  principal in Role::"editor",
  action == Action::"update",
  resource in ResourceType::"Article"
) when {
  resource.department == principal.department
};

// Deny access outside business hours
forbid(
  principal,
  action,
  resource
) when {
  context.time.hour < 6 || context.time.hour > 22
};
```

### Deployment
- Library: embed in application (Rust, Java, WASM)
- Amazon Verified Permissions: managed service with API
- Policy store: version-controlled, deployed via CI/CD
- Validation: static analysis catches type errors before deployment

## SpiceDB (Zanzibar-inspired)

### Strengths
- Native graph model: relationships are first-class
- Handles complex sharing, nesting, inheritance (Google Docs-style)
- Global consistency model (Zookies for cache safety)
- Check, Expand, Lookup APIs
- Schema validation and testing built-in

### Weaknesses
- Operational complexity (runs as service, needs datastore)
- Requires writing relationships on every data mutation
- Eventual consistency in distributed mode
- Overkill for simple RBAC

### SpiceDB Schema
```zed
definition user {}

definition group {
    relation member: user | group#member
}

definition folder {
    relation owner: user
    relation viewer: user | group#member
    permission view = owner + viewer
    permission edit = owner
}

definition document {
    relation parent: folder
    relation writer: user
    relation reader: user | group#member
    permission write = writer + parent->edit
    permission read = reader + write + parent->view
}
```

### Deployment
- Standalone gRPC/HTTP service
- Datastores: PostgreSQL, CockroachDB, Spanner, in-memory (dev)
- Client SDKs: Go, Java, Node.js, Python, Ruby
- Schema migrations via `zed` CLI

## When to Use Each

| Scenario | Recommended | Why |
|----------|-------------|-----|
| Kubernetes admission control | OPA (Gatekeeper) | Native integration, community policies |
| Simple API RBAC/ABAC | Cedar | Fast, verifiable, purpose-built |
| Document/resource sharing (Google Docs-like) | SpiceDB | Relationship model fits perfectly |
| Multi-policy (network + auth + data) | OPA | General-purpose handles all domains |
| AWS-native application | Cedar (AVP) | Managed, integrates with Cognito |
| Multi-tenant SaaS with complex permissions | SpiceDB | Org→team→user hierarchy natural in ReBAC |
| Startup, simple needs, quick start | Cedar (library) | Lowest operational overhead |
| Enterprise, audit-heavy, regulated | OPA + SpiceDB | OPA for policies, SpiceDB for relationships |

## Performance Characteristics

| Engine | Check Latency | Scale Factor | Cold Start |
|--------|---------------|--------------|------------|
| OPA (sidecar) | <1ms (hot) | Policy bundle size | Bundle load time |
| Cedar (library) | <0.1ms | Entity store size | Minimal |
| SpiceDB | 1-10ms | Graph depth, cache hit ratio | Service startup |
