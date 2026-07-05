---
type: example
title: "OPA/Rego Policy for API Authorization"
---

# OPA/Rego Policy for API Authorization

## Context
When you need fine-grained, decoupled authorization logic that can be tested independently from application code. OPA evaluates policies written in Rego against structured input (HTTP request, user claims, resource metadata) and returns allow/deny decisions.

## Code/Template

```rego
# policy/authz.rego
package api.authz

import rego.v1

default allow := false

# Input structure:
# {
#   "method": "GET",
#   "path": ["api", "v1", "orders", "ord-123"],
#   "user": {
#     "id": "user-456",
#     "role": "manager",
#     "org_id": "org-789",
#     "teams": ["payments", "support"]
#   },
#   "resource": {
#     "type": "order",
#     "id": "ord-123",
#     "owner_id": "user-456",
#     "org_id": "org-789"
#   }
# }

# Rule 1: Admins can do anything
allow if {
    input.user.role == "admin"
}

# Rule 2: Users can read their own resources
allow if {
    input.method == "GET"
    input.resource.owner_id == input.user.id
}

# Rule 3: Managers can read all resources in their org
allow if {
    input.method == "GET"
    input.user.role == "manager"
    input.resource.org_id == input.user.org_id
}

# Rule 4: Payments team can update order status
allow if {
    input.method in {"PUT", "PATCH"}
    input.path[2] == "orders"
    "payments" in input.user.teams
    input.resource.org_id == input.user.org_id
}

# Rule 5: No one can delete orders (hard business rule)
deny if {
    input.method == "DELETE"
    input.path[2] == "orders"
}

# Final decision: allow unless explicitly denied
authorized := allow if {
    not deny
}

# Audit: explain which rules matched
reasons contains reason if {
    input.user.role == "admin"
    reason := "admin_override"
}

reasons contains reason if {
    input.resource.owner_id == input.user.id
    reason := "resource_owner"
}

reasons contains reason if {
    input.user.role == "manager"
    input.resource.org_id == input.user.org_id
    reason := "org_manager"
}
```

```rego
# policy/authz_test.rego
package api.authz_test

import rego.v1
import data.api.authz

# Test: admin access
test_admin_allowed if {
    authz.allow with input as {
        "method": "DELETE",
        "path": ["api", "v1", "users", "user-999"],
        "user": {"id": "admin-1", "role": "admin", "org_id": "org-1", "teams": []},
        "resource": {"type": "user", "id": "user-999", "owner_id": "user-999", "org_id": "org-1"}
    }
}

# Test: owner can read own order
test_owner_read if {
    authz.allow with input as {
        "method": "GET",
        "path": ["api", "v1", "orders", "ord-1"],
        "user": {"id": "user-1", "role": "member", "org_id": "org-1", "teams": []},
        "resource": {"type": "order", "id": "ord-1", "owner_id": "user-1", "org_id": "org-1"}
    }
}

# Test: member cannot read other's order
test_non_owner_denied if {
    not authz.allow with input as {
        "method": "GET",
        "path": ["api", "v1", "orders", "ord-1"],
        "user": {"id": "user-2", "role": "member", "org_id": "org-1", "teams": []},
        "resource": {"type": "order", "id": "ord-1", "owner_id": "user-1", "org_id": "org-1"}
    }
}

# Test: cross-org manager cannot access
test_cross_org_denied if {
    not authz.allow with input as {
        "method": "GET",
        "path": ["api", "v1", "orders", "ord-1"],
        "user": {"id": "mgr-1", "role": "manager", "org_id": "org-2", "teams": []},
        "resource": {"type": "order", "id": "ord-1", "owner_id": "user-1", "org_id": "org-1"}
    }
}

# Test: order deletion always denied
test_delete_order_denied if {
    authz.deny with input as {
        "method": "DELETE",
        "path": ["api", "v1", "orders", "ord-1"],
        "user": {"id": "admin-1", "role": "admin", "org_id": "org-1", "teams": []},
        "resource": {"type": "order", "id": "ord-1", "owner_id": "user-1", "org_id": "org-1"}
    }
}
```

```bash
# Run policy tests
opa test policy/ -v

# Evaluate a specific decision
echo '{"method":"GET","path":["api","v1","orders","ord-1"],"user":{"id":"user-1","role":"member","org_id":"org-1","teams":[]},"resource":{"type":"order","id":"ord-1","owner_id":"user-1","org_id":"org-1"}}' | \
  opa eval -d policy/ -i /dev/stdin "data.api.authz.authorized"
```

## Key Points
- Separate `allow` and `deny` rules - explicit deny wins, making it easy to add hard business constraints that override permissions
- Always test cross-tenant access: the most critical authorization bug is org A reading org B's data
- Include `reasons` in the response for audit trails; knowing *why* access was granted is as important as the decision
