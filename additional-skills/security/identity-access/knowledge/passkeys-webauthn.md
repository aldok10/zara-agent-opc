# Passkeys and WebAuthn

WebAuthn-based passwordless authentication with passkeys, conditional UI, and cross-device flows.

## What Are Passkeys

Passkeys are discoverable FIDO2 credentials synced across devices via platform authenticators (iCloud Keychain, Google Password Manager, Windows Hello). They replace passwords entirely.

### Key Properties
- **Phishing-resistant**: bound to origin (RP ID), cannot be submitted to wrong site
- **No shared secrets**: asymmetric cryptography, server stores public key only
- **User-friendly**: biometric or device PIN, no typing
- **Synced**: available across user's devices via cloud keychain
- **Replay-resistant**: challenge-response with unique assertion per ceremony

### Passkey vs Security Key

| Feature | Passkey (synced) | Security Key (roaming) |
|---------|-----------------|----------------------|
| Storage | Cloud keychain | Hardware device |
| Backup | Automatic (cloud) | None (device loss = credential loss) |
| Discovery | Discoverable (no username needed) | May require username first |
| Cross-device | Via sync + hybrid flow | Physical presence required |
| Use case | Consumer authentication | High-assurance enterprise |

## WebAuthn API

### Registration (Create Credential)
```
Server                          Browser                      Authenticator
  │                                │                              │
  │ 1. Challenge + RP info         │                              │
  ├───────────────────────────────►│                              │
  │                                │ 2. navigator.credentials     │
  │                                │    .create(options)           │
  │                                ├─────────────────────────────►│
  │                                │                              │
  │                                │ 3. User verification         │
  │                                │    (biometric/PIN)           │
  │                                │                              │
  │                                │◄─────────────────────────────┤
  │                                │ 4. Attestation response      │
  │ 5. Verify + store pubkey       │    (credential ID, pubkey)   │
  │◄───────────────────────────────┤                              │
  │                                │                              │
```

### Authentication (Get Assertion)
```
Server                          Browser                      Authenticator
  │                                │                              │
  │ 1. Challenge (+ allowList      │                              │
  │    or empty for discoverable)  │                              │
  ├───────────────────────────────►│                              │
  │                                │ 2. navigator.credentials     │
  │                                │    .get(options)             │
  │                                ├─────────────────────────────►│
  │                                │                              │
  │                                │ 3. User verification         │
  │                                │                              │
  │                                │◄─────────────────────────────┤
  │                                │ 4. Assertion response        │
  │ 5. Verify signature with       │    (signed challenge)        │
  │    stored public key           │                              │
  │◄───────────────────────────────┤                              │
  │                                │                              │
```

## Conditional UI (Autofill)

Presents passkey option in the browser's autofill dropdown -- no modal UI interruption.

### Implementation
1. Add `autocomplete="webauthn"` to username field
2. Call `navigator.credentials.get()` with `mediation: "conditional"`
3. Browser shows passkey in autofill if available
4. User taps passkey entry -- completes authentication silently

### Benefits
- No separate "Sign in with passkey" button needed
- Graceful fallback: if no passkey, user types password normally
- Discovery: users learn passkeys exist through familiar autofill UI

### When to Use
- Login pages where users may or may not have passkeys
- Progressive migration from passwords to passkeys
- Consumer-facing apps with mixed credential types

## Cross-Device Authentication (Hybrid Flow)

Allows using phone as authenticator for desktop browser session.

```
Desktop Browser                  Phone (Authenticator)
      │                                │
      │ 1. Show QR code                │
      │    (contains BLE advert info)  │
      │                                │
      │                   ◄── User scans QR ──
      │                                │
      │ 2. BLE proximity verification  │
      │◄──────────────────────────────►│
      │                                │
      │ 3. Tunnel established          │
      │    (cloud-assisted CTAP)       │
      │◄──────────────────────────────►│
      │                                │
      │ 4. User verifies on phone      │
      │    (biometric/PIN)             │
      │                                │
      │◄──────────────────────────────►│
      │ 5. Assertion sent via tunnel   │
      │                                │
```

## Server-Side Implementation

### Storage Schema (per credential)
```
credential_id:     bytes (unique identifier)
public_key:        COSE key (algorithm-specific)
sign_count:        uint32 (replay detection)
user_handle:       bytes (user ID, opaque)
rp_id:             string (relying party domain)
transports:        []string (usb, ble, nfc, internal, hybrid)
backed_up:         bool (multi-device credential)
device_type:       string (single_device, multi_device)
created_at:        timestamp
last_used_at:      timestamp
```

### Critical Validations
1. **Origin check**: response origin matches expected RP origin
2. **RP ID hash**: matches SHA-256 of your RP ID in authenticator data
3. **Challenge**: matches server-generated challenge (prevent replay)
4. **User presence (UP) flag**: must be set
5. **User verification (UV) flag**: required for passwordless
6. **Sign count**: must be greater than stored (clone detection)
7. **Algorithm**: matches registered credential's algorithm

## Migration Strategy (Passwords to Passkeys)

### Phase 1: Add Passkeys as Option
- Offer passkey creation in account settings
- Show conditional UI on login (passkey appears in autofill)
- Password still works as fallback

### Phase 2: Encourage Adoption
- Prompt passkey creation after successful password login
- Highlight convenience benefits (no typing, faster)
- Track adoption metrics per platform

### Phase 3: Password Deprecation
- Require passkey for new accounts (password optional)
- Step-up: sensitive operations require passkey even if session was password-initiated
- Eventually: remove password option for accounts with passkeys

### Phase 4: Passwordless Default
- New accounts: passkey only, no password field
- Recovery: passkey on another device, or recovery code
- Password fully deprecated (existing accounts migrated)

## Security Considerations

- **Account recovery**: multiple passkeys + recovery codes + verified email/phone
- **Attestation**: verify in enterprise (confirm device type), skip for consumer
- **Clone detection**: increment sign counter, alert on anomaly
- **Phishing staff**: even with passkeys, social engineering can target recovery flows
- **Browser support**: all major browsers since 2023 -- fallback needed only for ancient clients

## 2026 Context

- Passkey adoption: 2B+ accounts support passkeys (Google, Apple, Microsoft, Amazon)
- Enterprise deployment: Azure AD/Entra, Okta, Duo all support passkeys for workforce
- Payment authentication: EMVCo adopted FIDO for payment confirmation (SPC)
- Attestation improvements: device-bound passkeys for regulated environments
- Signal API: RP can tell provider which credentials to revoke/update
- Credential exchange: portable credentials between providers (early spec)
