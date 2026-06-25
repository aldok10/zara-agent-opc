# Shellcode Analysis

TL;DR: Shellcode is position-independent code with no loader. It resolves APIs via PEB walking (Windows) or direct syscalls (Linux). Analysis uses emulation (scdbg, speakeasy, Unicorn) and disassembly (ndisasm, pwntools).

---

## Fundamentals

- Position-independent: no absolute addresses, no imports, no sections
- Null-byte free (for string-based exploits): use `xor eax, eax` not `mov eax, 0`
- Self-contained: resolves everything at runtime

### Finding EIP/RIP (GetPC)

```asm
; x86 call/pop trick
call next
next:
    pop ebx          ; EBX = address of 'next'

; x64
call next
next:
    pop rax          ; RAX = current RIP
```

---

## Windows API Resolution

### PEB Walk Offsets

| Field | x86 | x64 |
|-------|-----|-----|
| PEB from TIB | `fs:[0x30]` | `gs:[0x60]` |
| PEB->Ldr | `+0x0C` | `+0x18` |
| Ldr->InMemoryOrderModuleList | `+0x14` | `+0x20` |
| LDR_DATA_TABLE_ENTRY->DllBase | `+0x10` | `+0x20` |

### EAT Parsing Flow

```
1. Module base (from PEB walk)
2. base + [base+0x3C] = PE header (e_lfanew)
3. PE + 0x78 = Export Directory RVA
4. Export Dir + 0x18 = NumberOfNames
5. Export Dir + 0x20 = AddressOfNames (RVA array)
6. Export Dir + 0x24 = AddressOfNameOrdinals
7. Export Dir + 0x1C = AddressOfFunctions
8. Match name hash -> ordinal -> function RVA -> add base
```

### ROR13 Hash (msfvenom/Cobalt Strike standard)

| Function | Hash |
|----------|------|
| `LoadLibraryA` | `0xEC0E4E8E` |
| `GetProcAddress` | `0x7805F71B` |
| `VirtualAlloc` | `0xE553A458` |
| `VirtualProtect` | `0x30B5C2AD` |
| `CreateThread` | `0x0A1E77E8` |
| `WinExec` | `0x000CE7B5` |

### Direct Syscalls (EDR Bypass)

Extract SSN from ntdll function prologue (`mov eax, SSN` at offset +4), then execute `syscall` inline without calling the hooked function. Techniques: Hell's Gate, Halo's Gate, TartarusGate.

---

## Linux Shellcode

### Syscall Convention (x64)

| Register | Purpose |
|----------|---------|
| RAX | Syscall number |
| RDI | Arg 1 |
| RSI | Arg 2 |
| RDX | Arg 3 |
| R10 | Arg 4 |
| R8/R9 | Arg 5/6 |

```asm
; execve("/bin/sh", NULL, NULL) - 27 bytes
xor rdx, rdx
mov rdi, 0x68732f2f6e69622f  ; "/bin//sh"
push rdx
push rdi
mov rdi, rsp
xor rsi, rsi
mov al, 59
syscall
```

---

## Encoding/Obfuscation

| Encoder | Method | Key Signature |
|---------|--------|---------------|
| XOR | Single-byte key XOR loop | `lodsb; xor al, KEY; stosb; loop` |
| Shikata Ga Nai | Multi-key, reverse-order, self-modifying | Variable decoder stub, block-by-block |
| Alpha_mixed | Alphanumeric bytes only (0x30-7A) | PUSH/POP/AND/SUB arithmetic |

### Shikata Ga Nai Detection

- Short loop with `sub`, `add`, `xor`, `loop` processing from end to start
- Dynamic key per 4-byte block
- Decoder stub is instruction-substituted per generation

---

## Egg Hunting

Small first-stage (egg hunter) scans memory for a unique 8-byte tag marking the real payload.

```asm
; skape's NtAccessCheckAndAuditAlarm egg hunter
xor edx, edx
or dx, 0xFFF          ; page align
inc edx
push edx
push 0x02             ; syscall probe
pop eax
int 0x2e
test eax, eax
jnz next_page         ; skip inaccessible
mov eax, [edx]
xor eax, 0xDEADBEEF   ; check egg (x2)
jnz next_addr
jmp edx               ; found - jump to payload
```

---

## Staged vs Stageless

| Type | Size | Pattern |
|------|------|---------|
| Staged | ~200-400B stub | Connect -> read length -> alloc -> read stage2 -> jmp |
| Stageless | 200KB+ | Full payload, self-contained |

### msfvenom Signatures

- `EB FF` alignment sequences
- `call/pop` at entry
- PEB walk with standard offsets
- ROR13 hashing
- Winsock loading pattern (`LoadLibraryA("ws2_32")`)

---

## Process Injection Patterns

| Technique | API Chain |
|-----------|-----------|
| Classic | `VirtualAllocEx` -> `WriteProcessMemory` -> `CreateRemoteThread` |
| Thread Hijack | `SuspendThread` -> `SetThreadContext(RIP=shellcode)` -> `ResumeThread` |
| Early Bird APC | `CreateProcess(SUSPENDED)` -> `VirtualAllocEx` -> `QueueUserAPC` -> `ResumeThread` |
| Atom Bombing | `GlobalAddAtomA` (write) -> `GlobalGetAtomNameA` (read in target) |

---

## Anti-Analysis

| Check | What it detects |
|-------|-----------------|
| `PEB->BeingDebugged` (offset +2) | Debugger attached |
| `RDTSC` timing | Single-step or breakpoints |
| `CPUID` bit 31 | Hypervisor/VM |
| RAM < 2GB | Sandbox |
| Mouse movement = 0 | Sandbox |
| Window count < 5 | Sandbox |
| `NtGlobalFlag` & 0x70 | Debugger heap flags |

---

## Analysis Tools

| Tool | Use |
|------|-----|
| `ndisasm -b 32 sc.bin` | Quick disassembly |
| `scdbg -f sc.bin -c -r` | Emulate with API hooks |
| `speakeasy` | Full PE/shellcode emulation |
| Unicorn Engine | Custom Python emulator |
| pwntools `disasm()` | Python shellcode workflow |
| Ghidra (raw binary import) | Full static analysis |

### scdbg Workflow

```bash
scdbg -f shellcode.bin          # basic execution
scdbg -f shellcode.bin -c       # dump API calls
scdbg -f shellcode.bin -s       # step through
scdbg -f shellcode.bin -ip 10.0.0.1  # simulate IP
```

### Unicorn Emulation Pattern

```python
from unicorn import *
from unicorn.x86_const import *

mu = Uc(UC_ARCH_X86, UC_MODE_32)
mu.mem_map(0x1000000, 1024*1024)   # code
mu.mem_map(0x2000000, 1024*1024)   # stack
mu.mem_write(0x1000000, shellcode)
mu.reg_write(UC_X86_REG_ESP, 0x2080000)
mu.hook_add(UC_HOOK_CODE, trace_callback)
mu.emu_start(0x1000000, 0x1000000 + len(shellcode))
```

---

## Cobalt Strike BOFs

BOFs are COFF object files (.o) loaded in-memory by Beacon. Not shellcode - they have relocations and symbols resolved against Beacon's API table. Entry point: `go()`. Fast, small, no new process.

---

## Meterpreter Architecture

```
Stage 1 (~200B): Connect -> read 4 bytes (length) -> alloc -> recv stage2 -> jmp
Stage 2: Reflective loader + meterpreter DLL
  - Maps DLL sections, applies relocations, resolves imports
  - Calls DllMain, starts transport loop
  - Extensions loaded on-demand via core_loadlib
```
