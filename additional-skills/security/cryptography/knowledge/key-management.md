# Key Management

## Principles

1. Keys must have a defined lifecycle: generation, distribution, usage, rotation, destruction
2. Separate key material from data it protects
3. Least privilege access to key operations
4. Audit all key usage
5. Automate rotation -- manual rotation gets skipped

## Key Hierarchy

```
Root Key (HSM-protected, never exported)
  |
  +-- Master Key / KEK (Key Encryption Key)
        |
        +-- Data Encryption Key (DEK) - per record/file/session
        +-- Data Encryption Key (DEK)
        +-- ...
```

### Why Hierarchy?

- Root key rotation: rare, impacts master keys only
- Master key rotation: re-wraps DEKs, no data re-encryption
- DEK rotation: re-encrypt data (expensive, per-record scope)

## Cloud KMS Services

### AWS KMS

- Customer-managed keys (CMK) backed by HSM
- Automatic key rotation: once per year (configurable)
- Key policies + IAM for access control
- Multi-region keys for DR
- `GenerateDataKey` for envelope encryption
- Pricing: per-key/month + per-request

### Azure Key Vault

- Keys, secrets, and certificates in one service
- HSM-backed (Premium tier) or software-protected (Standard)
- Managed HSM for dedicated HSM partition
- RBAC or access policies for authorization
- Soft-delete and purge protection enabled by default

### GCP Cloud KMS

- Multi-tier protection levels: SOFTWARE, HSM, EXTERNAL, EXTERNAL_VPC
- Automatic rotation with configurable period
- IAM for access control
- EKM for external key management (hold your own key)

## Hardware Security Modules (HSMs)

### What HSMs Provide

- FIPS 140-2/3 Level 3 certified key storage
- Keys generated and used inside HSM, never exported in plaintext
- Tamper-evident physical housing
- Cryptographic acceleration
- Audit trail of all operations

### When to Use HSM

- Regulatory requirement (PCI-DSS, FIPS, eIDAS)
- Root CA private keys
- Code signing keys
- Payment processing keys
- High-value signing operations

### Cloud HSM Options

| Provider | Service | FIPS Level |
|----------|---------|-----------|
| AWS | CloudHSM | Level 3 |
| Azure | Managed HSM | Level 3 |
| GCP | Cloud HSM | Level 3 |
| On-prem | Thales Luna, Entrust nShield | Level 3 |

## Key Rotation

### Why Rotate

- Limits exposure if key is compromised (blast radius = rotation period)
- Compliance requirements (PCI-DSS: annual minimum)
- Crypto-period best practices (NIST SP 800-57)

### Rotation Strategies

**Re-wrap (KEK rotation)**:
1. Create new KEK version
2. Decrypt DEKs with old KEK
3. Re-encrypt DEKs with new KEK
4. No data re-encryption needed

**Re-encrypt (DEK rotation)**:
1. Decrypt data with old DEK
2. Generate new DEK
3. Encrypt data with new DEK
4. Expensive -- schedule during maintenance

**Dual-read (zero-downtime)**:
1. New writes use new key
2. Reads try new key first, fall back to old
3. Background migration re-encrypts old data
4. Retire old key after migration complete

### Rotation Periods

| Key Type | Recommended Period | Compliance |
|----------|-------------------|------------|
| KEK / Master key | 1 year | PCI-DSS |
| DEK | Per-session or per-record | Best practice |
| TLS certificate | 90 days (Let's Encrypt default) | CA/Browser Forum |
| Signing key | 1-2 years | Depends on use |
| SSH host key | On compromise only | Best practice |

## Envelope Encryption Implementation

### Encrypt Flow

```
1. Call KMS.GenerateDataKey(KeyId=master-key)
   Returns: {Plaintext: DEK, CiphertextBlob: encrypted_DEK}
2. Encrypt data with DEK (AES-256-GCM)
3. Zero DEK from memory immediately
4. Store: encrypted_data + encrypted_DEK + nonce + AAD metadata
```

### Decrypt Flow

```
1. Read encrypted_DEK from storage
2. Call KMS.Decrypt(CiphertextBlob=encrypted_DEK)
   Returns: {Plaintext: DEK}
3. Decrypt data with DEK (verify GCM tag)
4. Zero DEK from memory immediately
5. Return plaintext
```

## Key Storage Anti-Patterns

- Keys in environment variables (leaked in crash dumps, logs)
- Keys in git (even if repo is private)
- Keys in config files on disk (no access control)
- Same key across environments
- No key rotation ever configured
- Keys shared between teams without access control
- Backup keys stored with less protection than primary
