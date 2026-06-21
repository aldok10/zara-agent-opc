# ARM/ARM64 Reverse Engineering & Embedded Firmware Reversing

A reference for analysts examining ARM-family binaries and embedded firmware during
authorized security research. Covers ARM32 (AArch32), ARM64 (AArch64), Thumb/Thumb-2,
Cortex-M bare-metal firmware, RTOS internals, extraction methods, and the toolchain
for embedded RE.

Primary sources: ARM Architecture Reference Manuals [1][2], the AAPCS/AAPCS64 calling
standards [3][4], ARM's Cortex-M/M-profile documentation [5][6], MITRE ATT&CK for
embedded [7], and tool documentation for Ghidra [8], IDA [9], radare2 [10], binwalk
[11], OpenOCD [12], pwntools [13], UEFITool [14], and CHIPSEC [15].

---

## 1. ARM Architecture Overview

### 1.1 ARM, Thumb, Thumb-2

ARM processors support multiple instruction set states. The core distinction:

| State | Width | Description |
|-------|-------|-------------|
| ARM | 32-bit | Original fixed-width ISA. Every instruction is 4 bytes. All instructions can be conditionally executed. |
| Thumb | 16-bit | Compressed ISA introduced with ARMv4T. Higher code density (~65% of ARM size). Fewer registers accessible, no conditional execution except branches. |
| Thumb-2 | 16/32-bit mixed | Introduced ARMv6T2, extended in ARMv7. Blends 16-bit Thumb with 32-bit instructions. **All** ARM instructions available. IT block provides conditional execution. Unified Assembly Language (UAL) lets you write once and assemble to either encoding. |

Thumb-2 is **not** a separate ISA — it is the superset of Thumb + new 32-bit encodings.
Cortex-M processors (M0/M3/M4/M7/M33) implement only Thumb/Thumb-2, never ARM-mode [5].

### 1.2 ARMv7 / ARMv8 / ARMv9

| Architecture | Profiles | Key RE-relevant changes |
|-------------|----------|------------------------|
| ARMv7 (2005-2011) | A, R, M | Unified assembly, Thumb-2, NEON, hardware virtualization (VE), LPAE (40-bit PA) |
| ARMv8-A (2011) | A (64-bit) | **AArch64** — 64-bit ISA, 31 64-bit GPRs, new SVC convention, optional crypto extensions |
| ARMv8-M (2015) | M (microcontroller) | TrustZone for Cortex-M, MPU, vector table relocation (VTOR), SAU/IDAU |
| ARMv9-A (2021) | A | Realm Management Extension (RME), SVE2, MTE (Memory Tagging), confidential compute |
| ARMv8.1-M (2019) | M | M-profile Vector Extension (MVE)/Helium, PACBTI for control flow integrity |

All Cortex-A processors since ARMv7-A support both ARM and Thumb states. Cortex-M
processors support only Thumb/Thumb-2 [1][5].

### 1.3 AArch32 vs AArch64

A 64-bit ARMv8-A core can execute in either state. The two are **not** simply "32-bit
mode" and "64-bit mode" — they have different instruction encodings, register sets,
and exception models [2]:

| Feature | AArch32 | AArch64 |
|---------|---------|---------|
| GPRs | 16 (R0-R15) | 31 (X0-X30) + XZR |
| PC | R15 (GPR) | PC (not a GPR) |
| SP | R13 (banked per mode) | SP_EL0/1/2/3 (separate) |
| Conditional exec | On every instruction | Only branches, CSEL, etc. |
| LDM/STM | Yes | No (must use LDP/STP) |
| IT block | Yes (Thumb-2) | No |
| NEON registers | 32×64-bit (D0-D31) | 32×128-bit (V0-V31) |
| EL(s) | 3 + Monitor | EL0-EL3 |
| Syscall | `SVC #imm` | `SVC #0` (imm ignored), x8 = nr |

### 1.4 Processor Modes and Exception Levels

**AArch32 modes** (ARMv7-A): User, FIQ, IRQ, Supervisor (SVC), Abort, Undefined, System,
plus Monitor (TrustZone) and Hyp (virtualization). Each has banked copies of SP, LR, and
SPSR.

**AArch64 Exception Levels** [2]:

| EL | Name | Purpose |
|----|------|---------|
| EL0 | User | Unprivileged applications |
| EL1 | OS | Linux kernel, hypervisor-optional |
| EL2 | Hypervisor | Virtualization host (KVM, Xen) |
| EL3 | Secure Monitor | TrustZone secure monitor (TF-A, ATF) |

Exception level determines which system registers are accessible. Higher ELs can
configure traps for lower ELs.

### 1.5 Endianness

ARM processors are bi-endian but the ecosystem has settled:

| Format | Details |
|--------|---------|
| **LE** (little-endian) | Dominant. All Android, iOS, Linux, Windows ARM. Default for all modern ARM cores. |
| **BE32** (ARMv5 and earlier) | Old "word-invariant" big-endian. Byte lanes swapped at the word boundary. |
| **BE8** (ARMv6+) | "Byte-invariant" big-endian. Instruction fetches are LE, data accesses are BE. Used in some networking SoCs (Cavium Octeon, some Broadcom). |

For RE: 99% of targets are LE. BE8 is rare but appears in legacy telecom/network gear.
If bytes look like `\x00\x30\x9f\xe5` and disassembly is garbage, try flipping endianness.

### 1.6 NEON / SIMD

NEON is ARM's 128-bit SIMD extension, mandatory in ARMv8-A (optional ARMv7-A). 32
registers (V0-V31) viewable as:

| View | Width | Count | Available in |
|------|-------|-------|-------------|
| Bn | 8-bit | 16×8 | AArch32, AArch64 |
| Hn | 16-bit | 8×8 or 16×4 | AArch32, AArch64 |
| Sn | 32-bit | 4×8 or 8×4 | AArch32, AArch64 |
| Dn | 64-bit | 32 (AArch64) / 32 (AArch32) | Both |
| Qn | 128-bit | 16 | Both |

AArch64's NEON is fully IEEE-754 compliant. RE relevance: crypto, signal processing,
and image manipulation functions use NEON heavily. Instructions like `LD1`/`ST1`
(vector load/store), `FMLA` (fused multiply-add), `AESE`/`AESD`/`AESMC` (AES
crypto extensions) are common in Android native code and firmware DSP blocks [2].

---

## 2. ARM Register Set

### 2.1 ARM32 (AArch32) — R0-R15

| Register | APCS name | Role | Callee-saved? |
|----------|-----------|------|---------------|
| R0 | a1 | Argument 1 / return value, scratch | No |
| R1 | a2 | Argument 2 | No |
| R2 | a3 | Argument 3 | No |
| R3 | a4 | Argument 4 | No |
| R4 | v1 | Variable | Yes |
| R5 | v2 | Variable | Yes |
| R6 | v3 | Variable | Yes |
| R7 | v4 / w6 | Variable (also syscall number in ARM Linux EABI) | Yes |
| R8 | v5 | Variable | Yes |
| R9 | v6 / SB / TR | Variable / static base / TLS (platform-specific) | Yes |
| R10 | v7 / SL | Variable / stack limit | Yes |
| R11 | v8 / FP | Frame pointer (optional) | Yes |
| R12 | IP | Intra-procedure-call scratch | No |
| R13 | SP | Stack pointer | Yes (must restore) |
| R14 | LR | Link register | Caller's responsibility |
| R15 | PC | Program counter | N/A |

