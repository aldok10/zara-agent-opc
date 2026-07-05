---
type: subskill
title: "RBAC"
---

# RBAC

Kubernetes RBAC, cloud IAM, and principle of least privilege implementation.

## When to Load
- Designing Kubernetes RBAC policies
- Implementing least privilege across cloud and cluster
- Auditing excessive permissions
- Troubleshooting authorization failures

## Key Concepts

**Kubernetes RBAC:** Role (namespace-scoped) + ClusterRole (cluster-scoped) bound to subjects (User, Group, ServiceAccount) via RoleBinding/ClusterRoleBinding.

**Principle of least privilege:** grant only the minimum permissions required for the task, for the minimum time. Review and revoke regularly.

**RBAC layers:**
1. Cloud IAM: who can access the cluster and cloud resources
2. Kubernetes RBAC: what actions are allowed within the cluster
3. Namespace isolation: scope access to specific namespaces
4. Pod Security: what the workload itself can do (PSA/PSS)

## Patterns

**Namespace-scoped developer role:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: team-backend
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "services", "jobs", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods/log", "pods/exec"]
    verbs: ["get", "create"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: team-backend
subjects:
  - kind: Group
    name: backend-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

**Minimal CI/CD service account:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deploy-bot
  namespace: team-backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: team-backend
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "update", "patch"]
    resourceNames: ["api-server", "worker"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "update"]
    resourceNames: ["api-config"]
```

**Audit excessive permissions (script):**
```bash
#!/bin/bash
# Find ClusterRoleBindings granting cluster-admin
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
    select(.roleRef.name == "cluster-admin") |
    .metadata.name + ": " + ([.subjects[]? | .kind + "/" + .name] | join(", "))'
```

**Pod Security Standards (Restricted):**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

## Gotchas
- `cluster-admin` ClusterRoleBinding is often over-granted -- audit regularly
- Kubernetes RBAC is additive only -- no deny rules (use admission controllers for deny)
- ServiceAccount tokens are namespace-scoped but ClusterRoleBindings give cluster access
- `pods/exec` permission is effectively root access to that pod -- restrict carefully
- Wildcard (`*`) in verbs or resources is almost never appropriate
- RBAC changes are immediate -- no propagation delay (unlike cloud IAM)
- `system:authenticated` group includes any valid token -- don't bind roles to it

## Verification
- `kubectl auth can-i --list --as=system:serviceaccount:ns:sa` for permission check
- `kubectl auth can-i create pods --as=user@example.com -n namespace`
- `kubectl get rolebindings,clusterrolebindings -A -o wide` for full binding inventory
- Audit logs: filter for 403 Forbidden to find authorization failures
- rbac-lookup tool: `kubectl rbac-lookup <user>` for all bindings affecting a subject
- Regular access reviews: quarterly audit of all ClusterRoleBindings
