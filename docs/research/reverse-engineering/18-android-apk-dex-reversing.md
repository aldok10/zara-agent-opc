# Android APK/DEX/Smali/ART — Reverse Engineering Reference

Authorized-analysis knowledge base. Scope: APK structure, Dalvik bytecode, ART internals,
Smali patching, static/dynamic analysis of Android apps. Use only on binaries you own or
are explicitly authorized to analyze.

Last verified: 2026-06.

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

## 2. DEX / ODEX Format

The DEX (Dalvik EXecutable) format is the compiled bytecode container for Android apps.
Every APK has at least one `classes.dex`. Multi-dex apps use `classes2.dex`, etc. [5](https://source.android.com/docs/core/runtime/dex-format).

### 2.1 DEX Header

The header is 0x70 bytes:

```
Offset  Size  Field               Description
------  ----  ------------------- -------------------------------------------
0x00    8     magic               "dex\n035\0" (or 037, 038, 039)
0x08    4     checksum            Adler-32 of the rest of the file
0x0C    20    signature           SHA-1 of the rest of the file after this
0x20    4     file_size           Total file size
0x24    4     header_size         0x70 (constant)
0x28    4     endian_tag          0x12345678 (little-endian) or 0x78563412
0x2C    4     link_size           Size of the link section
0x30    4     link_off            Offset of the link section
0x34    4     map_off             Offset of the map_list
0x38    4     string_ids_size     Number of string IDs
0x3C    4     string_ids_off      Offset of string_ids table
0x40    4     type_ids_size       Number of type IDs
0x44    4     type_ids_off        Offset of type_ids table
0x48    4     proto_ids_size      Number of proto IDs (method signatures)
0x4C    4     proto_ids_off       Offset of proto_ids table
0x50    4     field_ids_size      Number of field IDs
0x54    4     field_ids_off       Offset of field_ids table
0x58    4     method_ids_size     Number of method IDs
0x5C    4     method_ids_off      Offset of method_ids table
0x60    4     class_defs_size     Number of class definitions
0x64    4     class_defs_off      Offset of class_defs table
0x68    4     data_size           Size of data section
0x6C    4     data_off            Offset of data section
```

Each magic version maps to a runtime: `035` = Dalvik (pre-4.4), `037` = ART (4.4+),
`038` = ART with default methods, `039` = ART with record classes.

### 2.2 ID Tables

These are fixed-size arrays of offsets or indexes:

```
string_ids[]     — each entry is a 4-byte offset into the data section (into the
                   string_pool). Strings are MUTF-8 encoded (modified UTF-8 with
                   multi-byte null as 0xC0 0x80).

type_ids[]       — each entry is a 4-byte index into string_ids (the descriptor,
                   e.g. "Ljava/lang/String;")

proto_ids[]      — each entry is 12 bytes:
                   shorty_idx   (4) — string_idx for the short descriptor (e.g. "(ID)V")
                   return_type_idx (4) — type_idx for the return type
                   params_off   (4) — offset to a type_list or 0 for no params

field_ids[]      — each entry is 8 bytes:
                   class_idx    (2) — type_idx of the defining class
                   type_idx     (2) — type_idx of the field type
                   name_idx     (4) — string_idx of the field name

method_ids[]     — each entry is 8 bytes:
                   class_idx    (2) — type_idx of the defining class
                   proto_idx    (2) — index into proto_ids (signature)
                   name_idx     (4) — string_idx of the method name
```

### 2.3 Class Definitions

Each `class_def` entry is 32 bytes:

```
struct class_def {
    uint32_t class_idx;           // type_idx for this class
    uint32_t access_flags;        // ACC_PUBLIC (0x1), ACC_FINAL (0x10), etc.
    uint32_t superclass_idx;      // type_idx for superclass, or NO_INDEX
    uint32_t interfaces_off;      // offset to type_list for interfaces
    uint32_t source_file_idx;     // string_idx for source file name, or NO_INDEX
    uint32_t annotations_off;     // offset to annotations structure
    uint32_t class_data_off;      // offset to class_data (fields + methods)
    uint32_t static_values_off;   // offset to encoded_array of static initializers
};
```

The `class_data` structure is a ULEB-encoded sequence:

```
ULEB    static_fields_size       // number of static fields
ULEB    instance_fields_size     // number of instance fields
ULEB    direct_methods_size      // number of direct methods (static/private/ctor)
ULEB    virtual_methods_size     // number of virtual methods

For each field (static then instance):
    ULEB   field_idx_diff        // delta-encoded index into field_ids
    ULEB   access_flags

For each method (direct then virtual):
    ULEB   method_idx_diff       // delta-encoded index into method_ids
    ULEB   access_flags
    ULEB   code_off              // offset to code_item, or 0 for abstract/native
```

### 2.4 code_item (Method Body)

```
struct code_item {
    uint16_t registers_size;     // total registers (locals + params)
    uint16_t ins_size;           // parameter register count
    uint16_t outs_size;          // outgoing argument register count
    uint16_t tries_size;         // number of try/catch blocks
    uint32_t debug_info_off;     // offset to debug_info or 0
    uint32_t insns_size;         // size of instruction stream in 16-bit code units
    uint16_t insns[];            // the instruction stream
    // If tries_size > 0: 2-byte padding to 4-byte alignment
    //   followed by try_item[tries_size]
    //   followed by encoded_catch_handler_list
};
```

### 2.5 map_list (TypeMap)

The `map_list` at `map_off` maps out every section in the DEX file. Each entry is 12 bytes:

```
struct map_item {
    uint16_t type;      // TYPE_HEADER (0), TYPE_STRING_ID (1), etc.
    uint16_t unused;
    uint32_t size;      // number of entries
    uint32_t offset;    // offset from start of file
};
```

Over 20 section types exist (TYPE_STRING_ID_ITEM = 0x0001, TYPE_TYPE_ID_ITEM = 0x0002,
TYPE_PROTO_ID_ITEM = 0x0003, TYPE_METHOD_ID_ITEM = 0x0004, TYPE_CLASS_DEF_ITEM = 0x0006,
TYPE_CODE_ITEM = 0x2001, etc.) [5](https://source.android.com/docs/core/runtime/dex-format).

### 2.6 Debug Info

Debug info (offset by `debug_info_off`) encodes line numbers, local variable names,
and source position mappings in a space-efficient state-machine format:

```
ULEB   line_start                // initial line number
ULEB   parameters_size           // number of parameter names
ULEB   parameter_names[]         // string_idx for each parameter, or NO_INDEX
DBG_XXX opcodes follow            // state-machine instructions
```

Key debug opcodes: `DBG_START_LOCAL` (0x03), `DBG_END_LOCAL` (0x05),
`DBG_ADVANCE_LINE` (0x20), `DBG_ADVANCE_PC` (0x01), `DBG_SET_PROLOGUE_END` (0x07),
`DBG_SET_EPILOGUE_BEGIN` (0x08).

### 2.7 Annotations

Annotations are stored as an encoded tree:

```
annotations_directory_item:
    class_annotations_off     // offset to annotation_set_item
    fields_size               // number of field annotations
    methods_size              // number of method annotations
    parameters_size           // number of parameter annotations
    field_annotation[fields_size]  // {field_idx, annotations_off}
    method_annotation[methods_size] // {method_idx, annotations_off}
    parameter_annotation[parameters_size] // {method_idx, annotations_off}
```

Each `annotation_set_item` contains an array of `annotation_off` offsets pointing to
`encoded_annotation` structures: type_idx + ULEB-pairs of name→value.

### 2.8 ODEX Format

ODEX (Optimized DEX) was used on pre-ART Android (Dalvik) — a DEX file with extra
pre-verified information appended. On ART, the equivalent is OAT files (see Section 3).

The Dalvik ODEX format added a `DEX_OPT_HEADER` after the DEX:

```
struct DexOptHeader {
    uint8_t  magic[8];          // "dey\n035\0"
    uint32_t dex_offset;         // offset to raw DEX inside
    uint32_t dex_length;
    uint32_t deps_offset;        // dependency table
    uint32_t deps_length;
    uint32_t opt_offset;         // optimized data section
    uint32_t opt_length;
    uint32_t flags;
    uint32_t checksum;           // of the original DEX
};
```

You rarely encounter ODEX today — ART OAT replaced it entirely.

### 2.9 Parsing DEX programmatically

Using the `dexdump` tool (ships with Android SDK / AOSP):

```bash
# Full disassembly
dexdump -d classes.dex > disassembly.txt

# Header dump
dexdump -h classes.dex

# Bad class data verification
dexdump -c classes.dex

# Raw dump with offsets
dexdump -i classes.dex
```

Using Python with `androguard`:

```python
from androguard.core.bytecodes import dvm, apk

a = apk.APK("myapp.apk")
for dex in a.get_all_dex():
    d = dvm.DalvikVMFormat(dex)
    for cls in d.get_classes():
        print(cls.get_name(), cls.get_methods())
```

---

## 3. ART (Android Runtime)

ART replaced Dalvik in Android 4.4 (experimental) and became the default in 5.0.
It introduced ahead-of-time (AOT) compilation via `dex2oat` [6](https://source.android.com/docs/core/runtime).

### 3.1 OAT File Format

OAT files are ELF binaries wrapping compiled DEX code. The ART compiler generates
native code (ARM64, ARM, x86, x86_64) from DEX bytecode and stores it alongside the
original DEX data:

```
ELF Header
├── .text         # Compiled native code
├── .dex          # Embedded DEX files
├── .oatdata      # OAT header + DEX data
├── .oatexec      # Compiled oat method code
├── .bss          # BSS segment
├── .got          # Global offset table
└── .data         # Runtime data structures
```

The primary OAT files live in `/system/framework/`:

```
/system/framework/
├── boot.oat      # AOT-compiled boot classpath (framework)
├── boot.art      # Boot image (pre-initialized objects, pre-resolved types)
├── arm64/
│   ├── boot.oat
│   └── boot.art
├── x86/
│   ├── boot.oat
│   └── boot.art
└── ...
```

App-specific OAT files live in the dalvik-cache:
```
/data/dalvik-cache/arm64/system@app@myapp-base.apk@classes.dex
```

### 3.2 OAT Header

```c
struct OatHeader {
    uint8_t  magic[4];          // "oat\n"
    uint8_t  version[4];         // "039\0", "045\0", etc.
    uint32_t adler32_checksum;   // of the OAT file
    uint32_t instruction_set;    // kArm64=0, kArm=1, kX86=2, kX86_64=3
    uint32_t instruction_set_features_bitmap;
    uint32_t dex_file_count;     // number of embedded DEX files
    uint32_t oat_dex_file_offset;// offset to OatDexFile array
    uint32_t oat_dex_file_offset_table_size;  // version >= 045
    uint32_t oat_dex_file_offset_table_offset;
    // Pointer-sized fields follow (size varies by architecture):
    uint32_t executable_offset;
    uint32_t jni_dlsym_lookup_offset;
    uint32_t quick_generic_jni_trampoline_offset;
    uint32_t quick_imt_conflict_trampoline_offset;
    uint32_t quick_resolution_trampoline_offset;
    uint32_t quick_to_interpreter_bridge_offset;
    // Key-value store:
    int32_t  key_value_store_size;
    uint8_t  key_value_store[];  // pairs of strings: "compiler-filter" "speed", etc.
};
```

Each `OatDexFile` entry points to an embedded DEX and its compiled code (OatClass
structures).

### 3.3 dex2oat Compilation Pipeline

```
classes.dex → dex2oat → boot.oat (or app.oat)

dex2oat options:
  --compiler-filter=speed            # full AOT
  --compiler-filter=verify           # bytecode verification only
  --compiler-filter=quicken          # quicken instructions only
  --compiler-filter=speed-profile    # profile-guided AOT
  --profile-file=myapp.prof          # profile for selective compilation
  --instruction-set=arm64
  --app-image-to-file=myapp.art
  --generate-mini-debug-info
```

`dex2oat` can run:
1. **Install-time** — when an app is installed (Android 5-6 era)
2. **Background (dexopt)** — via `dex2oat` in the background (Android 7+)
3. **Cloud** — compilation profiles downloaded from Google Play

### 3.4 Profile-Guided Compilation (Android 7+)

The runtime tracks hot methods and stores them in `.dm` (Dex Metadata) files:

```
/data/misc/profiles/cur/0/<package_name>/
├── primary.prof        # method/class hotness profile
└── primary.prof.prompt # (Android 12+) prompt-based metadata
```

The shell command to dump profiles:

```bash
# Generate a profile from runtime data
cmd package compile -f -m speed-profile com.example.app

# Force full AOT
cmd package compile -f -m speed com.example.app

# Reset to interpret-only
cmd package compile -f -m verify com.example.app

# Check current compilation state
cmd package compile -m check-profile com.example.app
```

Profiles are binary and can be inspected with `profman`:

```bash
profman --dump-only --profile-file=primary.prof
```

### 3.5 Quickened Instructions

ART introduced **quickened** opcodes — modified Dalvik instructions where
runtime-resolved data replaces original operands:

| Opcode | Original | Quickened variant |
|--------|----------|-------------------|
| `invoke-virtual` | `0x6E` | `execute-invoke-virtual-quick` (`0xF0`) |
| `invoke-direct` | `0x70` | `execute-invoke-direct-quick` |
| `invoke-static` | `0x71` | `execute-invoke-static-quick` |
| `iget` | `0x52` | `iget-quick` |
| `iput` | `0x59` | `iput-quick` |
| `sget` | `0x60` | `sget-quick` |

Quickened opcodes replace the method/field reference index with a direct vtable index
or field offset, bypassing resolution at runtime. This is a strong sign that an OAT
file has been processed by dex2oat with `--compiler-filter=quicken` or higher.

### 3.6 Image Files (boot.art / app.art)

ART image files (`.art`) contain pre-initialized objects and pre-resolved types that
speed up cold start. They are memory-mapped at a fixed address by the zygote:

```c
struct ArtHeader {
    uint8_t  magic[4];          // "art\n"
    uint8_t  version[4];         // "046\0", etc.
    uint32_t image_begin;        // base address (mmap target)
    uint32_t image_size;         // total image size
    uint32_t image_roots;        // offset to image root objects
    uint32_t oat_checksum;       // checksum of paired boot.oat
    uint32_t oat_file_begin;     // address of boot.oat in process
    uint32_t oat_data_begin;     // address of .oatdata section
    uint32_t pointer_size;       // 4 or 8
    uint32_t compile_pic;        // position-independent
    uint32_t patch_delta;        // relocation delta
    uint32_t image_reservation_size;
    uint64_t bitmap;             // gc/compaction bitmap
    // vdex info follows ...
};
```

### 3.7 Compilation / Compaction (Android 12+)

Artifacts moved to `/ apex /art_build_system/` and `/data/misc/apexdata/com.android.art/`.
The vdex (Verified DEX) format stores verification results:

```bash
# Check vdex files
vdex_recompress -i classes.vdex
# vdex contains: DEX file(s) + verification metadata + quickening info
```

`dexoptanalyzer` determines compilation needs:

```bash
dexoptanalyzer --dex=/data/app/.../base.apk --isa=arm64
    --compiler-filter=speed-profile
```

ART runtime properties can be inspected:

```bash
adb shell getprop | grep dalvik
adb shell dumpsys meminfo com.example.app
adb shell dumpsys package <package> --dex-usage
```

---

## 4. Smali / Baksmali

Smali/baksmali is the assembler/disassembler pair for DEX bytecode. Baksmali translates
a DEX file into human-readable Smali — one `.smali` file per class [7](https://github.com/JesusFreke/smali).

### 4.1 Smali Syntax

```smali
.class public Lcom/example/app/MainActivity;
.super Landroidx/appcompat/app/AppCompatActivity;
.source "MainActivity.java"

# annotations
.annotation build Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/example/app/MainActivity$MyInnerClass;
    }
.end annotation

# static fields
.field private static final TAG:Ljava/lang/String; = "MainActivity"

# instance fields
.field private mCounter:I

# direct methods (static/private/constructors)
.method public static getVersion()Ljava/lang/String;
    .registers 3
    .prologue
    const-string v0, "1.2.3"
    return-object v0
.end method

# virtual methods
.method public getThisAndThat(Ljava/lang/String;)Ljava/lang/String;
    .registers 6
    .param p1, "input"    # Ljava/lang/String;

    .line 42
    invoke-virtual {p0}, Lcom/example/app/MainActivity;->someInternal()Ljava/lang/String;
    move-result-object v0
    .line 43
    .local v0, "internal":Ljava/lang/String;
    new-instance v1, Ljava/lang/StringBuilder;
    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V
    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1

    return-object v1
.end method
```

### 4.2 Register Conventions

| Register | Meaning |
|----------|---------|
| `v0` .. `vN` | Local registers |
| `p0` | `this` reference (non-static methods only) |
| `p1` .. `pN` | Method parameters (after locals count) |
| `v0`-`v15` | First 16 registers (one-byte encoding) |
| `v16`-`v65535` | Wide registers (two-byte encoding) |

The `.registers` directive declares total registers. `.locals` declares only local
registers (params are implied). Example:

```smali
.method public doSomething(II)V
    .registers 6    # total = 6: 4 locals + 2 params
    # p0 = this, p1 = arg1, p2 = arg2
    # v0-v3 are truly local

.method public doSomething(II)V
    .locals 4       # 4 locals
    # same as above — p registers start after locals
```

### 4.3 Field & Method Directives

```
# Field
.field <access_flags> <name>:<type_descriptor>
.field private static TAG:Ljava/lang/String;
.field public count:I

# Method
.method <access_flags> <name>(<param_types>)<return_type>
.method public onClick(Landroid/view/View;)V
.method private static format(Ljava/lang/String;I)Ljava/lang/String;

# Inner class annotation
.annotation build Ldalvik/annotation/EnclosingClass;
    value = Lcom/example/app/MainActivity;
.end.annotation
```

### 4.4 Smali Patching Workflow

Typical patching flow — change a license check:

```bash
# 1. Decode APK
apktool d myapp.apk -o myapp_dir

# 2. Find the target Smali
grep -r "premium" myapp_dir/smali/

# 3. Edit the Smali — e.g., change a conditional jump
# Before:
if-eqz v0, :cond_license_ok
# After:
goto :cond_license_ok

# 4. Rebuild
apktool b myapp_dir -o myapp_patched.apk

# 5. Sign (with debug key)
apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android \
  myapp_patched.apk

# 6. Install
adb install myapp_patched.apk
```

Common Smali patches:

```smali
# NOP out a method body
.method public isLicensed()Z
    .registers 2
    const/4 v0, 0x1
    return v0
.end method

# Skip a root check
if-eqz v0, :cond_skip_root
# → Replace with:
nop
nop         # each 2 bytes

# Force a branch
if-nez v0, :cond_target
# → Replace beginning with:
goto :cond_target

# Bypass a signature check by making it always return null/true
.method public static native getSignature()Ljava/lang/String;
# Patch the native .so, or replace with a Smali method:
.method public static getSignature()Ljava/lang/String;
    .registers 1
    const-string v0, "DEBUG_SIGNATURE"
    return-object v0
.end method
```

### 4.5 Working with Smali Directives

```
.implements          # interface declaration
.annotation          # annotation block
.annotation build    # class/field/method annotation
.annotation system   # VM/system annotation
.annotation runtime  # runtime-retained annotation

.local v0, "var":Ljava/lang/String;   # local variable declaration (debug info)
.end local v0
.restart local v0

.array-data          # array initializer
    .packed 0x0      # packed-switch data
    .sparse-switch   # sparse-switch data

.prologue            # method prologue marker
.line 42             # source line number

# Catch blocks
:try_start
    ...
:try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :handler
    .catchall {:try_start .. :try_end} :catchall
:handler
    ...
:catchall
    ...
.end method
```

### 4.6 Smali Debugging

```bash
# Generate annotated Smali with line numbers
java -jar baksmali.jar d classes.dex -o smali_out

# Assemble back
java -jar smali.jar a smali_out -o classes.dex

# With debug info
java -jar baksmali.jar d classes.dex -o smali_out --debug-info

# With no debug info (cleaner output)
java -jar baksmali.jar d classes.dex -o smali_out --no-debug-info

# Register information
java -jar baksmali.jar d classes.dex -p /parameters/

# Use with jadx for comparison
jadx -d jadx_out myapp.apk   # decompiled Java for comparison
```

---

## 5. Dalvik Bytecode

Dalvik is a **register-based** virtual machine (not stack-based like JVM). Each method
declares its register count and instructions operate on registers directly [8](https://source.android.com/docs/core/runtime/dalvik-bytecode).

### 5.1 Instruction Formats

Each opcode is 8 bits. Instructions are 16-bit (2-byte) aligned and come in predefined
format IDs (the third column of the opcode table):

| Format | Width | Structure |
|--------|-------|-----------|
| `10x` | 2 bytes | `op` |
| `12x` | 2 bytes | `op vA, vB` |
| `11n` | 2 bytes | `op vA, #+B` (4-bit literal) |
| `11x` | 2 bytes | `op vAA` |
| `10t` | 2 bytes | `op +AA` (branch target) |
| `20t` | 4 bytes | `op +AAAA` |
| `22x` | 4 bytes | `op vAA, vBBBB` |
| `21t` | 4 bytes | `op vAA, +BBBB` |
| `21s` | 4 bytes | `op vAA, #+BBBB` (short literal) |
| `23x` | 4 bytes | `op vAA, vBB, vCC` |
| `22b` | 4 bytes | `op vAA, vBB, #+CC` |
| `22s` | 4 bytes | `op vAA, vBB, #+CCCC` |
| `21h` | 4 bytes | `op vAA, #+BBBB0000` (high16 literal) |
| `31t` | 6 bytes | `op vAA, +BBBBBBBB` |
| `32x` | 6 bytes | `op vAAAA, vBBBBBBBB` |
| `35c` | 6 bytes | `op {vC, vD, vE, vF, vG}, ref@BBBB` (invoke with 3-5 args) |
| `3rc` | 6 bytes | `op {vCCCC..v(CCCC+AA-1)}, meth@BBBB` (invoke range) |
| `45cc` | 8 bytes | `op {vC..vG}, meth@BBBB, proto@HHHH` (invoke-polymorphic) |

### 5.2 Key Opcode Groups

**Move instructions:**

| Opcode | Mnemonic | Action |
|--------|----------|--------|
| `0x01` | `move vA, vB` | Move register to register |
| `0x04` | `move-wide vA, vB` | Move 64-bit (long/double) |
| `0x07` | `move-object vA, vB` | Move reference |
| `0x0A` | `move-result vA` | Move result of previous invoke |
| `0x0D` | `move-exception vA` | Move caught exception |
| `0x02` | `move/from16 vAA, vBBBB` | Move with 16-bit destination |
| `0x03` | `move/16 vAAAA, vBBBB` | Move with full 16-bit regs |

**Return instructions:**

| Opcode | Mnemonic |
|--------|----------|
| `0x0E` | `return-void` |
| `0x0F` | `return vAA` |
| `0x10` | `return-wide vAA` |
| `0x11` | `return-object vAA` |

**Const instructions:**

| Opcode | Mnemonic |
|--------|----------|
| `0x12` | `const/4 vA, #+B` (4-bit signed) |
| `0x13` | `const/16 vAA, #+BBBB` |
| `0x14` | `const vAA, #+BBBBBBBB` (32-bit) |
| `0x15` | `const/high16 vAA, #+BBBB0000` |
| `0x16` | `const-wide/16 vAA, #+BBBB` |
| `0x17` | `const-wide/32 vAA, #+BBBBBBBB` |
| `0x18` | `const-wide vAA, #+BBBBBBBBBBBBBBBB` |
| `0x19` | `const-wide/high16 vAA, #+BBBB000000000000` |
| `0x1A` | `const-string vAA, string@BBBB` |
| `0x1B` | `const-string-jumbo vAA, string@BBBBBBBB` |
| `0x1C` | `const-class vAA, type@BBBB` |
| `0x1D` | `monitor-enter vAA` |
| `0x1E` | `monitor-exit vAA` |
| `0x1F` | `check-cast vAA, type@BBBB` |
| `0x20` | `instance-of vA, vB, type@CCCC` |
| `0x21` | `array-length vA, vB` |
| `0x22` | `new-instance vAA, type@BBBB` |
| `0x23` | `new-array vA, vB, type@CCCC` |

**Goto:**

| Opcode | Mnemonic |
|--------|----------|
| `0x28` | `goto +AA` (2-byte) |
| `0x29` | `goto/16 +AAAA` (4-byte) |
| `0x2A` | `goto/32 +AAAAAAAA` (6-byte) |

**Invoke instructions (the most important group):**

| Opcode | Mnemonic | Purpose |
|--------|----------|---------|
| `0x6E` | `invoke-virtual` | Standard virtual dispatch |
| `0x6F` | `invoke-super` | Superclass method call |
| `0x70` | `invoke-direct` | Direct (private/ctor) call |
| `0x71` | `invoke-static` | Static method call |
| `0x72` | `invoke-interface` | Interface method dispatch |
| `0x73` | `invoke-virtual/range` | Range variant (many args) |
| `0x74` | `invoke-super/range` | Range variant |
| `0x75` | `invoke-direct/range` | Range variant |
| `0x76` | `invoke-static/range` | Range variant |
| `0x77` | `invoke-interface/range` | Range variant |
| `0xFA` | `invoke-polymorphic` | Method handle invoke (API 28+) |
| `0xFB` | `invoke-polymorphic/range` | Range variant |

**Compare and Branch:**

| Opcode | Mnemonic |
|--------|----------|
| `0x2D` | `if-eq vA, vB, :target` |
| `0x2E` | `if-ne vA, vB, :target` |
| `0x2F` | `if-lt vA, vB, :target` |
| `0x30` | `if-ge vA, vB, :target` |
| `0x31` | `if-gt vA, vB, :target` |
| `0x32` | `if-le vA, vB, :target` |
| `0x38` | `if-eqz vAA, :target` (compare with zero) |
| `0x39` | `if-nez vAA, :target` |
| `0x3A` | `if-ltz vAA, :target` |
| `0x3B` | `if-gez vAA, :target` |
| `0x3C` | `if-gtz vAA, :target` |
| `0x3D` | `if-lez vAA, :target` |

**Array / Instance / Static operations:**

```
*aget*        — array get (aget, aget-wide, aget-object, aget-boolean, etc.)
*aput*        — array put
*iget*        — instance field get
*iput*        — instance field put
*sget*        — static field get
*sput*        — static field put
```

**Switch / Fill data:**

```
packed-switch vAA, :table                      # 0x2B
sparse-switch vAA, :table                      # 0x2C
fill-array-data vAA, :table                    # 0x26
```

Data table layout (packed):

```
uint16_t  ident    = 0x0100  (packed) or 0x0200 (sparse) or 0x0300 (array)
uint16_t  size
uint32_t  first_key             (packed) / key[size] (sparse)
uint32_t  targets[size]         (packed)
```

### 5.3 Quickened Opcodes (ART-specific)

When dex2oat runs with `--compiler-filter=quicken`, it replaces opcodes to skip
runtime resolution. Smali disassembled from OAT often shows these:

| Opcode | Quick Name | Original |
|--------|-----------|----------|
| `0xF0` | `invoke-virtual-quick` | `invoke-virtual` |
| `0xF1` | `invoke-virtual-quick/range` | `invoke-virtual/range` |
| `0xF2` | `invoke-super-quick` | `invoke-super` |
| `0xF3` | `invoke-super-quick/range` | `invoke-super/range` |
| `0xF4` | `iput-quick` | `iput` |
| `0xF5` | `iget-quick` | `iget` |
| `0xF6` | `iput-wide-quick` | `iput-wide` |
| `0xF7` | `iget-wide-quick` | `iget-wide` |
| `0xF8` | `iput-object-quick` | `iput-object` |
| `0xF9` | `iget-object-quick` | `iget-object` |
| `0xFC` | `sput-quick` | `sput` |
| `0xFD` | `sget-quick` | `sget` |

Quickened opcodes replace method/field indexes with vtable or field-offset values.
To revert, run `dex2oat --compiler-filter=verify` to re-verify without quickening,
or use a tool that handles quickened DEX.

---

## 6. Java → DEX Decompilation Tools

These tools lift DEX bytecode back to readable Java source with varying quality.

### 6.1 jadx (The Gold Standard)

The most widely used Android decompiler — supports GUI, CLI, and script modes [9](https://github.com/skylot/jadx).

```bash
# Decompile APK to Java source
jadx myapp.apk -d output_dir

# Decompile DEX directly
jadx classes.dex -d output_dir

# Decompile with resources
jadx --show-bad-code myapp.apk -d output_dir

# Export as Gradle project
jadx --export-gradle myapp.apk -d output_dir

# Decompile only specific package
jadx -d output_dir --include 'com.example.*' myapp.apk

# Deobfuscation mode (rename ambiguous classes/methods)
jadx --deobf myapp.apk -d output_dir

# Flatten hierarchy (no package directories)
jadx --no-inline-anonymous --no-restore-inner-class --flatten-hierarchy myapp.apk

# Run in GUI
jadx-gui myapp.apk
# GUI features: search by class/string, goto declaration, find usage,
# export to Gradle, show Smali alongside Java
```

Key features:
- Recovers try/catch, enhanced-for, switch, anonymous classes, lambdas
- Resource decoding (AndroidManifest, layouts, strings)
- Deobfuscation mapping export
- DSL for custom post-processing (jadx plugins)

### 6.2 CFR (ClassyShark's engine alternative)

CFR was designed for JARs but also works on DEX via enjarify bridge [10](https://github.com/leibnitz/cfr):

```bash
# Convert DEX to JAR first
enjarify classes.dex -o classes.jar
# Then decompile
java -jar cfr.jar classes.jar --outputdir ./cfr_output
```

### 6.3 Procyon / Fernflower

Procyon handles complex control flow well. Fernflower was the original IntelliJ engine:

```bash
# Procyon (via jadx or standalone)
java -jar procyon-decompiler.jar -o output classes.jar

# Fernflower (now part of IntelliJ; standalone jar available)
java -jar fernflower.jar classes.jar output/
```

### 6.4 dex2jar + JD-GUI

The classic pipeline — convert to JAR then decompile with JVM tools [11](https://github.com/pxb1988/dex2jar):

```bash
# Convert DEX to JAR
d2j-dex2jar.sh classes.dex -o classes.jar

# Convert entire APK
d2j-dex2jar.sh myapp.apk -o myapp.jar

# Decompile with JD-GUI (GUI)
jd-gui myapp.jar

# Decompile with jad (CLI, outdated)
jad -r -d output -s java classes/**/*.class
```

dex2jar remains useful when you need JAR-level analysis (e.g., with Procyon).

### 6.5 enjarify (Better than dex2jar)

Google's enjarify produces more correct JAR output than dex2jar, especially for
obfuscated DEX [12](https://github.com/Storyyeller/enjarify):

```bash
enjarify myapp.apk -o myapp.jar
enjarify classes.dex -o classes.jar
```

### 6.6 JEB (Commercial)

JEB Pro by PNF Software is the premium Android reverse engineering platform.
It handles DEX, APK, OAT, and native ARM/x86 with cross-references, decompilation,
and debugging all in one interface. Tiered licensing (Decompiler, Pro, Pro + debugger).

### 6.7 Bytecode Viewer

A multi-tool Swiss Army knife that bundles Krakatau, CFR, Procyon, Fernflower,
and JD-GUI in one interface [13](https://github.com/Konloch/Bytecode-Viewer):

```bash
java -jar BytecodeViewer.jar
# Supports APK, DEX, JAR, CLASS
# Built-in search, Smali viewer, hex viewer
```

### 6.8 Tool Comparison

| Tool | DEX input | Output | Quality | Best for |
|------|-----------|--------|---------|----------|
| **jadx** | Direct APK/DEX | Java + resources | Best overall | Default choice |
| **CFR** | JAR only | Java | Very good (complex CFG) | When jadx struggles with control flow |
| **Procyon** | JAR only | Java | Good (enum/switch) | Specialized constructs |
| **JEB** | Direct APK/DEX/OAT | Java + IR | Best commercial | Professional RE |
| **dex2jar + JD** | DEX→JAR | Java | Fair (often wrong) | Quick triage |
| **enjarify + CFR** | DEX→JAR | Java | Good | Correct JAR conversion |
| **Bytecode Viewer** | APK/DEX/JAR | Multi-engine | Aggregate | Engine comparison |
| **Androguard** | DEX programmatic | Python API | Any | Custom analysis scripts |

---

## 7. Android RE Toolchains

### 7.1 APKTool (Resource + Smali)

As covered in Section 1.3 and 4.4. The primary APK unpack/repack tool [4](https://apktool.org/).

```bash
apktool d app.apk -o out/       # decode
apktool b out/ -o patched.apk   # build
```

### 7.2 jadx (Decompilation)

Covered in Section 6.1. Best static analysis entry point.

### 7.3 Frida for Android

Dynamic instrumentation — inject JavaScript to hook Java or native methods at runtime [14](https://frida.re/docs/android/):

```bash
# Install Frida server on device
adb root
adb push frida-server-arm64 /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server-arm64
adb shell /data/local/tmp/frida-server-arm64 &

# Basic hooks
frida -U com.example.app -l script.js

# Trace all methods in a class
frida-trace -U com.example.app -j 'com.example.app.*!*'

# Spawn and attach (before any code runs)
frida -U -f com.example.app -l script.js --no-pause
```

Example Frida script — hook and modify return value:

```javascript
Java.perform(function() {
    var MainActivity = Java.use('com.example.app.MainActivity');

    // Hook a method and replace return
    MainActivity.isLicensed.implementation = function() {
        console.log('[+] isLicensed called — returning true');
        return true;
    };

    // Hook constructor
    MainActivity.$init.implementation = function() {
        console.log('[+] MainActivity constructor');
        this.$init();
    };

    // Hook static method
    MainActivity.getSignature.implementation = function() {
        return 'PATCHED_SIGNATURE';
    };

    // Dump arguments and modify
    var StringBuilder = Java.use('java.lang.StringBuilder');
    StringBuilder.toString.implementation = function() {
        var result = this.toString();
        console.log('StringBuilder.toString: ' + result);
        return result;
    };

    // Trace loaded classes
    Java.enumerateLoadedClasses({
        onMatch: function(className) {
            if (className.includes('com.example')) {
                console.log('Loaded: ' + className);
            }
        },
        onComplete: function() {}
    });
});
```

### 7.4 Objection (Frida-based exploration)

Runtime exploration toolkit built on Frida [15](https://github.com/sensepost/objection):

```bash
# Launch objection on device
objection -g com.example.app explore

# Inside objection console:
android hooking list classes
android hooking list class_methods com.example.app.MainActivity
android hooking generate simple com.example.app.MainActivity
android hooking set return_value "com.example.app.utils.LicenseChecker.isLicensed" boolean false

# Disable SSL pinning
android sslpinning disable

# Dump memory
android heap search instances com.example.app.model.User

# Search for strings in heap
memory search "password"

# Export all file system data for analysis
ls /data/data/com.example.app/
```

### 7.5 Mobile Security Framework — MobSF

Automated static + dynamic analysis pipeline [16](https://github.com/MobSF/Mobile-Security-Framework-MobSF):

```bash
# Run MobSF
docker pull opensecurity/mobile-security-framework-mobsf
docker run -it -p 8000:8000 opensecurity/mobile-security-framework-mobsf

# Upload APK via web UI at http://localhost:8000
# Static analysis: permissions, components, data flow, cert analysis
# Dynamic analysis: requires Android VM/emulator setup
```

### 7.6 Android Studio / DDMS

Dalvik Debug Monitor Server — part of Android Studio:

```
Android Studio → Profile or Debug app
  → Monitor: CPU, memory, network, energy
  → Method tracing (.trace file) — view call tree
  → Heap dump (.hprof) — analyze with MAT (Eclipse Memory Analyzer)
  → Network inspector — see all HTTP/HTTPS traffic
```

```bash
# Generate method trace from command line
adb shell am profile start com.example.app /data/local/tmp/app.trace
# ... use the app ...
adb shell am profile stop com.example.app

# Pull trace file
adb pull /data/local/tmp/app.trace .

# Capture heap dump
adb shell am dumpheap com.example.app /data/local/tmp/app.hprof
adb pull /data/local/tmp/app.hprof .
```

### 7.7 Drozer

Security assessment framework — discover attack surfaces via Android IPC [17](https://github.com/WithSecureLabs/drozer):

```bash
# Install drozer agent on device, connect
adb forward tcp:31415 tcp:31415
drozer console connect

# Enumerate attack surface
dz> run app.package.attacksurface com.example.app
dz> run app.activity.info -a com.example.app
dz> run app.provider.info -a com.example.app
dz> run app.service.info -a com.example.app
dz> run app.broadcast.info -a com.example.app

# Test content provider leakage
dz> run app.provider.query content://com.example.app.provider/users/

# Check for exported activities
dz> run app.activity.start --action android.intent.action.VIEW \
    --data-uri "http://evil.com" com.example.app
```

### 7.8 Androguard

Python framework for APK/DEX analysis with a powerful CLI [18](https://github.com/androguard/androguard):

```bash
# Basic APK info
androguard axplorer myapp.apk

# DEX analysis
androlyze.py -s myapp.apk <<< 'print(list(d.get_classes()))'

# Decompile all methods to Smali
androlyze.py -s myapp.apk <<< '
a, d, dx = AnalyzeAPK("myapp.apk")
for cls in d.get_classes():
    for m in cls.get_methods():
        print(m.get_name(), m.get_descriptor())
'

# Permission analysis
androguard permissions myapp.apk
```

### 7.9 radare2 / rizin for DEX

```bash
radare2 classes.dex
> iI          # show DEX header
> ic          # list classes
> il          # list methods
> afl         # list functions
> s sym.MainActivity.onCreate  # seek to method
> pdf         # disassemble function
> V           # enter visual mode
```

### 7.10 Ghidra DEX Support

Ghidra supports DEX via its Dalvik processor module:

```bash
# Import DEX file into Ghidra
# Language: Dalvik (all versions)
# Analyzer: Dalvik Decompiler (experimental)

# Headless mode
ghidraHeadless /tmp/projects MyProject \
  -import classes.dex \
  -postScript DumpClasses.java
```

---

## 8. Obfuscation and Deobfuscation

### 8.1 ProGuard / R8

ProGuard (now R8 is default in Android Gradle Plugin) is the standard Android code
shrinker/obfuscator [19](https://developer.android.com/build/shrink-code):

**What it does:**
- Renames classes, methods, fields to short meaningless names (`a`, `b`, `c`)
- Inlines short methods
- Removes dead code
- String encryption (ProGuard only with `-optimizationpasses`)

**Detection:**

A heavily ProGuard'd app shows classes named `a.a.a`, `b.c.d`, etc. In jadx:
```java
package a.a;

public class a {
    private String a;
    public void a(String a) { this.a = a; }
    public String a() { return this.a; }
}
```

**R8 mapping file recovery:**

ProGuard/R8 outputs a `mapping.txt` with deobfuscation data:

```
com.example.app.MainActivity -> a.a:
    com.example.app.utils.Logger log -> a
    void onCreate(android.os.Bundle) -> a
    boolean isLicensed() -> b
    int getVersionCode() -> c
```

This mapping can be re-applied by jadx:

```bash
# Apply mapping while decompiling
jadx --deobf --deobf-mapping mapping.txt myapp.apk -d output

# Or reverse the mapping with proguard tools
java -jar proguard.jar @retrace.conf mapping.txt obfuscated.txt
```

### 8.2 String Encryption

Common patterns in jadx output:

```java
// Direct string decryption in code
String key = "aB3dEf...";
String encrypted = "xYz...";
String decrypted = new String(Base64.decode(encrypted, 0));
// Now `decrypted` is used — the real string is runtime-derived

// Reflection-based decryption
private static String decrypt(int key, int seed) {
    char[] chars = new char[] { /* long char array */ };
    // XOR loop
    return new String(chars);
}
```

To recover strings interactively with Frida:

```javascript
Java.perform(function() {
    var Cls = Java.use('com.example.app.StringDecryptor');
    Cls.decrypt.implementation = function(key, seed) {
        var result = this.decrypt(key, seed);
        console.log('decrypt(' + key + ', ' + seed + ') = ' + result);
        return result;
    };
});
```

### 8.3 Control-Flow Obfuscation

Opaque predicates and bogus branches confuse decompilers:

```java
// Opaque predicate — always-true/always-false condition
if (System.currentTimeMillis() > 0) {
    // real path
} else {
    // dead code (bogus)
}

// Control-flow flattening (DexGuard specialty)
// Instead of:
if (a) { A(); } else { B(); }
// You get:
int state = a ? 1 : 2;
while (true) {
    switch(state) {
        case 1: A(); state = 3; break;
        case 2: B(); state = 3; break;
        case 3: return;
    }
}
```

DexGuard/DashO use this extensively. jadx handles simple opaque predicates well,
but may fail on deep-nested flattened dispatch loops.

### 8.4 DexGuard / DashO

Commercial Android obfuscators with advanced features:

| Feature | DexGuard | DashO | 360 Jiagu | Tencent Legu |
|---------|----------|-------|-----------|-------------|
| Name obfuscation | Yes | Yes | Yes | Yes |
| String encryption | Yes | Yes | Yes | Yes |
| Class encryption | Load-time | Load-time | Full dex | Full dex |
| CFG flattening | Yes | Yes | No | Limited |
| Reflection calls | Yes | Yes | Yes | Yes |
| Native protection | .so packer | Optional | ELF packer | ELF packer |
| Anti-tamper | Yes | Yes | Yes | Yes |
| Anti-debug | Yes | Yes | Yes | Yes |

**360 Jiagu (Qihoo 360)** unpacks the real DEX from encrypted native code at runtime.
The unpacking technique is: the app's real classes.dex is small (a stub). The
actual DEX is loaded into memory by native code (`libjiagu.so`) after decryption
and anti-tamper checks. Extracting the real DEX requires Frida memory dumping
(see Section 15).

**Tencent Legu** similarly packs the DEX and hooks `DexClassLoader` to serve
decrypted bytes at load time.

### 8.5 OLLVM for Native .so

OLLVM (Obfuscator-LLVM) applies to C/C++ native libraries — control-flow
flattening, bogus control flow, instruction substitution [20](https://github.com/obfuscator-llvm/obfuscator):

```bash
# Externally observable
strings libnative.so | head -20   # all strings are encrypted or XOR'd
# Disassembly shows:
# - Constant arrays instead of direct values
# - Redundant arithmetic (substitution)
# - Flattened switch dispatch
# - Bogus conditional branches
```

Detection: search for unique OLLVM patterns in Ghidra or IDA — flattened dispatch
with `switch` to a state variable, blocks ending in `mov` + `b` to a dispatch block.

---

## 9. Native Library (.so) RE

Android apps ship native ARM/ARM64 libraries in `lib/<abi>/`. JNI (Java Native Interface)
maps Java methods to C/C++ functions [21](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/functions.html).

### 9.1 JNI Function Naming Convention

The standard naming pattern for JNI exports:

```
Java_<package>_<class>_<method>
  where dots → underscores, package separators → /
  e.g. com/example/app/NativeLib → Java_com_example_app_NativeLib_getKey

Special characters are mangled:
  _ → _1
  / → _2
  $ → _00024 (Unicode for $)
```

Example disassembly in Ghidra/IDA:

```c
// JNI function signature
JNIEXPORT jstring JNICALL
Java_com_example_app_NativeLib_getKey(JNIEnv *env, jobject thiz) {
    // native key derivation
}

// JNIEnv is a pointer to a function table (JNINativeInterface)
// env->FindClass, env->GetMethodID, env->CallStringMethod, etc.
```

### 9.2 Dynamic Registration (RegisterNatives)

Many apps use `JNI_OnLoad` + `RegisterNatives` to avoid the verbose naming convention:

```c
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env;
    (*vm)->GetEnv(vm, (void**)&env, JNI_VERSION_1_6);

    JNINativeMethod methods[] = {
        {"nativeInit",    "(Landroid/content/Context;)V", (void*)my_native_init},
        {"nativeProcess", "([B)[B",                       (void*)my_native_process},
    };
    jclass clazz = (*env)->FindClass(env, "com/example/app/NativeLib");
    (*env)->RegisterNatives(env, clazz, methods, 2);

    return JNI_VERSION_1_6;
}
```

This breaks the name-based export convention. Finding methods requires:
1. Locating `JNI_OnLoad` (exported function)
2. Tracing the `RegisterNatives` call
3. Matching `JNINativeMethod.name` + `signature` → function pointer

Frida can enumerate dynamically registered methods:

```javascript
// Find all native methods in a class
Java.perform(function() {
    var clazz = Java.use('com.example.app.NativeLib');
    var methods = clazz.class.getDeclaredMethods();
    methods.forEach(function(m) {
        console.log(m.getName() + ' ' + m.toGenericString());
    });
});
```

### 9.3 ARM32 vs ARM64 Analysis

```
ARM32 (armeabi-v7a):
  - Thumb-2 instruction set (2 or 4 byte instructions)
  - 16 registers (r0-r12, sp, lr, pc)
  - Arguments: r0-r3, rest on stack
  - Return: r0 (32-bit), r0-r1 (64-bit)

ARM64 (arm64-v8a):
  - AArch64 fixed 4-byte instructions
  - 31 general-purpose registers (x0-x30)
  - Arguments: x0-x7, rest on stack
  - Return: x0 (64-bit)
  - SP must be 16-byte aligned
```

```bash
# Check architecture of native lib
readelf -h libnative.so | grep Machine
# or
file libnative.so

# List JNI exports
nm -D libnative.so | grep Java_
objdump -T libnative.so | grep Java_

# Dump dynamic registrations (if symbols available)
objdump -t libnative.so | grep -i native

# Disassemble a specific function
arm-linux-androideabi-objdump -d libnative.so \
  --start-address=0x1234 --stop-address=0x1300
```

### 9.4 Reversing .so Workflow

```bash
# 1. Extract native libraries
unzip -j myapp.apk "lib/arm64-v8a/*" -d native_libs/

# 2. Quick triage
file native_libs/*.so
readelf -h native_libs/libnative.so
readelf -d native_libs/libnative.so | grep NEEDED

# 3. List strings (may be obfuscated)
strings native_libs/libnative.so | head -100

# 4. Find JNI functions
nm -D native_libs/libnative.so 2>/dev/null | grep -E "Java_|JNI_"

# 5. Import into Ghidra
# Language: AARCH64 (or ARM32)
# Add libc.so, libm.so, liblog.so, libandroid.so as dependent libraries

# 6. Frida trace native calls
frida-trace -U com.example.app -i "libnative.so!*"
```

### 9.5 Native Anti-RE in .so

Common protections in packed/obfuscated .so:

```
- String obfuscation (XOR every string at runtime)
- JNI function table encryption (decrypt on JNI_OnLoad)
- ptrace anti-debug (PTRACE_TRACEME to prevent debugger attach)
- CRC integrity checks of loaded segments
- /proc/self/status "TracerPid" check
- Linker symbol hiding (strip all exports except JNI_OnLoad)
```

---

## 10. Dynamic Analysis

### 10.1 Frida Scripting (Advanced)

```javascript
// Class tracing — intercept all methods in a class
Java.perform(function() {
    var target = Java.use('com.example.app.utils.CryptoUtils');
    var methods = target.class.getDeclaredMethods();
    methods.forEach(function(method) {
        var name = method.getName();
        var overloads = target[name].overloads;
        overloads.forEach(function(overload) {
            overload.implementation = function() {
                console.log('[+] ' + name + ' called | args: ' +
                    JSON.stringify(Array.prototype.slice.call(arguments)));
                var ret = this[name].apply(this, arguments);
                console.log('[+] ' + name + ' returned: ' + ret);
                return ret;
            };
        });
    });
});

// Runtime DEX dumping (extract loaded DEX classes)
Java.perform(function() {
    Java.enumerateClassLoaders({
        onMatch: function(loader) {
            try {
                var clazz = loader.loadClass('com.example.app.MainActivity');
                console.log('Found class on loader: ' + loader);
                // Use Frida's DexDump gadget or Fridump for full extraction
            } catch(e) {}
        },
        onComplete: function() {}
    });
});

// Hook native functions (via NativeFunction)
var getKey = new NativeFunction(
    Module.findExportByName('libnative.so', 'Java_com_example_app_NativeLib_getKey'),
    'pointer', ['pointer', 'pointer']
);
Interceptor.attach(getKey, {
    onEnter: function(args) {
        console.log('getKey called');
    },
    onLeave: function(retval) {
        console.log('getKey returned: ' + retval.readCString());
    }
});
```

### 10.2 Xposed / LSPosed Framework

Xposed hooks into the Zygote process to modify app behavior before any app code runs.
LSPosed is the modern implementation for ART (Android 8-14) [22](https://github.com/LSPosed/LSPosed):

```java
// Xposed module example
public class HookModule implements IXposedHookLoadPackage {
    public void handleLoadPackage(XC_LoadPackage.LoadPackageParam lpparam) {
        if (!lpparam.packageName.equals("com.example.app")) return;

        XposedHelpers.findAndHookMethod(
            "com.example.app.MainActivity",
            lpparam.classLoader,
            "isLicensed",
            new XC_MethodReplacement() {
                @Override
                protected Object replaceHookedMethod(MethodHookParam param) {
                    return true;
                }
            }
        );
    }
}
```

Xposed vs Frida trade-offs:

| Aspect | Xposed/LSPosed | Frida |
|--------|---------------|-------|
| Persistence | Module installed permanently | Per-session script injection |
| Root required | Yes | Yes |
| API level | Java-only hooks | Java + native + in-memory |
| Zygote hook | Yes (catch all apps) | Per-process |
| Stealth | Lower (known signature) | Higher (if using Frida-gadget) |
| Setup | Magisk module | Push server / Gadget injection |

### 10.3 Magisk

Systemless root — essential for running Frida, LSPosed, objection [23](https://github.com/topjohnwu/Magisk):

```bash
# Install Magisk via custom recovery (TWRP) or patched boot.img
# Magisk modules for RE:
#   - Frida Server
#   - LSPosed
#   - Busybox
#   - Systemless ADB

# Hide root from target app
# MagiskHide → select app
# Or: Zygisk + Enforce DenyList
```

### 10.4 Runtime Method Tracing

```bash
# Method trace with simple timing
adb shell echo "stop" > /proc/`pgrep com.example.app`/method-trace

# ART tracing
adb shell setprop dalvik.vm.method-trace true
# Restart app, use it, then:
adb pull /data/misc/trace/dmtrace.trace .

# Simple log-based tracing (Frida one-liner)
frida -U com.example.app -e "Java.perform(function() {
    Java.use('com.example.app.MainActivity').onClick.implementation =
        function(v) { console.log('onClick'); this.onClick(v); };
})"
```

### 10.5 SSL Pinning Bypass

Most apps implement certificate pinning. Bypass methods:

**Frida universal script (objection's behind the scenes):**

```javascript
// Override TrustManager
Java.perform(function() {
    var TrustManager = Java.use('javax.net.ssl.TrustManager');
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');

    var TrustManagerClass = Java.registerClass({
        name: 'com.example.MyTrustManager',
        implements: [X509TrustManager],
        methods: {
            checkClientTrusted: function(chain, authType) {},
            checkServerTrusted: function(chain, authType) {},
            getAcceptedIssuers: function() { return []; }
        }
    });

    var trustManager = TrustManagerClass.$new();
    var sslContext = SSLContext.getInstance('TLS');
    sslContext.init(null, [trustManager], null);

    // Also patch OkHttp/HttpURLConnection
});
```

Using objection:

```bash
objection -g com.example.app explore
android sslpinning disable
```

Using Frida directly:

```bash
# Using the well-known universal SSL bypass script
frida -U com.example.app -l frida-android-repinning.js

# Native SSL library hook (for apps using native TLS)
frida -U com.example.app -e "Interceptor.attach(
    Module.findExportByName('libssl.so', 'SSL_CTX_set_verify'),
    { onEnter: function(args) { args[2] = ptr(0); } }
)"
```

### 10.6 r0capture

Dedicated Android traffic capture tool using Frida to dump SSL traffic [24](https://github.com/r0ysue/r0capture):

```bash
# Capture all SSL traffic from an app
python r0capture.py -U com.example.app -p capture.pcap

# The output is a pcap file — open in Wireshark
```

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

---

## 12. Root Detection Bypass

### 12.1 Common Root Checks

Apps detect root using various methods [29](https://www.optiv.com/insights/source-zero/blog/techniques-bypass-android-root-detection):

**Binary existence checks:**

```bash
# Files an app might check:
/sbin/su
/system/bin/su
/system/xbin/su
/system/sd/xbin/su
/data/local/xbin/su
/data/local/bin/su
/system/app/Superuser.apk
/system/app/SuperSU.apk
/data/data/com.topjohnwu.magisk/
```

**Runtime checks:**

```java
// Build tag check
boolean isRooted = "test-keys".equals(Build.TAGS);

// Which su
try {
    String[] commands = {"/system/xbin/which", "su"};
    Process p = Runtime.getRuntime().exec(commands);
    // if inputStream has content → su exists
} catch (Exception e) { }

// Superuser binary execution
try {
    Process p = Runtime.getRuntime().exec("su -c id");
    // if process starts successfully → rooted
} catch (Exception e) { }

// Magisk detection
try {
    Class.forName("com.topjohnwu.magisk.core.Provider");
    // likely rooted
} catch (ClassNotFoundException e) { }

// /proc/1/uid (init process)
// Read /proc/1/uid — normally 0 on rooted
```

### 12.2 Bypass Techniques

**Frida hook for build tag:**

```javascript
Java.perform(function() {
    var Build = Java.use('android.os.Build');
    Build.TAGS.value = 'release-keys';  // original: 'test-keys'

    var File = Java.use('java.io.File');
    File.exists.implementation = function() {
        var path = this.getAbsolutePath();
        var blocked = ['/system/app/Superuser.apk',
                       '/system/xbin/su',
                       '/data/data/com.topjohnwu.magisk',
                       '/data/local/tmp/frida-server'];
        if (blocked.includes(path)) {
            console.log('[+] Blocked root check: ' + path);
            return false;
        }
        return this.exists();
    };
});
```

**Frida hook for su execution:**

```javascript
Java.perform(function() {
    var Runtime = Java.use('java.lang.Runtime');
    Runtime.exec.overload('[Ljava.lang.String;').implementation = function(cmd) {
        var cmdStr = cmd.join(' ');
        console.log('[+] exec called: ' + cmdStr);
        if (cmdStr.includes('su') || cmdStr.includes('which su')) {
            console.log('[+] Blocked su check');
            throw new Error('Permission denied');
        }
        return this.exec(cmd);
    };
});
```

**Objection bypass:**

```bash
objection -g com.example.app explore
android root disable    # generic root check bypass
```

**LSPosed module:**
Modules like "RootCloak" or custom hooks in LSPosed can block root detection for
specific apps.

### 12.3 Detection Evasion (Magisk)

Magisk itself uses Zygisk + DenyList to hide from detection:

```bash
# Magisk settings to maximize stealth:
# 1. Magisk app → Settings → Hide Magisk App (repackaged name)
# 2. Magisk app → Settings → Zygisk: ON
# 3. Magisk app → Configure DenyList → add target app
# 4. Install Shamiko module (hides Zygisk + DenyList traces)
# 5. Use MagiskHide Props Config to spoof fingerprint + props
```

---

## 13. Resources and Assets Analysis

### 13.1 resources.arsc Binary Format

The Android Resource Table (`resources.arsc`) is a binary file that maps resource
IDs (e.g., `0x7f010000`) to configuration-specific values [30](https://justanapplication.wordpress.com/2011/09/16/a-closer-look-at-android-resources-part-1/).

```
ResTable_header (12 bytes):
    uint16_t header.type      = 0x0002 (RES_TABLE_TYPE)
    uint16_t header.headerSize = 0x000C (12 bytes)
    uint32_t header.size      = total file size
    uint32_t packageCount     = number of packages (usually 1)

ResTable_package:
    header (12 bytes, type=0x0200)
    uint32_t id               = 0x7f (or 0x01 for android)
    uint16_t name[128]        = package name (UTF-16)
    uint32_t typeStrings      = offset to type name strings
    uint32_t lastPublicType   = last public type index
    uint32_t keyStrings       = offset to key name strings
    uint32_t lastPublicKey    = last public key index
    uint32_t typeIdOffset     = 0

ResTable_type (one per configuration variant):
    header (12 bytes, type=0x0201)
    uint8_t  id               = type ID (1-based, 1=attr, 2=drawable, 3=layout, etc.)
    uint8_t  flags            = 0
    uint16_t reserved
    uint32_t entryCount       = number of entries in this type
    uint32_t entriesStart     = offset from this struct to entry data
    ResTable_config config    = 40-byte configuration descriptor

ResTable_entry:
    uint16_t size             = sizeof(ResTable_entry)
    uint16_t flags            = FLAG_COMPLEX (0x0001) for complex entries
    uint32_t index in ResTable_type (entry index)

Res_value (simple entries):
    uint16_t size             = 8
    uint8_t  RES_VALUE_TYPE   = 0
    uint8_t  dataType         = TypedValue type (0x03=string, 0x10=boolean, etc.)
    uint32_t data             = value (string index or integer)
```

### 13.2 String Pool Format

The string pool covers both resource table strings and binary XML strings:

```
ResStringPool_header (28 bytes):
    uint16_t header.type         = 0x0001 (RES_STRING_POOL_TYPE)
    uint16_t header.headerSize   = 0x001C
    uint32_t header.size         = total pool size
    uint32_t stringCount         = number of strings
    uint32_t styleCount          = number of style spans (usually 0)
    uint32_t flags               = SORTED (0x01), UTF8 (0x0100)
    uint32_t stringsStart        = offset from header to string data
    uint32_t stylesStart         = offset from header to style data

If UTF8 flag set:
    strings[0..stringCount-1]    = each is {ULEB128 length, ULEB128 length, ...UTF-8 data...}
Else:
    strings[0..stringCount-1]    = each is {uint16_t length, ...UTF-16 data...}

After string data:
    uint32_t offset[stringCount] (actually before the data, 'stringStart' points past them)
```

### 13.3 ResTable_config

A 40-byte structure describing device configuration for resource qualification:

```c
struct ResTable_config {
    uint32_t size;              // sizeof(ResTable_config) = 40
    union {
        uint16_t mcc;           // mobile country code
        uint16_t mnc;           // mobile network code
    };
    char language[2];           // ISO-639-1 language
    char country[2];            // ISO-3166-1 country
    uint8_t orientation;        // 1=portrait, 2=landscape
    uint8_t touchscreen;        // 1=notouch, 2=stylus, 3=finger
    uint16_t density;           // DPI (120, 160, 240, 320, 480, 640, etc.)
    uint8_t keyboard;           // 1=nokeys, 2=qwerty, 3=12key
    // ... (more fields for screen size, SDK version, etc.)
};
```

### 13.4 Binary XML (AXML)

AndroidManifest.xml and layout XMLs are compiled into a binary format (AXML) using
AAPT2. Structure:

```
XML header (8 bytes: type=0x0003, headerSize=8, fileSize=total)
ResStringPool (attribute names, values, URIs, namespace prefixes)
ResXMLTree_node nodes:
    - RES_XML_START_NAMESPACE_TYPE (0x0100)
    - RES_XML_START_ELEMENT_TYPE (0x0102)  # <activity>, <service>, etc.
    - RES_XML_ATTRIBUTE_TYPE (inline inside START_ELEMENT)
    - RES_XML_END_ELEMENT_TYPE (0x0103)
    - RES_XML_END_NAMESPACE_TYPE (0x0101)
    - RES_XML_CDATA_TYPE (0x0104)
    - RES_XML_END_DOCUMENT_TYPE (0x0101)
```

Each element has a namespace URI, name, and attribute count. Each attribute has:
namespace URI, name, value string, type (reference/string/boolean), and data.

### 13.5 9-Patch Images

Nine-patch (`.9.png`) images have a 1px border encoding stretchable regions [31](https://developer.android.com/develop/ui/views/graphics/drawables#nine-patch):

```bash
# Convert 9-patch from compiled APK
# AAPT2 dumps them as PNGs — the 1px border must be preserved for rebuild
apktool d myapp.apk -o out/
# Look in out/res/drawable-*/ for *.9.png

# Parse 9-patch chunks
xxd myimage.9.png | head -20
# Look for 'npTc' chunk (nine-patch chunk) after PNG IEND
```

### 13.6 AAPT2

The modern Android Asset Packaging Tool:

```bash
# Extract resources
aapt2 dump resources myapp.apk

# Dump string pool
aapt2 dump strings myapp.apk

# Dump XML
aapt2 dump xmltree myapp.apk AndroidManifest.xml

# Convert binary XML to text
aapt2 dump xmlstrings myapp.apk res/layout/activity_main.xml
```

### 13.7 AndroidManifest Parser Internals

The manifest in binary form can be parsed manually:

```bash
# Use AAPT2
aapt2 dump xmltree myapp.apk AndroidManifest.xml

# Use androguard
androguard xml myapp.apk AndroidManifest.xml

# Use apktool (always decodes it)
apktool d myapp.apk -o out/
cat out/AndroidManifest.xml
```

Common manifest entries of RE interest:
- `<uses-permission>` — requested permissions
- `<application android:debuggable="true">` — debuggable flag
- `<activity android:exported="true">` — exported activities
- `<provider android:authorities="...">` — content authorities (URI path for Drozer)
- `<meta-data>` — API keys, Firebase URLs, ad IDs

---

## 14. Intercepting Android Traffic

### 14.1 mitmproxy + Frida SSL Pinning Bypass

The universal setup for intercepting HTTPS traffic [32](https://mitmproxy.org/):

```bash
# 1. Start mitmproxy
mitmproxy -p 8080

# 2. Install CA cert on device
adb push ~/.mitmproxy/mitmproxy-ca-cert.cer /sdcard/
# Settings → Security → Install from storage → Select mitmproxy-ca-cert.cer

# 3. Set proxy
adb shell settings put global http_proxy 192.168.1.100:8080

# 4. Bypass SSL pinning (if needed)
frida -U com.example.app -l ssl-pinning-bypass.js

# 5. For non-HTTP traffic:
# mitmproxy transparent mode with iptables redirect
android sslpinning disable  # inside objection
```

### 14.2 ProxyDroid

An Android app that redirects all app traffic through a proxy (requires root):

```bash
# Install ProxyDroid from Play / F-Droid
# Configure: proxy host/port, select target app
# Works with SOCKS5 and HTTP proxy
# Global proxy mode → all TCP traffic through proxy
```

### 14.3 PCAPdroid

A no-root network capture tool using VPNService API [33](https://github.com/emanuele-f/PCAPdroid):

```bash
# Enable PCAPdroid
# Set target app → start capture
# Export to pcap → open in Wireshark
# For TLS decryption: combine with mitmproxy

# Or capture with tcpdump on rooted device:
adb shell tcpdump -i any -s 0 -w /sdcard/capture.pcap
```

### 14.4 tcpdump (Rooted Device)

```bash
# Capture all traffic on device
adb shell su -c "tcpdump -i any -s 0 -w /data/local/tmp/traffic.pcap"

# Interface-specific
adb shell su -c "tcpdump -i wlan0 -s 0 -w /data/local/tmp/traffic.pcap"

# Apply filter for specific app port
adb shell su -c "tcpdump -i any port 8080 -w /data/local/tmp/api.pcap"

# Pull and analyze
adb pull /data/local/tmp/traffic.pcap .
tshark -r traffic.pcap -Y http
```

### 14.5 VPNService-Based Capture

Apps like **Packet Capture**, **HTTPCanary**, and Frida's own `frida-network-intercept`
use Android's VPNService to redirect traffic through a local VPN interface:

```bash
# Frida network intercept
frida -U com.example.app -l frida-network-intercept.js
# Modifies traffic in-line — no external proxy needed
```

Programmatic capture with VPNService:

```java
// App implements VpnService.Builder()
// Creates a TUN interface
// Reads/writes packets from the interface FD
// Non-root, but requires user consent for VPN permission
```

---

## 15. Android Memory Forensics

### 15.1 Fridump

A Frida-based memory dumping tool [34](https://github.com/Nightbringer21/fridump):

```bash
# Dump all memory
python fridump.py -U com.example.app

# Dump only specific strings
python fridump.py -U com.example.app -s password

# Dump to custom directory
python fridump.py -U com.example.app -o /tmp/memory_dump

# Search dumped memory for specific patterns
strings dump_dir/*.data | grep -i "api_key"
```

Fridump enumerates memory regions via Frida's `Process.enumerateRanges()` and
reads each region. The output is raw binary memory dumps plus a strings summary.

### 15.2 LiME (Linux Memory Extractor)

LiME extracts full RAM images from Android devices [35](https://github.com/504ensicsLabs/LiME):

```bash
# Compile LiME kernel module for target kernel
# (Needs kernel source matching device)
make KERNELDIR=~/android-kernel/

# Load module and dump
adb push lime.ko /data/local/tmp/
adb shell su -c "insmod lime.ko 'path=/sdcard/ram.dump format=lime'"
```

LiME dumps are compatible with Volatility for analysis.

### 15.3 In-Memory DEX Extraction

Many obfuscation packers (360, Legu, Bangcle) load decrypted DEX into memory
at runtime and never write it to disk. To extract:

**Frida DexDump approach:**

```javascript
// Hook DexClassLoader and capture the real DEX bytes
Java.perform(function() {
    var DexFile = Java.use('dalvik.system.DexFile');

    // Or hook BaseDexClassLoader
    var BaseDexClassLoader = Java.use('dalvik.system.BaseDexClassLoader');
    BaseDexClassLoader.$init.implementation = function(dexPath, ...) {
        console.log('[+] Dex loaded from: ' + dexPath);
        // Read the file if it exists; otherwise, it's in-memory
        return this.$init(dexPath, ...);
    };

    // For in-memory DEX, dump via reflection
    var PathClassLoader = Java.use('dalvik.system.PathClassLoader');
    // Use Java.enumerateClassLoaders to find the right one
});
```

**Frida script to dump loaded DEX:**

```javascript
Java.perform(function() {
    var DexFile = Java.use('dalvik.system.DexFile');
    var BaseDexClassLoader = Java.use('dalvik.system.BaseDexClassLoader');
    var Elements = Java.use('dalvik.system.DexPathList$Element');

    // Walk the class loader's path list for DEX files
    Java.enumerateClassLoaders({
        onMatch: function(loader) {
            if (loader.toString().includes('com.example.app')) {
                try {
                    var pathList = loader.pathList.value;
                    var dexElements = pathList.dexElements.value;
                    for (var i = 0; i < dexElements.length; i++) {
                        var dexFile = dexElements[i].dexFile.value;
                        var mCookie = dexFile.mCookie.value;
                        console.log('[+] DEX cookie: ' + mCookie);
                    }
                } catch(e) {
                    console.log('[-] Error: ' + e);
                }
            }
        },
        onComplete: function() {}
    });
});
```

**Frida-dump-dex (custom tool):**
```bash
git clone https://github.com/amimo94/frida-dump-dex
cd frida-dump-dex
python dump_dex.py -U com.example.app
# Dumps all loaded DEX files to current directory
```

### 15.4 Process Dumping via /proc/mem

```bash
# Find PID
adb shell ps | grep com.example.app

# Dump memory map
adb shell su -c "cat /proc/PID/maps" > maps.txt

# Dump heap
adb shell su -c "dd if=/proc/PID/mem bs=4096 skip=0 count=1000 of=/sdcard/mem.dump"
# (Be careful: mem ranges are virtual, need map parsing)

# Better: use /proc/PID/mem via dd with range from maps
adb shell su -c "dd if=/proc/PID/mem bs=1 \
  skip=$((0xHEAP_BASE)) count=$((0xHEAP_SIZE)) \
  of=/sdcard/heap.dump"
```

### 15.5 Classloader Inspection

Finding all DEX loaders in a running app:

```javascript
Java.perform(function() {
    // Enumerate all class loaders
    Java.enumerateClassLoaders({
        onMatch: function(loader) {
            console.log('[Loader] ' + loader);
            console.log('  toString: ' + loader.toString());
            // Get parent
            try {
                var parent = loader.getParent();
                console.log('  parent: ' + (parent ? parent : 'null'));
            } catch(e) {}
        },
        onComplete: function() {
            console.log('[+] Class loader enumeration complete');
        }
    });
});
```

---

## 16. End-to-End Workflow

### 16.1 Full App Assessment Pipeline

```bash
# === PHASE 1: Static Analysis ===

# 1. Triage APK
aapt dump badging myapp.apk | head -30
aapt dump permissions myapp.apk
unzip -l myapp.apk | head -50

# 2. Extract and decompile with jadx
jadx myapp.apk -d jadx_out

# 3. Resource analysis
apktool d myapp.apk -o apktool_out
grep -r "https\?://" apktool_out/res/values/strings.xml

# 4. Native library analysis
unzip -j myapp.apk "lib/arm64-v8a/*" -d libs/
file libs/*.so
nm -D libs/*.so | grep -E "^[0-9a-f]+ T Java_"

# 5. Manifest inspection
aapt2 dump xmltree myapp.apk AndroidManifest.xml | grep -E "exported|permission|debuggable|backup"

# === PHASE 2: Dynamic Analysis ===

# 6. Install and run
adb install myapp.apk
adb shell monkey -p com.example.app 100    # poking

# 7. Test with Frida
frida -U -f com.example.app -l init.js --no-pause

# 8. Intercept traffic
mitmproxy -p 8080 &
frida -U com.example.app -l ssl-pinning-bypass.js

# 9. Check for certificate transparency / pinning
# Use objection android sslpinning disable

# === PHASE 3: Deep Analysis ===

# 10. Memory dump
python fridump.py -U com.example.app -o dump/
strings dump/*.data | grep -iE "secret|key|token|password|api"

# 11. Extract packed DEX
python dump_dex.py -U com.example.app

# 12. Profile methods
frida-trace -U com.example.app -j 'com.example.app.*!*'

# 13. Bypass root detection + SSL + tampering
frida -U com.example.app -l bypass_all.js
```

### 16.2 Tool Decision Matrix

| Scenario | Primary Tool | Secondary |
|----------|-------------|-----------|
| First look at APK | jadx | jadx-gui |
| Change behavior | APKTool + Smali edit | Frida hook |
| Bypass license check | Frida | Smali patch |
| Decrypt strings | Frida trace + manual | jadx deobf |
| Analyze native lib | Ghidra/IDA | radare2 |
| Bypass SSL pinning | objection | Frida script |
| Intercept all traffic | mitmproxy | PCAPdroid |
| Memory dump | Fridump | /proc/mem dd |
| Unpack obfuscated app | Fridump + DexDump | Custom Frida |
| Permission audit | androguard | MobSF |
| IPC attack surface | Drozer | Manual AIDL |
| Runtime method trace | frida-trace | DDMS method profiling |
| Full automation | MobSF | Python + Frida |

---

## Sources

1. Nelenkov — Android App Security Part 1: https://nelenkov.blogspot.com/2012/07/android-app-security-part-1.html
2. AOSP — APK Signing: https://source.android.com/docs/security/features/apksigning
3. Android Developers — zipalign: https://developer.android.com/studio/command-line/zipalign
4. APKTool: https://apktool.org/
5. AOSP — DEX Format: https://source.android.com/docs/core/runtime/dex-format
6. AOSP — ART: https://source.android.com/docs/core/runtime
7. JesusFreke — smali/baksmali: https://github.com/JesusFreke/smali
8. AOSP — Dalvik Bytecode: https://source.android.com/docs/core/runtime/dalvik-bytecode
9. skylot — jadx: https://github.com/skylot/jadx
10. leibnitz — CFR: https://github.com/leibnitz/cfr
11. pxb1988 — dex2jar: https://github.com/pxb1988/dex2jar
12. Storyyeller — enjarify: https://github.com/Storyyeller/enjarify
13. Konloch — Bytecode Viewer: https://github.com/Konloch/Bytecode-Viewer
14. Frida — Android setup: https://frida.re/docs/android/
15. sensepost — objection: https://github.com/sensepost/objection
16. MobSF: https://github.com/MobSF/Mobile-Security-Framework-MobSF
17. WithSecureLabs — Drozer: https://github.com/WithSecureLabs/drozer
18. Androguard: https://github.com/androguard/androguard
19. Android Developers — Shrink, obfuscate, optimize: https://developer.android.com/build/shrink-code
20. obfuscator-llvm — OLLVM: https://github.com/obfuscator-llvm/obfuscator
21. Oracle — JNI Spec: https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/functions.html
22. LSPosed: https://github.com/LSPosed/LSPosed
23. topjohnwu — Magisk: https://github.com/topjohnwu/Magisk
24. r0ysue — r0capture: https://github.com/r0ysue/r0capture
25. AOSP — App Sandbox: https://source.android.com/docs/security/app-sandbox
26. AOSP — Key Attestation: https://source.android.com/docs/security/keystore/attestation
27. AOSP — Verified Boot: https://source.android.com/docs/security/features/verifiedboot
28. AOSP — APEX: https://source.android.com/docs/core/ota/apex
29. Optiv — Bypass Android Root Detection: https://www.optiv.com/insights/source-zero/blog/techniques-bypass-android-root-detection
30. JustanApplication — Android Resources, Part 1: https://justanapplication.wordpress.com/2011/09/16/a-closer-look-at-android-resources-part-1/
31. Android Developers — Nine-patch: https://developer.android.com/develop/ui/views/graphics/drawables#nine-patch
32. mitmproxy: https://mitmproxy.org/
33. emanuele-f — PCAPdroid: https://github.com/emanuele-f/PCAPdroid
34. Nightbringer21 — Fridump: https://github.com/Nightbringer21/fridump
35. 504ensicsLabs — LiME: https://github.com/504ensicsLabs/LiME