**Reality check**: R7 is the frame pointer on Thumb (not R11). In ARM Linux EABI, R7
holds the syscall number for `SVC #0`. R9 varies wildly — on some platforms it is
read-only TLS pointer, on others it's a callee-saved variable.

### 2.2 ARM64 (AArch64) — X0-X30

64-bit registers, plus 32-bit Wn aliases (writing Wn zero-extends to Xn) [3]:

| Register | Role | Callee-saved? |
|----------|------|---------------|
| X0 | Argument 1 / return value, scratch | No |
| X1-X7 | Arguments 2-8 | No |
| X8 | Indirect result location (struct return), also syscall nr | No |
| X9-X15 | Scratch / caller-saved temporaries | No |
| X16 | IP0 — procedure-call temporary (used by linker veneers) | No |
| X17 | IP1 — procedure-call temporary (used by linker veneers) | No |
| X18 | Platform register (TLS on Windows, unused on Linux) | N/A (reserved) |
| X19-X28 | Callee-saved temporaries | Yes |
| X29 | Frame pointer | Yes |
| X30 | Link register | N/A (caller saves) |
| SP | Stack pointer (separate from GPRs) | Yes (must restore) |
| XZR | Zero register (reads as 0, writes discarded) | — |
| PC | Program counter (not a GPR — cannot read/write directly) | — |

Key differences from ARM32: PC is not a GPR, LDM/STM is gone, LDP/STP replaces pair
loads, and the zero register XZR lets you encode common patterns efficiently (`sub
sp, sp, #0x20`).

### 2.3 CPSR / SPSR / PSTATE

| Register | Width | Available in |
|----------|-------|-------------|
| CPSR (Current PSR) | 32-bit | AArch32 |
| SPSR (Saved PSR) | 32-bit | AArch32 (banked per mode) |
| PSTATE | Conceptual | AArch64 (accessed via `MRS`/`MSR`) |

Key flags in CPSR/PSTATE:

| Flag | Bit | Meaning |
|------|-----|---------|
| N | 31 | Negative condition flag |
| Z | 30 | Zero condition flag |
| C | 29 | Carry condition flag |
| V | 28 | Overflow condition flag |
| T | 5 | Thumb state (AArch32 only: 1=Thumb, 0=ARM) |
| M[4:0] | 4-0 | Mode field (AArch32: 0x10=User, 0x13=SVC, 0x11=FIQ...) |
| DAIF | 7,6,5,4 | Debug/SError/IRQ/FIQ mask bits (AArch64) |

### 2.4 VFP / NEON registers

AArch32: S0-S31 (32-bit float), D0-D31 (64-bit double), Q0-Q15 (128-bit NEON).
AArch64: V0-V31 (128-bit), accessible as B/H/S/D/Q views via `MRS`/`MSR` prefix.

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

---

## 6. Thumb/Thumb-2 Specifics

### 6.1 16-bit vs 32-bit instruction encoding

Thumb instructions are either 16-bit (halfword) or 32-bit (word). The top bits of
the first halfword determine the encoding:

| First halfword (bits 15-11) | Instruction width |
|------------------------------|-------------------|
| `11101`, `11110`, `11111` | 32-bit Thumb-2 |
| All others | 16-bit Thumb |

A 32-bit Thumb instruction has a second halfword with bits 15-14 usually `10` or `11`.

In a hex dump from Cortex-M firmware: `0x2000` = `MOVS R0, #0` (16-bit), while
`0xF04F 0x2000` = `MOV.W R0, #0` (32-bit, Thumb-2). The `.W` suffix in UAL
distinguishes the wide (32-bit) encoding.

### 6.2 BLX switching

`BLX Rn` (Branch with Link and Exchange) writes the return address to LR **and**
toggles processor state based on the LSB of Rn. LSB=0 → ARM mode, LSB=1 → Thumb mode.

This is how ARM Linux interworks between ARM-mode kernel and Thumb-mode user code.
Ghidra handles this automatically, but when analyzing raw interwork veneers (small
ARM-mode stubs that switch to Thumb), the LSB toggling is explicit:

```asm
; ARM-mode veneer that calls Thumb function
LDR R12, =thumb_func + 1   ; +1 for Thumb mode
BX R12                     ; switches to Thumb
```

### 6.3 IT blocks in Thumb-2

The `IT` instruction (If-Then) conditionally executes 1-4 following instructions.
Format:

```asm
IT     cond    ; 1 instruction
ITT   cond    ; 2 instructions, both Then
ITE   cond    ; 2 instructions: Then, Else
ITTEE cond    ; 4 instructions: Then, Then, Else, Else
```

The condition applies to each instruction in the block's logical order, with E
instructions using the inverted condition. Ghidra decompiles these correctly but
at the assembly level, the conditional suffix on each instruction is **syntactic
sugar** — the condition is determined entirely by the IT instruction.

### 6.4 Unified Assembly Language (UAL)

UAL lets you write one source that assembles to either ARM or Thumb. The assembler
chooses the encoding based on the target. `.W` forces 32-bit (wide), `.N` forces
16-bit (narrow):

```asm
MOVS R0, #0      ; 16-bit in Thumb, 32-bit in ARM
MOV.W R0, #0     ; force 32-bit
MOVS.N R0, #0    ; force 16-bit (may fail if out of range)
```

For RE: the `.W`/`.N` annotations in disassembly tell you whether the compiler chose
the compact or extended encoding.

---

## 7. Firmware Reverse Engineering Methodology

### 7.1 Finding entry points

Unlike PE/ELF, bare-metal firmware has no header. The **vector table** is the entry
point convention for Cortex-M devices [5][18]:

```
Address  +0x00: Initial SP value
         +0x04: Reset vector (entry point)
         +0x08: NMI handler
         +0x0C: HardFault handler
         +0x10: MemManage handler
         +0x14: BusFault handler
         +0x18: UsageFault handler
         ...   : System handlers + IRQ handlers
```

The first DWORD at the firmware base is the initial stack pointer; the second DWORD
(+0x04) is the reset handler address. Both must have the LSB set to 1 (Thumb mode).
A valid vector table has SP at a RAM address and the reset vector LSB=1 [18].

**Recognizing a vector table in a raw dump:**
```
Offset 0x00:  0x2000XXXX   ; SP initial (in SRAM range, typically 0x20000000+)
Offset 0x04:  0x0800YYYY   ; Reset vector LSB=1 (in flash range, e.g. 0x08000000+)
```

Common flash bases: `0x00000000` (Cortex-M default), `0x08000000` (STM32),
`0x1FFFxxxx` (boot ROM), `0x40000000` (some NXP). Ghidra's "ARM Supervisor +
Non-secure" or "ARM Cortex-M" processor types apply the vector table model
automatically.

### 7.2 Identifying base addresses

Firmware is often extracted as a raw binary with no relocation information. To
determine the base address [18]:

