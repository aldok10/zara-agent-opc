# x86/x64 Assembly: Register Sets, Common Instructions & Flags

TL;DR: General-purpose and special registers, data movement/arithmetic/control-flow instructions, flags register, and conditional jump mappings.
See also: `asm-calling-conventions-patterns.md`

---

## 1. Register Sets

### General-Purpose Registers (x64)

x64 extends the eight 32-bit x86 registers to 64-bit and adds eight more (`R8`-`R15`). Writing a 32-bit register (e.g. `eax`) **zero-extends** into the full 64-bit register; writing 8/16-bit aliases does not.

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
| R8-R15 | R8D-R15D | R8W-R15W | R8B-R15B | Args / scratch (see ABI) |

### Special / Other

- **RIP / EIP**: instruction pointer. Not directly writable except via control flow.
- **RFLAGS / EFLAGS**: status flags (see section 3).
- **XMM0-XMM15** (SSE): 128-bit float/SIMD. `xmm0` returns floats/doubles.
- **Segment registers** (`CS DS SS ES FS GS`): mostly vestigial; `FS`/`GS` anchor thread-local storage and the stack canary.

---

## 2. Common Instructions

### Data movement
| Instruction | Meaning |
|-------------|---------|
| `mov dst, src` | Copy value |
| `movzx` / `movsx` | Move with zero / sign extension |
| `lea dst, [expr]` | Load **effective address** -- computes address, does **not** dereference |
| `push` / `pop` | Decrement/increment RSP and store/load |

`lea` vs `mov`: `mov rax, [rbx]` loads memory **at** rbx; `lea rax, [rbx]` loads the address rbx itself.

### Arithmetic / logic
`add sub imul idiv inc dec and or xor not neg shl shr sar`. Idioms:
- `xor eax, eax` -> set EAX to 0 (zero-extends to RAX).
- `test eax, eax` -> set flags by ANDing EAX with itself; check zero/sign without modifying.

### Control flow
| Instruction | Meaning |
|-------------|---------|
| `call target` | Push return address, jump |
| `ret` | Pop return address, jump back. `ret N` also frees N bytes (stdcall) |
| `jmp target` | Unconditional jump |
| `jmp [table+rax*8]` | Indirect jump -- switch table or vtable dispatch |
| `leave` | `mov rsp, rbp` + `pop rbp` |

### Compare / set flags
`cmp a, b` computes `a - b` and sets flags **without storing** the result. `test a, b` computes `a & b` and sets flags (commonly `test reg, reg` to check for zero/negative).

---

## 3. Flags & Conditional Jumps

| Flag | Name | Set when |
|------|------|----------|
| ZF | Zero | Result == 0 |
| SF | Sign | Result's MSB == 1 (negative) |
| CF | Carry | Unsigned overflow / borrow |
| OF | Overflow | Signed overflow |

### Conditional jumps after `cmp a, b`
| Jump | Condition | Signed? | Flags |
|------|-----------|---------|-------|
| `je` / `jz` | a == b | both | ZF=1 |
| `jne` / `jnz` | a != b | both | ZF=0 |
| `jg` / `jnle` | a > b | signed | ZF=0 & SF=OF |
| `jge` / `jnl` | a >= b | signed | SF=OF |
| `jl` / `jnge` | a < b | signed | SF!=OF |
| `jle` / `jng` | a <= b | signed | ZF=1 or SF!=OF |
| `ja` / `jnbe` | a > b | unsigned | CF=0 & ZF=0 |
| `jae` / `jnb` | a >= b | unsigned | CF=0 |
| `jb` / `jnae` | a < b | unsigned | CF=1 |
| `jbe` / `jna` | a <= b | unsigned | CF=1 or ZF=1 |

Mnemonic: **A/B = above/below = unsigned**, **G/L = greater/less = signed**.

`setcc` (e.g. `sete al`) writes 0/1 into a byte instead of jumping; `cmovcc` conditionally moves.
