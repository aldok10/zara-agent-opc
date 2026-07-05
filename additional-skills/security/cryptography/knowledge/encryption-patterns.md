# Encryption Patterns

## Symmetric Encryption

Same key encrypts and decrypts. Fast, suitable for bulk data.

### Recommended Algorithms (2026)

| Algorithm | Use Case | Key Size | Notes |
|-----------|----------|----------|-------|
| AES-256-GCM | General purpose | 256-bit | Authenticated, hardware-accelerated |
| ChaCha20-Poly1305 | Mobile/no AES-NI | 256-bit | Authenticated, constant-time |
| AES-256-GCM-SIV | Nonce-misuse resistant | 256-bit | Safer when nonce uniqueness uncertain |
| XChaCha20-Poly1305 | Large nonce space | 256-bit | 192-bit nonce, safer for random generation |

### GCM Critical Rules

- Nonce (IV) must be exactly 96 bits (12 bytes)
- NEVER reuse a nonce with the same key (reveals plaintext XOR)
- Random nonces safe for ~2^32 encryptions per key, then rotate
- Use deterministic nonce (counter) for high-volume systems
- Always verify authentication tag before using plaintext
- Additional Authenticated Data (AAD) for context binding

### Avoid

- ECB mode: patterns leak through
- CBC without HMAC: padding oracle attacks
- CTR without MAC: malleable ciphertext
- Any unauthenticated encryption mode

## Asymmetric Encryption

Key pair: public encrypts, private decrypts. Slow, used for key exchange.

### Recommended Algorithms

| Algorithm | Use Case | Key Size | Notes |
|-----------|----------|----------|-------|
| RSA-OAEP (SHA-256) | Legacy compatibility | 3072+ bits | Prefer OAEP over PKCS1v1.5 |
| ECIES (P-256) | Modern key encapsulation | 256-bit | Ephemeral ECDH + symmetric |
| X25519 + symmetric | Key exchange | 256-bit | Preferred for new systems |
| ML-KEM-768 | Post-quantum | -- | NIST PQC standard, hybrid recommended |

### Usage Pattern

Never encrypt data directly with RSA. Instead:
1. Generate random symmetric key (DEK)
2. Encrypt data with DEK using AES-GCM
3. Encrypt DEK with recipient's public key
4. Send encrypted DEK + encrypted data + nonce + tag

## Envelope Encryption

Standard pattern for data-at-rest encryption with cloud KMS.

### Architecture

```
[Plaintext] --encrypt(DEK)--> [Ciphertext]
[DEK] --encrypt(KEK)--> [Encrypted DEK]
[KEK] lives in KMS/HSM, never exported
```

### Flow

1. Request new DEK from KMS (returns plaintext DEK + encrypted DEK)
2. Encrypt data with plaintext DEK
3. Immediately discard plaintext DEK from memory
4. Store encrypted DEK alongside ciphertext
5. To decrypt: send encrypted DEK to KMS, get plaintext DEK, decrypt data

### Benefits

- KEK never leaves KMS/HSM boundary
- Rotate KEK without re-encrypting all data
- Audit trail on all KEK operations
- Per-record or per-file unique DEKs

## Data at Rest

### File/Object Encryption

- Use envelope encryption with cloud KMS
- Per-file DEK (not shared across files)
- Store encrypted DEK in file metadata or adjacent
- Verify integrity via GCM tag

### Database Encryption

**Transparent (TDE)**: handled by database engine
- Protects against disk theft, not SQL injection
- No application changes needed

**Application-level**: encrypt before storage
- Protects against DB compromise
- Enables per-field encryption
- Challenges: indexing, searching, sorting encrypted data

**Searchable encryption**: encrypted indexes
- Deterministic encryption for equality search (weaker security)
- Order-preserving encryption for range queries (weaker security)
- Homomorphic approaches (still impractical for most workloads in 2026)

## Data in Transit

### TLS 1.3

- Mandatory for all new services
- 1-RTT handshake (0-RTT available but has replay risk)
- Only strong cipher suites (no configuration needed)
- Certificate pinning for mobile apps (backup pins required)

### mTLS (Mutual TLS)

- Both client and server present certificates
- Standard for service-to-service in zero-trust networks
- Use SPIFFE/SPIRE for workload identity
- Short-lived certificates (hours, not years)

## Common Mistakes

1. Using encryption without authentication (CBC without HMAC)
2. Reusing nonces/IVs
3. Comparing MACs with non-constant-time equality
4. Storing DEK and encrypted data in same access boundary
5. Using RSA key size < 2048 bits
6. Not zeroing key material from memory after use
7. Trusting encrypted data without verifying authentication tag
