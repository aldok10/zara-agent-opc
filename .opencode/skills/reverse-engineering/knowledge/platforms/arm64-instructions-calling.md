# ARM Instruction Set & Calling Conventions

> **TL;DR:** ARM32/ARM64 instruction encoding (data processing, load/store, branches,
> conditional execution, barrel shifter, NEON), calling conventions (AAPCS/AAPCS64),
> syscall conventions, and key differences between ARM and x86 for reverse engineers.

> **Cross-reference:** Siblings: `arm64-architecture-registers.md`, `arm64-thumb-firmware-methodology.md`,
> `arm64-firmware-architectures-mitre.md`, `arm64-tooling-shellcode.md`, `arm64-rtos-iot-uefi.md`

---

## 3. ARM Instruction Set

### 3.1 Data Processing

Most ARM instructions follow the pattern: `op{cond}{s} Rd, Rn, Operand2` where
Operand2 is an immediate, register, or shifted register.

| Category | AArch32 examples | AArch64 examples |
|----------|-----------------|-----------------|
| Move | `MOV R0, #42` | `MOV X0, #42` |
| Add | `ADD R0, R1, R2` | `ADD X0, X1, X2` |
| Subtract | `SUB R0, R1, #8` | `SUBS X0, X1, #8` |
| Multiply | `MUL R0, R1, R2` | `MUL X0, X1, X2` |
| Bitwise | `AND R0, R1, R2` | `AND X0, X1, X2` |
| Compare | `CMP R0, #5` | `CMP X0, #5` |
| Extended | `SMULL R0, R1, R2, R3` (64-bit mul) | `SMULL X0, W1, W2` |

The `S` suffix (AArch32) or `S` infix (AArch64, e.g. `SUBS`) updates condition flags.
Without `S`, flags are unchanged.

### 3.2 Load/Store Architecture

ARM is a **load-store** architecture — only LDR/STR access memory; data processing
operates on registers.

**ARM32:**

| Instruction | Meaning |
|------------|---------|
| `LDR R0, [R1]` | Load word from address in R1 |
| `LDR R0, [R1, #4]` | Load word from R1+4 (immediate offset) |
| `LDR R0, [R1, R2]` | Load word from R1+R2 (register offset) |
| `LDR R0, [R1, #4]!` | Pre-increment: R1 += 4, then load from new R1 |
| `LDR R0, [R1], #4` | Post-increment: load from R1, then R1 += 4 |
| `STR R0, [R1]` | Store word to address in R1 |
| `LDMIA R0!, {R1-R4}` | Load multiple, increment after |
| `STMDB SP!, {R4-R11, LR}` | Store multiple, decrement before (push) |
| `LDRB` / `LDRH` | Load byte (zero-extend) / halfword (zero-extend) |
| `LDRSB` / `LDRSH` | Load signed byte / signed halfword (sign-extend) |

**ARM64:**

| Instruction | Meaning |
|------------|---------|
| `LDR X0, [X1]` | Load 64-bit from X1 |
| `LDR W0, [X1]` | Load 32-bit from X1 (zero-extends) |
| `LDR X0, [X1, #8]` | Immediate offset |
| `LDP X0, X1, [SP]` | Load pair — two 64-bit registers |
| `STP X0, X1, [SP, #-16]!` | Store pair with pre-decrement (push two) |
| `LDUR` / `STUR` | Unscaled offset variant (used by compiler for -256..255) |
| `LDRSB` / `LDRSH` / `LDRSW` | Signed byte/halfword/word load (sign-extends to 64) |

No LDM/STM in AArch64 — use LDP/STP instead. Pair operations always align to 2×
element size.

### 3.3 Branches

| AArch32 | AArch64 | Effect |
|---------|---------|--------|
| `B label` | `B label` | PC-relative branch (±32MB ARM, ±2KB-16MB Thumb) |
| `BL label` | `BL label` | Branch and link (LR = return address) |
| `BX Rn` | `BR Xn` | Branch and exchange (switches ARM↔Thumb based on LSB) |
| `BLX Rn` | `BLR Xn` | Branch with link and exchange |
| `CBZ R0, label` | `CBZ X0, label` | Compare and branch if zero (Thumb-2/AArch64) |
| `TBB [PC, R0]` | — | Table branch byte (Thumb-2 switch) |

The LSB of the target address selects the state in AArch32: 0 = ARM, 1 = Thumb.
AArch64 has no Thumb — all addresses must be 4-byte aligned for BL/B.

### 3.4 Conditional Execution

**ARM mode** (AArch32): Every instruction can be conditional. Four-bit condition field
prefixes the mnemonic:

| Code | Suffix | Condition |
|------|--------|-----------|
| 0000 | EQ | Z == 1 |
| 0001 | NE | Z == 0 |
| 1010 | GE | N == V |
| 1011 | LT | N != V |
| 1100 | GT | Z == 0 && N == V |
| 1101 | LE | Z == 1 \|\| N != V |
| 1110 | AL | Always (default) |
| 1111 | — | (reserved / unconditional) |

