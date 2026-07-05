# Passkeys & WebAuthn

## Context

Passkeys are FIDO2 credentials synced across devices via platform keychain (iCloud Keychain, Google Password Manager, Windows Hello). They provide phishing-resistant authentication without passwords. WebAuthn is the browser API; CTAP2 is the authenticator protocol.

## Rules

1. Prefer synced passkeys (discoverable/resident credentials) over device-bound keys for consumer apps — recovery is built-in via cloud sync
2. Set `residentKey: "required"` for passwordless flows; `"preferred"` if supporting security keys as fallback
3. Use `userVerification: "preferred"` — lets platform decide biometric/PIN; `"required"` blocks some security keys
4. RP ID must be a registrable domain suffix of the origin — `auth.example.com` can use RP ID `example.com`
5. Challenge must be cryptographically random, minimum 16 bytes, single-use, expire within 5 minutes
6. Store credential public key, credential ID, sign count, and transports — never store attestation unless compliance requires it
7. Verify sign count is strictly increasing on each authentication — stale/reset count signals cloned authenticator
8. Implement conditional UI (`mediation: "conditional"`) for autofill-style passkey prompts — non-blocking UX
9. Support multiple credentials per user for device redundancy — minimum 2 passkeys recommended during onboarding
10. Attestation: use `"none"` unless enterprise policy requires device provenance; `"direct"` adds privacy cost

## Registration Flow

```
1. Server generates challenge + user entity (id, name, displayName)
2. Client calls navigator.credentials.create({publicKey: options})
3. Authenticator creates key pair, returns attestationObject + clientDataJSON
4. Server verifies: origin, rpIdHash, challenge, flags (UV, UP, BE, BS)
5. Server stores: credentialId, publicKey (COSE), signCount, transports
```

### Key Options
```javascript
{
  rp: { id: "example.com", name: "Example" },
  user: { id: userIdBuffer, name: "user@example.com", displayName: "User" },
  challenge: randomBytes(32),
  pubKeyCredParams: [
    { type: "public-key", alg: -7 },   // ES256
    { type: "public-key", alg: -257 }  // RS256 fallback
  ],
  authenticatorSelection: {
    residentKey: "required",
    userVerification: "preferred"
  },
  attestation: "none",
  excludeCredentials: existingCredentials // prevent duplicate registration
}
```

## Authentication Flow

```
1. Server generates challenge (no user ID needed for discoverable credentials)
2. Client calls navigator.credentials.get({publicKey: options, mediation: "conditional"})
3. Authenticator signs challenge with private key
4. Server verifies: signature, origin, rpIdHash, challenge, signCount > stored
5. Server updates stored signCount, issues session
```

## Anti-Patterns

- Requiring attestation for consumer apps — reduces compatibility, adds no security value
- Using `userVerification: "discouraged"` — skips biometric, weakens 2FA to just possession
- Single passkey per account — device loss = account lockout
- Storing raw attestation blobs — wastes storage, privacy concern, rarely needed
- Falling back to SMS OTP as primary when passkey unavailable — use TOTP or recovery codes

## UX Patterns

- Conditional UI: passkey autofill in username field, zero-click if single credential
- Progressive enrollment: offer passkey creation after successful password login
- Account recovery: backup passkeys (synced), recovery codes, verified email magic link
- Cross-device: QR code + BLE proximity for authenticating on a different device

## Verification

- Registration rejects invalid origin or RP ID mismatch
- Authentication fails with incorrect signature or stale sign count
- Challenge reuse is rejected (single-use enforcement)
- Conditional UI triggers without user interaction on returning visitors
- Multiple credentials per user all work independently
