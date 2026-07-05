---
type: fact
title: "Applied Cryptography - Symmetric, Asymmetric, Hashing, Key Management"
---

# Applied Cryptography

Practical cryptography guidance for engineering teams. What to use, what to avoid, and why.

---

## Symmetric Encryption

### AES-256-GCM (default choice)

- AEAD (Authenticated Encryption with Associated Data) - encrypts AND authenticates
- 256-bit key, 96-bit nonce (IV), 128-bit auth tag
- Hardware-accelerated on modern CPUs (AES-NI)
- Max ~64 GB per key/nonce pair before collision risk

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encrypt(plaintext: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(12); // 96-bit nonce, MUST be unique per encryption
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, iv, tag: cipher.getAuthTag() };
}

function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
```

### ChaCha20-Poly1305 (alternative)

- Same security level as AES-256-GCM
- Faster on hardware WITHOUT AES-NI (mobile, embedded, older ARM)
- Immune to timing attacks (no table lookups)
- Preferred for: mobile apps, IoT, software-only implementations

Choose AES-256-GCM for servers/cloud. Choose ChaCha20-Poly1305 for client-side without hardware acceleration.

### Never Use

- ECB mode (patterns visible in ciphertext, the "penguin problem")
- CBC without HMAC (padding oracle attacks)
- CTR without authentication (malleable)
- DES/3DES (56/112 bit keys, too short)

---

## Asymmetric Cryptography

| Algorithm | Use Case | Key Size | Performance |
|---|---|---|---|
| RSA-2048+ | Legacy compatibility, TLS certs | 2048-4096 bit | Slow |
| ECDSA (P-256) | TLS, code signing, JWT | 256 bit | Fast |
| Ed25519 | Signatures, SSH keys, modern APIs | 256 bit | Fastest |
| X25519 | Key exchange (ECDH) | 256 bit | Fast |

### Ed25519 (prefer for new systems)

- Deterministic signatures (no nonce misuse risk, unlike ECDSA)
- Small keys (32 bytes) and signatures (64 bytes)
- Fast verification (~70k ops/sec)
- No subtle parameter choices that weaken security

```typescript
import { generateKeyPairSync, sign, verify } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

const signature = sign(null, Buffer.from("message"), privateKey);
const valid = verify(null, Buffer.from("message"), publicKey, signature);
```

### RSA Pitfalls

- PKCS#1 v1.5 padding: vulnerable to Bleichenbacher attack. Use OAEP for encryption, PSS for signatures.
- Key size below 2048: breakable. Use 2048 minimum, 4096 for long-term.
- Never encrypt large data with RSA directly. Encrypt a symmetric key, then use that (hybrid encryption).

---

## Hashing

| Algorithm | Output | Use Case |
|---|---|---|
| SHA-256 | 256 bit | General integrity, signatures, HMAC |
| SHA-3 (Keccak) | 256/512 bit | Alternative to SHA-2 (different construction) |
| BLAKE3 | 256 bit | High-speed hashing, file integrity, KDF |

BLAKE3 is ~5x faster than SHA-256 on modern hardware. Use it for non-regulatory contexts (file checksums, content addressing, Merkle trees). Use SHA-256 where compliance requires it.

---

## Password Hashing

These are deliberately slow to resist brute force. Never use SHA-256/MD5 for passwords.

| Algorithm | Status | Tuning |
|---|---|---|
| Argon2id | Preferred | Memory: 64MB+, iterations: 3+, parallelism: 1 |
| scrypt | Good | N: 2^17, r: 8, p: 1 |
| bcrypt | Acceptable | Cost factor: 12+ (2024) |

```typescript
import { hash, verify } from "@node-rs/argon2";

// Hash with Argon2id (memory-hard + time-hard)
const hashed = await hash(password, {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,        // iterations
  parallelism: 1,
});

