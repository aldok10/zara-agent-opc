# ELF .dynamic Section, Symbol Tables, and Hash Tables

TL;DR: The `.dynamic` section (DT_NEEDED, DT_INIT, etc.), symbol tables (`.dynsym`/`.symtab`),
and hash tables (`.hash`/`.gnu.hash`) used for dynamic linking and symbol resolution.

Cross-reference: See also `elf-header-segments-sections.md`, `elf-plt-got-relro-init.md`, `elf-pic-relocations-tls.md` in this directory.

---

## 4. The `.dynamic` Section — Dynamic Linking Metadata [1][3]

`.dynamic` is an array of `Elf64_Dyn` entries, terminated by a `DT_NULL` entry.
It is pointed to by both `PT_DYNAMIC` segment and the `.dynamic` section.

```c
typedef struct {
    int64_t  d_tag;   // DT_* constant
    uint64_t d_val;   // integer value (or d_ptr: virtual address)
} Elf64_Dyn;
```

### DT_* tags relevant to reverse engineering

| Tag | Value | RE meaning |
|-----|-------|------------|
| `DT_NEEDED` | 1 | String table offset of a needed shared library name. Each DT_NEEDED = one dependency. |
| `DT_INIT` | 12 | Address of `.init` function |
| `DT_FINI` | 13 | Address of `.fini` function |
| `DT_INIT_ARRAY` | 25 | Address of `.init_array` |
| `DT_INIT_ARRAYSZ` | 27 | Size of `.init_array` |
| `DT_FINI_ARRAY` | 26 | Address of `.fini_array` |
| `DT_FINI_ARRAYSZ` | 28 | Size of `.fini_array` |
| `DT_PREINIT_ARRAY` | 32 | Address of `.preinit_array` (glibc only) |
| `DT_PREINIT_ARRAYSZ` | 33 | Size of `.preinit_array` |
| `DT_SYMTAB` | 6 | Address of `.dynsym` |
| `DT_STRTAB` | 5 | Address of `.dynstr` |
| `DT_SYMENT` | 11 | Size of each symbol entry (24 for Elf64) |
| `DT_STRSZ` | 10 | Size of `.dynstr` |
| `DT_HASH` | 4 | Address of SVR4 `.hash` |
| `DT_GNU_HASH` | 0x6ffffef5 | Address of GNU hash |
| `DT_PLTGOT` | 3 | Address of `.got.plt` |
| `DT_PLTRELSZ` | 2 | Size of PLT relocation entries |
| `DT_PLTREL` | 20 | Type of PLT relocations (`DT_REL` or `DT_RELA`) |
| `DT_JMPREL` | 23 | Address of PLT relocations (`.rela.plt`) |
| `DT_RELA` | 7 | Address of general relocations (`.rela.dyn`) |
| `DT_RELASZ` | 8 | Size of general relocation entries |
| `DT_RELAENT` | 9 | Size of each RELA entry (24 for Elf64) |
| `DT_VERNEED` | 0x6ffffffe | Address of `.gnu.version_r` |
| `DT_VERNEEDNUM` | 0x6fffffff | Count of version need entries |
| `DT_VERSYM` | 0x6ffffff0 | Address of `.gnu.version` |
| `DT_DEBUG` | 21 | Debugger interface — filled by ld.so at runtime with pointer to `r_debug` (see §14) |
| `DT_FLAGS` | 30 | Flags: `DF_ORIGIN`, `DF_SYMBOLIC`, `DF_TEXTREL`, `DF_BIND_NOW`, `DF_STATIC_TLS` |
| `DT_FLAGS_1` | 0x6ffffffb | Flags_1: `DF_1_NOW`, `DF_1_PIE`, `DF_1_INITFIRST`, `DF_1_NOOPEN` |
| `DT_SONAME` | 14 | String table offset of this shared object's soname |
| `DT_RPATH` | 15 | String table offset of runtime search path (deprecated by DT_RUNPATH) |
| `DT_RUNPATH` | 29 | String table offset of library search path |
| `DT_TEXTREL` | 22 | Relocation entries modify read-only segments (rare, insecure) |

### Workflow: enumerate dependencies

```bash
readelf -d /bin/ls | head -20

Dynamic section at offset 0x1bd60 contains 29 entries:
  Tag        Type                         Name/Value
 0x00000005 (STRTAB)                     0x1a698
 0x00000006 (SYMTAB)                     0x196a8
 0x0000000a (STRSZ)                      277 (bytes)
 0x0000000b (SYMENT)                     24 (bytes)
 0x00000015 (DEBUG)                      0x0
 0x00000003 (PLTGOT)                     0x1c000
 0x00000002 (PLTRELSZ)                   1152 (bytes)
 0x00000014 (PLTREL)                     RELA
 0x00000017 (JMPREL)                     0x1a018
 0x00000007 (RELA)                       0x19820
 0x00000008 (RELASZ)                     1992 (bytes)
 0x00000009 (RELAENT)                    24 (bytes)
 0x0000001e (FLAGS)                      BIND_NOW
 0x6ffffffb (FLAGS_1)                    Flags: NOW PIE
 0x6ffffffe (VERNEED)                    0x19e28
 0x6fffffff (VERNEEDNUM)                 2
 0x6ffffff0 (VERSYM)                     0x19736
 0x00000000 (NULL)                       0x0
```

