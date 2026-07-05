---
type: fact
title: "Hashing and Signing"
---

# Hashing and Signing

## Password Hashing

Passwords need slow, salted, memory-hard hashes. NOT general-purpose hash functions.

### Recommended (2026)

| Algorithm | Priority | Parameters |
|-----------|----------|------------|
| Argon2id | First choice | m=64MB, t=3, p=4 (OWASP recommended) |
| bcrypt | Acceptable | cost=12 minimum |
| scrypt | Acceptable | N=2^17, r=8, p=1 |

### Why These?

- Memory-hard: defeats GPU/ASIC attacks
- Built-in salt: prevents rainbow tables
- Configurable cost: increase over time as hardware improves
- Designed for passwords: intentionally slow

### Do NOT Use for Passwords

- MD5, SHA-1, SHA-256, SHA-3 (too fast, no salt built in)
- PBKDF2 with < 600,000 iterations (if forced to use it)
- Any hash without salt

### Implementation Rules

- Generate random salt per password (16+ bytes)
- Store full output (algorithm + params + salt + hash)
- Rehash on login if algorithm/params are outdated
- Rate limit login attempts (defense in depth)
- Maximum password length: 72 bytes for bcrypt (truncates silently)

## HMAC (Hash-Based Message Authentication Code)

Verifies both integrity and authenticity of a message.

### How It Works

```
HMAC(key, message) = H((key XOR opad) || H((key XOR ipad) || message))
```

### Use Cases

- API request signing (AWS Signature V4, Stripe webhooks)
- Session token verification
- Message integrity in transit
- Webhook payload verification

### Best Practices

- HMAC-SHA256 or HMAC-SHA384 minimum
- Key size >= hash output size (32 bytes for SHA-256)
- Time-constant comparison to prevent timing attacks
- Different key per purpose (auth vs integrity)
- Include all relevant context in signed message (prevent replay)

### Time-Constant Comparison

```python
import hmac
# CORRECT: constant-time
is_valid = hmac.compare_digest(computed_mac, received_mac)

# WRONG: timing side-channel
is_valid = (computed_mac == received_mac)
```

## Digital Signatures

Prove authorship and integrity. Only private key holder can sign; anyone with public key can verify.

### Recommended Algorithms (2026)

| Algorithm | Use Case | Notes |
|-----------|----------|-------|
| Ed25519 | General purpose | Fast, small signatures, safe |
| ECDSA (P-256) | Legacy/compliance | Requires good RNG for k-value |
| RSA-PSS (3072+) | Legacy compatibility | Large signatures, slow |
| ML-DSA (Dilithium) | Post-quantum | NIST PQC standard |

### Common Applications

- Code signing (binaries, packages, containers)
- JWT tokens (RS256, ES256, EdDSA)
- Git commit signing
- Document signing (PDF, contracts)
- Certificate signing (CA operations)
- Software supply chain (Sigstore, in-toto)

### Implementation Rules

1. Sign the hash of the message, not the message itself (for RSA/ECDSA)
2. Include timestamp to prevent replay
3. Include context/purpose to prevent cross-protocol attacks
4. Verify signature before trusting any signed data
5. Revocation mechanism must exist (CRL, OCSP, transparency log)

## General-Purpose Hashing

For checksums, deduplication, data structures -- NOT for passwords or security.

### Recommended

| Algorithm | Output | Use Case |
|-----------|--------|----------|
| SHA-256 | 32 bytes | File integrity, content addressing |
| SHA-384 | 48 bytes | Higher security margin |
| SHA-3-256 | 32 bytes | Alternative to SHA-2 family |
| BLAKE3 | Variable | High performance, parallelizable |

### When to Use

- File integrity verification (checksums)
- Content-addressable storage (git, IPFS)
- Hash tables, bloom filters (non-security)
- Deduplication
- Merkle trees

### Deprecated (Do NOT use for security)

- MD5: collision attacks practical since 2004
- SHA-1: collision attacks demonstrated (SHAttered, 2017)
- CRC32: not a cryptographic hash, easily forged

## Key Derivation Functions (KDFs)

Derive multiple keys from a single secret or stretch a weak secret.

### HKDF (HMAC-based KDF)

- Use for: deriving subkeys from a strong secret
- NOT for passwords (no work factor)
- Two steps: Extract (salt + input) -> PRK, Expand (PRK + info) -> output keys
- Include context in `info` parameter to get domain-separated keys

### Argon2 / scrypt / bcrypt

- Use for: deriving keys from passwords (human-memorable secrets)
- Include work factor to resist brute force
- Argon2id with memory cost for anti-GPU resistance

## Common Mistakes

1. Using SHA-256 for passwords
2. Non-constant-time MAC comparison
3. Signing without including timestamp/nonce
4. ECDSA without deterministic k (RFC 6979) or good RNG
5. Reusing HMAC keys across different protocols
6. Truncating hash output without understanding security implications
7. Using hash for authentication without a secret (hash != MAC)
