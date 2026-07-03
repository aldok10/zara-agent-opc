# macOS/iOS FairPlay DRM and iOS App Binary Analysis

TL;DR: FairPlay DRM detection (cryptid), decryption strategies (lldb dump,
dumpdecrypted, frida-ios-dump, bfdecrypt), and iOS IPA extraction, code signing,
entitlements, embedded.mobileprovision, Info.plist analysis, and binary analysis workflow.

See also: macos-lldb-re-workflow.md, macos-kernel-antire-dtrace.md, macos-objc-runtime.md, macos-swift-runtime-abi.md

---

## 7. FairPlay DRM / App Encryption

App Store binaries are encrypted using Apple's FairPlay DRM. The decryption key
is hardware-bound to the device's Secure Enclave [32][33][34].

### 7.1 Detection

```bash
# Check if a binary is encrypted
otool -l /path/to/binary | grep -A4 LC_ENCRYPTION_INFO

# Output:
# cmd LC_ENCRYPTION_INFO_64
# cmdsize 8
# cryptoff 16384
# cryptsize 13369344
# cryptid 1
```

`cryptid = 1` = encrypted, `cryptid = 0` = decrypted.

The encrypted region covers `__TEXT` from `cryptoff` to `cryptoff + cryptsize`.
The `__PAGEZERO` and `__DATA` segments are typically unencrypted.

### 7.2 Decryption Strategies

**1. Runtime dump via debugger (lldb):**

On a jailbroken device, attach lldb to the running app and dump the
decrypted memory:

```lldb
# Attach to process
(lldb) process attach --name "AppName"

# Find the binary load address
(lldb) image list -o -f AppName

# Dump the entire binary image
(lldb) memory read --outfile /tmp/decrypted.bin --binary --count <size> <load_address>

# Or dump specific segments
(lldb) memory read --outfile /tmp/__text.bin <text_start> <text_end>
```

**2. dumpdecrypted (Stefan Esser):**

The classic tool: https://github.com/stefanesser/dumpdecrypted
Injects a dylib into the running app that writes the decrypted binary:

```bash
# Build dumpdecrypted.dylib (requires jailbroken device SDK)
# Then inject via DYLD_INSERT_LIBRARIES
DYLD_INSERT_LIBRARIES=dumpdecrypted.dylib /path/to/AppName.app/AppName
```

**3. frida-ios-dump:**

Frida-based approach — works on jailbroken devices with frida installed
[35]: https://github.com/Azule/cr4shed/tree/master?tab=readme-ov-file

```bash
# Install
pip install frida-tools

# Dump IPA from connected device
frida-ios-dump --quiet -o decrypted.ipa AppName
```

**4. bfdecrypt / Clutch**

- **bfdecrypt**: https://github.com/BishopFox/bfdecrypt — patches FairPlay at
  the kernel level on jailbroken devices
- **Clutch** (legacy): https://github.com/KJCracks/Clutch — older tool, less
  compatible with modern iOS versions

**5. yacd — Yet Another Crackme Decrypter [36]**

https://github.com/DerekSelander/yacd
Decrypts FairPlay on iOS 13.4.1 and lower without jailbreak (uses an older
vulnerability), but requires a specific toolchain.

### 7.3 Post-Decryption Analysis

After decryption:
1. The `cryptid` field should be patched to 0
2. The decrypted `__TEXT` segment is written to the output
3. The file must be re-signed (`codesign -f -s -`) to run

Verify:
```bash
otool -l decrypted_binary | grep cryptid
# Should show cryptid 0
```

Without decryption, disassemblers show scrambled data (high entropy, no
instruction patterns). After decryption, the actual ARM64 code is visible.

---

## 8. iOS App Binary Analysis

An iOS app distribution is a `.ipa` file (a ZIP archive) [6][37].

### 8.1 IPA Extraction

```bash
# Rename .ipa to .zip and extract
unzip AppName.ipa -d AppName_extracted

# Structure:
# AppName_extracted/
#   Payload/
#     AppName.app/         # the main app bundle
#       AppName            # the Mach-O binary
#       Info.plist         # app metadata
#       embedded.mobileprovision  # provisioning profile
#       Frameworks/        # embedded dylibs and frameworks
#       Plugins/           # app extensions
#       assets.car         # asset catalog
#       *.lproj/           # localized resources
```

### 8.2 Code Signing and Entitlements

Each Mach-O binary has an embedded code signature (LC_CODE_SIGNATURE) that
includes a CMS blob + a dictionary of entitlements [16][38].

