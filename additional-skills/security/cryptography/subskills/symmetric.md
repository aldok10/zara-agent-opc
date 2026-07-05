---
type: subskill
title: "Symmetric Cryptography"
---

# Symmetric Cryptography

AES-GCM, ChaCha20-Poly1305, key derivation functions, nonce management, and authenticated encryption.

## When to Load

- Implementing data encryption at the application layer
- Choosing between AES-GCM and ChaCha20-Poly1305
- Designing key derivation from passwords or master keys
- Handling nonces/IVs correctly to prevent catastrophic failures

## Key Concepts

**Authenticated Encryption (AEAD)**
- Provides confidentiality AND integrity in a single operation
- Always use AEAD -- never use encryption without authentication
- AES-GCM: hardware-accelerated on modern CPUs (AES-NI)
- ChaCha20-Poly1305: fast in software, resistant to timing attacks
- XChaCha20-Poly1305: extended nonce (192-bit) -- safer for random nonces

**Algorithm Selection**
- AES-256-GCM: default choice when hardware acceleration available
- ChaCha20-Poly1305: mobile devices, environments without AES-NI
- AES-GCM-SIV: nonce-misuse resistant (slightly slower, but safer)
- XChaCha20: when you need random nonces without tracking state

**Key Derivation**
- From password: Argon2id, then use derived key for encryption
- From master key: HKDF (extract-and-expand) with unique info/context
- Key hierarchy: master key -> per-purpose keys -> per-record keys
- Never use a password directly as an encryption key

**Nonce/IV Management**
- AES-GCM: 96-bit nonce -- NEVER reuse with same key (catastrophic)
- Counter-based: increment per encryption (guarantees uniqueness)
- Random: only safe with XChaCha20 (192-bit nonce space)
- Hybrid: counter + random component for distributed systems
- Store nonce alongside ciphertext (it's not secret)

## Patterns

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

def encrypt(plaintext: bytes, key: bytes, associated_data: bytes = b"") -> bytes:
    nonce = os.urandom(12)  # 96-bit random nonce
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
    return nonce + ciphertext  # prepend nonce to output

def decrypt(token: bytes, key: bytes, associated_data: bytes = b"") -> bytes:
    nonce = token[:12]
    ciphertext = token[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, associated_data)

def derive_key(master_key: bytes, purpose: str) -> bytes:
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=purpose.encode(),
    ).derive(master_key)
```

**Envelope Encryption Pattern**
```
1. Generate random data encryption key (DEK) -- 256-bit
2. Encrypt data with DEK using AES-GCM
3. Encrypt DEK with master key (KEK) using AES-KW or RSA-OAEP
4. Store: encrypted_data + encrypted_DEK + nonce
5. To decrypt: unwrap DEK with KEK, then decrypt data with DEK
```

## Gotchas

- AES-GCM nonce reuse with same key reveals the auth key AND allows forgery
- GCM has a ~64GB per-key limit before collision risk becomes significant
- Key rotation means re-encryption OR versioned keys (version prefix on ciphertext)
- Associated data (AAD) is authenticated but NOT encrypted -- use for metadata
- Don't use AES-CBC without HMAC -- padding oracle attacks are devastating
- 128-bit vs 256-bit AES: both are secure today; 256-bit for post-quantum margin

## Verification

- Encrypt/decrypt round-trip produces original plaintext
- Tampered ciphertext raises authentication error (integrity check)
- Different nonces produce different ciphertext for same plaintext
- Key derivation with different contexts produces different keys
- Performance benchmark confirms hardware acceleration is being used