1. Find the vector table: first 2 DWORDs give SP and reset vector.
2. Compute base from the reset vector: if reset vector = `0x08000145`, LSB-1 =
   `0x08000144`, base = `0x08000000` (assuming the reset handler is at a small
   offset from flash base).
3. Confirm: search for the vector table at `base + 0`. Look at the first few
   handler addresses — they should all point into flash with LSB=1.
4. In Ghidra: "Options → Program → Language" set to ARM Cortex-M little-endian,
   then "Analyze → Aggressive Instruction Finder" to discover code at known
   handler addresses.

### 7.3 Vector table relocation (VTOR)

Cortex-M3/4/7/M33 can remap the vector table via the Vector Table Offset Register
(VTOR) at `0xE000ED08`. Code that relocates the vector table does:

```asm
LDR R0, =0xE000ED08
LDR R1, =0x20000000     ; new vector table address in SRAM
STR R1, [R0]
```

Finding VTOR writes tells you where the interrupt handlers moved — useful when
firmware uses a bootloader + application split.

### 7.4 Interrupt handler identification

The vector table maps IRQ numbers to handler addresses. Common IRQs for typical
MCU peripherals:

| IRQ | Typical handler | Peripheral |
|-----|----------------|------------|
| 0-15 | System handlers | Reset, NMI, HardFault, SVC... |
| 16+ | USART1_IRQHandler | UART |
| 16+ | TIM1_UP_IRQHandler | Timer |
| 16+ | DMA1_Stream0_IRQHandler | DMA |
| 16+ | EXTI0_IRQHandler | External interrupt pin |

Vendor-specific IRQ numbering is in the MCU reference manual. STM32 uses a 16-entry
system exception block + up to 240 peripheral interrupts.

### 7.5 Memory-mapped peripherals

Unlike x86 with IN/OUT instructions, ARM accesses peripherals via memory-mapped
registers at fixed addresses. Identifying peripheral base addresses in firmware
code gives you the hardware interaction points:

```
Common peripheral bases (STM32F4):
  0x40000000  - APB1 peripherals
  0x40010000  - APB2 peripherals
  0x40020000  - AHB1 peripherals
  0x50000000  - AHB2 peripherals
  0xE0000000  - System control block (SCB, NVIC, SysTick)
```

Grep for these base addresses in the disassembly to find hardware initialization
code and I/O operations.

---

## 8. Firmware Extraction

### 8.1 Reading flash/ROM

| Method | Required | Success rate | Notes |
|--------|----------|-------------|-------|
| SWD/JTAG via OpenOCD | Debug port accessible, debug unlock possible | High if not locked | Most common extraction method [12] |
| Bootloader dumping | UART/SPI boot mode + custom protocol | Medium | Requires protocol reversing [19] |
| Flash chip desoldering | Hot air station + programmer | High (physical) | Destructive to the board |
| Firmware update extraction | OTA update file or programmer image | High | Often encrypted — need keys |
| DFU mode | USB DFU supported | Medium | Only if DFU allows readback |
| Side-channel (glitch) | Fault injection equipment | Low (specialized) | Expensive, academic |

### 8.2 JTAG/SWD extraction via OpenOCD [12]

```bash
# List available adapters
openocd -f interface/ftdi/ft2232h_compact.cfg

# Connect to STM32 target via SWD
openocd -f interface/stlink-v2.cfg -f target/stm32f4x.cfg \
  -c "init" -c "reset halt" \
  -c "flash read_bank 0 firmware.bin 0 0x100000" \
  -c "shutdown"
```

SWD pinout: SWDIO (PA13/TCK), SWCLK (PA14/TMS), GND, VCC (optional reference).
Typical 4-pin header. JTAG uses 5 pins: TCK, TMS, TDI, TDO, nSRST.

RP2040/Raspberry Pi Pico can act as a low-cost SWD probe via `picoprobe` firmware.

### 8.3 Readout protection bypass

Modern MCUs (STM32, NXP) implement readout protection (RDP) levels:

| Level | Name | Access |
|-------|------|--------|
| 0 | None | Full debug, read, write |
| 1 | Medium | No debug access, flash read blocked. Can revert to 0 but flash is erased. |
| 2 | High | Permanent, irreversible — no debug access ever. |

Common bypass techniques [19]:
- **Voltage glitching** on VDD or RDP check during boot (requires scope + glitcher).
- **Cold boot attack** on external SDRAM (for Cortex-A devices).
- **Decapping + microprobing** (expensive, destructive).
- **Fault injection** on RDP check instructions (laser, EM, clock glitch).

### 8.4 UART boot dumping

Many Cortex-M MCUs have a UART bootloader activated by a specific pin strapping
(BOOT0 = HIGH for STM32). The bootloader typically provides read commands via a
proprietary or standard protocol (ST's USART bootloader, NXP's ISP).

```bash
# STM32 UART bootloader flash read
# Protocol: 0x7F sync, 0x00 + addr (3 bytes) + N (1 byte)
python -c "
import serial, struct
s = serial.Serial('/dev/ttyUSB0', 115200)
s.write(b'\x7f')              # sync
assert s.read(1) == b'\x79'   # ACK
s.write(b'\x11\x00\x00\x00')  # read memory command
s.write(bytes([0xEE]))        # checksum
addr = struct.pack('>I', 0x08000000)
s.write(addr + bytes([~(addr[0]+addr[1]+addr[2]+addr[3]) & 0xFF]))
n = struct.pack('B', 255)
s.write(n + bytes([~n[0] & 0xFF]))
data = s.read(256)
"
```

### 8.5 Flash chip desoldering

When debug ports are locked or absent, desolder the SPI flash (usually SOIC-8) and
read it with a SOIC clip or programmer:

```bash
# Read with flashrom (requires a supported programmer like CH341A)
flashrom -p ch341a_spi -r firmware.bin
```

Common flash chips: Winbond W25Qxx, Macronix MX25Lxx, Micron N25Qxx, Spansion
S25FLxx. SPI flash pinout: CS# (1), DO (2), WP# (3), GND (4), DI (5), CLK (6),
HOLD# (7), VCC (8).

---

## 9. Common Firmware Architectures

### 9.1 ARM Cortex-M (M0/M3/M4/M7/M33)

| Core | Arch | Thumb | FPU | TrustZone | Key RE traits |
|------|------|-------|-----|-----------|---------------|
| Cortex-M0 | ARMv6-M | Thumb-1 only | No | No | Small encoding: only 56 instructions, no IT block |
| Cortex-M3 | ARMv7-M | Thumb-2 | No | No | Full Thumb-2, hardware divide, bit-banding |
| Cortex-M4 | ARMv7E-M | Thumb-2 | Single precision | No | DSP extensions, SIMD (SADD, SMUL) |
| Cortex-M7 | ARMv7E-M | Thumb-2 | Single/double | No | Cache, TCM, dual-issue pipeline |
| Cortex-M33 | ARMv8-M | Thumb-2 | Single/double | Yes | PACBTI, TrustZone, MPU, Helium (MVE) |

All Cortex-M are **Thumb-only** — no ARM-mode execution. The vector table is the
mandatory entry point. Stack starts at RAM top and grows downward.