Extract entitlements:

```bash
# Using codesign
codesign -d --entitlements - /path/to/AppName.app/AppName

# Using ldid (Linux-command-line IPA analysis)
ldid -e /path/to/AppName.app/AppName

# Using jtool2
jtool2 --ent /path/to/AppName.app/AppName
```

Common entitlements analysis:

```xml
<!-- Restricted capabilities requested -->
<key>keychain-access-groups</key>
<key>com.apple.developer.associated-domains</key>      <!-- Universal Links -->
<key>com.apple.developer.applesign-in</key>             <!-- Sign In with Apple -->
<key>com.apple.security.application-groups</key>        <!-- App Groups -->
<key>com.apple.developer.healthkit</key>                <!-- HealthKit access -->
<key>com.apple.developer.ubiquity-identity-key-value-store</key>  <!-- iCloud -->
<key>com.apple.developer.networking.vpn.api</key>       <!-- VPN/NETunnel -->
<key>com.apple.developer.siri</key>                     <!-- SiriKit -->
<key>com.apple.developer.nfc.readersession.formats</key> <!-- NFC -->
```

Entitlements determine the app's sandbox and system capability boundaries.
Over-entitled apps (requesting more than they need) are a common vulnerability
pattern [6].

### 8.3 embedded.mobileprovision

A cryptographically signed plist containing [37]:
- App ID (`application-identifier`)
- Team ID
- Provisioned devices (for development profiles)
- Entitlements
- Expiration date
- Certificate chain

```bash
# Decode the provisioning profile
security cms -D -i /path/to/AppName.app/embedded.mobileprovision

# Extract as XML
security cms -D -i /path/to/AppName.app/embedded.mobileprovision -o profile.plist
plutil -convert xml1 profile.plist
```

### 8.4 Info.plist Analysis

```bash
plutil -convert xml1 Info.plist
```

Key entries for RE [37]:

| Key | RE relevance |
|-----|-------------|
| `CFBundleExecutable` | Name of the Mach-O binary |
| `CFBundleIdentifier` | Bundle ID (app identity) |
| `CFBundleVersion` / `CFBundleShortVersionString` | Version info |
| `UIRequiredDeviceCapabilities` | Hardware requirements (arm64, opengles-2, gamekit, etc.) |
| `CFBundleURLTypes` | Custom URL schemes (for inter-app communication) |
| `LSApplicationQueriesSchemes` | Apps the app can query (canary URL schemes) |
| `NSAppTransportSecurity` | ATS exceptions / HTTP endpoints |
| `UIBackgroundModes` | Background capability (voip, location, fetch, etc.) |
| `NSFaceIDUsageDescription` / `NSCameraUsageDescription` / etc. | Privacy permission strings |
| `UIApplicationExitsOnSuspend` | Kill-on-background behavior |

### 8.5 Required Device Capabilities

The `UIRequiredDeviceCapabilities` dictionary or array can indicate:
- `arm64`: 64-bit device only
- `armv7`: 32-bit (older)
- `opengles-2`: OpenGL ES 2.0
- `gamekit`: Game Center
- `metal`: Metal GPU API
- `arkit`: ARKit support
- `telephony`: Must have cellular radio
- `wifi`: Must have Wi-Fi
- `nfc`: NFC hardware

A reverse engineer can identify missing capabilities that would limit testing.

### 8.6 Embedded Frameworks and Libraries

```bash
# List dylibs linked
otool -L /path/to/AppName.app/AppName

# List embedded frameworks in IPA
ls -la Payload/AppName.app/Frameworks/

# Check if they are encrypted
for f in Payload/AppName.app/Frameworks/*.framework/*; do
  otool -l "$f" 2>/dev/null | grep -A4 LC_ENCRYPTION_INFO | grep cryptid
done
```

### 8.7 Binary Analysis Workflow

1. Extract .ipa → `unzip AppName.ipa`
2. Identify target arch → `lipo -info Payload/AppName.app/AppName`
3. Check encryption → `otool -l | grep cryptid`
4. Decrypt if needed (jailbroken device) → dumpdecrypted/frida-ios-dump
5. Extract entitlements → `codesign -d --entitlements -`
6. Dump ObjC class info → `otool -ov`, `class-dump`, `dsdump`
7. Analyze Info.plist for capabilities and schemes
8. Check embedded provisioning profile
9. List dependent libraries → `otool -L`
10. Disassemble → Hopper, Ghidra, Binary Ninja