const valid = await verify(hashed, password);
```

Argon2id > scrypt > bcrypt. Argon2id resists both GPU attacks (memory-hard) and side-channel attacks.

---

## TLS 1.3

### Key Improvements Over 1.2

- 1-RTT handshake (vs 2-RTT in TLS 1.2)
- 0-RTT resumption (for repeat connections, with replay protection caveats)
- Removed insecure ciphers (RC4, DES, static RSA key exchange)
- Perfect forward secrecy mandatory (ephemeral keys only)
- Encrypted handshake (server certificate hidden from passive observers)

### 0-RTT Risks

0-RTT data can be replayed by network attackers. Safe for: idempotent GETs. Unsafe for: state-changing operations (POST, PUT, DELETE). Mitigate with anti-replay tokens server-side.

### Cipher Suites (TLS 1.3 only allows these)

- TLS_AES_256_GCM_SHA384
- TLS_AES_128_GCM_SHA256
- TLS_CHACHA20_POLY1305_SHA256

---

## Key Management

### Key Rotation Strategy

- Symmetric encryption keys: rotate every 90 days or after encrypting 2^32 messages
- Signing keys: rotate annually minimum
- TLS certificates: 90 days (Let's Encrypt default), automate renewal
- API keys: rotate on personnel change, suspected compromise, or quarterly

### Envelope Encryption (AWS KMS Pattern)

```
Data Encryption Key (DEK) -> encrypts actual data
Key Encryption Key (KEK) -> encrypts the DEK
Root Key (in HSM/KMS)    -> encrypts the KEK
```

```typescript
// Encrypt
const { Plaintext: dek, CiphertextBlob: encryptedDek } = await kms.generateDataKey({
  KeyId: "alias/my-key",
  KeySpec: "AES_256",
});
const encrypted = aesEncrypt(data, dek);
// Store: encryptedDek + encrypted data. DEK plaintext discarded.

// Decrypt
const { Plaintext: decryptedDek } = await kms.decrypt({ CiphertextBlob: encryptedDek });
const data = aesDecrypt(encrypted, decryptedDek);
```

Benefits: root key never leaves HSM, DEK rotation doesn't require re-encrypting all data, audit trail on KMS API calls.

---

## Token Formats

### JWT vs JWE vs Paseto

| Format | Type | Use When |
|---|---|---|
| JWT (JWS) | Signed, not encrypted | Claims visible to client is acceptable |
| JWE | Encrypted + signed | Claims must be hidden from client |
| Paseto v4 | Signed (public) or encrypted (local) | New systems, no algorithm confusion |

JWT pitfalls:
- `alg: "none"` attack (always validate algorithm server-side)
- RSA/HMAC confusion (library accepts HMAC with public key as secret)
- No built-in revocation (pair with short expiry + refresh tokens)

Paseto eliminates algorithm confusion by design (version + purpose = fixed algorithm).

---

## Certificate Management

- Automate issuance/renewal (ACME protocol, certbot, cert-manager in k8s)
- Monitor expiry (alert at 30 days, critical at 7 days)
- Pin leaf certificates only in mobile apps (not intermediate/root)
- Certificate Transparency: monitor CT logs for unauthorized issuance of your domains
- Revocation: prefer OCSP stapling over CRL (faster, no privacy leak)

---

## Common Crypto Mistakes

| Mistake | Impact | Fix |
|---|---|---|
| ECB mode | Pattern leakage | Use GCM or CTR+HMAC |
| Reusing nonce/IV | Complete plaintext recovery | Random or counter-based, never reuse |
| Predictable IV (CBC) | Chosen-plaintext attack | Random IV for each message |
| Timing attacks on comparison | Auth bypass | Use `crypto.timingSafeEqual()` |
| Rolling your own crypto | Everything breaks | Use audited libraries (libsodium, OpenSSL) |
| Hardcoded keys/secrets | Key compromise | Use KMS, env vars, vault |
| MD5/SHA-1 for integrity | Collision attacks | Use SHA-256+ |
| Insufficient randomness | Predictable keys | Use `crypto.getRandomValues()` / `/dev/urandom` |

```typescript
import { timingSafeEqual } from "node:crypto";

// BAD: timing leak
function verifyMac(expected: Buffer, actual: Buffer): boolean {
  return expected.toString("hex") === actual.toString("hex"); // Early return leaks length
}

// GOOD: constant-time comparison
function verifyMac(expected: Buffer, actual: Buffer): boolean {
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
```