**Identifying Cortex-M firmware in a raw dump:**
- First DWORD at offset 0 is initial SP (must be in SRAM range, e.g. 0x20000000+).
- Second DWORD is reset vector (must have LSB=1).
- Scan for `0xE000ED00` (NVIC base) references in code — this is the Cortex-M system
  control block address.
- Cortex-M interrupt handlers use `BX LR` to return (not POP {PC}).

### 9.2 Cortex-R

Real-time profile for hard real-time (automotive, industrial). Supports both ARM and
Thumb. Key difference from Cortex-M: MMU (optional), MPU, split TCM, and tighter
interrupt latency. Used in TI TMS570, NXP i.MX RT (cross-over — actually Cortex-M7
with MMU), and many automotive SoCs.

### 9.3 Cortex-A

Application profile for Linux/Android/Windows. Supports the full ARM ISA including
AArch64. Key difference: MMU mandatory, L1/L2 cache, performance monitoring unit (PMU),
GIC interrupt controller. Firmware here is usually a bootloader (U-Boot, TF-A) plus
a kernel, not a single bare-metal blob.

### 9.4 Bare-metal vs RTOS

**Bare-metal**: Super-loop `while(1)` polling or interrupt-driven. Firmware is a
single thread. RE markers: no scheduler code, no task lists, no context switching,
SP remains constant.

**RTOS** (FreeRTOS, Zephyr, ThreadX): adds a scheduler with context switching.
RE markers:
- PendSV handler (`0xE000ED04` → PendSV) that saves/restores registers.
- `SVCall` handler for system calls.
- Linked list of TCBs (Task Control Blocks) [20].
- Tick timer (SysTick at `0xE000E010`) increments scheduling ticks.

### 9.5 RTOS Context Switch Pattern (Cortex-M)

The PendSV exception performs the context switch — this is the most important
function to identify when reversing RTOS firmware [20]:

```asm
; Simplified FreeRTOS PendSV handler (Cortex-M)
PendSV_Handler:
    MRS R0, PSP              ; get process stack pointer
    STMDB R0!, {R4-R11}      ; save callee-saved registers
    LDR R3, =pxCurrentTCB    ; current task control block
    LDR R2, [R3]
    STR R0, [R2]             ; save updated SP into TCB
    ; ... select next task ...
    LDR R3, =pxCurrentTCB
    LDR R1, [R3]
    LDR R0, [R1]             ; load new task's SP
    LDMIA R0!, {R4-R11}      ; restore callee-saved registers
    MSR PSP, R0              ; set process stack pointer
    ORR LR, LR, #4           ; indicate PSP is active
    BX LR                    ; return to new task
```

---

## 10. MITRE ATT&CK for Embedded

MITRE ATT&CK for embedded builds on the enterprise framework with techniques specific
to IoT/firmware attacks [7]. Key techniques relevant to ARM/embedded RE:

### 10.1 T1525 — Implant Internal Image

Formally "Implant Container Image" — adversaries implant malicious code into firmware
images stored on the device flash. In embedded context: flashing a malicious firmware
update or modifying the bootloader to persist.

RE relevance: analyzing firmware dumps, look for unexpected code in the bootloader,
extra partitions, unsigned regions, or modification dates that don't match the vendor
release.

### 10.2 T1219 — Remote Access Software

In embedded: backdoored telnet/SSH, custom reverse shell, or "remote management"
features that are undocumented. Common in IoT botnet firmware (Mirai, Mozi, Gafgyt).

RE markers: bind shell on port 23/22/2323, hardcoded credentials, `socket()` +
`connect()` or `bind()` + `listen()` + `accept()` sequences, `system()` with URL
fetch commands.

### 10.3 Embedded-specific techniques

| Technique | Embedded variant | RE indicators |
|-----------|-----------------|--------------|
| T1543.003 | Persistence via bootloader replacement | Modified first-stage bootloader, unsigned flash regions |
| T1542.001 | System Firmware persistence | Malicious code in option ROM, SPI flash regions |
| T1554 | Compromise Host Software | Vendor backdoors, debug ports left enabled |
| T1562.001 | Disable or modify security tools | Readout protection bypass, TrustZone disable |
| T1485 | Data destruction | Flash erase routines, JTAG-disable via permanent RDP2 |

---

## 11. Tooling

### 11.1 Ghidra for ARM

Ghidra's ARM analysis is mature. Key steps for firmware [8]:

```
1. File → New Project → Import File.
2. Language: ARM → Cortex (or v7/v8). For Cortex-M, pick
   "ARM Cortex (little endian)" → "ARM Cortex-M".
3. Options → "Analyze → Aggressive Instruction Finder" — finds code
   at addresses referenced by vector table handlers.
4. After analysis: check "Symbol Table" for address labels.
5. Manually set base address: Window → Memory Map → Set Image Base.
6. For unknown peripherals: Window → Memory Map → Add Block with
   peripheral base/backing bytes.
```

Ghidra SLEIGH processor models handle ARM/Thumb interworking. If a function doesn't
decompile cleanly, check if it's Thumb code marked as ARM (or vice versa). The
processor type in the listing header shows the current mode.

### 11.2 IDA Pro for ARM

IDA handles ARM firmware well with the "ARM Supervisor + Non-secure Mode" processor
type for Cortex-M [9]. Key features:

```
- Processor specific → "ARM Cortex-M" for vector table auto-analysis.
- Options → "ARM Specific → Treat as Thumb" for raw Cortex-M binaries.
- Manual base: Edit → Segments → Rebase Program.
- For exception handlers: use "Make Name" to name NRST/Vectors.
```

Hex-Rays v7.5+ decompiles ARM64 well but struggles with IT blocks and Thumb-2
corner cases. IDA 8.x added better Armv9 support.

### 11.3 radare2 / Rizin

Radare2 ARM analysis commands [10]:

```bash
# Load raw firmware as Cortex-M
r2 -a arm -b 16 -m 0x08000000 firmware.bin

# Inside r2:
[0x08000000]> aaa          # auto-analyze
[0x08000000]> afl           # list functions
[0x08000000]> pdf @ main    # disassemble function
[0x08000000]> e asm.arch=arm; e asm.bits=32   # switch to ARM32
[0x08000000]> e asm.arch=arm; e asm.bits=16   # Thumb mode
[0x08000000]> pxw 64 @ 0x0 # hex dump, word-aligned
[0x08000000]> /v 0x20000000 # search for SRAM references
[0x08000000]> s 0x08000004  # seek to reset vector
[0x08000000]> avr           # ARM vector table analysis
```

### 11.4 binwalk

Standard tool for firmware extraction and signature scanning [11]:

```bash
# Scan for file signatures, filesystems, compression
binwalk firmware.bin

# Extract all detected filesystems
binwalk -e firmware.bin

# Only extract specific signatures
binwalk -D 'uboot:u-boot:0x10' firmware.bin

# Entropy analysis — identifies compressed/encrypted regions
binwalk -E firmware.bin
```

Entropy output is critical: 0.0-0.2 = constant/empty, 0.3-0.6 = normal code/data,
0.7-0.9 = compressed/encrypted sections. A sudden entropy shift marks boundaries
between bootloader and filesystem.

