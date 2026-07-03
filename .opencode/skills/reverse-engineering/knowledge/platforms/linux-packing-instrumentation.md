# Linux Executable Packing & Instrumented Binary Patterns

TL;DR: UPX packing/unpacking, OEP discovery, ELF crypters and infection techniques,
runtime decryption stubs, CFI/ASan/UBSan/libFuzzer instrumented binary patterns.

See also: linux-re-tools-workflow.md, linux-dynamic-linker-init.md, linux-syscalls-signals.md, linux-anti-debug-rdebug.md

---

## 19. Linux Executable Packing and Infection [39][40]

### 19.1 UPX (Ultimate Packer for eXtended executables)

UPX is the most common ELF packer. It compresses the original binary and prepends
a decompression stub.

Detecting UPX-packed ELF:

```bash
# UPX section names: UPX0, UPX1, UPX2
readelf -S /bin/ls.upx
  [ 1] UPX0           NOBITS         0000000000001000  00001000
  [ 2] UPX1           PROGBITS       0000000000002000  00002000
  [ 3] UPX2           PROGBITS       0000000000030000  00003000
# --- or ---
# Note that .text to .init_array are missing / section names are unusual
# The entry point lands inside UPX1, not the original .text

# Also detect via:
strings /bin/ls.upx | grep UPX
UPX!
UPX!
```

Unpacking UPX:
```bash
# Method 1: built-in decompression
upx -d /bin/ls.upx -o /bin/ls.unpacked

# Method 2: manual dump (when upx -d fails due to version mismatch)
# Run under gdb, break after OEP, dump memory:
# (gdb) catch syscall mprotect
# (gdb) run
# (gdb) continue until OEP reached (typically after a series of mprotect + jmp)
# (gdb) dump memory /tmp/dump.bin 0x400000 0x401000
```

### 19.2 Finding the OEP (Original Entry Point)

For packed ELF binaries:

1. **Section-based** — UPX typically jumps to unpacked code in `UPX0` after decompression
2. **Memory-based** — break on `mprotect` calls (packer changes page permissions for the
   unpacked code) and watch for `e_entry` value
3. **Stack-based** — after unpacking, the stub may `push e_entry; ret` to reach OEP
4. **Hardware breakpoint** — set on the known OEP region (from `readelf -h` before packing)

### 19.3 ELF crypters

A crypter encrypts the original binary and wraps it with a decryption stub.
Detection:

```bash
# High entropy in .text (encrypted payload)
ent /bin/myapp.crypted
# Shannon entropy: 7.99 bits per byte  (near-max = 8 = encrypted/compressed)
```

```python
# Python entropy check
import math
from collections import Counter

def entropy(data):
    c = Counter(data)
    return -sum((p/len(data)) * math.log2(p/len(data)) for p in c.values())

with open("/bin/myapp.crypted", "rb") as f:
    data = f.read()
    # Check .text section specifically
    # .text entropy > 7.5 suggests encryption or compression
```

### 19.4 ELF infection techniques [40]

Ways malware can infect existing ELF binaries:

| Technique | Description | Detection |
|-----------|-------------|-----------|
| **Code cave** | Overwrite padding bytes in `.text` with jump → payload → jump back | Unexpected control flow in `.text`, modified checksum |
| **PT_NOTE → PT_LOAD** | Modify a `PT_NOTE` header type to `PT_LOAD`, add code segment | Unexpected extra LOAD segment |
| **Shrink `.symtab`** | Extend section to add code, corrupt section alignment | `readelf -S` shows alignment violations |
| **Segment padding** | Overwrite padding between LOAD segments | Check file vs memory sizes |
| **`PHDR` overwrite** | Corrupt the program header and add a new one | Header validation fails |
| **`PT_GNU_RELRO`** | Remove or shrink RELRO to make GOT writable for hijack | Missing RELRO pages |

### 19.5 Runtime decryption stub patterns

An ELF crypter's stub typically does:

