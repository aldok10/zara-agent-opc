# APK Structure and Signing

TL;DR: APK archive layout (ZIP structure), signing schemes (v1-v4), ZIP alignment,
and APKTool workflow for decode/rebuild.

Cross-reference: See also `dex-odex-format.md`, `art-runtime-compilation.md` in this directory.

---

## 1. APK Structure

An APK (Android Package Kit) is a ZIP archive containing everything needed to install and
run an Android app. The ZIP is usually uncompressed for classes.dex and resources.arsc
to enable mmap-based loading [1](https://nelenkov.blogspot.com/2012/07/android-app-security-part-1.html).

```
myapp.apk
├── AndroidManifest.xml          # Binary XML (compiled AXML format)
├── classes.dex                  # DEX bytecode (primary). classes2.dex, etc. for multi-dex
├── classes2.dex                 # (optional) secondary dex files
├── classes3.dex                 # (optional)
├── resources.arsc               # Compiled resource table (strings, IDs, configs)
├── res/                         # Resource files (XML, images, raw)
│   ├── layout/                  # Layout XMLs (compiled binary XML)
│   ├── drawable-*/              # Images, 9-patch, drawable XMLs
│   ├── values/                  # strings.xml, colors.xml (compiled)
│   └── ...
├── lib/                         # Native libraries
│   ├── armeabi-v7a/             # 32-bit ARM
│   ├── arm64-v8a/               # 64-bit ARM
│   └── x86/ x86_64/             # x86/x64 (mostly emulators)
├── assets/                      # Raw assets (accessed via AssetManager)
├── kotlin/                      # Kotlin metadata (.kotlin_module)
├── META-INF/                    # Signing & manifest
│   ├── MANIFEST.MF              # SHA-256 digests of all files
│   ├── CERT.RSA                 # Signer certificate + signature (v1 scheme)
│   └── CERT.SF                  # Signature file with digests of MANIFEST.MF entries
└── res/                         # (also under res/ — see above)
```

### 1.1 APK Signing Schemes

Android supports four signing schemes. They are additive; v2/v3/v4 are stored as
**APK Signing Blocks** (a chunk inserted before the Central Directory of the ZIP):

| Scheme | Since | Storage | What it signs |
|--------|-------|---------|---------------|
| v1 (JAR) | API 1 | META-INF/* files | ZIP entries |
| v2 | API 24 (7.0) | APK Signing Block | Whole APK (ZIP contents, excluding Signing Block) |
| v3 | API 28 (9.0) | APK Signing Block | Same as v2 + proof-of-rotation |
| v4 | API 31 (12.0) | APK Signing Block + `.idsig` | Incremental APK install; hash tree |

The APK Signing Block sits right before the Central Directory offset. Its magic is
`0x504B0607` followed by a 64-bit size. The block contains a sequence of **ID-value**
pairs (8-byte little-endian ID plus length-prefixed value) [2](https://source.android.com/docs/security/features/apksigning).

Detection from command line:

```bash
# Parse signing info
apksigner verify --verbose myapp.apk

# Check APK Signing Block presence
xxd -l 8 -s $(( ( $(unzip -l myapp.apk | tail -1 | awk '{print $3}' ) + 22 ) )) myapp.apk
```

### 1.2 ZIP alignment

The APK must be **4-byte aligned** (for mmap). `zipalign` enforces this:

```bash
zipalign -v -p 4 myapp.apk aligned.apk
zipalign -c -v 4 myapp.apk        # verify
```

Misaligned entries cause runtime crashes on Android 11+ for native libs [3](https://developer.android.com/studio/command-line/zipalign).

### 1.3 APKTool workflow

The universal APK unpack/repack tool:

```bash
# Decode (with resources)
apktool d myapp.apk -o myapp_dir

# Decode (without resources, for deodexing)
apktool d myapp.apk -o myapp_dir -s

# Build (rebuild from decoded directory)
apktool b myapp_dir -o myapp_patched.apk

# Build + sign
apktool b myapp_dir && \
  apksigner sign --ks my.keystore myapp_patched.apk

# Display framework info
apktool if framework-res.apk     # install framework for system apps
```

APKTool decodes binary XML and resources.arsc into text form. It also disassembles
classes.dex into Smali using baksmali internally [4](https://apktool.org/).

---

## Sources

1. Nelenkov -- Android App Security Part 1: https://nelenkov.blogspot.com/2012/07/android-app-security-part-1.html
2. AOSP -- APK Signing: https://source.android.com/docs/security/features/apksigning
3. Android Developers -- zipalign: https://developer.android.com/studio/command-line/zipalign
4. APKTool: https://apktool.org/