### 11.5 firmware-mod-kit

Extracts and repacks filesystems common in firmware (SquashFS, JFFS2, CramFS, etc.):

```bash
./extract-firmware.sh firmware.bin   # unpack
./build-firmware.sh output/ firmware-mod.bin  # repack
```

### 11.6 OpenOCD

Open-source on-chip debugger for JTAG/SWD [12]:

```bash
# Connect to target
openocd -f interface/stlink-v2.cfg -f target/stm32f4x.cfg

# GDB server (default port 3333)
# In another terminal:
arm-none-eabi-gdb -ex "target remote :3333" \
  -ex "monitor reset halt" \
  -ex "dump binary memory firmware.bin 0x08000000 0x08100000"
```

### 11.7 pwntools for ARM shellcode

Python library for exploit development with ARM shellcode generators [13]:

```python
from pwn import *

# AArch32 Thumb shellcode: execve("/bin/sh", 0, 0)
context.arch = 'arm'
context.bits = 32
context.os = 'linux'

shellcode = asm(shellcraft.arm.linux.sh())
# or Thumb mode
shellcode = asm(shellcraft.thumb.linux.sh())

# AArch64
context.arch = 'aarch64'
shellcode = asm(shellcraft.aarch64.linux.sh())
```

### 11.8 QEMU for ARM emulation

QEMU can emulate ARM systems for dynamic analysis of firmware [21]:

```bash
# Full system emulation: ARM versatile PB
qemu-system-arm -M versatilepb -kernel vmlinuz -append "console=ttyAMA0"

# User-mode: run ARM Linux binary
qemu-arm -L /path/to/extracted/rootfs ./binary

# GDB stub mode
qemu-system-arm -M xilinx-zynq-a9 -kernel firmware.elf -s -S
# then "target remote :1234" in GDB/IDA

# Cortex-M3 emulation (via xPack QEMU or upstream)
qemu-system-arm -M lm3s6965evb -kernel firmware.bin -nographic
```

### 11.9 ARM Development Studio (DS-5)

ARM's commercial IDE with full debugger support for all ARM cores. Includes:
- ARM Streamline (performance analysis).
- Fast Models for instruction-accurate simulation.
- DSTREAM for JTAG/SWD hardware debug.

Expensive but the gold standard for ARM firmware development. Most RE analysts use
Ghidra/IDA unless they need emulation fidelity.

### 11.10 Tool reference table

| Tool | Use | ARM-specific features |
|------|-----|-----------------------|
| Ghidra | Static RE, decompilation | Cortex-M vector table auto-analysis, Thumb interwork [8] |
| IDA Pro | Static RE, decompilation | ARM64 decompiler, bootloader templates [9] |
| radare2/Rizin | CLI RE | `avr`, Thumb detection, scripting [10] |
| binwalk | Firmware extraction | Entropy analysis, signature scanning [11] |
| OpenOCD | JTAG/SWD debug | Target configs for hundreds of MCUs [12] |
| pwntools | Shellcode, exploitation | Shellcraft ARM/Thumb/AArch64 [13] |
| QEMU | Emulation | System/user mode, GDB stub [21] |
| UEFITool | UEFI extraction | FV parsing, FFS GUID matching [14] |
| CHIPSEC | UEFI security analysis | SPI flash scanning, firmware module inventory [15] |
| firmware-mod-kit | Filesystem extract | SquashFS, JFFS2, TRX repack |
| flashrom | SPI flash read/write | CH341A, FTDI, Raspberry Pi support |
| Bu traction Board | Hardware | JTAGulator for pin finding |

---

## 12. ARM Shellcode

### 12.1 Position-independent code

ARM firmware and bootloaders are often position-independent for execution from
unknown base addresses. Key techniques:

**ARM32 PC-relative addressing:**
```asm
    ADR R0, message      ; PC-relative address (assembled as ADD/SUB)
    
    ; Or manually (for greater ranges):
    ADD R0, PC, #0x10    ; R0 = PC + 0x10
    
    ; Classic ARM technique:
    MOV PC, PC           ; forces PC to even word (ARM mode, ignore)
```

**ARM64 PC-relative addressing:**
```asm
    ADR X0, label        ; ±1MB range
    ADRP X0, page_label  ; 4KB page, ±4GB range
    ADD X0, X0, #:lo12:label  ; add page offset
```

### 12.2 Thumb mode shellcode

Thumb shellcode is denser but has restrictions: no R0-R7 only for many instructions,
conditional execution via IT only. Standard execve("/bin/sh") for ARM Linux EABI [13]:

```asm
@ ARM32 Thumb execve("/bin/sh")
.section .text
.global _start
.thumb
_start:
    adr r0, binsh        @ r0 = address of "/bin/sh"
    eors r1, r1          @ r1 = 0 (argv)
    eors r2, r2          @ r2 = 0 (envp)
    movs r7, #11         @ syscall nr = 11 (execve)
    svc #0
binsh:
    .asciz "/bin/sh"
```

AArch64 execve("/bin/sh") [21]:
```asm
@ AArch64 execve("/bin/sh")
.section .text
.global _start
_start:
    adr x0, binsh         @ x0 = "/bin/sh"
    mov x1, xzr           @ x1 = 0 (argv)
    mov x2, xzr           @ x2 = 0 (envp)
    mov x8, #221          @ syscall nr = execve
    svc #0
binsh:
    .asciz "/bin/sh"
```

### 12.3 Addressing PC efficiently

In ARM32, PC reads as current address + 8 (due to pipeline). This is a common
trap — code that uses `MOV R0, PC` to get the current IP must account for +8:

```asm
getpc:
    MOV R0, PC          ; R0 = addr of getpc + 8 on ARM
    ; For data referencing, SUB R0, R0, #offset
```

Thumb reads PC as current address + 4. In AArch64, PC cannot be read directly —
use `ADR` or `ADRP` instead.

### 12.4 ARM Linux syscall table excerpt [17]

| Nr (AArch32) | Nr (AArch64) | Name | Purpose |
|-------------|-------------|------|---------|
| 1 | 64 | `exit` | Exit process |
| 3 | 63 | `read` | Read from fd |
| 4 | 64 | `write` | Write to fd |
| 11 | 221 | `execve` | Execute program |
| 45 | 29 | `shmget` | Shared memory |
| 120 | — | `clone` | Create thread (AArch32) |
| 248 | — | `exit_group` | Exit all threads (AArch32) |

### 12.5 Egghunter pattern

ARM egghunters search memory for a specific tag (e.g. `0x50905090`) to find the
second-stage shellcode payload. Common pattern using `LDMIA` to check alignments:

```asm
egghunter_thumb:
    MOV R1, #0x5090
    LSL R1, R1, #16
    ADD R1, #0x5090       ; R1 = 0x50905090
next_page:
    ADD R0, #8
    ...
    LDMIA R0!, {R2, R3}
    EORS R2, R1
    BNE next_page
    ; egg found — execute
```

---

## 13. RTOS Reversing

### 13.1 FreeRTOS TCB structure

