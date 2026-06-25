# Android Smali/Baksmali and Dalvik Bytecode

TL;DR: Smali assembly language syntax, register conventions, patching workflows,
and complete Dalvik register-based bytecode opcode reference (move, return, const,
goto, invoke, compare/branch, array/field ops, switch, quickened opcodes).

See also: android-decompilers-toolchains.md, android-obfuscation-deobfuscation.md

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
