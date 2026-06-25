# Mach-O dyld and Shared Cache

TL;DR: dyld dynamic linker loading sequence, shared cache location and extraction,
rebase/bind opcodes (legacy), chained fixups (iOS 15+), and dyldinfo tool usage.

Cross-reference: See also `macho-header-loadcmds-segments.md`, `macho-re-tools.md` in this directory.

---

## 10. dyld and Shared Cache

### 10.1 dyld -- The Dynamic Linker

`/usr/lib/dyld` is responsible for loading all dependent Mach-O images into
a process address space. It runs before `main()` as part of the `LC_MAIN`
startup [2][8][41].

**dyld loading sequence:**
1. Parse the main executable's load commands
2. Load any `LC_LOAD_DYLIB` and `LC_REEXPORT_DYLIB` dependencies recursively
3. Perform **rebase**: adjust all internal pointers by the ASLR slide value
4. Perform **bind**: resolve external symbols (look up by dylib + symbol name)
5. Perform **weak bind**: resolve weak symbol overrides
6. Run initializers: `+load` methods, C++ static initializers, `__attribute__((constructor))`
7. Call `LC_MAIN` entry point

### 10.2 dyld Shared Cache Location

System libraries are pre-merged into a single large file to improve launch
time and memory sharing [8][9][10]:

```
/System/Library/Caches/com.apple.dyld/
  dyld_shared_cache_arm64           # iOS arm64 devices
  dyld_shared_cache_arm64e          # iOS arm64e devices (A12+)
  dyld_shared_cache_x86_64          # macOS Intel
  dyld_shared_cache_x86_64h         # macOS Intel (Haswell+)
```

On macOS, the cache is mapped by `dyld` at boot time and each framework is
sliced out during process launch. On iOS, the shared cache is loaded into
every process's address space at a fixed address (`0x180000000` on arm64).

### 10.3 Extracting Libraries from the Shared Cache

**Apple's dsc_extractor:**

Apple open-sources `dsc_extractor` inside the dyld project [2]:
https://opensource.apple.com/source/dyld/

```bash
# Build the extractor from dyld source
clang++ -o dsc_extractor dsc_extractor.cpp

# Extract all libraries
dsc_extractor /System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64 /output/dir

# List library names
dsc_extractor -l /System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64
```

**Third-party tools:**
- **dyld-shared-cache-big-sur** (antons): fixes ObjC metadata for Hopper [42]
- **radare2**: `r2 -e io.cache=true dsc_extractor://` interface
- **Ghidra**: `Load File -> dyld_shared_cache` with automatic library parsing

### 10.4 dyld Internal Structures [41]

**ImageLoader** -- the core class (pre-macOS 11):

```
ImageLoader
  |- fMachOData: mapped file bytes
  |- fImagePath: path on disk
  |- segLoadCommands: parsed segments
  +- fSymbolTable: bound symbols
```

Post-macOS 11, dyld was rewritten in C++ with simpler architecture:
- `dyld4` uses the `RuntimeState` object to track all images
- Each image is a `LoadedImage` struct wrapping a MachOObject
- Binding uses the `DI (Dynamic Info)` structures (chained fixups)

### 10.5 Rebase and Bind Opcodes (Legacy, pre-iOS 15)

When `LC_DYLD_INFO_ONLY` is present, dyld interprets a stream of opcodes for
rebase and bind operations [2][41]:

```c
struct dyld_info_command {
    uint32_t cmd;           // LC_DYLD_INFO_ONLY
    uint32_t cmdsize;
    uint32_t rebase_off;    // file offset of rebase opcodes
    uint32_t rebase_size;   // size of rebase opcodes
    uint32_t bind_off;      // file offset of normal bind opcodes
    uint32_t bind_size;
    uint32_t weak_bind_off;
    uint32_t weak_bind_size;
    uint32_t lazy_bind_off;
    uint32_t lazy_bind_size;
    uint32_t export_off;    // file offset of trie-structured exports
    uint32_t export_size;
};
```

Each opcode stream has a `REBASE_OPCODE` / `BIND_OPCODE` prefix byte:

```c
// Rebase opcodes
REBASE_OPCODE_DO_REBASE_IMM_TIMES    = 0x30
REBASE_OPCODE_DO_REBASE_ADD_ADDR_UID = 0x50
REBASE_OPCODE_DO_REBASE_ULEB_TIMES   = 0x70

// Bind opcodes
BIND_OPCODE_SET_DYLIB_ORDINAL_IMM    = 0x10
BIND_OPCODE_SET_SYMBOL_TRAILING_FLAGS_IMM = 0x20
BIND_OPCODE_DO_BIND                   = 0x50
BIND_OPCODE_DO_BIND_ADD_ADDR_ULEB    = 0x60
```

The opcode stream tells dyld where to apply rebase (add `slide` to pointers)
and bind (replace DWORD/QWORD with symbol address).

### 10.6 Chained Fixups (iOS 15+ / macOS 12+)

Modern binaries use `LC_DYLD_CHAINED_FIXUPS`. Instead of interpreting opcodes,
dyld walks pointer chains. Each chained fixup pointer encodes [2][17]:

```
63                                                             0
+---+--------+---------+---------+----------------------------+
| 7 | next   | ordinal | addend  | target                     |
+---+--------+---------+---------+----------------------------+
```

- Bit 63 (high bit): chain type indicator
- Bits 62-51: offset to next fixup (in entries)
- Bits 50-36: dylib ordinal (for binds)
- Bits 35-32: addend
- Bits 31-0: target offset (rebase: offset within the image)

To work with chained fixups in RE:
- Use `jtool2 --analyze` for visualization
- Hopper 5+ handles chained fixups automatically
- Ghidra community plugins are working on support
- `dyldinfo -fixups` shows fixup locations (legacy format only)

### 10.7 dyldinfo

```bash
# Rebase info
dyldinfo -rebase /path/to/binary

# Bind info
dyldinfo -bind /path/to/binary

# Lazy bind info
dyldinfo -lazy_bind /path/to/binary

# All fixup info
dyldinfo -fixups /path/to/binary

# Export info (from trie)
dyldinfo -export /path/to/binary

# Summary of all
dyldinfo -opcodes /path/to/binary
```