Example: `ADDNE R0, R1, #1` adds 1 only if the previous comparison was not-equal.
Conditional execution was the hallmark of ARM — it eliminated short forward branches
at the cost of encoding space.

**Thumb-2**: uses the `IT` (If-Then) instruction to conditionally execute up to 4
subsequent instructions:

```asm
CMP R0, #0
ITE GT          ; If-Then-Else: three instructions following
MOVGT R1, #1   ; if R0 > 0, R1 = 1
MOVLE R1, #-1  ; else R1 = -1 (actually MOVGT with condition inverted by ITE)
```

IT blocks were a major source of Thumb-2 complexity for RE. The condition applies
to each instruction via the ITSTATE. Format `IT{x{y{z}}} cond` where each x/y/z is
T (then) or E (else).

**AArch64**: No conditional execution on general instructions. Uses conditional
select/move instructions instead:

```asm
CMP X0, #0
CSEL X1, X2, X3, GT   ; X1 = (X0 > 0) ? X2 : X3
CSINC X1, X2, X3, EQ  ; X1 = (X0 == 0) ? X2 : X3 + 1
```

### 3.5 Barrel Shifter

The ARM barrel shifter can shift or rotate one source operand before it is used by
an instruction — at no extra cycle cost [16]. This is a defining ARM feature:

```asm
ADD R0, R1, R2, LSL #2   ; R0 = R1 + (R2 << 2)
SUB R0, R1, R2, ASR #3   ; R0 = R1 - (R2 >> 3)  (arithmetic)
MOV R0, R1, RRX           ; R0 = R1 rotated right 1 via carry
LDR R0, [R1, R2, LSL #2] ; load from R1 + (R2 * 4) — array indexing in one insn
```

Shift amounts can be an immediate (0-31) or a register (lower 8 bits used). AArch64
removed the flexible barrel shifter; shift is encoded in dedicated shifted-register
forms.

### 3.6 SIMD/NEON Instructions

Common NEON instructions in firmware:

| Instruction | Meaning |
|-------------|---------|
| `VADD.I32 Q0, Q1, Q2` | Add 4×32-bit lanes (AArch32) |
| `LD1 {V0.4S}, [X0]` | Load 4×32-bit elements (AArch64) |
| `ST1 {V0.4S}, [X1]` | Store 4×32-bit elements (AArch64) |
| `AESE.8 V0, V1` | AES single round encryption (crypto ext) |
| `FMLA V0.4S, V1.4S, V2.4S` | Fused multiply-add 4×float (AArch64) |
| `UMULL V0.8H, V1.8B, V2.8B` | Unsigned multiply long |

---

## 4. ARM Calling Conventions

### 4.1 AAPCS (ARM32) [4]

The ARM Architecture Procedure Call Standard governs parameter passing, register
preservation, and stack layout for AArch32.

**Parameter passing** (base standard):
- R0-R3: first 4 integer/pointer arguments (a1-a4).
- Remaining arguments pushed on stack, right-to-left.
- If argument is a 64-bit integer (long long), it occupies 2 registers (R0+R1 for
  arg 1, R2+R3 for arg 2, or R0+R2 if misaligned per the "alignment rules").

**Return values**:
- 32-bit: R0.
- 64-bit: R0 (low) + R1 (high).
- 128-bit: R0-R3 (core registers) or via "return in memory" (caller passes pointer
  in R0 as a hidden first arg — seen as `struct` returns > 16 bytes).

**FP/NEON (VFP variant)**:
- `-mfloat-abi=softfp`: uses core registers (R0-R3).
- `-mfloat-abi=hard` (AAPCS-VFP): S0-S15 for float args; D0-D7 for double.

**Stack**:
- Full-descending: SP points to the last pushed item.
- 8-byte aligned at public interfaces (function call boundaries).
- Frame pointer: R11 (ARM) or R7 (Thumb) when `-fno-omit-frame-pointer`.

**Register preservation**:

| Register | Status |
|----------|--------|
| R0-R3 | Caller-saved (scratch) |
| R4-R11 | Callee-saved |
| R12 (IP) | Caller-saved (intra-call scratch) |
| R13 (SP) | Callee-saved (must restore to entry value) |
| R14 (LR) | Caller saves if it needs the return address |
| R15 (PC) | N/A |

### 4.2 AAPCS64 (ARM64) [3]

**Parameter passing**:
- X0-X7: first 8 integer/pointer arguments.
- V0-V7: first 8 floating-point/SIMD arguments.
- Integer and FP argument slots are **independent** — a function with signature
  `(int, float, int)` uses X0, V0, X1.
- Remaining arguments on the stack, 8-byte aligned.
- Large arguments (>16 bytes) passed by reference (caller allocates, passes pointer).

**Return values**:
- X0 (32/64-bit), X0+X1 (128-bit).
- V0 (float/double), V0+V1 (struct of 2 floats/doubles).
- >16 bytes: caller passes address in X8 (the "indirect result location").

