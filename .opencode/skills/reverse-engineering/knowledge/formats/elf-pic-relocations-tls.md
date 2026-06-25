# ELF PIC/PIE, Relocation Types, and Thread-Local Storage

TL;DR: Position-independent code (PIE/PIC) addressing, x86-64 and AArch64 relocation
types, COPY relocations, and TLS (Thread-Local Storage) access models.

Cross-reference: See also `elf-header-segments-sections.md`, `elf-dynamic-symbols-hash.md`, `elf-plt-got-relro-init.md` in this directory.

---

## 10. Position-Independent Code -- PIE and PIC [10][23]

### 10.1 PIE vs non-PIE

| Aspect | Non-PIE (ET_EXEC) | PIE (ET_DYN) |
|--------|-------------------|--------------|
| e_type | ET_EXEC (2) | ET_DYN (3) |
| Base address | Fixed (e.g. 0x400000) | Random (ASLR) |
| Relocation | Optional (custom linker script) | Mandatory |
| Modern default | No (GCC `-no-pie`) | Yes |
| `TextRel` risk | Lower | Higher but well-handled |

### 10.2 PIC addressing

PIC code cannot use absolute addresses. Instead, it uses RIP-relative addressing:

```asm
; Load the address of a global variable via GOT
lea    rax, [rip+0x2009c4]    ; RAX = address of GOT entry for "my_global"
mov    rax, [rax]              ; RAX = actual value of my_global (from GOT)

; Call through PLT
call   [rip+0x200a12]           ; indirect call through GOT
```

The linker adds `R_X86_64_REX_GOTPCRELX` relocations that the linker can optimize.
Modern linkers convert common patterns like `lea rax, [rip+offset]` + `mov rax, [rax]`
into a direct memory access when the symbol resolves locally [23][24].

### 10.3 Code models [23]

| Model | Constraint | Use case |
|-------|-----------|----------|
| `mcmodel=small` | Code + data < 2GB, RIP-relative reachable | Default for user-space |
| `mcmodel=medium` | Code < 2GB, data can exceed | Large data structures |
| `mcmodel=large` | No addressing limit, all references via absolute | Rare, no PIC |
| `mcmodel=kernel` | Code in negative 2GB, 64-bit absolute for symbols | Linux kernel modules |

The code model determines how the compiler generates address references. For the
reverse engineer: `mcmodel=large` binaries use 64-bit immediate mov instructions
(`movabs rax, 0xdeadbeef`), which are 10-byte REX.W-encoded movabs. The default
small model uses RIP-relative which is more compact [23].

---

## 11. Relocation Types -- x86-64 and AArch64 [1][12][24]

### 11.1 x86-64 relocation types

| Relocation | Type | Description |
|------------|------|-------------|
| `R_X86_64_NONE` | 0 | No-op |
| `R_X86_64_64` | 1 | Direct 64-bit absolute (S + A) |
| `R_X86_64_PC32` | 2 | 32-bit PC-relative (S + A - P) |
| `R_X86_64_GOT32` | 3 | 32-bit GOT entry offset |
| `R_X86_64_PLT32` | 4 | 32-bit PLT-relative |
| `R_X86_64_COPY` | 5 | Copy symbol into writable space (used for read-only data imports) |
| `R_X86_64_GLOB_DAT` | 6 | Set GOT entry to symbol address (S + A) |
| `R_X86_64_JUMP_SLOT` | 7 | Set PLT GOT entry to resolved address (lazy) |
| `R_X86_64_RELATIVE` | 8 | `(Base + A)` - base-relative; most common in PIE |
| `R_X86_64_GOTPCREL` | 9 | 32-bit PC-relative GOT entry |
| `R_X86_64_32` | 10 | 32-bit absolute (S + A) |
| `R_X86_64_32S` | 11 | 32-bit signed absolute |
| `R_X86_64_16` | 12 | 16-bit absolute |
| `R_X86_64_PC16` | 13 | 16-bit PC relative |
| `R_X86_64_8` | 14 | 8-bit absolute |
| `R_X86_64_PC8` | 15 | 8-bit PC relative |
| `R_X86_64_IRELATIVE` | 37 | Resolver returns function pointer (ifunc) |
| `R_X86_64_REX_GOTPCRELX` | 41 | GOTPCREL with REX prefix -- may be optimized to direct access |

Key notation:
- **S** = symbol value
- **A** = addend (from `r_addend` in RELA)
- **P** = position being relocated
- **B** = base address of shared object

