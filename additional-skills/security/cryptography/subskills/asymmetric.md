---
type: subskill
title: "Asymmetric Cryptography"
---

# Asymmetric Cryptography

RSA, ECDSA, Ed25519, key exchange protocols, and Public Key Infrastructure.

## When to Load

- Implementing digital signatures or key exchange
- Choosing between RSA, ECDSA, and Ed25519
- Setting up PKI or certificate-based authentication
- Designing hybrid encryption (asymmetric + symmetric)

## Key Concepts

**Algorithm Comparison**
| Algorithm | Key Size | Signature Size | Speed | Use Case |
|-----------|----------|---------------|-------|----------|
| RSA-2048 | 256 bytes | 256 bytes | Slow | Legacy, key exchange |
| RSA-4096 | 512 bytes | 512 bytes | Very slow | High-security legacy |
| ECDSA P-256 | 32 bytes | 64 bytes | Fast | TLS, general purpose |
| Ed25519 | 32 bytes | 64 bytes | Fastest | Modern signatures |
| X25519 | 32 bytes | N/A | Fast | Key exchange (ECDH) |

**When to Use What**
- Signatures (new systems): Ed25519 -- fast, constant-time, no pitfalls
- Signatures (compatibility): ECDSA P-256 -- widely supported
- Key exchange: X25519 -- simple, safe, fast
- Encryption of small data: RSA-OAEP (only if you must; prefer hybrid)
- Hybrid encryption: X25519 key exchange + AES-GCM for bulk data

**Key Exchange Pattern (Diffie-Hellman)**
1. Alice generates ephemeral X25519 keypair
2. Alice sends public key to Bob
3. Bob generates ephemeral X25519 keypair
4. Bob computes shared_secret = X25519(bob_private, alice_public)
5. Alice computes shared_secret = X25519(alice_private, bob_public)
6. Both derive symmetric key from shared_secret via HKDF
7. Use symmetric key for AES-GCM encryption

## Patterns

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

# Ed25519 signing
private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

signature = private_key.sign(b"message to sign")
public_key.verify(signature, b"message to sign")  # raises on failure

# X25519 key exchange
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

alice_private = X25519PrivateKey.generate()
alice_public = alice_private.public_key()

bob_private = X25519PrivateKey.generate()
bob_public = bob_private.public_key()

shared_key_alice = alice_private.exchange(bob_public)
shared_key_bob = bob_private.exchange(alice_public)
# shared_key_alice == shared_key_bob

derived_key = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=None,
    info=b"encryption key",
).derive(shared_key_alice)
```

**Hybrid Encryption (Seal/Open)**
```
Seal(recipient_public_key, plaintext):
  1. ephemeral = X25519PrivateKey.generate()
  2. shared = ephemeral.exchange(recipient_public_key)
  3. key = HKDF(shared, context)
  4. ciphertext = AES-GCM.encrypt(key, plaintext)
  5. return ephemeral.public_key() + ciphertext

Open(recipient_private_key, sealed):
  1. ephemeral_pub = sealed[:32]
  2. shared = recipient_private_key.exchange(ephemeral_pub)
  3. key = HKDF(shared, context)
  4. plaintext = AES-GCM.decrypt(key, sealed[32:])
  5. return plaintext
```

## Gotchas

- RSA without OAEP padding is insecure -- never use PKCS#1 v1.5 for new systems
- ECDSA requires unique random k per signature -- reuse leaks private key (see PlayStation 3 hack)
- Ed25519 avoids the k-reuse problem by design (deterministic signatures)
- Key sizes: RSA-2048 ~ ECDSA P-256 ~ Ed25519 in security level
- Private keys must never be serialized without encryption (use password-protected PEM)
- Post-quantum: current asymmetric crypto is vulnerable to quantum computers; consider hybrid schemes

## Verification

- Sign/verify round-trip works with correct key pair
- Verify fails with wrong public key or tampered message
- Key exchange produces identical shared secret on both sides
- Hybrid encryption: decrypt(encrypt(msg)) == msg
- Private key serialization is password-protected
