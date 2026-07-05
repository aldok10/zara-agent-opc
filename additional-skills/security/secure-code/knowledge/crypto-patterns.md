# Cryptographic Patterns

Modern cryptographic primitives, key management, and common implementation patterns.

## Algorithm Selection (2026)

### Symmetric Encryption

| Use Case | Algorithm | Key Size | Notes |
|----------|-----------|----------|-------|
| General encryption | AES-256-GCM | 256-bit | Authenticated encryption, hardware acceleration |
| Alternative (no AES-NI) | ChaCha20-Poly1305 | 256-bit | Software-fast, constant-time |
| Disk/volume encryption | XTS-AES-256 | 512-bit (2x256) | Sector-level encryption |
| DO NOT USE | DES, 3DES, RC4, AES-ECB, AES-CBC without HMAC | -- | Deprecated, vulnerable |

### Hashing

| Use Case | Algorithm | Notes |
|----------|-----------|-------|
| Password hashing | Argon2id | Memory: 64MB, iterations: 3, parallelism: 1 |
| General integrity | SHA-256 / SHA-3-256 | 256-bit output |
| High-security integrity | SHA-512 / SHA-3-512 | 512-bit output |
| HMAC | HMAC-SHA-256 | For message authentication |
| Short hash (non-crypto) | BLAKE3 | Very fast, not for passwords |
| DO NOT USE | MD5, SHA-1 | Broken collision resistance |

### Asymmetric / Signatures

| Use Case | Algorithm | Key Size | Notes |
|----------|-----------|----------|-------|
| Digital signatures | Ed25519 | 256-bit | Fast, deterministic, safe |
| Key exchange | X25519 | 256-bit | Diffie-Hellman, curve25519 |
| RSA (legacy compat) | RSA-PSS | 4096-bit minimum | Prefer Ed25519 for new systems |
| ECDSA (if required) | P-256 (secp256r1) | 256-bit | Use with RFC 6979 deterministic k |
| DO NOT USE | RSA <2048, DSA, PKCS1v1.5 signing | -- | Deprecated |

### Password Hashing Deep Dive

```
Argon2id parameters (2026 recommendations):
- Memory: 64MB minimum (256MB for high-value targets)
- Iterations: 3 (time cost)
- Parallelism: 1 (single-threaded for resistance to GPU attacks)
- Salt: 16 bytes, cryptographically random, unique per password
- Output: 32 bytes

For login systems:
- Target: ~250ms per hash on production hardware
- Adjust memory upward until you hit time target
- Never reduce below 64MB/3 iterations
```

**Why not bcrypt/scrypt?**
- bcrypt: 72-byte input limit, fixed memory usage, GPU-resistant but less than Argon2
- scrypt: good but harder to tune, less studied than Argon2, no memory-hardness variants
- Argon2id: combines Argon2i (side-channel resistant) and Argon2d (GPU resistant)

## Key Management

### Principles
1. Never store keys in source code, config files, or environment variables long-term
2. Use cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault) for key storage
3. Separate encryption keys from data they protect
4. Rotate keys on schedule and on compromise
5. Use envelope encryption: KMS encrypts data encryption keys (DEKs)

### Envelope Encryption Pattern
```
┌──────────────┐     ┌──────────────┐
│  Cloud KMS   │     │  Your App    │
│              │     │              │
│  KEK (never  │     │  Encrypted   │
│  leaves KMS) │     │  DEK stored  │
│              │     │  alongside   │
└──────┬───────┘     │  encrypted   │
       │             │  data        │
       │ Decrypt     └──────────────┘
       │ DEK
       ▼
┌──────────────┐
│ Plaintext    │
│ DEK (in      │
│ memory only) │
│              │
│ Used to      │
│ decrypt data │
└──────────────┘
```

### Key Rotation
- **KMS keys**: rotate annually (or per compliance requirement)
- **Data encryption keys**: rotate per-record or per-session
- **API keys**: rotate every 90 days, immediately on suspected compromise
- **TLS certificates**: 90-day lifetime (Let's Encrypt default)
- **Signing keys**: annual rotation with overlap period for verification

## Common Implementation Mistakes

### Mistake 1: Using Encryption Without Authentication
```
// WRONG: AES-CBC without HMAC (malleable ciphertext)
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// RIGHT: AES-GCM provides authentication
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
// GCM produces auth tag that must be verified on decryption
```

### Mistake 2: Reusing Nonces/IVs
```
// WRONG: static or predictable IV
const iv = Buffer.alloc(12, 0);

// RIGHT: random IV per encryption
const iv = crypto.randomBytes(12);  // 96-bit for GCM
// Store IV alongside ciphertext (it's not secret)
```

### Mistake 3: Using Math.random() for Security
```
// WRONG: predictable, not cryptographically secure
const token = Math.random().toString(36);

// RIGHT: cryptographic randomness
const token = crypto.randomBytes(32).toString('hex');
```

### Mistake 4: Comparing Hashes Without Timing Safety
```
// WRONG: vulnerable to timing attacks
if (computedHmac === providedHmac) { ... }

// RIGHT: constant-time comparison
if (crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(providedHmac))) { ... }
```

### Mistake 5: Deriving Keys from Low-Entropy Sources
```
// WRONG: password directly as encryption key
const key = Buffer.from(password.padEnd(32));

// RIGHT: KDF with salt and proper parameters
const key = crypto.scryptSync(password, salt, 32, { N: 2**17, r: 8, p: 1 });
// Or use HKDF for deriving multiple keys from a single secret
```

## TLS Configuration

### Server-Side (2026 Minimum)
```
- Protocol: TLS 1.3 only (disable 1.2 if possible; minimum TLS 1.2)
- Cipher suites (TLS 1.3): TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
- HSTS: max-age=63072000; includeSubDomains; preload
- Certificate: 2048-bit RSA or P-256 ECDSA (P-256 preferred for performance)
- OCSP stapling: enabled
- Certificate Transparency: mandatory
```

### Client-Side Validation
- Always verify TLS certificates (never disable in production)
- Pin certificates only for mobile apps (not web -- too fragile)
- Use system trust store, keep it updated
- Verify hostname matches certificate SAN

## Secure Random Generation

| Language | Secure Random Source |
|----------|---------------------|
| Node.js | `crypto.randomBytes()`, `crypto.randomUUID()` |
| Go | `crypto/rand.Read()` |
| Python | `secrets.token_bytes()`, `secrets.token_urlsafe()` |
| Rust | `rand::rngs::OsRng` |
| Browser | `crypto.getRandomValues()` |
| Java | `java.security.SecureRandom` |

## 2026 Context

- Post-quantum readiness: NIST PQC standards (ML-KEM/Kyber, ML-DSA/Dilithium) finalized
- Hybrid key exchange in TLS (X25519 + ML-KEM) available in major libraries
- Key transparency protocols (Google, Apple) for public key discovery
- Hardware security modules accessible via cloud APIs (cost-effective for all sizes)
- Homomorphic encryption becoming practical for specific use cases (encrypted search)
- Age encryption format gaining adoption as GPG replacement for file encryption