```asm
; Simplified ELF decryptor stub
stub_start:
    call    $+5                      ; get EIP/RIP
    pop     rbx                      ; base address
    ; Decrypt loop
    lea     rsi, [rbx + encrypted_offset]
    lea     rdi, [rbx + encrypted_offset]
    mov     ecx, encrypted_size
decrypt_loop:
    xor     byte [rdi], 0x55         ; simple XOR or more complex
    inc     rdi
    loop    decrypt_loop
    ; Set permissions
    mov     eax, 10                  ; mprotect
    mov     rdi, code_base
    mov     rsi, code_size
    mov     edx, 7                   ; PROT_READ|PROT_WRITE|PROT_EXEC
    syscall
    ; Jump to OEP
    mov     rax, original_entry
    jmp     rax
```

---

## 20. CFI, ASan, UBSan — Instrumented Binary Patterns [41][42]

### 20.1 Control-Flow Integrity (CFI)

Clang's CFI enforces that indirect call/jump targets are valid function entry points.

```bash
# Detect CFI in a binary
readelf -S /bin/cfi_app | grep cfi
  [NN] .cfi               PROGBITS        ...
```

CFI-flavored binaries have:
- `.cfi` section with valid-target bitmaps
- Each indirect call preceded by a `__cfi_check` call or jump
- Additional `.rodata` tables listing valid call targets

```asm
; CFI-protected indirect call
call    __cfi_check           ; verify target
mov     rax, [rdi+0x10]       ; load function pointer
call    rax                   ; safe call

; __cfi_check verifies the target address
; against the valid-function bitmap
```

### 20.2 AddressSanitizer (ASan) [42]

Asan instruments memory accesses with a **shadow memory** that tracks whether each
byte of application memory is accessible.

Shadow memory mapping (x86-64 Linux):

```
App memory:   [0x00007fffffffe000, 0x7fffffffffff]
Shadow byte:  app_addr >> 3 + 0x7fff8000  (for 64-bit)
```

Each shadow byte encodes:
- `0` = all 8 bytes in this aligned region are valid
- `1-7` = only the first N bytes are valid
- Negative = the entire 8-byte region is poisoned (redzone)

```asm
; ASan-instrumented load
mov    rax, [rdi]                  ; load address
mov    rcx, rdi
shr    rcx, 3                      ; shadow address = addr / 8
add    rcx, __asan_shadow_offset   ; + 0x7fff8000
test   byte [rcx], 0x7f            ; check shadow
jnz    __asan_report_load_n        ; if non-zero, error!
mov    rax, [rdi]                  ; actual load
```

Detecting ASan binaries:
- Symbols: `__asan_*` present
- Runtime library: `libasan.so.*` loaded
- Stack frames have redzones (32+ bytes of poison around locals)
- `__asan_option_detect_stack_use_after_return` may be set

### 20.3 UndefinedBehaviorSanitizer (UBSan)

UBSan inserts checks for undefined behavior:

```asm
; UBSan check for signed overflow
add    eax, ebx                    ; may overflow
jo     __ubsan_handle_add_overflow ; if overflow, call handler

; UBSan check for shift-out-of-bounds
mov    ecx, [rbp-4]
cmp    ecx, 31
ja     __ubsan_handle_shift_out_of_bounds
shr    eax, cl
```

Detecting UBSan:
- Symbols: `__ubsan_handle_*` visible via `nm` or `readelf -s`
- Strings: `/usr/lib/gcc/x86_64-linux-gnu/.../libubsan.so`
- Call to `__ubsan_get_current_report_data` in crash handlers

### 20.4 libFuzzer instrumentation [43]

Fuzzer-instrumented binaries have:

```bash
# Symbols
nm /bin/fuzz_app | grep -E '__sanitizer_cov|__sanitizer_alloc|__afl_'
__sanitizer_cov_reset
__sanitizer_cov_load
__sanitizer_get_coverage_guards

# .data section contains coverage bitmaps
# Callbacks on each edge/cmp
```

---

## Sources

39. UPX documentation — https://upx.github.io/
40. "ELF Virus Writing Tutorial" — https://www.ma.utexas.edu/linux/elf/elf.html
41. "Control Flow Integrity in Clang" — https://clang.llvm.org/docs/ControlFlowIntegrity.html
42. "AddressSanitizer Algorithm" — https://github.com/google/sanitizers/wiki/AddressSanitizerAlgorithm
43. "libFuzzer — a library for coverage-guided fuzz testing" — https://llvm.org/docs/LibFuzzer.html
