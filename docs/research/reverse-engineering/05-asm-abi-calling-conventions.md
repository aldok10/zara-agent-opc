# x86 / x64 Assembly, ABIs & Calling Conventions

A reverse-engineering reference for reading disassembly and decompiler output (Ghidra, IDA, Binary Ninja, objdump). Scope: authorized analysis only. Covers register sets, instruction semantics, calling conventions, stack frames, name mangling, and compiler-pattern recognition.

> Syntax note: examples use **Intel syntax** (`mov dst, src`) unless prefixed with `%` registers, which is **AT&T syntax** (`mov %src, %dst`). AT&T reverses operand order and prefixes registers with `%`, immediates with `$`.

---

## 1. Register Sets

### General-Purpose Registers (x64)

x64 extends the eight 32-bit x86 registers to 64-bit and adds eight more (`R8`–`R15`). Each has narrower aliases. Writing a 32-bit register (e.g. `eax`) **zero-extends** into the full 64-bit register; writing 8/16-bit aliases does not.

| 64-bit | 32-bit | 16-bit | 8-bit low | x86 role / convention |
|--------|--------|--------|-----------|------------------------|
| RAX | EAX | AX | AL | Return value, accumulator |
| RBX | EBX | BX | BL | Callee-saved (base) |
| RCX | ECX | CX | CL | 4th arg (Win) / counter |
| RDX | EDX | DX | DL | 3rd arg, return high half |
| RSI | ESI | SI | SIL | 2nd arg (SysV) / source idx |
| RDI | EDI | DI | DIL | 1st arg (SysV) / dest idx |
| RBP | EBP | BP | BPL | Frame pointer (callee-saved) |
| RSP | ESP | SP | SPL | Stack pointer |
| R8–R15 | R8D–R15D | R8W–R15W | R8B–R15B | Args / scratch (see ABI) |