FreeRTOS's `tskTaskControlBlock` is the central data structure for task management.
The first member is `pxTopOfStack` (pointer to the last saved context) [20]:

```c
// FreeRTOS TCB (simplified, version dependent)
typedef struct tskTaskControlBlock {
    volatile StackType_t *pxTopOfStack;   // +0x00: top of stack
    ListItem_t xStateListItem;            // +0x04: state list
    ListItem_t xEventListItem;            // +0x14: event list
    UBaseType_t uxPriority;               // +0x24: task priority
    StackType_t *pxStack;                 // +0x28: stack start
    char pcTaskName[configMAX_TASK_NAME_LEN]; // +0x2C: name
    // ... platform-specific fields follow
} tskTCB;
```

**Finding FreeRTOS in firmware:**
1. Search for the PendSV handler (context switch — see §9.5).
2. Look for `pxCurrentTCB` — a global pointer to the currently running TCB.
3. The TCB list appears as a circular doubly-linked list via `xStateListItem`.
4. Task names in `.rodata` (strings like "IDLE", "main", "LED Task").
5. `vTaskDelay`, `xQueueSend`, `xTaskCreate` calls found via API strings.

### 13.2 ThreadX block/byte pools

ThreadX uses pool-based memory management [22]. Key structures:

```c
// TX_BLOCK_POOL structure offset layout
typedef struct TX_BLOCK_POOL_STRUCT {
    UINT    tx_block_pool_id;           // +0x00: 0x424C4F43 ("BLOC")
    CHAR    *tx_block_pool_name;        // +0x04: pool name pointer
    UINT    tx_block_pool_available;    // +0x08: available blocks
    UINT    tx_block_pool_total;        // +0x0C: total blocks
    TX_BLOCK_POOL *tx_block_pool_next;  // +0x10: linked list
    // ...
};
```

**Identifying ThreadX:**
1. Pool ID constants: `0x424C4F43` ("BLOC" for block pools), `0x42595445` ("BYTE")
   appearing in data sections.
2. `tx_kernel_enter` — the entry function (analogous to `main`).
3. All blocks have a magic number at offset 0.
4. Thread names in strings referenced from `TX_THREAD` structures.

### 13.3 Zephyr RTOS

Zephyr uses a unified kernel with `k_thread` structures. Identifying features:
- `k_thread_entry_t` function pointers in the thread struct.
- `_kernel` global symbol referencing the current CPU state.
- Thread names in `.gnu.linkonce.this_module` sections.
- Zephyr uses device tree (DT) for hardware description — strings like `&uart0` in
  binary data are a strong signal.

### 13.4 RTOS-aware debugging

OpenOCD can be configured for RTOS-aware debugging with FreeRTOS support:

```bash
openocd -f interface/stlink-v2.cfg -f target/stm32f4x.cfg \
  -c "init" -c "reset halt" \
  -c "rtos create 0"              # enables RTOS detection
```

GDB then shows thread info via `info threads`. However, this only works when symbols
are present. Without symbols, you must:
1. Locate the PendSV handler in the vector table.
2. Trace the context switch code to find the TCB list.
3. Parse TCBs by known offsets.

---

## 14. IoT/Embedded Security

### 14.1 Common vulnerabilities

| Vulnerability | Example | RE indicator |
|--------------|---------|-------------|
| Hardcoded keys | `const uint8_t aes_key[16] = {0x00, ...}` | Look for 16/32-byte constants in `.rodata` used as AES key schedule input |
| Debug ports enabled | UART shell on TX/RX | UART `\n` login prompt, shell commands in strings |
| Unsigned firmware | No signature check in update routine | Search for signature verification functions; missing = unsigned |
| Buffer overflow | `strcpy(dst, src)` in network handler | `strcpy`, `sprintf`, `vsprintf` usage on network buffers |
| Command injection | `system(user_input)` | `system()`, `popen()`, `exec*()` with user-controlled args |
| Insecure OTA | Update fetched over HTTP | URL strings with `http://`, no TLS, no cert pinning |
| Backdoor accounts | Hardcoded password check | `strcmp(password, "admin123")` patterns in authentication code |

### 14.2 Secure Boot chain

A typical secure boot chain on ARM Cortex-A [23]:

```
Boot ROM (on-chip) → verifies → TF-A BL1 (boot loader stage 1)
  → verifies → TF-A BL2 (platform init + SPM)
    → verifies → BL31 (EL3 runtime firmware)
      → verifies → BL32 (TrustZone OS, optional)
        → verifies → BL33 (UEFI or U-Boot)
          → verifies → Linux kernel
```

