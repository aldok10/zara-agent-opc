# Mach-O Reverse Engineering Tools

TL;DR: Tools for Mach-O analysis -- otool, nm, strings, jtool2, class-dump, dsdump,
MachOView, Hopper, Binary Ninja, Ghidra, and comparison table.

Cross-reference: See also `macho-header-loadcmds-segments.md`, `macho-dyld-shared-cache.md` in this directory.

---

## 2. Mach-O RE Tools

### 2.1 otool -- The Native Disassembler and Inspector

Ships with Xcode Command Line Tools. The LLVM-based `llvm-otool` (or
`otool-classic`). Essential commands [18][19]:

```bash
# Basic header dump
otool -h /path/to/binary

# Full load commands
otool -l /path/to/binary

# Disassemble __TEXT,__text section
otool -tV /path/to/binary

# Disassemble a specific range
otool -tV -range __TEXT,__text=0x1000:0x2000 /path/to/binary

# Objective-C class/method listing
otool -ov /path/to/binary

# Dependent dylibs
otool -L /path/to/binary

# Symbol table (both static and dynamic)
otool -IV /path/to/binary

# Universal binary contents
otool -f /path/to/universal

# All segment/section sizes
otool -l /path/to/binary | grep -A4 "segname\|sectname"

# FairPlay encryption status
otool -l /path/to/binary | grep -A4 LC_ENCRYPTION_INFO

# Read-only cstring contents
otool -s __TEXT __cstring /path/to/binary
```

### 2.2 nm -- Symbol Listing

Lists symbols from the symbol table [19]:

```bash
# All symbols
nm /path/to/binary

# Only undefined (imported) symbols
nm -u /path/to/binary

# Sort by address value
nm -n /path/to/binary

# Show both debug/dynamic symbols (macOS specific)
nm -m /path/to/binary

# Only ObjC class-related symbols
nm /path/to/binary | grep -E 'OBJC_CLASS|OBJC_METACLASS|OBJC_IVAR'

# Demangle Swift symbols
nm -U /path/to/binary | xcrun swift-demangle
```

### 2.3 strings

```bash
# Extract all printable strings from a Mach-O
strings /path/to/binary

# ObjC selector names are stored as raw strings in __objc_methname
strings - /path/to/binary | grep '^\-\[.*' | sort -u

# Find URL scheme handlers
strings /path/to/binary | grep '://'
```

### 2.4 jtool / jtool2

Jonathan Levin's `jtool2` is a more feature-rich `otool` alternative [20].
Requires installation from http://newosxbook.com.

```bash
# Header and load commands
jtool2 --analyze /path/to/binary

# ObjC class introspection
jtool2 --objc /path/to/binary

# Entitlements
jtool2 --ent /path/to/binary

# Signing status
jtool2 --sig /path/to/binary

# Unpack universal
jtool2 --arch arm64 /path/to/binary

# Show all load commands in detail
jtool2 -l /path/to/binary
```

### 2.5 class-dump

Dumps the Objective-C class interface from a Mach-O binary [21].
Requires the (now unsupported) `class-dump`, or the maintained fork
from nygard: https://github.com/nygard/class-dump.

```bash
# Dump all ObjC interfaces
class-dump /path/to/binary

# Output to specific file
class-dump -H -o /output/dir /path/to/binary

# Dump for specific arch in fat binary
class-dump --arch arm64 /path/to/binary
```

### 2.6 dsdump

A modern alternative to `class-dump` by Derek Selander [11], written in Swift:
https://github.com/DerekSelander/dsdump

```bash
# Dump all ObjC/Swift class info
dsdump /path/to/binary

# Dump with Swift demangling
dsdump --swift /path/to/binary

# JSON output
dsdump --json /path/to/binary
```

### 2.7 MachOView / MachO Explorer

- **MachOView** (GUI): Visual hex editor + structure viewer for Mach-O files.
  Open-source: https://github.com/gdbinit/MachOView
- **MachO Explorer** (commercial): Modern SwiftUI-based Mach-O inspector with
  section navigation, symbol browsing, and ObjC runtime tree view.

### 2.8 Hopper Disassembler

A native macOS RE tool by CrystalIDE: https://www.hopperapp.com
- First-class Mach-O parsing (fat/universal, encryption signatures)
- Objective-C class browser (class hierarchy, method lists, protocols)
- Swift metadata awareness (type descriptors, witness tables)
- ARM64, x86-64, ARMv7 disassembly + decompilation (pseudo-code)
- Scriptable with Python and native Hopper SDK

### 2.9 Binary Ninja Mach-O Support

Vector35's Binary Ninja has growing Mach-O support:
- Parses LC_DYLD_CHAINED_FIXUPS (newer format)
- ObjC/Swift metadata reconstruction
- ARM64e PAC pointer support
- Scriptable Python API for custom analysis

### 2.10 Ghidra Mach-O Loader

Ghidra ships with a Mach-O loader that:
- Parses fat/universal headers, load commands, segments/sections
- Reconstructs ObjC class hierarchies (with `OBJC_CLASS` analysis)
- Handles dyld shared cache as a bulk load
- Swift name demangling via plugin
- Code signing block analysis

Limitations: encrypted binaries must be decrypted first. The loader may struggle
with newer chained fixup formats (iOS 15+) -- use the community `ghidra-macho`
plugins if needed.

### 2.11 Tool Comparison

| Tool | Static | Dynamic | ObjC | Swift | GUI | Scripting |
|------|--------|---------|------|-------|-----|-----------|
| otool | Full | -- | -ov | -- | No | Pipeable |
| nm | Symbol | -- | OBJC_CLASS | -- | No | Pipeable |
| jtool2 | Full | -- | Full | Partial | No | Bash |
| class-dump | -- | -- | Full | -- | No | Pipeable |
| dsdump | Full | -- | Full | Full | No | JSON |
| MachOView | Full | -- | Sections | -- | Yes | -- |
| Hopper | Full | Partial | Full | Partial | Yes | Python |
| Binary Ninja | Full | Partial | Full | Partial | Yes | Python |
| Ghidra | Full | -- | Plugin | Plugin | Yes | Python/Java |