**Stack**:
- Full-descending.
- **16-byte aligned** at all times (SP must be 16-byte aligned before `BL`).
- 128-byte **red zone** below SP that leaf functions may use without adjusting SP.
- Frame pointer: X29.

**Register preservation**:

| Register | Status |
|----------|--------|
| X0-X15 | Caller-saved |
| X16-X17 | IP0/IP1 — linker veneer scratch |
| X18 | Platform register (do not touch) |
| X19-X29 | Callee-saved |
| X30 (LR) | Caller-saved |
| SP | Callee-saved |
| V0-V7 | Caller-saved (FP/argument) |
| V8-V15 | Callee-saved (lower 64 bits only) |
| V16-V31 | Caller-saved |

### 4.3 ARM Linux syscall convention

Unlike x86, ARM has no separate `syscall` instruction. Linux uses `SVC` (formerly
`SWI`) with the syscall number in a register [17]:

**AArch32 (EABI):**
```asm
MOV R7, #11      ; syscall number in R7
SVC #0           ; SVC with immediate 0
```
Result in R0. Arguments in R0-R5. R7 = syscall number. The immediate is unused.

**AArch64:**
```asm
MOV X8, #64      ; syscall number in X8
SVC #0           ; supervisor call
```
Result in X0. Arguments in X0-X5. X8 = syscall number.

### 4.4 Frames and prologues

**ARM32 AAPCS prologue:**
```asm
PUSH {R4-R11, LR}    ; save callee-saved regs + LR
MOV R11, SP          ; set frame pointer (R11)
SUB SP, SP, #0x20    ; allocate locals
```

**ARM64 AAPCS64 prologue:**
```asm
STP X29, X30, [SP, #-16]!   ; save FP (X29) and LR (X30)
MOV X29, SP                  ; set frame pointer
SUB SP, SP, #0x30            ; allocate locals
```

---

## 5. ARM vs x86 Differences for RE

### 5.1 PC-relative addressing

ARM code frequently computes addresses from the PC — critical for position-independent
code (PIC) and shellcode.

**ARM32:**
```asm
ADR R0, data_label   ; assembler calculates PC-relative
LDR R0, [PC, #0x10]  ; load from PC + 0x10 (literal pool)
```

**ARM64:**
```asm
ADR X0, label         ; PC-relative address (±1MB)
ADRP X0, page         ; 4KB page-relative (lower 12 bits zeroed)
ADD X0, X0, #0x42     ; add page offset
ADRL                 ; pseudo-instruction for larger range (assembler expands)
```

**x86**: RIP-relative was added in x64: `lea rax, [rip+0x1234]`. In 32-bit x86,
position-independent code requires `call/pop` or `get_pc_thunk`, making ARM PIC
far more natural.

### 5.2 Literal pools

ARM places constants inline with code using literal pools — blocks of data embedded
within instruction sequences that `LDR Rx, [PC, #offset]` reaches. IDA and Ghidra
identify them automatically, but a raw hex dump shows 32-bit values interleaved
with instructions. The assembler inserts pools at strategic points (after `B`/`BL`
where fall-through won't execute them).

```asm
    LDR R0, =0xDEADBEEF    ; pseudo-instruction → literal pool entry
    ...
    .word 0xDEADBEEF       ; literal pool (at PC-aligned location)
```

AArch64 uses `ADRP`/`ADD` or `LDR` literal (`LDR X0, =value`) which loads from a
pool at a 4-byte-aligned PC-relative offset.

### 5.3 Conditional execution

ARM32 can make any instruction conditional — an if-statement compiles to a single
instruction, not a branch over a block. This makes all code look like it has no
branches until you notice `ADDNE`, `SUBEQ`, `MOVGT`. Ghidra/IDA decompile this
correctly, but in linear disassembly (no decompiler) it's a common trap.

**AArch64** and **Thumb-2** both eliminate general conditional execution, replacing
it with `CSEL`/`CSINC`/`CCMP` or `IT` blocks respectively.

### 5.4 Link register

ARM uses LR (R14/X30) for return addresses instead of pushing them on the stack.
A non-leaf function saves LR to the stack in its prologue; a leaf function may not
touch the stack at all. This makes `call`/`ret` patterns different:

**x86**: `call` pushes return address, `ret` pops it.
**ARM**: `BL`/`BLR` loads PC and writes return address to LR. `BX LR` / `RET`
returns without touching the stack (leaf) or restores LR from stack first.

A tail call in ARM is simply `B func` (no stack push needed) — the LR already points
to the original caller.

### 5.5 Load-store vs memory-operand

x86 can operate directly on memory (`add [rax], 1`). ARM must load into a register,
operate, store back. This means ARM code has more register pressure and more explicit
temporaries. A simple counter increment:

**x86**: `inc DWORD PTR [rax]`
**ARM**: `LDR R1, [R0]` + `ADD R1, R1, #1` + `STR R1, [R0]`
