# Android Security Model: Sandbox, SELinux, Keystore, AVB

TL;DR: Android application sandbox (UID isolation, Binder IPC), permission model,
SELinux domains, hardware-backed keystore and key attestation, Verified Boot (AVB),
SafetyNet/Play Integrity, and APEX modules.

See also: android-native-so-re.md, android-frida-dynamic.md, android-root-bypass-resources.md, android-traffic-forensics-workflow.md

---
## 11. Android Security Model

### 11.1 Application Sandbox

Each app runs as a unique Linux UID in its own Dalvik/ART process. The kernel enforces
process isolation. Inter-process communication (IPC) goes through Binder [25](https://source.android.com/docs/security/app-sandbox).

```
App A (UID 10123)                  App B (UID 10124)
┌─────────────────────┐           ┌─────────────────────┐
│ Zygote fork          │           │ Zygote fork          │
│ Process: a.app      │           │ Process: b.app       │
│ UID/GID: 10123      │           │ UID/GID: 10124       │
│ DAC: app_23         │           │ DAC: app_24          │
│ SELinux: u:r:app:s0 │           │ SELinux: u:r:app:s0  │
└─────────────────────┘           └─────────────────────┘
         │                                │
         └───────── Binder IPC ──────────┘
```

### 11.2 Permission Model

| Type | Description | Check |
|------|-------------|-------|
| Normal | Auto-granted on install | `INTERNET`, `ACCESS_NETWORK_STATE` |
| Dangerous | Runtime prompt (Android 6+) | `CAMERA`, `LOCATION`, `READ_CONTACTS` |
| Signature | Only apps signed with same cert | `BIND_ACCESSIBILITY_SERVICE` |
| SignatureOrSystem | System apps or same cert | `WRITE_SETTINGS` |

Extract permissions from APK:

```bash
# Via aapt
aapt dump permissions myapp.apk

# Via jadx
jadx --show-bad-code myapp.apk -d out && grep -r "permission" out/AndroidManifest.xml

# Via androguard
androguard xml myapp.apk AndroidManifest.xml
```

### 11.3 SELinux on Android

Every app process runs under a SELinux domain defined by `sepolicy` (stored in
`/sys/fs/selinux/policy` on device):

```bash
# Check current context
adb shell ps -Z | grep com.example.app
# Output: u:r:untrusted_app:s0:c42,c256,c512,c768

# Common domains:
# untrusted_app     — third-party apps
# platform_app      — system/jar signed apps
# system_app        — system partition apps
# radio             — telephony
# nfc               — NFC stack
# isolated_app      — isolated services (work profile)
```

SELinux policy is compiled into monolithic binary (`sepolicy`) or split policy files
in `/sys/fs/selinux/load`. Custom policy can be injected via Magisk modules.

### 11.4 Keystore / Key Attestation

Android Keystore provides hardware-backed key storage via TEE (Trusted Execution
Environment). Key attestation proves a key was generated in hardware [26](https://source.android.com/docs/security/keystore/attestation):

```java
// Key attestation flow
KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
ks.load(null);
KeyStore.Entry entry = ks.getEntry("my_key", null);
if (entry instanceof KeyStore.PrivateKeyEntry) {
    PrivateKey key = ((KeyStore.PrivateKeyEntry)entry).getPrivateKey();
    // Use CertificateChain for attestation verification
}
```

Bypassing key attestation is non-trivial — it requires compromising the TEE or
patching the keystore daemon.

### 11.5 Verified Boot (AVB)

Android Verified Boot (AVB) checks partition integrity on every boot using a
dm-verity hash tree rooted in the `vbmeta` partition. ABL (Android Bootloader)
verifies `vbmeta` → `boot` → `system` → `vendor` [27](https://source.android.com/docs/security/features/verifiedboot).

```bash
# Check AVB status
adb shell getprop ro.boot.verifiedbootstate
# Values: green (locked, stock), yellow (locked, custom),

# orange (unlocked)
adb shell getprop ro.boot.flash.locked
# 1 = locked, 0 = unlocked
```

For RE, unlocked bootloader is essential (to flash Magisk, Frida, etc.).

### 11.6 SafetyNet / Play Integrity

SafetyNet (deprecated) → Play Integrity API. Flags:

| Check | What it detects |
|-------|-----------------|
| Device integrity | Bootloader locked, stock ROM |
| Basic integrity | Device is Google-certified |
| CTS profile | Compatible with compatibility test suite |

Common bypass approaches:
- MagiskHide / Zygisk + Shamiko to hide root
- Systemless modules that don't modify `/system`
- Custom kernel without dm-verity

### 11.7 APEX Modules (Android 10+)

APEX is the new system component format — an APK-like container for low-level system
components (ART, Conscrypt, media codecs). APEX files live in `/system/apex/` and
are mounted at boot via `apexd` [28](https://source.android.com/docs/core/ota/apex).

```
/apex/com.android.art/       # ART runtime
/apex/com.android.conscrypt/ # TLS provider
/apex/com.android.media/     # Media codecs
```

RE relevance: the APEX containers hold the actual `libart.so`, `dex2oat`, and
other RE-relevant runtime binaries. Extracting them:

```bash
# List APEX modules
adb shell ls /apex/

# Extract ART APEX for analysis
adb shell cp /apex/com.android.art/current.apex /data/local/tmp/
adb pull /data/local/tmp/current.apex .
unzip current.apex
# Extract the inner IMG (EROFS or ext4) for full analysis
```
