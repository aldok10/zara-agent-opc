---
type: subskill
title: "Secrets Management"
---

# Secrets Management

Vault, SOPS, parameter stores, and secret rotation strategies.

## When to Load
- Choosing or implementing a secrets management solution
- Setting up HashiCorp Vault for production
- Encrypting secrets in Git with SOPS
- Implementing secret rotation

## Key Concepts

**Secrets management principles:**
1. Never store secrets in code or plaintext config
2. Encrypt at rest and in transit
3. Rotate regularly (automated)
4. Audit all access
5. Least privilege access to secrets

**Solution spectrum (complexity vs features):**
- Environment variables: simple, no audit, no rotation
- Cloud parameter stores (SSM, Secret Manager): managed, basic rotation
- SOPS: encrypted files in Git, GitOps-friendly
- HashiCorp Vault: full lifecycle management, dynamic secrets, PKI

**Dynamic secrets:** generated on-demand with short TTL. Database credentials, cloud tokens, certificates. Reduces blast radius of credential theft.

## Patterns

**HashiCorp Vault database dynamic secrets:**
```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/mydb \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@db:5432/app?sslmode=require" \
  allowed_roles="app-role" \
  username="vault" \
  password="vault-password"

# Create role with dynamic credentials
vault write database/roles/app-role \
  db_name=mydb \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Application reads credentials
vault read database/creds/app-role
```

**SOPS with age encryption:**
```bash
# Create key
age-keygen -o keys.txt

# Create .sops.yaml config
cat > .sops.yaml << 'EOF'
creation_rules:
  - path_regex: secrets/.*\.yaml$
    age: "age1xxxxx..."
  - path_regex: secrets/prod/.*\.yaml$
    age: "age1xxxxx...,age1yyyyy..."
EOF

# Encrypt a file
sops -e secrets/db.yaml > secrets/db.enc.yaml

# Edit in-place
sops secrets/db.enc.yaml
```

**Kubernetes External Secrets Operator:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: prod/app/database
        property: password
    - secretKey: API_KEY
      remoteRef:
        key: prod/app/api-key
```

**Secret rotation pattern:**
```
1. Generate new secret (version N+1)
2. Deploy to secret store (both N and N+1 valid)
3. Update consumers to use N+1
4. Verify all consumers using N+1 (grace period)
5. Revoke version N
6. Audit log the rotation event
```

## Gotchas
- Vault unsealing requires careful planning -- auto-unseal with cloud KMS is recommended
- SOPS encrypted files must not be decrypted in CI logs or artifact stores
- External Secrets Operator creates Kubernetes Secrets -- still base64, not encrypted in etcd without encryption-at-rest
- Secret rotation without app restart needs file-watching or API polling in the application
- Vault token renewal: if token expires, app loses access -- implement token refresh logic
- Parameter store rate limits (AWS SSM: 40 TPS default) can cause issues at scale

## Verification
- `vault token lookup` for current auth status
- `vault audit list` for enabled audit backends
- `sops -d <file>` to verify decryption works
- `kubectl get externalsecrets` for sync status
- Secret access audit logs (Vault audit log, CloudTrail for SSM/Secrets Manager)
- Rotation test: rotate a secret and verify app picks up new value without restart
