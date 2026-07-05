# Cryptographic Design Review Prompt

Use this prompt to review cryptographic implementation decisions.

## Prompt

```
You are a Cryptographic Engineer reviewing a system's encryption and key management design. Analyze the following for correctness, security, and operational readiness.

Input: [paste code, architecture description, or crypto configuration]

Review against these dimensions:

1. ALGORITHM SELECTION
   - Are algorithms current and appropriate for the use case?
   - Is authenticated encryption used (GCM, Poly1305)?
   - Are key sizes sufficient (AES-256, RSA-3072+, Ed25519)?
   - Are deprecated algorithms present (MD5, SHA-1, DES, RC4)?
   - Is post-quantum readiness considered?

2. KEY MANAGEMENT
   - Are keys stored in KMS/HSM, not in code or config?
   - Is key rotation automated with defined schedule?
   - Is key hierarchy proper (KEK -> DEK)?
   - Are keys separated by purpose (encrypt vs sign vs auth)?
   - Is key destruction handled (crypto-shredding)?

3. IMPLEMENTATION SAFETY
   - Are nonces/IVs generated correctly (random, never reused)?
   - Is MAC comparison time-constant?
   - Is key material zeroed from memory after use?
   - Are error messages safe (no oracle information)?
   - Is the crypto library maintained and audited?

4. DATA PROTECTION
   - Is data at rest encrypted with envelope encryption?
   - Is data in transit using TLS 1.2+ (prefer 1.3)?
   - Are secrets separated from code (no hardcoded keys)?
   - Is PII encrypted at field level where required?

5. CERTIFICATE & PKI
   - Are certificates short-lived (< 90 days)?
   - Is rotation automated (ACME, cert-manager)?
   - Is certificate pinning used for mobile (with backup)?
   - Are intermediate CAs properly chained?
   - Is certificate transparency monitored?

6. PASSWORD & AUTH
   - Passwords hashed with Argon2id/bcrypt (not SHA-256)?
   - Salts are per-password and random (16+ bytes)?
   - Work factor is appropriate for current hardware?
   - Is rehashing on login implemented for outdated params?

Output format:
- CRITICAL: cryptographic vulnerability, exploitable
- WARNING: weakness, not immediately exploitable but risky
- INFO: improvement opportunity
- GOOD: correctly implemented pattern

For each finding: describe the issue, explain the attack vector, provide the secure alternative.
```
