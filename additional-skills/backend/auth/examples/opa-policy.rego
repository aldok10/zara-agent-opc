# API Authorization Policy
# OPA Rego policy for a multi-tenant REST API
# Evaluates: identity + role + resource ownership + tenant isolation

package api.authz

import rego.v1

default allow := false

# ─── Role Definitions ─────────────────────────────────────────────────────────

role_permissions := {
    "admin": {"read", "write", "delete", "manage_members"},
    "editor": {"read", "write"},
    "viewer": {"read"},
}

# ─── Helper Rules ─────────────────────────────────────────────────────────────

# Extract user from verified JWT claims (input.user populated by middleware)
user := input.user

# Current user's permissions based on org role
user_permissions contains perm if {
    some perm in role_permissions[user.org_role]
}

# Check if user belongs to the same org as the resource
same_tenant if {
    input.resource.org_id == user.org_id
}

# ─── Access Rules ─────────────────────────────────────────────────────────────

# Rule 1: Allow access if user has required permission AND is in same tenant
allow if {
    required_permission := action_to_permission[input.action]
    required_permission in user_permissions
    same_tenant
}

# Rule 2: Resource owners can always read/write their own resources
allow if {
    input.action in {"read", "write"}
    input.resource.owner_id == user.sub
    same_tenant
}

# Rule 3: Service accounts with explicit scope
allow if {
    startswith(user.sub, "svc_")
    required_scope := sprintf("%s:%s", [input.resource.type, input.action])
    required_scope in user.scopes
}

# ─── Action Mapping ──────────────────────────────────────────────────────────

action_to_permission := {
    "read": "read",
    "list": "read",
    "create": "write",
    "update": "write",
    "delete": "delete",
    "invite": "manage_members",
    "remove_member": "manage_members",
}

# ─── Deny Rules (override allow) ─────────────────────────────────────────────

# Deny cross-tenant access regardless of any allow rule
deny if {
    not same_tenant
}

# Deny if token is missing required claims
deny if {
    not user.org_id
}

deny if {
    not user.org_role
}

# ─── Final Decision ──────────────────────────────────────────────────────────

# Final authorization: allow AND NOT deny
authorized if {
    allow
    not deny
}

# ─── Audit Output ────────────────────────────────────────────────────────────

# Structured decision for audit logging
decision := {
    "allowed": authorized,
    "user": user.sub,
    "org": user.org_id,
    "action": input.action,
    "resource_type": input.resource.type,
    "resource_id": input.resource.id,
    "reason": reason,
}

reason := "allowed_by_role" if {
    allow
    not deny
}

reason := "denied_cross_tenant" if {
    deny
    not same_tenant
}

reason := "denied_insufficient_permission" if {
    not allow
    same_tenant
}

reason := "denied_missing_claims" if {
    deny
    not user.org_id
}

# ─── Example Input ───────────────────────────────────────────────────────────
# {
#   "user": {
#     "sub": "user_7kQ9mPx2",
#     "org_id": "org_acme",
#     "org_role": "editor",
#     "scopes": ["read:projects", "write:projects"]
#   },
#   "action": "update",
#   "resource": {
#     "type": "project",
#     "id": "proj_abc",
#     "org_id": "org_acme",
#     "owner_id": "user_other"
#   }
# }
# Result: authorized = true (editor has "write" permission, same tenant)
