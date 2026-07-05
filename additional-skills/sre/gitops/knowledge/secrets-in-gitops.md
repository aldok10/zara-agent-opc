# Secrets in GitOps

Managing secrets in a GitOps workflow requires keeping encrypted or referenced secrets in git while actual secret values remain external.

## Approach Comparison

| Feature | SOPS | Sealed Secrets | External Secrets |
|---------|------|----------------|------------------|
| Secret storage | Encrypted in git | Encrypted in git | External provider |
| Provider support | AWS KMS, GCP KMS, Azure KV, age, PGP | Cluster-specific key | AWS SM, Vault, GCP SM, Azure KV, etc. |
| Rotation | Manual re-encrypt | Manual re-seal | Automatic polling |
| Cluster coupling | None (provider agnostic) | Tight (sealed per cluster) | Medium (operator + provider) |
| Audit trail | Git history | Git history | Provider audit logs |
| Complexity | Low | Low | Medium |
| Multi-cluster | Easy (same KMS key) | Hard (re-seal per cluster) | Easy (same provider) |

## SOPS (Secrets OPerationS)

Encrypts values in-place within YAML/JSON files. Only values are encrypted; keys remain readable for diffing.

### Setup

```bash
# Create age key
age-keygen -o keys.txt
# Configure .sops.yaml
cat > .sops.yaml <<EOF
creation_rules:
  - path_regex: .*secrets.*\.yaml$
    age: "age1..."
  - path_regex: .*prod.*secrets.*\.yaml$
    kms: "arn:aws:kms:us-east-1:123:key/abc-123"
EOF
```

### Usage

```bash
sops encrypt secrets.yaml > secrets.enc.yaml
sops decrypt secrets.enc.yaml
sops edit secrets.enc.yaml  # decrypt-edit-encrypt in one step
```

### ArgoCD Integration

Use `ksops` (Kustomize plugin) or `helm-secrets` plugin. ArgoCD server needs access to the decryption key (via environment variable, mounted secret, or IAM role).

### Pros/Cons

- Pro: simple, no controller needed, works anywhere
- Pro: partial encryption preserves git diffability
- Con: key distribution to CI/CD and developers
- Con: no automatic rotation -- must re-encrypt after rotating provider keys

## Sealed Secrets

Bitnami Sealed Secrets uses asymmetric encryption. Encrypt with the cluster's public key; only the controller (with the private key) can decrypt.

### Setup

```bash
# Install controller
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Seal a secret
kubectl create secret generic db-creds \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-creds.yaml
```

### Limitations

- Sealed per cluster (and optionally per namespace) -- same secret must be re-sealed for each cluster
- Controller private key is the single point of failure -- backup it
- No automatic rotation -- must re-seal when values change
- Certificate rotation requires re-sealing all secrets

### When to Use

Small teams, single-cluster deployments, or environments where external secret providers aren't available.

## External Secrets Operator (ESO)

Syncs secrets from external providers into Kubernetes Secrets. The source of truth is the external provider, not git.

### Architecture

```
External Provider (AWS SM / Vault / GCP SM)
    |
    v
ExternalSecret CR (in git) -- references the external secret by name/path
    |
    v
External Secrets Operator (controller)
    |
    v
Kubernetes Secret (created/updated automatically)
```

### ExternalSecret Example

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: prod/database/credentials
        property: password
```

### ClusterSecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

### Pros/Cons

- Pro: automatic rotation via `refreshInterval`
- Pro: single source of truth in secret provider
- Pro: multi-cluster friendly (all clusters read from same provider)
- Pro: no secrets in git (even encrypted)
- Con: requires controller running in cluster
- Con: dependency on external provider availability
- Con: more moving parts than SOPS

## Recommendations by Scenario

**Small team, single cluster**: SOPS with age keys. Simple, no infrastructure dependency.

**Multi-cluster, cloud-native**: External Secrets Operator with cloud provider secret manager. Automatic rotation, centralized management.

**Compliance-heavy / enterprise**: External Secrets + HashiCorp Vault. Full audit trail, dynamic secrets, lease management.

**Air-gapped / on-prem**: Sealed Secrets or SOPS with age/PGP. No external dependency.

## Security Baseline (All Approaches)

- Encrypt secrets at rest in etcd (`EncryptionConfiguration`)
- RBAC: restrict `get`/`list` on Secrets to workloads that need them
- Network policies: limit egress from secret-consuming pods
- Audit logging: enable Kubernetes audit logs for Secret access
- Rotation: define and enforce rotation cadence regardless of tooling