### 11.2 COPY relocations -- special for RE [25]

`R_X86_64_COPY` is unusual: it copies the contents of a symbol **from** a shared
library **into** the executable's `.bss` or `.data` at the symbol's address. This
is needed when an executable (non-PIE) references a global variable from a shared
library. The COPY relocation means the original library's copy is unused -- the
executable owns the data.

```bash
readelf -r /bin/myapp | grep COPY
000000601038  0000001e00000005 R_X86_64_COPY        _IO_2_1_stdin_
```

RE relevance: COPY relocations complicate in-memory patching -- changing the value
in the library doesn't affect the executable's copy.

### 11.3 AArch64 relocation types [24]

| Relocation | Type | Description |
|------------|------|-------------|
| `R_AARCH64_ABS64` | 257 | 64-bit absolute |
| `R_AARCH64_RELATIVE` | 1027 | (Base + A) |
| `R_AARCH64_CALL26` | 283 | 26-bit PC-relative call |
| `R_AARCH64_ADR_PREL_PG_HI21` | 275 | ADRP: page-relative high |
| `R_AARCH64_LDST64_ABS_LO12_NC` | 286 | Load/store offset low 12 bits |
| `R_AARCH64_GLOB_DAT` | 1025 | GOT data entry |
| `R_AARCH64_JUMP_SLOT` | 1026 | PLT GOT entry |
| `R_AARCH64_TLSIE_LDST64_TPREL_LO12_NC` | 535 | TLS initial-exec |
| `R_AARCH64_TLSLE_ADD_TPREL_HI12` | 553 | TLS local-exec |
| `R_AARCH64_COPY` | 1024 | Copy relocation |
| `R_AARCH64_TSTBR14` | 279 | 14-bit TBZ/TBNZ branch |

AArch64 relocations often come in ADRP+ADD/ADRP+LDx pairs because the ISA has a
fixed 32-bit instruction size and cannot encode a full 64-bit address in one
instruction. The `ADRP` instruction loads the page address, and a subsequent
instruction provides the page offset [24].

---

## 12. Thread-Local Storage -- `.tbss`, `.tdata`, `PT_TLS` [26][27]

### 12.1 TLS segment layout

Thread-Local Storage provides per-thread data. The `PT_TLS` program header in the
executable and each loaded library describes the TLS template:

```
+------------------+
| tdata (initialized)
| tbss (zero-filled)
+------------------+  <- TP (thread pointer)
```

The thread pointer register specifies where TLS lies:
- **x86-64**: `fs:0` points to the TCB (Thread Control Block). TLS variables are at
  negative offsets from `fs:0`.
- **AArch64**: `tpidr_el0` is the thread pointer.

```
Arch   TLS access        Example
x86-64 initial-exec      mov  rax, fs:0xffffffffffffffb8  ; load from negative offset
x86-64 general-dynamic   call __tls_get_addr              ; libc function for dynamic TLS
AArch64 initial-exec     mrs  x1, tpidr_el0; ldr x0, [x1, #-0x10]
```

### 12.2 TLS access models [27]

| Model | Efficiency | Limitation | When used |
|-------|-----------|------------|-----------|
| **Initial Exec** | Fast (direct TP offset) | Only works if loaded at startup | Default for executables |
| **General Dynamic** | Slower (calls `__tls_get_addr`) | Works for dlopen'd libraries | Default for shared libraries |
| **Local Exec** | Fastest (fixed TP offset) | Cannot be shared | Static linking |
| **Local Dynamic** | Medium | Multiple TLS variables in one module | Optimizes group of TLS access |

### 12.3 TLS relocations

For x86-64:
- `R_X86_64_TPOFF64` -- Initial Exec: offset from TP
- `R_X86_64_TLSGD` -- General Dynamic: GOT entry for `__tls_get_addr`
- `R_X86_64_TLSLD` -- Local Dynamic: GOT entry for `__tls_get_addr` (module ID)
- `R_X86_64_DTPOFF64` -- Offset from Dynamic Thread Pointer (DTV)

### 12.4 RE relevance

- TLS variables appear in `.tbss` as zero-size sections at link time but have
  runtime storage per thread
- A `fs:` segment override in x86-64 code is a dead giveaway for TLS access
- Binary instrumentation for TLS-aware tools needs to handle per-thread copies
- Anticheat/tamper detection sometimes uses TLS to store secret values that differ
  per process/thread [26]
