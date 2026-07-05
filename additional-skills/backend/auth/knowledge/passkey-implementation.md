---
type: fact
title: "Passkey Implementation Guide"
---

# Passkey Implementation Guide

## WebAuthn API Overview

Two ceremonies: registration (navigator.credentials.create) and authentication (navigator.credentials.get). Both are promise-based, require secure context (HTTPS), and user gesture.

## Credential Types

| Type | Discoverable | Synced | Use Case |
|------|-------------|--------|----------|
| Synced Passkey | Yes | Yes (cloud keychain) | Consumer apps, passwordless |
| Device-bound Passkey | Yes | No | Enterprise, hardware security keys |
| Non-resident | No | No | Legacy 2FA, security keys as second factor |

## Registration (navigator.credentials.create)

### Server generates options:
```json
{
  "rp": {"id": "example.com", "name": "My App"},
  "user": {"id": "base64url-user-id", "name": "alice@example.com", "displayName": "Alice"},
  "challenge": "base64url-random-32-bytes",
  "pubKeyCredParams": [{"type": "public-key", "alg": -7}],
  "authenticatorSelection": {
    "residentKey": "required",
    "userVerification": "preferred"
  },
  "attestation": "none",
  "excludeCredentials": [{"id": "existing-cred-id", "type": "public-key"}],
  "timeout": 300000
}
```

### Server verifies response:
1. Decode clientDataJSON  -  verify type="webauthn.create", origin, challenge
2. Decode attestationObject  -  extract authData, verify rpIdHash
3. Check flags: UP (user present) must be set, UV (user verified) based on policy
4. Extract credential public key and credential ID from authData
5. Store: credentialId, publicKey (COSE format), signCount, transports, userId

## Authentication (navigator.credentials.get)

### Server generates options:
```json
{
  "challenge": "base64url-random-32-bytes",
  "rpId": "example.com",
  "allowCredentials": [],
  "userVerification": "preferred",
  "timeout": 300000
}
```

Empty `allowCredentials` enables discoverable credential selection (passkey picker).

### Server verifies response:
1. Look up credential by rawId in database
2. Decode clientDataJSON  -  verify type="webauthn.get", origin, challenge
3. Verify rpIdHash matches expected RP ID
4. Verify flags (UP, UV)
5. Verify signature over authData + hash(clientDataJSON) using stored public key
6. Verify signCount > stored signCount (cloning detection)
7. Update stored signCount

## Conditional UI (Autofill)

```javascript
// Check support
if (window.PublicKeyCredential?.isConditionalMediationAvailable) {
  const available = await PublicKeyCredential.isConditionalMediationAvailable();
  if (available) {
    // Add autocomplete="username webauthn" to input field
    const cred = await navigator.credentials.get({
      publicKey: options,
      mediation: "conditional" // non-blocking, shows in autofill
    });
  }
}
```

## UX Best Practices

1. Progressive enrollment: don't block signup on passkey; offer after first password login
2. Show platform-appropriate language: "Face ID", "Touch ID", "Windows Hello", "Fingerprint"
3. Recovery: require 2+ passkeys, offer recovery codes, verified email fallback
4. Cross-device: hybrid transport (QR + BLE) for authenticating on different device
5. Explain value: "Sign in without a password, using your fingerprint or face"

## Common Failures

| Error | Cause | Fix |
|-------|-------|-----|
| NotAllowedError | User cancelled or timeout | Graceful fallback UI |
| SecurityError | Wrong origin or RP ID | Check domain configuration |
| InvalidStateError | Credential already registered | Use excludeCredentials |
| NotSupportedError | Browser/platform unsupported | Feature-detect first |