Each stage verifies the next via digital signature (RSA/ECDSA) before jumping.
RE approach: work backwards from the most accessible stage (U-Boot or kernel) and
trace the verification chain. Look for:
- Public key storage (DER-encoded RSA keys, ECC curve parameters).
- Hash check functions (SHA-256 context init + update + final).
- Signature verification (RSA PKCS#1 v1.5 or PSS, ECDSA).
- BootROM entry points that call flash read + signature check.

### 14.3 TrustZone

ARM TrustZone splits the processor into **Normal World** (REE — Rich Execution
Environment, e.g. Linux) and **Secure World** (TEE — Trusted Execution Environment,
e.g. OP-TEE, Trusty, QSEE) [24].

**For RE:**
- Normal World code runs at EL0/EL1; Secure World at EL1(S)/EL3.
- Transition via SMC (Secure Monitor Call) instruction.
- The Secure Monitor (EL3, typically TF-A) handles SMC dispatch.
- TrustZone-aware firmware has two sets of exception vectors (VBAR_EL1, VBAR_EL3).
- Memory regions marked as "Secure" are inaccessible from Normal World — you cannot
  dump Secure World memory via Linux /dev/mem.

**Analyzing TrustZone firmware:**
- Extract the Secure World image (usually a separate partition in SPI flash).
- Look for SMC handler dispatch tables: EL3 code that reads X0 and branches to
  a function pointer array.
- OP-TEE binary can be identified by strings like "OP-TEE", "tee_pager".
- For locked-down devices (e.g., Qualcomm QSEE), the Secure World is proprietary
  and rarely documented — analyze its SMC interface from the Normal World side.

### 14.4 ARM Trusted Firmware (TF-A)

TF-A is the reference implementation for ARMv8-A secure world firmware [23]. RE
identifiers:

- BL1 at `0x00000000` or ROM base (on-chip boot ROM).
- BL2 at a fixed offset in flash (platform-specific).
- BL31 (EL3 runtime) at a defined DRAM/SPM location.
- FIP (Firmware Image Package) containing all BLx images concatenated.

FIP parsing: `fiptool` (from TF-A) lists and extracts images:

```bash
fiptool info fip.bin
fiptool unpack fip.bin
```

### 14.5 Anti-analysis techniques

**TrustZone obfuscation**: Critical code runs in Secure World where debug access is
blocked. The Normal World sees only SMC calls and opaque data.

**ARM Jazelle** (DBX — Direct Bytecode eXecution): Hardware Java bytecode execution
on some ARMv5/v6 cores. Extremely rare but can be used to hide logic in Java bytecode
that the CPU executes natively. Ghidra/IDA do not support Jazelle disassembly.

**JTAG/SWD lock**: RDP2 on Cortex-M makes the debug port permanently inaccessible.
Recovery requires hardware fault injection.

**Firmware encryption**: Firmware images encrypted with AES/XOR. decryption key may
be derived from device UID, embedded in boot ROM, or provided externally.

**Self-modifying code**: Cortex-M can execute from RAM. Firmware that copies code
to SRAM and executes it (common for flash wait-state optimization) can also hide
logic in ram-executed blocks.

**PAC/BTI** (Pointer Authentication / Branch Target Indicator): ARMv8.3-A+ hardware
control flow integrity. Makes ROP/JOP exploitation much harder and confuses RE by
corrupting backtrace info when functions use PAC [25].

---

## 15. Reverse Engineering UEFI Firmware

### 15.1 PI boot phases

UEFI firmware on ARM systems follows the Platform Initialization (PI) specification:

| Phase | Name | Description |
|-------|------|-------------|
| SEC | Security | Cache-as-RAM (CAR), measures first code |
| PEI | Pre-EFI Initialization | Memory discovery, early chipset init |
| DXE | Driver Execution Environment | Most drivers run here, protocol dispatch |
| BDS | Boot Device Selection | Boot manager, OS selection |
| RT | Runtime | UEFI runtime services after ExitBootServices() |
| SMM | System Management Mode | x86-only; ARM uses TrustZone instead |

On ARM, the SEC → PEI transition differs from x86 — ARM uses ROM-based boot
(TF-A BL1/BL2) before UEFI begins.

### 15.2 Firmware Volume (FV) and FFS

UEFI firmware is structured as Firmware Volumes containing Firmware File System
(FFS) files [14]:

```
Firmware Volume:
  - FV Header (zero vector + GUID + size)
  - FFS Files:
    - File header (GUID + type + size + state)
    - Sections (code, data, GUIDed, FV image, raw)
  - Free space (0xFF)
```

FFS file types:
- 0x01: Raw (binary blob)
- 0x02: FREEFORM (arbitrary GUID-identified data)
- 0x03: SECURITY_CORE (SEC phase)
- 0x04: PEI_CORE (PEI foundation)
- 0x05: DXE_CORE (DXE foundation)
- 0x07: DRIVER (DXE driver as TE or PE32+ image)
- 0x08: APPLICATION (UEFI application)
- 0x0C: FIRMWARE_VOLUME_IMAGE (nested FV)
- 0x0D: COMBINED_SMM_DXE (x86 SMM driver)

### 15.3 GUID-based protocols

UEFI drivers register and consume services via GUID-keyed protocols. Finding these
GUIDs in firmware identifies functionality:

```
Known UEFI protocol GUIDs:
  09576e91-6d3f-11d2-8e39-00a0c969723b  - Device Path
  5b1b31a1-9562-11d2-8e3f-00a0c969723b  - Driver Binding
  d6b2b640-fb4f-11d3-944a-0080c7f2e590  - Serial I/O
  31878c87-0b75-11d5-9a4f-0090273fc14d  - EBC (EFI Byte Code) interpreter
  bc62157e-3e33-4fec-9920-2d3b36d70805  - GOP (Graphics Output Protocol)
```

PE32+ images extracted from UEFI firmware can be analyzed with standard PE tools.
They use the same calling conventions as Windows x64 UEFI (Microsoft x64 ABI
for x86-64 UEFI, or AAPCS for ARM UEFI) [14].

### 15.4 FV parsing tools

**UEFITool** [14]:

```bash
# Extract all files from an image
UEFITool firmware.bin

# Command-line extraction
UEFIExtract firmware.bin extract
```

Parses the entire FV tree, identifies FFS files, extracts PE32+ images, and
resolves GUID names against a database. UEFITool can also **reconstruct** and
**modify** firmware images.

**CHIPSEC** [15]:

```bash
# Static analysis of UEFI firmware dump
chipsec_main -m decode_spi_rom
chipsec_util uefi decode firmware.bin
chipsec_util uefi efi_list firmware.bin   # list EFI executables
chipsec_util uefi find                    # search for GUID in firmware
```

CHIPSEC also checks for known UEFI malware (LoJax, ThinkPwn, HackingTeam
rootkits) by scanning for signature patterns in the SPI flash image.

**uefi-firmware-parser**:

```bash
pip install uefi_firmware
python -m uefi_firmware firmware.bin
```

---

## 16. Common Embedded Protocols

### 16.1 UART (Universal Asynchronous Receiver/Transmitter)

The most common embedded debug interface — two wires (TX, RX). Asynchronous,
no clock line. Typical parameters: 115200/8/N/1 (115200 baud, 8 data bits,
no parity, 1 stop bit) [26].

**RE on UART:**
```bash
# Scan baud rate via pulse width on oscilloscope/logic analyzer
# Common baud rates: 9600, 19200, 38400, 57600, 115200, 230400

# Connect with picocom
picocom /dev/ttyUSB0 -b 115200 --parity n --databits 8 --stopbits 1

# Or with screen
screen /dev/ttyUSB0 115200
```

UART output to look for: boot messages (`U-Boot 2023.04`, `Linux version ...`),
shell prompts (`#`, `$`, `>`, `console:`), login banners.

UART **shell access** is the holy grail of embedded RE — many devices expose an
unauthenticated root shell via UART during boot.

### 16.2 SPI (Serial Peripheral Interface)

Four-wire synchronous protocol: MOSI, MISO, SCLK, CS#. Common for flash chips,
sensors, displays [27].

**RE on SPI:**
- Logic analyzer decode: set CS# as enable, clock as SPI clock.
- SPI flash commands to know: `0x9F` (read JEDEC ID), `0x03` (read data),
  `0x0B` (fast read), `0x02` (page program).
- Many devices expose SPI flash on test points.
- Sniffing SPI traffic between SoC and flash reveals firmware read in real-time.

```
SPI transaction example (analyzer output):
CS# ↓  [0x9F] [0x00] [0x00] [0x00] → JEDEC ID read command
      ← [0xEF] [0x40] [0x18]        ← Winbond W25Q128JV response
```

### 16.3 I2C (Inter-Integrated Circuit)

Two-wire protocol: SDA (data), SCL (clock). 7-bit or 10-bit addressing. Common
for sensors, EEPROMs, PMICs [27].

**RE on I2C:**
- Address the device (`0x50` = common EEPROM address, `0x48` = temp sensor).
- I2C read: start + addr(W) + register + start + addr(R) + data + stop.
- Bus Pirate or logic analyzer can probe the bus for active addresses.
- Many MCUs have I2C debug interfaces that dump firmware over SCL/SDA.

```bash
# With i2c-tools on a connected Linux host
i2cdetect -y 0          # scan bus 0 for devices
i2cdump -y 0 0x50       # dump I2C EEPROM at address 0x50
```

### 16.4 CAN bus (Controller Area Network)

Two-wire differential protocol (CAN_H, CAN_L). Dominant in automotive and
industrial. Messages are broadcast with 11-bit (CAN 2.0A) or 29-bit (CAN 2.0B)
identifiers [27].

**RE on CAN:**
```bash
# With SocketCAN + USB-CAN adapter
sudo ip link set can0 type can bitrate 500000
sudo ip link set can0 up
candump can0               # monitor all traffic
cansniffer can0            # detect changing values
cansend can0 123#DEADBEEF  # send a message
```

RE workflow: identify PGN (Parameter Group Number) patterns, map CAN IDs to
functions (engine RPM, brake, steering), inject messages to test behavior.

### 16.5 Logic analysis workflow

For all protocols, a logic analyzer is the essential hardware tool [26]:

```bash
# With Saleae Logic or compatible (using sigrok)
sigrok-cli -d fx2lafw --config samplerate=24M --channels D0=TX,D1=RX \
  -p -a uart:baudrate=115200 --wait 5 -o capture.sr

# Decode SPI
sigrok-cli -i capture.sr -P spi:clk=CS:MISO=3:MOSI=2:cs=0
```

For unknown pinouts:
- **JTAG** identification: 5 pins with pull-up/pull-down at known patterns.
- **SWD** identification: 2 pins, SWDIO has bidirectional signal, SWCLK is clock.
- **UART** identification: TX idles high, pulsing low for start bits.

Bus Pirate, Saleae clones (FX2LP-based), and Raspberry Pi Pico are the most
common low-cost tools ($10-$150) for protocol RE.

---

## Quick Reference Card

| Concept | ARM32 (AArch32) | ARM64 (AArch64) |
|---------|-----------------|-----------------|
| GPRs | R0-R15 | X0-X30 + XZR |
| LR | R14 | X30 |
| PC | R15 (can read) | PC (cannot read) |
| FP | R11 (ARM) / R7 (Thumb) | X29 |
| Stack alignment | 8 bytes | 16 bytes |
| Red zone | None | 128 bytes |
| Arg registers | R0-R3 | X0-X7, V0-V7 |
| Return | R0 (+R1) | X0 (+X1) |
| Syscall nr | R7 | X8 |
| Syscall insn | `SVC #0` | `SVC #0` |
| Thumb entry | LSB=1 in target | Not applicable |
| Conditional exec | 4-bit cond on every insn (ARM), IT blocks (Thumb-2) | CSEL/CSINC/CCMP |

| Firmware type | Entry | Flash base | Tool chain |
|---------------|-------|------------|------------|
| Cortex-M bare-metal | Vector table +0x00 | 0x08000000 (STM32), 0x00000000 (others) | Ghidra + Cortex-M processor |
| UEFI (ARM) | SEC Core GUID in FV | SPI flash descriptor | UEFITool, CHIPSEC |
| Linux kernel | stext, `B start_kernel` | Varies | Ghidra decompiler, vmlinux symbols |
| FreeRTOS | `main` → `xTaskCreate` | Application base | Ghidra + RTOS thread detection |
| ThreadX | `tx_kernel_enter` | Application base | IDA, Ghidra, pool magic search |

---

## Sources

1. Arm Architecture Reference Manual Armv8, for Armv8-A architecture profile — https://developer.arm.com/documentation/ddi0487/
2. Arm Architecture Reference Manual for A-profile architecture (ARMv9) — https://developer.arm.com/documentation/ddi0608/
3. Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64) — https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst
4. Arm Architecture Procedure Call Standard for the Arm 32-bit Architecture (AAPCS) — https://github.com/ARM-software/abi-aa/blob/main/aapcs32/aapcs32.rst
5. Arm Cortex-M Processor Comparison Table — https://developer.arm.com/architectures/cpu-architecture/m-profile
6. Armv8-M Architecture Reference Manual — https://developer.arm.com/documentation/ddi0553/
7. MITRE ATT&CK, "Implant Internal Image (T1525)" — https://attack.mitre.org/techniques/T1525/
8. Ghidra ARM Processor Analysis — https://ghidra.re/online-cookbook/
9. IDA Pro ARM Analysis, Hex-Rays — https://hex-rays.com/products/ida/processor/arm/
10. radare2 ARM analysis / Book — https://book.rada.re/arch/intro.html
11. binwalk: Firmware Analysis Tool — https://github.com/ReFirmLabs/binwalk
12. OpenOCD Debugger — https://openocd.org/
13. pwntools shellcraft ARM — https://docs.pwntools.com/en/dev/shellcraft/arm.html
14. UEFITool — https://github.com/LongSoft/UEFITool
15. CHIPSEC — https://github.com/chipsec/chipsec
16. Microsoft, "The ARM processor (Thumb-2), part 3: Addressing modes" — https://devblogs.microsoft.com/oldnewthing/20210602-00/?p=105271
17. ARM Linux syscall interface — https://arm64.syscall.sh/
18. Azeria Labs, "ARM Cortex-M Firmware Reverse Engineering" — https://azeria-labs.com/
19. Attify, "Analyzing bare metal firmware binaries in Ghidra" — https://blog.attify.com/analyzing-bare-metal-firmware-binaries-in-ghidra/
20. FreeRTOS Task Control Block (TCB) — https://www.freertos.org/implementing-a-FreeRTOS-task.html
21. QEMU System Emulation for Arm — https://www.qemu.org/docs/master/system/target-arm.html
22. Azure RTOS ThreadX documentation — https://learn.microsoft.com/en-us/azure/rtos/threadx/
23. Trusted Firmware-A Documentation — https://trustedfirmware-a.readthedocs.io/
24. ARM TrustZone for Cortex-A — https://www.arm.com/technologies/trustzone-for-cortex-a
25. Armv8.3-A Pointer Authentication, "PAC/BTI" — https://developer.arm.com/architectures/cpu-architecture/a-profile
26. Embedded Security, "Embedded Communication Protocols" — https://embeddedsecurity.io/protocols
27. Kinda Technical, "Communication Protocols: UART, SPI, I2C, and CAN Bus" — https://kindatechnical.com/low-level-computing/lesson-87-communication-protocols-uart-spi-i2c-and-can-bus.html
28. Cortex-M Vector Table, Arm Developer — https://developer.arm.com/documentation/dui0471/m/handling-processor-exceptions/vector-table-for-armv6-m-and-armv7-m-profiles
29. JTAG and SWD debugging techniques — https://arshon.com/blog/jtag-and-swd-debugging-techniques/
30. Cortex-M0 Vector Table Management with a Bootloader — https://s-o-c.org/cortex-m0-vector-table-management-with-a-bootloader/
31. Quarkslab, "Nerd Life: Weeks of Firmware Teardown" — https://blog.quarkslab.com/nerd-life-weeks-firmware-teardown-we-were-right.html
32. Usedbytes, "Reverse engineering keyboard firmware with Ghidra" — https://blog.usedbytes.com/2020/03/reverse-engineering-keyboard-firmware-with-ghidra-part-3/
33. STM32 SWD Firmware Extraction via OpenOCD — https://industrialmonitordirect.com/blogs/knowledgebase/stm32-swd-firmware-extraction-via-openocd-tutorial
34. Phrack #66, "ARM/Thumb alphanumeric shellcode" — https://phrack.org/issues/66/12
35. Eclipse ThreadX, ThreadX overview — https://github.com/eclipse-threadx/rtos-docs/blob/main/rtos-docs/threadx/overview-threadx.md
