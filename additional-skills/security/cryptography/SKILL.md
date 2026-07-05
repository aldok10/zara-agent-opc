---
name: cryptography
description: "Cryptographic engineering: PKI, key management, encryption, signing, hashing, certificates, HSMs"
---

# Cryptographic Engineering

## Scope

Applied cryptography in production systems. Encryption (symmetric/asymmetric), key management, digital signatures, hashing, PKI, certificates, HSMs, and secure protocols. Implementation guidance, not academic cryptanalysis.

## First Action

Identify what needs protection (data at rest, in transit, or both). Determine the threat model. Check if a cloud KMS is available. Never implement custom cryptographic primitives -- use established libraries.

## Constraints

1. Never implement custom crypto algorithms -- use audited libraries (libsodium, OpenSSL, platform SDKs)
2. Key material must never exist in plaintext outside HSM/KMS boundaries in production
3. Envelope encryption for data at rest -- encrypt data with DEK, encrypt DEK with KEK
4. TLS 1.3 minimum for new services; TLS 1.2 only for backward compatibility
5. RSA key size minimum 3072 bits; prefer Ed25519 for signatures
6. AES-256-GCM for symmetric encryption (authenticated encryption required)
7. Argon2id for password hashing; bcrypt acceptable for legacy
8. Key rotation policy must be defined before deployment
9. Certificate lifecycle automation required (ACME/cert-manager)
10. Separate keys per environment (dev/staging/prod)
11. Audit log all key operations (creation, rotation, deletion)
12. Hardware-backed keys for signing operations in production
13. Nonces must never repeat -- use random nonces with GCM (96-bit)
14. Time-constant comparison for HMAC verification

## DO NOT

1. Roll your own crypto (no custom ciphers, no custom PRNGs)
2. Use ECB mode for anything
3. Use MD5 or SHA-1 for security purposes
4. Store encryption keys alongside encrypted data
5. Use the same key for encryption and signing
6. Hardcode keys, IVs, or salts in source code
7. Use RSA-PKCS1v1.5 padding (use OAEP)
8. Reuse nonces with AES-GCM (catastrophic failure)

## Route to Subskill

| Signal | Target | Why |
|--------|--------|-----|
| Encrypt/decrypt/AES/RSA | knowledge/encryption-patterns.md | Encryption guidance |
| KMS/HSM/key rotation | knowledge/key-management.md | Key management |
| Password/hash/HMAC/sign | knowledge/hashing-signing.md | Hashing and signing |
| Envelope encryption code | examples/envelope-encryption.py | Reference implementation |
| Security review | tools/crypto-review-prompt.md | Structured review |

## Verification

- [ ] No plaintext keys in code, config, or logs
- [ ] Authenticated encryption used (GCM, ChaCha20-Poly1305)
- [ ] Key rotation mechanism tested
- [ ] Certificate expiry monitoring configured
- [ ] Time-constant comparison for all MAC verification
- [ ] Nonce uniqueness guaranteed
- [ ] Key separation: different keys for encrypt vs sign
- [ ] Crypto library is maintained and recently audited

## Knowledge

- knowledge/encryption-patterns.md -- symmetric, asymmetric, envelope encryption
- knowledge/key-management.md -- KMS, HSM, rotation, key hierarchy
- knowledge/hashing-signing.md -- password hashing, HMAC, digital signatures

## AI-Era Context (2026)

Post-quantum cryptography transition underway. NIST PQC standards (ML-KEM, ML-DSA) finalized. Hybrid key exchange (X25519 + ML-KEM-768) recommended for forward secrecy. Confidential computing (Intel TDX, AMD SEV-SNP) protects data in use. Cloud KMS services now offer PQC key types. Certificate transparency is mandatory. Short-lived certificates (< 90 days) are the norm.

## Related Skills

- security-engineering (threat modeling, zero trust)
- system-design (infrastructure patterns)
- sre/azure or sre/aws (cloud KMS)