x86 (32-bit) has only `EAX EBX ECX EDX ESI EDI EBP ESP`. There is no `RIP`-relative addressing in 32-bit; x64 adds **RIP-relative** addressing (`lea rax, [rip+0x1234]`), heavily used for position-independent code and data references [4](https://cs61.seas.harvard.edu/site/2018/Asm2/).

### Special / Other

- **RIP / EIP**: instruction pointer. Not directly writable except via control flow.
- **RFLAGS / EFLAGS**: status flags (see §3).
- **XMM0–XMM15** (SSE): 128-bit float/SIMD. `xmm0` returns floats/doubles; `xmm0–xmm7` pass FP args under both major x64 ABIs [1](http://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/X86ISA____X86-SYSCALL-ARGS-AND-RETURN-VALUE-MARSHALLING).
- **Segment registers** (`CS DS SS ES FS GS`): mostly vestigial in flat memory; `FS`/`GS` still anchor thread-local storage and the stack canary (`fs:0x28` on Linux, `gs:` on Windows).

---

## 2. Common Instructions

### Data movement
| Instruction | Meaning |
|-------------|---------|
| `mov dst, src` | Copy value |
| `movzx` / `movsx` | Move with zero / sign extension to wider register |
| `lea dst, [expr]` | Load **effective address** — computes the address expression, does **not** dereference. Often abused for arithmetic: `lea eax, [rdi+rsi*4]` = `eax = rdi + rsi*4` |
| `push` / `pop` | Decrement/increment RSP by 8 (x64) and store/load |
| `xchg` | Swap two operands |

`lea` vs `mov`: `mov rax, [rbx]` loads memory **at** rbx; `lea rax, [rbx]` loads the address rbx itself. A decompiler showing `&x` usually came from `lea`.

### Arithmetic / logic
`add sub imul idiv inc dec and or xor not neg shl shr sar`. Idioms:
- `xor eax, eax` → set EAX to 0 (shorter/faster than `mov eax, 0`, and zero-extends to RAX).
- `test eax, eax` → set flags by ANDing EAX with itself; used to check zero/sign without modifying it.
- `sar` = arithmetic (signed) shift right; `shr` = logical (unsigned).

### Control flow
| Instruction | Meaning |
|-------------|---------|
| `call target` | Push return address, jump |
| `ret` | Pop return address, jump back. `ret N` also frees N bytes of args (stdcall) |
| `jmp target` | Unconditional jump |
| `jmp [table+rax*8]` | Indirect jump — switch table or vtable dispatch |
| `leave` | `mov rsp, rbp` + `pop rbp` (collapses frame) |
| `nop` | Padding / alignment |

### Compare / set flags
`cmp a, b` computes `a - b` and sets flags **without storing** the result [1](https://stackoverflow.com/questions/56567446/explain-how-the-flags-work-in-conditional-jumps-in-assembly-language). `test a, b` computes `a & b` and sets flags (commonly `test reg, reg` to check for zero/negative) [7](https://stackoverflow.com/questions/31171336/how-does-test-and-je-jne-work).

---

## 3. Flags & Conditional Jumps

When the ALU runs an operation it records results in the FLAGS register [3](https://riptutorial.com/x86/example/6976/flags-register).

| Flag | Name | Set when |
|------|------|----------|
| ZF | Zero | Result == 0 (so `cmp a,b` sets ZF iff `a == b`) |
| SF | Sign | Result's MSB == 1 (negative) |
| CF | Carry | Unsigned overflow / borrow (used for **unsigned** comparisons) |
| OF | Overflow | Signed overflow (used for **signed** comparisons) |
| PF | Parity | Low byte has even number of 1-bits |
| DF | Direction | String op direction (0 = up, 1 = down) |

Signed comparisons rely on SF and OF; unsigned comparisons rely on CF [8](https://diveintosystems.cs.swarthmore.edu/book/C7-x86_64/preliminaries.html).

### Conditional jumps after `cmp a, b`
| Jump | Condition | Signed? | Flags |
|------|-----------|---------|-------|
| `je` / `jz` | a == b | both | ZF=1 |
| `jne` / `jnz` | a != b | both | ZF=0 |
| `jg` / `jnle` | a > b | signed | ZF=0 & SF=OF |
| `jge` / `jnl` | a >= b | signed | SF=OF |
| `jl` / `jnge` | a < b | signed | SF≠OF |
| `jle` / `jng` | a <= b | signed | ZF=1 or SF≠OF |
| `ja` / `jnbe` | a > b | unsigned | CF=0 & ZF=0 |
| `jae` / `jnb` / `jnc` | a >= b | unsigned | CF=0 |
| `jb` / `jnae` / `jc` | a < b | unsigned | CF=1 |
| `jbe` / `jna` | a <= b | unsigned | CF=1 or ZF=1 |
| `js` / `jns` | result neg / non-neg | — | SF=1 / SF=0 |
| `jo` / `jno` | overflow / not | — | OF=1 / OF=0 |

`je`/`jz` are the same opcode; `je` reads better after `cmp`, `jz` after `test`/arithmetic [4](https://stackoverflow.com/a/14267642). Mnemonic: **A/B = above/below = unsigned**, **G/L = greater/less = signed**.

`setcc` (e.g. `sete al`) writes 0/1 into a byte instead of jumping; `cmovcc` conditionally moves. Both are signs the source had a boolean or ternary.

---

## 4. Calling Conventions (32-bit x86)

The convention is the caller/callee contract: where args go, who cleans the stack, which registers survive, where the return value lands [6](http://kindatechnical.com/compiler-design/calling-conventions-and-stack-frame-layout.html). 32-bit conventions are mostly stack-based.

| Convention | Args | Stack cleanup | Name decoration | Notes |
|-----------|------|---------------|-----------------|-------|
| **cdecl** | All on stack, right-to-left | **Caller** | `_func` (leading underscore) | C default; supports varargs because caller knows arg count [6](https://azrael.digipen.edu/~mmead/www/Courses/CS225/CallingConventions.html) |
| **stdcall** | All on stack, right-to-left | **Callee** (`ret N`) | `_func@N` (N = byte size of args) | Win32 API default [7](https://learn.microsoft.com/en-us/cpp/cpp/stdcall?view=msvc-170) |
| **fastcall** | First two DWORDs in **ECX, EDX**, rest on stack | **Callee** | `@func@N` (leading + trailing @) | [3](http://www.cs.cornell.edu/courses/cs412/2000SP/resources/microsoft-calling-conventions.html) |
| **thiscall** | `this` in **ECX**, args on stack | Callee (MSVC) | C++ mangled | MSVC default for member functions |
| **vectorcall** | Integer in ECX/EDX, FP/vector in XMM0–5 | Callee | `func@@N` | Adds SIMD register passing |

**Reading the cleanup**: if you see `ret 8` the callee cleaned 8 bytes → stdcall/fastcall. If after every `call` the caller does `add esp, N`, that's cdecl.

The trailing number is **total bytes** of all parameters (including register-passed ones for fastcall), so `_f@8` = 8 bytes = two 4-byte args [5](https://devblogs.microsoft.com/oldnewthing/20040108-00/?p=41163). 32-bit return: integer in **EAX** (64-bit in **EDX:EAX**), float on the x87 `st0` stack.

---

## 5. x64 Calling Conventions

Both major x64 ABIs pass the first several args in registers. They differ in **which** registers and in stack reservation.

### x64 Windows ABI (Microsoft)
Four-register fastcall by default [2](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170).

- Integer/pointer args 1–4: **RCX, RDX, R8, R9** (left to right) [9](https://devblogs.microsoft.com/oldnewthing/20040114-00/?p=41053).
- FP args 1–4: **XMM0–XMM3**. Positions are shared: a float in slot 2 uses XMM1 and skips RDX.
- Args 5+ pushed on the stack, right to left.
- **Shadow space (a.k.a. home/spill space)**: the caller **always** reserves 32 bytes (0x20) on the stack above the return address, even when there are fewer than four args, so the callee can spill RCX/RDX/R8/R9. Critical for variadics [5](http://stackoverflow.com/a/30191127/831878)[6](https://stackoverflow.com/q/43865429).
- Return: **RAX** (integer/pointer), **XMM0** (float).
- **Volatile (caller-saved)**: RAX, RCX, RDX, R8, R9, R10, R11, XMM0–5. **Nonvolatile (callee-saved)**: RBX, RBP, RDI, RSI, RSP, R12–R15, XMM6–15 [7](https://stackoverflow.com/questions/53290932/)[3](https://stackoverflow.com/revisions/92d6ef49-80b9-4941-9068-7b68fd579a6e/view-source).

A classic Win64 prologue reserving shadow space plus locals: `sub rsp, 0x28` (0x20 shadow + 8 to realign to 16).

### System V AMD64 ABI (Linux, macOS, BSD)
- Integer/pointer args 1–6: **RDI, RSI, RDX, RCX, R8, R9** [4](https://cs61.seas.harvard.edu/site/2018/Asm2/)[10](https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64)[7](http://c9x.me/compile/doc/abi.html).
- FP args 1–8: **XMM0–XMM7** [1](http://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/X86ISA____X86-SYSCALL-ARGS-AND-RETURN-VALUE-MARSHALLING).
- Args beyond that on the stack, right to left.
- **No shadow space.** Instead a 128-byte **red zone** below RSP that leaf functions may use without adjusting RSP.
- Return: **RAX** (+ **RDX** for 128-bit / two-eightbyte structs), **XMM0**(+XMM1) for FP [1](http://kindatechnical.com/compiler-design/calling-conventions-and-stack-frame-layout.html).
- **Callee-saved**: RBX, RBP, RSP, R12, R13, R14, R15. Everything else is caller-saved/scratch [5](https://stackoverflow.com/questions/18024672/what-registers-are-preserved-through-a-linux-x86-64-function-call).
- For variadics, AL holds the count of vector registers used.

### x64 register-arg cheat sheet
| Arg | Win64 | System V |
|-----|-------|----------|
| 1 | RCX | RDI |
| 2 | RDX | RSI |
| 3 | R8 | RDX |
| 4 | R9 | RCX |
| 5 | stack | R8 |
| 6 | stack | R9 |
| 7+ | stack | stack |
| FP 1–4/8 | XMM0–3 | XMM0–7 |
| Return | RAX / XMM0 | RAX(+RDX) / XMM0 |

### Linux syscalls (not the C ABI)
`syscall` number in **RAX**; args in **RDI, RSI, RDX, R10, R8, R9** — note **R10 replaces RCX**, because the `syscall` instruction clobbers RCX (saves RIP) and R11 (saves RFLAGS) [3](https://www.systutorials.com/x86-64-calling-convention-by-gcc/)[1](http://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/X86ISA____X86-SYSCALL-ARGS-AND-RETURN-VALUE-MARSHALLING).

---

## 6. Stack Frames, Prologue & Epilogue

The stack grows **downward** (toward lower addresses). RSP points at the current top; RBP (when used) anchors a fixed reference into the current frame [3](https://stackoverflow.com/revisions/d8c3e7c2-e5de-446a-ae1e-b10a19998021/view-source).

### Frame-pointer prologue / epilogue
```asm
; Prologue
push rbp            ; save caller's frame pointer
mov  rbp, rsp       ; establish new frame pointer
sub  rsp, 0x30      ; allocate locals (and shadow space on Win64)
; ... body: locals at [rbp-8], [rbp-0x10] ...; args (SysV 7+) at [rbp+0x10]+
; Epilogue
mov  rsp, rbp       ; \ often replaced by a single
pop  rbp            ; / `leave` instruction
ret
```
`push rbp; mov rbp, rsp` saves the old base and makes RBP the frame anchor [2](https://reversingid.gitbooks.io/panduan-reverse-code-engineering/content/mapping-c-dan-assembly/function-prolog.html). The epilogue undoes it; `leave` is the compact form [1](https://stackoverflow.com/questions/14296088/what-is-this-assembly-function-prologue-epilogue-code-doing-with-rbp-rsp-l).

### Frame-pointer-omission (FPO / `-fomit-frame-pointer`)
Optimized builds often skip RBP setup and address everything **RSP-relative** (`[rsp+0x20]`). RBP becomes a normal register. Decompilers reconstruct frame layout from RSP deltas; this is why optimized code is harder to read.

### Typical frame layout (high → low address)
```
[ caller's stack args 7+ ]      higher addresses
[ return address         ]  <- pushed by `call`
[ saved RBP              ]  <- RBP points here after prologue
[ local variables        ]
[ saved nonvolatile regs ]
[ shadow space (Win64)    ]  <- for the next call
[ outgoing stack args     ]  <- RSP (top)         lower addresses
```

**Stack alignment**: at the point of a `call`, RSP must be 16-byte aligned in both x64 ABIs. After `call` pushes the 8-byte return address, RSP is 16n+8 inside the callee, which is why prologues add/subtract values like 8 or 0x28 to realign.

---

## 7. Name Mangling / Decoration

`extern "C"` disables C++ mangling but **not** the C decoration above; the two are orthogonal [3](https://stackoverflow.com/questions/4550294/stdcall-name-mangling-using-extern-c-and-dllexport-vs-module-definitions-msvc).

### C decoration (per convention) — see §4 table
`_func` (cdecl), `_func@N` (stdcall), `@func@N` (fastcall). On x64 there is essentially **no** leading underscore and a single calling convention, so exported C names usually appear undecorated.

### C++ mangling — two incompatible schemes
There is no single standard; compilers diverge [1](https://stackoverflow.com/questions/70051283/what-are-all-the-commonly-used-c-abis-and-mangling-schemes).

**Itanium ABI** (GCC, Clang on Unix; the two converged here) [2](https://medium.com/@bengisu.batmaz/name-mangling-with-itanium-abi-00a5c4dbc3c4):
- Prefix `_Z`, then length-prefixed names, then encoded parameter types.
- `int func(char*, int)` → `_Z4funcPci` (`P`=pointer, `c`=char, `i`=int) [6](http://stackoverflow.com/questions/12400105).
- Demangle with `c++filt _Z4funcPci` or `llvm-cxxfilt`.

**MSVC mangling** (Windows):
- Begins with `?`, name, `@@`, then encoded access/convention/return/params.
- e.g. `?func@@YAHPADH@Z` (`YA`=cdecl, `H`=int return) [8](https://stackoverflow.com/questions/30366113/msvc-function-demangling).
- Demangle with `undname.exe` or `dumpbin /SYMBOLS`.

Tools like `pydemangler` handle both schemes [7](https://github.com/wbenny/pydemangler). Recognizing the prefix tells you the toolchain: `_Z…` = GCC/Clang, `?…@@` = MSVC.

---

## 8. Recognizing Compiler Patterns

### if / else
`cmp` + conditional jump skipping a block. Inverted condition: source `if (a == b)` compiles to `cmp; jne else_label` (jump when **not** equal). Always read the jump as the *fall-through-avoidance* of the C condition.

### Loops
- A backward conditional jump is a loop tail. `for`/`while` often become: test at top, body, `jmp` back, with the condition check sometimes duplicated at the bottom (loop rotation).
- `dec ecx; jnz top` or `loop` instruction → counted loop.

### switch — jump tables
Dense `case` values become an indirect jump through a table: bounds-check (`cmp; ja default`), then `jmp [table + index*8]` (or `*4` in 32-bit) [3](https://stackoverflow.com/a/1837703). Sparse cases compile to a binary-search tree of `cmp`/`je`, or a chain of compares. The table itself sits in `.rodata`/`.rdata`.

### struct access
Field access is base + constant offset: `mov eax, [rdi+0x10]` reads the field at offset 16 of the struct pointed to by the first arg. Arrays: `[base + index*scale]` where scale ∈ {1,2,4,8} reveals element size.

### C++ virtual calls / vtables
A polymorphic object's first hidden member is a **vtable pointer**; the vtable is an array of function pointers laid out in declaration order [5](https://stackoverflow.com/revisions/048c6651-12cf-4fff-9854-1318064c884e/view-source)[1](https://stackoverflow.com/revisions/997a9140-146b-421f-ba27-e84eebfb7299/view-source). Canonical dispatch:
```asm
mov  rax, [rcx]        ; load vtable ptr from object (this in RCX on Win64)
call [rax+0x18]        ; call 4th virtual method (offset 0x18 = index 3)
```
Two indirections + a `this` in the first arg register = almost certainly a virtual call. Model classes as structs and vtables as structs of function pointers to recover the hierarchy [10](https://reverseengineering.stackexchange.com/q/87/)[6](https://dennisbabkin.com/blog/?t=reverse-engineer-virtual-functions-vs-cpp-compiler-vtable-purecall-cfg).

### String / memory operations
`rep movsb` (copy RCX bytes RSI→RDI), `rep stosb` (fill), `repne scasb` (strlen-style scan) use the implicit RSI/RDI/RCX registers and the DF direction flag. Inlined `memcpy`/`memset` often appear as SSE stores (`movdqu`).

### Stack canary / stack protector
Tell-tale of `-fstack-protector` / `/GS`. Prologue loads a cookie from TLS, epilogue re-checks before `ret`; mismatch calls `__stack_chk_fail` [4](https://www.sans.org/blog/stack-canaries-gingerly-sidestepping-the-cage/):
```asm
mov  rax, fs:0x28        ; Linux: load canary from TLS (gs: on Windows)
mov  [rbp-8], rax
; ... body ...
mov  rax, [rbp-8]
sub  rax, fs:0x28        ; or xor + cmp
jne  __stack_chk_fail
```

---

## 9. Endianness, Alignment & Optimizations That Confuse Decompilers

### Endianness
x86/x64 are **little-endian**: the least-significant byte is at the lowest address. `mov eax, [mem]` loading bytes `78 56 34 12` yields `0x12345678`. Multi-byte immediates in a hex dump look byte-reversed.

### Alignment
Natural alignment = a type aligned to its size (4-byte int on 4-byte boundary, 8-byte pointer on 8). Compilers insert **struct padding** to satisfy this, so struct offsets are not the naive sum of field sizes. Stack stays 16-byte aligned at calls (§6). Misreading padding as fields is a common analysis error.

### Optimizations that obscure source
- **Inlining**: callee body folded in; no `call` to anchor on.
- **FPO**: no RBP frame (§6).
- **Instruction scheduling / reordering**: independent ops interleaved to hide latency, so source order is lost [7](https://devblogs.microsoft.com/oldnewthing/20210624-46/?p=105355).
- **Strength reduction**: `imul` by constant becomes `lea`/`shl`/`add` combos; division by constant becomes a magic-number multiply + shift.
- **Tail-call optimization**: `jmp func` instead of `call; ret`.
- **Common subexpression elimination / register reuse**: one register holds different source variables across its lifetime.
- **Vectorization**: scalar loops become XMM/YMM SIMD with leftover scalar "tail" loops.
- **Dead-code / branch folding**: `if (constant)` branches vanish entirely.

---

## 10. Mapping Assembly Back to C — Worklist

1. **Find function bounds**: prologue (`push rbp`/`sub rsp`) to epilogue (`leave`/`ret`) [2](https://kindatechnical.com/low-level-computing/lesson-94-static-analysis-reading-disassembly-and-identifying-functions.html).
2. **Identify the ABI** from arg registers (RDI… = SysV, RCX… = Win64) and cleanup (`ret N` = stdcall-family).
3. **Name the parameters**: trace the incoming arg registers / `[rbp+...]` stack slots.
4. **Recover locals**: each distinct `[rbp-N]` / `[rsp+N]` slot is a local variable.
5. **Rebuild control flow**: map `cmp`+`jcc` to if/else, backward jumps to loops, indirect `jmp [table]` to switch.
6. **Type the data**: offset constants on a pointer → struct fields; `*scale` indexing → array element size; double indirection + first-arg `this` → C++ virtual call.
7. **Track the return** in RAX/EAX (or XMM0 for float).
8. **Demangle symbols** to confirm signatures (`c++filt`, `undname`).

---

## Quick Reference Card

| Question | Answer |
|----------|--------|
| First int arg, Linux | RDI |
| First int arg, Windows | RCX |
| Integer return | RAX / EAX |
| Float return | XMM0 |
| Frame pointer | RBP (if not omitted) |
| Stack pointer | RSP |
| Win64 caller reserves | 32B shadow space |
| SysV leaf scratch below RSP | 128B red zone |
| Stack alignment at `call` | 16 bytes |
| `cmp a,b; je` means | `a == b` |
| `ja`/`jb` | unsigned compare |
| `jg`/`jl` | signed compare |
| `xor eax,eax` | zero EAX |
| `test rax,rax; je` | if (rax == 0) |
| `lea` | address arithmetic, no load |
| GCC/Clang C++ symbol | `_Z…` |
| MSVC C++ symbol | `?…@@` |
| stdcall symbol | `_func@N` |
| Canary source | `fs:0x28` (Linux) / `gs:` (Win) |

---

### Sources
Microsoft x64 ABI [2](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170), Old New Thing amd64 history [9](https://devblogs.microsoft.com/oldnewthing/20040114-00/?p=41053), shadow space [5](http://stackoverflow.com/a/30191127/831878), Win64 volatile regs [7](https://stackoverflow.com/questions/53290932/), System V ABI [7](http://c9x.me/compile/doc/abi.html) and stack layout [10](https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64), CS61 register args [4](https://cs61.seas.harvard.edu/site/2018/Asm2/), GCC syscall convention [3](https://www.systutorials.com/x86-64-calling-convention-by-gcc/), Wikipedia x86 calling conventions [1](https://en.wikipedia.org/wiki/X86_calling_conventions), MSVC fastcall decoration [3](http://www.cs.cornell.edu/courses/cs412/2000SP/resources/microsoft-calling-conventions.html), DigiPen decoration table [6](https://azrael.digipen.edu/~mmead/www/Courses/CS225/CallingConventions.html), Itanium mangling [2](https://medium.com/@bengisu.batmaz/name-mangling-with-itanium-abi-00a5c4dbc3c4), flags & jumps [1](https://stackoverflow.com/questions/56567446/explain-how-the-flags-work-in-conditional-jumps-in-assembly-language)[2](https://riptutorial.com/x86/example/20470/conditional-jumps)[8](https://diveintosystems.cs.swarthmore.edu/book/C7-x86_64/preliminaries.html), prologue/epilogue [1](https://stackoverflow.com/questions/14296088/what-is-this-assembly-function-prologue-epilogue-code-doing-with-rbp-rsp-l)[2](https://reversingid.gitbooks.io/panduan-reverse-code-engineering/content/mapping-c-dan-assembly/function-prolog.html), vtables [5](https://stackoverflow.com/revisions/048c6651-12cf-4fff-9854-1318064c884e/view-source)[6](https://dennisbabkin.com/blog/?t=reverse-engineer-virtual-functions-vs-cpp-compiler-vtable-purecall-cfg), stack canaries [4](https://www.sans.org/blog/stack-canaries-gingerly-sidestepping-the-cage/).
