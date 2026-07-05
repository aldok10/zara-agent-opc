---
type: fact
title: "Pod Security Admission (PSA)"
---

# Pod Security Admission (PSA)

Built-in admission controller (GA since 1.25) that enforces Pod Security Standards at the namespace level. Replaces PodSecurityPolicy with a simpler, label-based mechanism. Three security levels: privileged, baseline, restricted.

## Key Concepts

**Pod Security Standards** -- three profiles defining what a pod may do:

- **Privileged**: Unrestricted. For system-level workloads (CNI, CSI, monitoring agents).
- **Baseline**: Prevents known privilege escalations. Blocks hostNetwork, hostPID, privileged containers, but allows running as root.
- **Restricted**: Maximum lockdown. Requires non-root, drops all capabilities, read-only root filesystem, seccomp profile set, no privilege escalation.

**Enforcement modes** (per namespace, via labels):

- `enforce`: Rejects pods that violate the standard. Hard block.
- `audit`: Allows pods but records violations in audit log. For monitoring.
- `warn`: Allows pods but returns a warning to the user. For migration.

**Version pinning**: Labels accept a version (`v1.31`) to lock behavior even as K8s upgrades. Use `latest` only in audit/warn mode during migration.

## Configuration Examples

Namespace with restricted enforcement:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.31
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: v1.31
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: v1.31
```

Pod that passes restricted PSA:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
  namespace: app-prod
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    fsGroup: 65534
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: registry.example.com/app:v1.2.3@sha256:abc123
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
        runAsNonRoot: true
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          memory: 256Mi
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir:
        sizeLimit: 100Mi
```

## Common Patterns

| Pattern | Implementation |
|---------|---------------|
| Cluster default | Set restricted on all namespaces, exempt system namespaces |
| Migration path | Start with `warn: restricted`, fix violations, then flip to `enforce` |
| System namespace exemption | `pod-security.kubernetes.io/enforce: privileged` on kube-system, kube-node-lease |
| Mixed workloads | Separate namespaces per security level, never mix in one namespace |
| CI validation | `kubectl label --dry-run=server ns <ns> pod-security.kubernetes.io/enforce=restricted` to test |
| Exemptions for operators | Use AdmissionConfiguration to exempt specific users, runtimeClasses, or namespaces globally |

## Gotchas

1. **Labels only -- no inheritance**: PSA labels must be on every namespace individually. No cluster-wide default exists without admission configuration or a policy engine applying labels.
2. **Applies to pod spec, not container image**: PSA checks the manifest, not what the image actually does at runtime. A compliant manifest can still run vulnerable code.
3. **Volume types restricted**: Under `restricted`, only specific volume types are allowed (configMap, emptyDir, projected, secret, PVC, downwardAPI, ephemeral, csi). hostPath is blocked.
4. **Sidecar injection breaks restricted**: Service meshes (Istio) inject sidecars that may not pass restricted. Use exemptions or ensure the mesh's injected containers comply.
5. **enforce rejects at admission**: Existing running pods are NOT evicted when you add labels. Only new pods are blocked. Always audit first to find existing violations.
6. **No field-level exemptions**: Cannot say "allow hostNetwork for this one pod." Either the whole namespace is restricted or it's not. Use separate namespaces for different trust levels.
7. **ephemeral containers inherit**: Debug containers (`kubectl debug`) must also pass the namespace's PSA level. Use `--profile=restricted` with kubectl debug.

## Quick Reference

```bash
# Check which PSA labels a namespace has
kubectl get ns <ns> -o jsonpath='{.metadata.labels}' | jq .

# Dry-run: test if a namespace would pass a level
kubectl label --dry-run=server --overwrite ns <ns> \
  pod-security.kubernetes.io/enforce=restricted

# Find pods that would violate restricted in a namespace
kubectl get pods -n <ns> -o yaml | kubectl apply --dry-run=server -f - 2>&1 | grep -i "forbidden"

# List all namespaces missing PSA labels
kubectl get ns -o json | jq -r '.items[] | select(.metadata.labels["pod-security.kubernetes.io/enforce"] == null) | .metadata.name'

# Apply restricted to all non-system namespaces
for ns in $(kubectl get ns -o jsonpath='{.items[?(@.metadata.name!="kube-system")].metadata.name}'); do
  kubectl label ns "$ns" pod-security.kubernetes.io/enforce=restricted --overwrite
done

# Audit violations (requires audit logging enabled)
kubectl get events --field-selector reason=FailedCreate -A | grep -i "violat"
```
