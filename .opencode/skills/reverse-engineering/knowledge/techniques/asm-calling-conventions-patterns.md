# x86/x64 Calling Conventions, Stack Frames & Compiler Patterns

TL;DR: 32-bit calling conventions (cdecl/stdcall/fastcall/thiscall), x64 Windows and System V ABIs, stack frame layout, name mangling schemes, and recognizing compiler patterns (if/else, loops, switches, vtables, canaries).
See also: `asm-registers-instructions-flags.md`

---

## 4. Calling Conventions (32-bit x86)

| Convention | Args | Stack cleanup | Name decoration |
|-----------|------|---------------|-----------------|
| **cdecl** | All on stack, right-to-left | **Caller** | `_func` |
| **stdcall** | All on stack, right-to-left | **Callee** (`ret N`) | `_func@N` |
| **fastcall** | First two in **ECX, EDX**, rest on stack | **Callee** | `@func@N` |
| **thiscall** | `this` in **ECX**, args on stack | Callee (MSVC) | C++ mangled |

**Reading the cleanup**: `ret 8` = callee cleaned 8 bytes = stdcall/fastcall. After every `call` the caller does `add esp, N` = cdecl.

---

## 5. x64 Calling Conventions

### x64 Windows ABI (Microsoft)

- Integer/pointer args 1-4: **RCX, RDX, R8, R9**.
- FP args 1-4: **XMM0-XMM3**.
- **Shadow space**: caller **always** reserves 32 bytes (0x20) on the stack.
- Return: **RAX** (integer/pointer), **XMM0** (float).
- **Volatile**: RAX, RCX, RDX, R8-R11, XMM0-5. **Nonvolatile**: RBX, RBP, RDI, RSI, RSP, R12-R15, XMM6-15.

### System V AMD64 ABI (Linux, macOS, BSD)

- Integer/pointer args 1-6: **RDI, RSI, RDX, RCX, R8, R9**.
- FP args 1-8: **XMM0-XMM7**.
- **No shadow space.** 128-byte **red zone** below RSP for leaf functions.
- Return: **RAX** (+ RDX for 128-bit), **XMM0**.
- **Callee-saved**: RBX, RBP, RSP, R12-R15.

### x64 register-arg cheat sheet
| Arg | Win64 | System V |
|-----|-------|----------|
| 1 | RCX | RDI |
| 2 | RDX | RSI |
| 3 | R8 | RDX |
| 4 | R9 | RCX |
| 5 | stack | R8 |
| 6 | stack | R9 |

### Linux syscalls
`syscall` number in **RAX**; args in **RDI, RSI, RDX, R10, R8, R9** -- note **R10 replaces RCX**.

---

## 6. Stack Frames, Prologue & Epilogue

The stack grows **downward**. RSP points at the current top; RBP anchors the frame.

### Frame-pointer prologue / epilogue
```asm
push rbp            ; save caller's frame pointer
mov  rbp, rsp       ; establish new frame pointer
sub  rsp, 0x30      ; allocate locals
; ... body ...
leave               ; mov rsp, rbp + pop rbp
ret
```

### Frame-pointer-omission (FPO)
Optimized builds skip RBP setup and address everything **RSP-relative**. RBP becomes a normal register.

### Typical frame layout
```
[ caller's stack args ]      higher addresses
[ return address      ]  <- pushed by `call`
[ saved RBP           ]  <- RBP points here
[ local variables     ]
[ shadow space (Win64) ]
[ outgoing stack args  ]  <- RSP (top)     lower addresses
```

**Stack alignment**: at `call`, RSP must be 16-byte aligned.

---

## 7. Name Mangling / Decoration

### C decoration
`_func` (cdecl), `_func@N` (stdcall), `@func@N` (fastcall). On x64: usually plain names.

### C++ mangling
- **Itanium ABI** (GCC, Clang): `_Z` prefix, length-prefixed names, encoded parameter types.
- **MSVC**: `?` prefix, `@@` separator, encoded access/convention/return/params.

Recognizing the prefix tells you the toolchain: `_Z...` = GCC/Clang, `?...@@` = MSVC.

---

## 8. Recognizing Compiler Patterns

### if / else
`cmp` + conditional jump skipping a block. Inverted condition: `if (a == b)` compiles to `cmp; jne else_label`.

### Loops
A backward conditional jump is a loop tail. `dec ecx; jnz top` = counted loop.

### switch -- jump tables
Dense cases become an indirect jump: bounds-check (`cmp; ja default`), then `jmp [table + index*8]`. Sparse cases: binary-search tree of `cmp`/`je`.

### struct access
`mov eax, [rdi+0x10]` reads field at offset 16. Arrays: `[base + index*scale]` where scale reveals element size.

### C++ virtual calls / vtables
```asm
mov  rax, [rcx]        ; load vtable ptr from object
call [rax+0x18]        ; call 4th virtual method
```
Two indirections + `this` in the first arg register = virtual call.

### Stack canary / stack protector
```asm
mov  rax, fs:0x28        ; Linux: load canary from TLS
mov  [rbp-8], rax
; ... body ...
mov  rax, [rbp-8]
sub  rax, fs:0x28
jne  __stack_chk_fail
```

---

## 10. Mapping Assembly Back to C -- Worklist

1. Find function bounds (prologue to epilogue).
2. Identify the ABI from arg registers.
3. Name the parameters from incoming registers/stack.
4. Recover locals from `[rbp-N]` / `[rsp+N]` slots.
5. Rebuild control flow: `cmp`+`jcc` -> if/else, backward jumps -> loops.
6. Type the data: offset constants -> struct fields; `*scale` -> array element size.
7. Track return in RAX/EAX.
8. Demangle symbols.

---

## Quick Reference Card

| Question | Answer |
|----------|--------|
| First int arg, Linux | RDI |
| First int arg, Windows | RCX |
| Integer return | RAX / EAX |
| Float return | XMM0 |
| Win64 caller reserves | 32B shadow space |
| SysV leaf scratch below RSP | 128B red zone |
| Stack alignment at `call` | 16 bytes |
| `cmp a,b; je` means | `a == b` |
| `ja`/`jb` | unsigned compare |
| `jg`/`jl` | signed compare |
| `xor eax,eax` | zero EAX |
| `test rax,rax; je` | if (rax == 0) |
| `lea` | address arithmetic, no load |
| GCC/Clang C++ symbol | `_Z...` |
| MSVC C++ symbol | `?...@@` |
| stdcall symbol | `_func@N` |
| Canary source | `fs:0x28` (Linux) / `gs:` (Win) |