`DF_1_NOW` + `BIND_NOW` means full RELRO — all relocations resolved at load time,
no lazy binding (see §7). `PIE` confirms this is a position-independent executable.
Notably missing: no `DT_NEEDED` entries in this truncated output, but `VERNEED`
tells us version dependencies exist.

---

## 5. The Symbol Tables — `.dynsym` and `.symtab` [1][11]

```c
typedef struct {
    uint32_t      st_name;   // index into associated string table
    unsigned char st_info;   // bind + type (ELF64_ST_BIND, ELF64_ST_TYPE)
    unsigned char st_other;  // visibility (ELF64_ST_VISIBILITY)
    uint16_t      st_shndx;  // section index (SHN_UNDEF, SHN_ABS, SHN_COMMON, or real)
    uint64_t      st_value;  // value/address
    uint64_t      st_size;   // symbol size
} Elf64_Sym;
```

`st_info` encodes two fields: `ELF64_ST_BIND(info) >> 4` and `ELF64_ST_TYPE(info) & 0xf`.
Bind values: `STB_LOCAL (0)`, `STB_GLOBAL (1)`, `STB_WEAK (2)`. Type values:
`STT_NOTYPE (0)`, `STT_OBJECT (1)`, `STT_FUNC (2)`, `STT_SECTION (3)`,
`STT_FILE (4)`, `STT_COMMON (5)`, `STT_TLS (6)`, `STT_GNU_IFUNC (10)`.

### Identifying ifunc (STT_GNU_IFUNC) [12]

GNU indirect functions (ifunc) are resolved at runtime by a resolver function — the
symbol's `st_value` points to the resolver, which returns the actual function pointer.
This is how `memcpy`, `strlen`, etc. dispatch to the optimized SIMD variant on the
current CPU. Ifunc symbols appear in `.dynsym` with `st_info != 10` (STT_GNU_IFUNC)
and their relocations use `R_X86_64_IRELATIVE`.

### Symbol visibility [2]

`st_other` holds `ELF64_ST_VISIBILITY(other)`:
`STV_DEFAULT (0)` — normal visibility, `STV_HIDDEN (2)` — not exported,
`STV_PROTECTED (3)` — exported but must not be preempted.

### Workflow: list dynamic symbols

```bash
readelf -s /bin/ls | head -15

Symbol table '.dynsym' contains 89 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND
     1: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __ctype_toupper_loc@GLIBC_2.3 (2)
     2: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND getenv@GLIBC_2.2.5 (3)
     3: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __libc_start_main@GLIBC_2.34 (4)
     4: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND strcpy@GLIBC_2.2.5 (3)
     5: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND read@GLIBC_2.2.5 (3)
```

UND entries (st_shndx = SHN_UNDEF) are imported functions. The `@GLIBC_2.34` is
the version requirement from `.gnu.version` (see §11).

---

## 6. The Hash Tables — `.hash` vs `.gnu.hash` [16][17]

The SVR4 hash table (`.hash`) is a simple 32-bit word bucket+chain scheme:

```
+-----------+-----------+-----------+-----------+-----+
| nbucket   | nchain    | bucket[0] | bucket[1] | ... |   (all uint32_t)
+-----------+-----------+-----------+-----------+-----+
| chain[0]  | chain[1]  | ...       |           |
+-----------+-----------+-----------+-----------+-----+
```

Hash formula: `h = (h << 4) + c; h ^= (h >> 24)` per character, modulo nbucket.

The GNU hash table (`.gnu.hash`) is more complex but faster:

```
+-----------+-----------+-----------+-----------+-----------+
| nbuckets  | symndx    | maskwords  | shift2    |           |  (uint32_t)
+-----------+-----------+-----------+-----------+-----------+
| bloom[maskwords]       | (Elf64_Xword or Elf32_Word)
+-----------+-----------+-----------+-----------+
| buckets[nbuckets]      | (uint32_t)
+-----------+-----------+-----------+-----------+
| chains[]               | (uint32_t, variable length)
+-----------+-----------+-----------+-----------+
```

- `symndx` = the symbol index of the first dynamic symbol covered by the hash
- Bloom filter pre-filters: two hash functions per symbol, bloom bits reduce lookups
- Chains encode whether the previous chain entry shares the same bucket

The GNU hash is why modern binaries can resolve symbols faster. If both `.hash` and
`.gnu.hash` are present, the linker uses `.gnu.hash` first and falls back to `.hash` [17].

```bash
readelf -S /bin/ls | grep hash
  [ 6] .gnu.hash         GNU_HASH         0000000000000320  00000320
  [ 7] .dynsym           DYNSYM           0000000000000398  00000398
  [ 8] .dynstr           STRTAB           00000000000005a8  000005a8
```
