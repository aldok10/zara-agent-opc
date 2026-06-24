# Alternative Architecture Reverse Engineering: MIPS, PowerPC, RISC-V

> Reference document for reverse engineering non-x86 architectures. Covers architecture fundamentals, calling conventions, branch semantics, tooling, firmware analysis, and common targets. Aimed at RE practitioners coming from x86/ARM.

## Table of Contents

1. [Why These Architectures Matter](#1-why-these-architectures-matter)
2. [MIPS Architecture](#2-mips-architecture)
3. [PowerPC / Power ISA](#3-powerpc--power-isa)
4. [RISC-V Architecture](#4-risc-v-architecture)
5. [Calling Conventions Compared](#5-calling-conventions-compared)
6. [Branch & Flow Control](#6-branch--flow-control)
7. [Tooling & Analysis](#7-tooling--analysis)
8. [Firmware & Bootloader Reversing](#8-firmware--bootloader-reversing)
9. [Common Target Devices](#9-common-target-devices)
10. [References & Further Reading](#10-references--further-reading)

---

## 1. Why These Architectures Matter

x86 and ARM dominate desktop/mobile, but the embedded world runs on a wider spectrum. MIPS has powered routers and IoT for decades. PowerPC drives automotive ECUs, game consoles (Wii, PS3, Xbox 360), and legacy Apple hardware. RISC-V is the rising open ISA, appearing in ESP32-C3, BL602, and countless new SoCs.

If you reverse engineer firmware, you *will* hit these architectures. Each one has quirks that break x86 assumptions: branch delay slots, dedicated link registers, and wildly different calling conventions [1](https://github.com/DatanoiseTV/practical-reverse-engineering).

---

## 2. MIPS Architecture

### 2.1 MIPS32 / MIPS64 Overview

MIPS is a 32-bit (MIPS32) or 64-bit (MIPS64) load-store RISC architecture. Fixed 32-bit instruction encoding. Releases 1 through 6; Release 6 (2014) introduced significant breaking changes [2](https://gcc.gnu.org/pipermail/gcc-patches/2015-July/424573.html).

| Feature | MIPS32 | MIPS64 |
|---------|--------|--------|
| GPRs | 32 x 32-bit | 32 x 64-bit |
| PC-relative? | No (PC invisible) | Same |
| Endianness | Bi-endian (big-endian common in networking) | Same |
| ALU ops | Reg-reg, reg-imm | Same + 64-bit variants |
| FPU | 32 x 32-bit FPRs (paired for double) | 32 x 64-bit FPRs |

### 2.2 Register Convention (o32 ABI)

The o32 (old 32-bit) ABI is the most common MIPS calling convention in embedded firmware [3](https://www.cs.unm.edu/~jeffk/cs341f09/_media/o32callingconvention.pdf).

| Register | ABI Name | Role | Saved by |
|----------|----------|------|----------|
| `$0` | `zero` | Always zero | N/A |
| `$1` | `at` | Assembler temporary | Caller |
| `$2-$3` | `v0-v1` | Return values | Caller |
| `$4-$7` | `a0-a3` | First 4 arguments | Caller |
| `$8-$15` | `t0-t7` | Temporaries | Caller |
| `$16-$23` | `s0-s7` | Callee-saved | Callee |
| `$24-$25` | `t8-t9` | Temporaries | Caller |
| `$26-$27` | `k0-k1` | Kernel reserved | N/A |
| `$28` | `gp` | Global pointer | Callee |
| `$29` | `sp` | Stack pointer | Callee |
| `$30` | `fp` | Frame pointer | Callee |
| `$31` | `ra` | Return address | Callee |

N32/N64 ABIs pass first 8 arguments in `$a0-$a7`. o32 uses only `$a0-$a3`; extra args go on stack [4](https://github.com/NationalSecurityAgency/ghidra/issues/1693).

### 2.3 Stack Frame (o32)

The o32 stack frame layout [5](https://d3s.mff.cuni.cz/files/teaching/nswi200/202324/doc/mips-abi.pdf):

```
High addresses
+-------------------+
| Caller's frame    |
+-------------------+
| Argument slots    |  <- 16 bytes reserved for $a0-$a3
| (4 words)         |
+-------------------+
| Return address    |  <- $ra save
+-------------------+
| Saved $s0-$s7     |  <- callee-saved regs
+-------------------+
| Local variables   |
+-------------------+
| Outgoing args     |  <- space for callee's argument slots
| (16+ bytes)       |
+-------------------+
| (padding to 8)    |
+--- $sp ----------+
Low addresses
```

Key points:
- Minimum non-leaf frame: 24 bytes (16 arg slots + 8 for $ra)
- Stack is 8-byte aligned at all times
- Leaf functions (no calls) may need zero frame space
- The 16-byte argument area belongs to the *caller's* frame conceptually, but is addressed from $sp

### 2.4 Delay Slots (Critical RE Topic)

Every branch and jump on pre-R6 MIPS has a **branch delay slot**: the instruction physically after the branch executes *before* the branch target [6](https://reverseengineering.stackexchange.com/questions/19606/understanding-branch-delay-slots-for-reversing-mips).

```asm
jalr    t9          ; branch instruction
addiu   a3, zero, 0 ; <<< THIS EXECUTES FIRST (delay slot)
```

When reading disassembly, the delay slot instruction logically belongs to the branch, not to the fall-through block. RE tools handle this differently:

- **Ghidra**: reorders delay slot instructions into their logical position in decompilation
- **radare2**: shows original order; use `e asm.midflags=true` to see annotations
- **IDA**: auto-skips delay slots in graph view

Branch likely variants (`beql`, `bnel`, etc.) nullify the delay slot instruction if the branch is not taken. These were removed in MIPS Release 6 [7](https://reviews.llvm.org/D16353).

Release 6 introduced **compact branches** (no delay slot) and **forbidden slots**: the instruction after a compact branch must not be a branch or jump [8](https://lists.llvm.org/pipermail/llvm-commits/Week-of-Mon-20160314/339417.html).

### 2.5 Common Pitfalls for RE

- **GOT/GP-relative addressing**: MIPS PIC uses `$gp` as base for a global offset table. Function prologues often load `$gp` from `$t9`. Without this context, Ghidra/IDA may show strange address references [9](https://github.com/NationalSecurityAgency/ghidra/issues/2622).
- **HI16/LO16 relocation pairs**: MIPS builds 32-bit constants with `lui` (high) + `addiu` (low). These pairs span instructions and tools must pair them correctly.
- **T9 register**: In PIC code, `$t9` holds the function address. Function prologues often begin with `move $t9, $ra` or load the GOT entry.
- **JR vs JALR**: `jr $ra` returns; `jalr $t9` calls through function pointer. R6 merged these with different opcodes.
- **MIPS16e / microMIPS**: Thumb-like compressed instruction sets (16-bit). Ghidra has context-sensitive decoding via `ext_delay` context vars [10](https://github.com/NationalSecurityAgency/ghidra/issues/862).

---

## 3. PowerPC / Power ISA

### 3.1 Architecture Lineage

PowerPC has two major branches:

| Family | ISA | Cores | Target |
|--------|-----|-------|--------|
| Classic PowerPC | AIM (Apple/IBM/Motorola) | 601, 603, 604, G3, G4, G5 | Desktops, Mac |
| Power ISA (Book E) | Book E / Power ISA v.2.03+ | e200, e300, e500, e600, e700 | Embedded |
| Server | Power ISA Server category | POWER4-POWER10 | Servers |
| Gaming | PowerPC 2.02 derivatives | PPE (Cell), XCPU, Broadway | PS3, Xbox 360, Wii |

### 3.2 Book E / Embedded Category

Book E was designed by Motorola/IBM specifically for embedded use, replacing the classic PowerPC MMU and interrupt model with embedded-friendly alternatives [11](https://www.nxp.com/docs/en/user-guide/BOOK_EUM.pdf).

**e300 core family**: Based on the original 603 design. Superscalar, out-of-order. Found in legacy automotive and networking gear. Three-stage FXU, single-pipe FPU [12](https://www.nxp.com/docs/en/reference-manual/e300coreRM.pdf).

**e500 core family**: Book E compliant. Dual-issue, 7-stage pipeline. Features:
- Hardware MMU with software-loaded TLBs (TLB0-TLB3)
- Separate interrupt vector table (IVORs)
- Per-page endianness (true little-endian support)
- Signal Processing Engine (SPE) APU for SIMD [13](https://www.nxp.com/docs/en/reference-manual/E500CORERM.pdf)

The e500 ABI diverges from classic PowerPC in parameter passing. Floating-point args use only FPRs; they don't also occupy GPR slots as in the PowerOpen ABI [14](https://www.nxp.com/docs/en/reference-manual/E500ABIUG.pdf).

### 3.3 Register Model

PowerPC has 32 GPRs and numerous special-purpose registers (SPRs).

| Register | Role | Preserved? |
|----------|------|------------|
| `r0` | Volatile, used in function prologs | Caller |
| `r1` | Stack pointer | Callee |
| `r2` | TOC pointer (64-bit) / Small data anchor | Callee |
| `r3-r10` | Parameter passing + return (r3-r4) | Caller |
| `r11` | Environment pointer / call-through | Caller |
| `r12` | Exception handling / glink | Caller |
| `r13` | Thread pointer / small data (ABI-dependent) | Callee |
| `r14-r31` | Callee-saved | Callee |
| `LR` | Link register (return address) | Caller |
| `CTR` | Count register (loop/branch) | Caller |
| `CR` | Condition register (8 x 4-bit fields) | Caller |
| `XER` | Fixed-point exception | Caller |
| `FPSCR` | FP status & control | Caller |

**Critical for RE**: The Condition Register (CR) is 8 independent 4-bit fields (CR0-CR7). Most integer instructions write CR0; compare instructions write a specified CR field. Branch instructions test a single CR bit using the BI operand [15](http://refspecs.linux-foundation.org/PPC_hrm.2005mar31.pdf).

### 3.4 PowerPC Calling Convention

Parameters are passed in `r3` through `r10` (GPRs) and `f1` through `f13` (FPRs). Each parameter consumes the next available GPR slot, regardless of whether a prior param was in FPR (differs by ABI variant) [16](https://devblogs.microsoft.com/oldnewthing/20180817-00/?p=99515).

The stack frame layout:

```
High addresses
+-------------------+
| Caller's frame    |
+-------------------+
| Back chain word   |  -> points to previous frame
+-------------------+
| CR save           |  (4 bytes, optional)
+-------------------+
| LR save           |  (return address)
+-------------------+
| TOC save (opt)    |  (64-bit only)
+-------------------+
| Parameter save    |  (8 words for r3-r10)
+-------------------+
| Saved GPRs        |  (r14-r31 as needed)
+-------------------+
| Saved FPRs        |  (f14-f31 as needed)
+-------------------+
| Local variables   |
+-------------------+
| Outgoing params   |
+--- $sp ----------+
Low addresses
```

The back chain is a linked list of stack frames. `$sp` points to the back chain pointer of the current frame. This makes stack unwinding deterministic even without debug info [17](https://refspecs.linuxfoundation.org/ELF/ppc64/PPC-elf64abi-1.7.html).

### 3.5 Branch Semantics

PowerPC branch instructions are remarkably flexible. The BO field encodes: decrement CTR, test CR bit, and prediction hint -- all in one byte [18](https://devblogs.microsoft.com/oldnewthing/20180815-00/?p=99495).

| Instruction | Meaning |
|-------------|---------|
| `bl target` | Branch and link (call) |
| `b target` | Unconditional branch |
| `bc BO, BI, target` | Conditional branch |
| `bcl BO, BI, target` | Conditional branch and link |
| `bclr BO, BI` | Conditional branch to LR (return) |
| `bcctr BO, BI` | Conditional branch to CTR (function pointer) |
| `bctrl` | Branch to CTR and link (call via pointer) |

**Key RE detail**: `bcl` with LK=1 always writes LR, even if the branch is *not* taken. This is a documented ISA behavior, but is a common source of decompiler bugs [19](https://github.com/NationalSecurityAgency/ghidra/issues/5218).

The CTR can be decremented-and-tested as part of the branch condition. This is used for loop optimization without a separate subtract/compare.

---

## 4. RISC-V Architecture

### 4.1 RV32 / RV64 / RV128

RISC-V is a modular ISA with a small base (RV32I/RV64I) and optional extensions [20](https://riscv.github.io/riscv-isa-manual/snapshot/privileged).

| Base | GPRs | XLEN | Address space |
|------|------|------|---------------|
| RV32I | 32 x 32-bit | 32 | 4 GiB |
| RV64I | 32 x 64-bit | 64 | 16 EiB |
| RV128I | 32 x 128-bit | 128 | (experimental) |

Standard extensions: M (multiply/divide), A (atomics), F (single FP), D (double FP), Q (quad FP), C (compressed 16-bit), V (vector).

### 4.2 Register Convention

| Register | ABI | Role | Preserved? |
|----------|-----|------|------------|
| `x0` | `zero` | Hardwired zero | N/A |
| `x1` | `ra` | Return address | No |
| `x2` | `sp` | Stack pointer | Yes |
| `x3` | `gp` | Global pointer | N/A (unallocatable) |
| `x4` | `tp` | Thread pointer | N/A |
| `x5-x7` | `t0-t2` | Temporaries | No |
| `x8` | `s0/fp` | Saved reg or frame pointer | Yes |
| `x9` | `s1` | Saved register | Yes |
| `x10-x17` | `a0-a7` | Arguments/return values | No |
| `x18-x27` | `s2-s11` | Saved registers | Yes |
| `x28-x31` | `t3-t6` | Temporaries | No |

**Key differences from MIPS/PPC**:
- 8 argument registers (vs MIPS o32's 4, PPC's 8)
- 12 callee-saved registers (vs MIPS 8, PPC 18)
- Return address in a GPR (x1/ra), not a special register
- No condition code register; branches compare two registers directly

### 4.3 Calling Conventions

RISC-V defines several ABIs [21](https://docs.riscv.org/reference/abi/riscv-cc-procedure-calling-convention.html):

| ABI Name | ISA Combo | Floats in | ILEN | FLEN |
|----------|-----------|-----------|------|------|
| ilp32 | RV32I | GPRs | 32 | N/A |
| ilp32f | RV32IF | FPRs | 32 | 32 |
| ilp32d | RV32IFD | FPRs | 32 | 64 |
| lp64 | RV64I | GPRs | 64 | N/A |
| lp64f | RV64IF | FPRs | 64 | 32 |
| lp64d | RV64IFD | FPRs | 64 | 64 |

The ILP32E variant (for RV32E with 16 registers) uses only `a0-a5`, `s0-s1`, `t0-t2`. Stack pointer alignment relaxed to 4 bytes [22](https://riscv-non-isa.github.io/riscv-elf-psabi-doc/).

### 4.4 Stack Frame

```
High addresses
+-------------------+
| Caller's frame    |
+-------------------+
| Return address    |  <- saved ra (if non-leaf)
+-------------------+
| Saved s0-s11      |  <- callee-saved
+-------------------+
| Local variables   |
+-------------------+
| Outgoing args     |  <- for callee's a0-a7 spill
| (8-pointerwords)  |
+--- $sp ----------+
Low addresses
```

ABI requires 16-byte stack alignment at the point of a call instruction. The stack grows downward. Leaf functions that don't call others and use few registers may not allocate a frame at all.

### 4.5 Privileged Architecture

RISC-V privilege levels [23](https://docs.riscv.org/reference/isa/v20240411/_attachments/riscv-privileged.pdf):

| Level | Encoding | Name |
|-------|----------|------|
| 0 | 00 | U (User) |
| 1 | 01 | S (Supervisor) |
| 2 | 10 | H (Hypervisor, optional) |
| 3 | 11 | M (Machine) |

Machine level is mandatory. Control and Status Registers (CSRs) are accessed via `csrrw`, `csrrs`, `csrrc` and their immediate variants.

Important CSRs for RE:

| CSR | Name | Purpose |
|-----|------|---------|
| `mstatus` | Machine status | IE bits, privilege mode |
| `mtvec` | Trap vector base | Exception handler address |
| `mepc` | Exception PC | PC at time of trap |
| `mcause` | Exception cause | Trap reason code |
| `satp` | Supervisor address translation | Page table base (S-mode) |

RV32 has high-half CSR aliases (`mstatush`, `timeh`, etc.) for 64-bit CSR access [24](https://courses.grainger.illinois.edu/ece391/sp2025/docs/priv-isa-20240411.pdf).

### 4.6 RISC-V Quirks

- **No delay slots**: RISC-V branches have no delay slots. The next instruction only executes if the branch is not taken.
- **JALR with rd=zero**: used for indirect jumps (not calls). With rd=ra, it's an indirect call.
- **AUIPC + ADDI pairs**: for PC-relative address generation (functionally similar to MIPS LUI+ADDI but PC-relative).
- **Zicntr CSRs**: `cycle`, `time`, `instret` are always 64-bit even in RV32. Accessed via `rdcycle[h]` pseudo-ops [25](https://sourceware.org/pipermail/binutils/2022-November/124527.html).

---

## 5. Calling Conventions Compared

| Aspect | MIPS (o32) | PowerPC (SVR4/EABI) | RISC-V (LP64/ILP32) |
|--------|------------|---------------------|---------------------|
| Arg regs (int) | $a0-$a3 (4) | r3-r10 (8) | a0-a7 (8) |
| Arg regs (FP) | $f12-$f15 (4) | f1-f13 (13) | fa0-fa7 (8) |
| Return regs | $v0-$v1 | r3-r4, f1-f4 | a0-a1, fa0-fa1 |
| Callee-saved | $s0-$s7 (8) | r14-r31 (18) | s0-s11 (12) |
| RA location | $31 (GPR) | LR (SPR) | x1 (GPR) |
| Stack alignment | 8-byte | 8-byte (16 SVR4) | 16-byte |
| Frame pointer | $30 (optional) | r31 (optional) | s0 (optional) |
| Red zone? | No | No | No |
| Leaf opt | Zero frame possible | Zero frame possible | Zero frame possible |
| GOT register | $gp | r2 (64-bit) | gp (uncommon) |

**Impact on RE**:
- MIPS o32 has few arg registers; inlined functions with many params spill to stack quickly
- PowerPC's LR/CTR as SPRs means Ghidra's decompiler must model them as special variables; IDA tracks them in register views
- RISC-V's reg-relative branches (no flags) make condition codes explicit: `blt a0, a1, label` leaves no trace in a flag register

---

## 6. Branch & Flow Control

### 6.1 Branch Delay Slot Matrix

| Architecture | Branch delay | Delay slot nullify | Compact form |
|-------------|--------------|-------------------|--------------|
| MIPS pre-R6 | Yes (always) | Likely variants | R6 only |
| MIPS R6 | No | N/A | Forbidden slot |
| PowerPC | No | N/A | N/A |
| RISC-V | No | N/A | N/A |

### 6.2 MIPS Delay Slot: RE Workflow

When analyzing MIPS firmware:

1. Identify the branch instruction
2. The instruction at PC+4 is the delay slot -- it executes *before* the jump
3. In Ghidra, the decompiler handles this automatically; verify in listing view
4. With `beql`/`bnel` (likely branches), the delay slot only executes if branch is taken
5. A NOP in the delay slot means the compiler couldn't find anything useful to fill it

**Obfuscation trick**: Attackers sometimes place jumps in delay slots (undefined behavior), used as an anti-disassembly technique [26](https://github.com/NationalSecurityAgency/ghidra/issues/132).

### 6.3 PowerPC Branch Processor

PowerPC's branch architecture is unlike anything in x86:

- LR holds the return address; calls use `bl`, returns use `blr`
- CTR can hold a target address for indirect calls (`bcctrl`) or act as a loop counter
- CR bits are set by compare instructions and tested by branch instructions
- Simplified mnemonics hide the BO/BI encoding: `beq` = `bc 12, 2, target` [27](https://fenixfox-studios.com/manual/powerpc/instructions/bcctr.html)

### 6.4 RISC-V Branch Comparison

RISC-V branches compare two registers directly (or one register vs zero):

| Mnemonic | Condition |
|----------|-----------|
| `beq rs1, rs2, offset` | Equal |
| `bne rs1, rs2, offset` | Not equal |
| `blt rs1, rs2, offset` | Signed less than |
| `bge rs1, rs2, offset` | Signed greater or equal |
| `bltu rs1, rs2, offset` | Unsigned less than |
| `bgeu rs1, rs2, offset` | Unsigned greater or equal |

All branches have a ±4 KiB range (12-bit immediate << 1). Longer ranges require a `j` (jal with rd=zero) trampoline.

---

## 7. Tooling & Analysis

### 7.1 Ghidra

**MIPS support**:
- Processor modules: `MIPS:BE:32:default`, `MIPS:LE:32:default`, `MIPS:BE:64:64-32addr`, `MIPS:LE:64:64-32addr`
- MIPS16e and microMIPS support via context-sensitive SLEIGH, but bugs remain with `ext_delay` handling [10](https://github.com/NationalSecurityAgency/ghidra/issues/862)
- Decompiler correctly handles delay slot reordering
- N32/N64 ABI requires manual compiler selection at import time (not auto-detected) [4](https://github.com/NationalSecurityAgency/ghidra/issues/1693)
- Known bug: delay slot instructions setting the last function argument are silently dropped [9](https://github.com/NationalSecurityAgency/ghidra/issues/2622)

**PowerPC support**:
- Processor modules: `PowerPC:BE:32:default`, `PowerPC:BE:64:default`, `PowerPC:LE:32:default`
- Book E variants available under `PowerPC:BE:32:booke`
- Known issue: `bcl`/`bclrl` with LK=1 sets LR conditionally in SLEIGH, but the ISA spec says it should be unconditional [19](https://github.com/NationalSecurityAgency/ghidra/issues/5218)

**RISC-V support**:
- Available since Ghidra 9.1 (PR #932) [28](https://github.com/NationalSecurityAgency/ghidra/pull/932)
- Processor modules: `RISCV:LE:32:RV32GC`, `RISCV:LE:64:RV64GC` (and variants for different ABI)
- Extensions: I, M, A, F, D, C implemented; V (vector) partial
- Auto-detects ELF attributes for ISA string
- C extension (compressed) support integrated

### 7.2 IDA Pro

**MIPS**: First-class support with full delay slot visualization. Graph view correctly reorders delay slot instructions. The `mipsrp` plugin (Hex-Rays) decompiles MIPS to pseudocode. Supports MIPS16, microMIPS, and R6 compact branches.

**PowerPC**: Hex-Rays decompiler for PPC handles both 32/64-bit and Book E. The `ppc` module includes Altivec/VMX support. Xbox 360's XEX format is handled by specialized loaders (xb360).

**RISC-V**: Native support added in IDA 7.5. ELF and raw binary support. Decompiler support added later; early versions lack C extension handling. Use `-Mpriv-spec=1.12` with riscv64-elf-objdump for CSR names [25](https://sourceware.org/pipermail/binutils/2022-November/124527.html).

### 7.3 radare2 / rizin

All three architectures are supported via Capstone/AsmJit backends.

**MIPS**:
- `r2 -a mips -b 32` or `-b 64`
- Endianness: `e cfg.bigendian=true`
- Delay slot awareness: `e asm.midflags=true` shows delay slot annotations
- Stack value metadata analysis added in r2 6.1.6 [29](https://github.com/radareorg/radare2/releases/tag/6.1.6)

**PowerPC**:
- `r2 -a ppc -b 32`
- Conditional branch fix for positive offsets in 6.1.6
- Book E not separately differentiated

**RISC-V**:
- `r2 -a riscv -b 32` or `-b 64`
- C extension handled by Capstone
- Stack value metadata analysis added in 6.1.6

### 7.4 Binary Ninja

Full MIPS, PowerPC, and RISC-V support with medium IL lifting. The architecture plugins handle delay slots, calling conventions, and stack analysis. HVIL (High-Level IL) for RISC-V available in recent versions.

### 7.5 Cross-Target Utilities

| Tool | Use Case |
|------|----------|
| `binwalk` | Firmware extraction, signature scanning |
| `qemu-system-ppc -M broadway` | Wii CPU emulation for dynamic analysis [30](http://oct0xor.github.io/2018/05/06/unpacking_devolution/) |
| `qemu-system-mips` | MIPS user/system emulation |
| `qemu-system-riscv32/64` | RISC-V system emulation |
| `riscv64-unknown-elf-objdump` | RISC-V disassembly with priv-spec flags |
| `mips-linux-gnu-objdump` | MIPS cross disassembly |
| `powerpc-linux-gnu-objdump` | PPC cross disassembly |
| `firmadyne` | Automated firmware emulation (Linux-based) |

---

## 8. Firmware & Bootloader Reversing

### 8.1 General Approach

Embedded firmware differs from userland binaries in key ways:

1. **Raw binary, not ELF**: No symbol table, no section headers, no loader. You must determine the base address yourself (tools like `binwalk`, `binbloom` help) [31](https://cavefxa.com/posts/router-hacking0/)
2. **Custom entry points**: Vector tables (PPC), reset vectors (MIPS at 0xBFC00000 or 0x80000000), or hardcoded addresses (RISC-V typically 0x80000000 or 0x20000000)
3. **No standard libc**: Many firmwares use uClibc, newlib, or no C library at all
4. **Memory-mapped peripherals**: Hardware registers at fixed physical addresses; cross-referencing with datasheets is essential

### 8.2 MIPS Boot Flow

- Reset vector: `0xBFC00000` (uncached, unmapped)
- Typical bootloader: U-Boot, CFE, RedBoot
- Flash layout: bootloader at 0x0, kernel at 0x10000+/0x20000+, rootfs (SquashFS/JFFS2) after kernel
- Uboot header magic: `0x27051956` (uImage)
- LZMA/gzip compressed kernel; decompressor stub before vmlinux

**Hardware extraction**: SPI flash dumped via clip/programmer. UART at 115200 baud is standard. Many TP-Link routers use UART console locked with password or `console=` parameter [31](https://github.com/IssamSayyaf/tplink-firmware-reversing).

### 8.3 PowerPC Boot Flow

- Reset vector: `0xFFF00100` (32-bit classic), `0x00000100` (Book E via IVORs), or `0x01000000` (some Book E)
- Bootloader: U-Boot with `ARCH=ppc`
- MMU is disabled at reset; cache-as-RAM trick for early stack
- Uboot on PPC includes a device tree blob (DTB) at a known location
- The back chain (`$sp[0]`) provides stack trace even in firmware

**Game consoles**:
- Wii: BootROM loads from NAND, verifies RSA signatures, then jumps to Broadway at `0x80004000` [32](https://marcan.st/uploads/25c3_console_hacking/)
- Xbox 360: 3x PPC cores, no MMU in game mode. Boot from DVD with encryption
- PS3: Cell BE's PPE boots first, loads SPU firmware from flash

### 8.4 RISC-V Boot Flow

- Reset vector: Implementation-dependent. Typical: `0x80000000` (QEMU), `0x20000000` (BL602 XIP), `0x40000000` (ESP32-C3)
- Privilege: Starts in M-mode
- Boot stages: ROM bootloader (M-mode) → 2nd-stage bootloader (S-mode) → kernel (S-mode)
- OpenSBI provides SBI (Supervisor Binary Interface) between M and S modes
- Multi-stage boot: many SoCs have a masked ROM (unchangeable) that loads a flash-based bootloader

**ESP32-C3**: RISC-V variant. ROM bootloader at `0x4000_0000`. Reads efuses for boot mode, loads from flash (XIP), supports secure boot and flash encryption. The ROM has undocumented CSRs at `0x800` and `0x801` related to interrupt handling [33](https://github.com/TristanWebber/ESP32C3-ROM-bootloader).

**BL602**: RISC-V with custom boot2 bootloader at XIP address `0x2300_0000`. AES-encrypted firmware images with SHA-256 verification. The EFlash Loader (sent via UART) writes images to embedded flash using ROM calls [34](https://lupyuen.github.io/articles/loader).

### 8.5 Firmware Analysis Checklist

```
1. Identify architecture (binwalk --opcodes, file command, strings)
2. Find base address (binbloom, check reset vectors, entry points)
3. Locate and extract filesystem (SquashFS, JFFS2, CramFS, YAFFS)
4. Identify bootloader (U-Boot, CFE, RedBoot, proprietary)
5. Find kernel (uImage header, ELF, raw vmlinux)
6. Map memory layout (datasheet + cross-referencing constants)
7. Locate peripheral registers (GPIO, UART, watchdog, timers)
8. Identify encryption/checksum (vendor-specific, often broken)
9. Emulate with QEMU/Firmadyne/FirmAE for dynamic analysis
10. Prioritize: web interface binaries, CGI handlers, auth logic
```

---

## 9. Common Target Devices

### 9.1 MIPS Devices

| Device | SoC | CPU | Bootloader | Notes |
|--------|-----|-----|------------|-------|
| TP-Link TL-WR841N | Qualcomm Atheros AR9341 | MIPS 74Kc | U-Boot | Most-studied RE target [35](https://github.com/NationalSecurityAgency/ghidra/files/5718455/wr841nv11_3_16_9_httpd.zip) |
| TP-Link Archer C7 | Qualcomm IPQ40xx | MIPS 74Kc | U-Boot | OpenWRT popular target [36](https://sergioprado.blog/reverse-engineering-router-firmware-with-binwalk/) |
| TP-Link TL-WR940N | MediaTek MT7628 | MIPS 24Kc | U-Boot 1.1.3 | CVE-2024-54887 stack overflow [37](https://infosecwriteups.com/reversing-discovering-and-exploiting-a-tp-link-router-vulnerability-cve-2024-54887-341552c4b104) |
| Mitrastar router | Broadcom BCM63xxx | MIPS 34Kc | CFE | Broadcom BCM tag header format [38](https://github.com/0xedh/mistrastar-mips-exploit) |
| Cisco/Linksys WRT54G | Broadcom BCM4712 | MIPS 32-bit | CFE | Classic RE target; VxWorks or Linux |
| Ubiquiti UniFi | MediaTek MT7621 | MIPS 1004Kc | U-Boot | Dual-core, network appliances |

VxWorks-based routers require special handling. The binary is a single flat image (kernel + apps), no ELF structure. LZMA compressed, with symbol table sometimes stripped. Base address detection is critical [39](http://sechub.in/view/2115689).

### 9.2 PowerPC Devices

| Device | SoC | Core | ISA | Notes |
|--------|-----|------|-----|-------|
| Nintendo Wii | IBM Broadway | 750CL @729MHz | PowerPC 32-bit | Paired-single FPU, no OS (bare-metal games) [40](https://lists.ozlabs.org/pipermail/linuxppc-dev/2009-December/078912.html) |
| Nintendo GameCube | IBM Gekko | 750CXe @486MHz | PowerPC 32-bit | Broadway predecessor |
| Microsoft Xbox 360 | IBM XCPU | 3x PPE @3.2GHz | PowerPC 2.02+VMX128 | Custom VMX128, unified L2 [41](https://web.archive.org/web/20080122021306/http:/www-128.ibm.com/developerworks/power/library/pa-fpfxbox/) |
| Sony PlayStation 3 | Cell BE | 1 PPE + 8 SPE | PowerPC 2.02 | Hybrid architecture, in-order PPE [42](http://blink.copetti.org/writings/consoles/playstation-3/) |
| Freescale (NXP) MPC5xxx | e200 | e200z0/4/6 | PowerPC Book E | Automotive powertrain, body electronics |
| NXP QorIQ P1/P2/P3/P4 | e500mc/e5500 | e500/e5500 | Power ISA v2.06 | Networking, industrial |
| PowerQUICC II/III | MPC82xx/85xx | e300/e500 | Book E | Legacy telecom, networking |

### 9.3 RISC-V Devices

| Device | SoC | Core | ISA | Notes |
|--------|-----|------|-----|-------|
| ESP32-C3 | Espressif | RISC-V RV32IMC | Single-core, WiFi/BLE 5 | ROM bootloader at 0x40000000 [33](https://github.com/TristanWebber/ESP32C3-ROM-bootloader) |
| ESP32-C6 | Espressif | RISC-V RV32IMAC | WiFi 6, BLE, Thread, Zigbee | Low-power, multi-protocol |
| BL602/BL604 | Bouffalo Lab | SiFive E24 | RV32IMACF | WiFi/BLE, XIP flash, AES-secured boot [34](https://lupyuen.github.io/articles/loader) |
| Bouffalo BL70x | Bouffalo Lab | RISC-V | RV32IMC | BLE-only, smaller memory |
| SiFive FU540 | SiFive | U54 | RV64GC | Linux-capable, 4 cores, HiFive Unleashed |
| SiFive FE310 | SiFive | E31 | RV32IMAC | HiFive1 dev board, no MMU |
| Allwinner D1 | Allwinner | XuanTie C906 | RV64GCV | Linux SBC, GPU, video decode |
| Milk-V Duo | CVITEK | CV1800B | RV64IMAFDC | Dual-core, camera ISP |
| PolarFire SoC | Microchip | SiFive U54 | RV64GC | FPGA + hard RISC-V cores, Linux |

---

## 10. References & Further Reading

### Architecture Manuals

- MIPS32 Architecture for Programmers (MD00086). MIPS Technologies.
- MIPS64 Architecture for Programmers (MD00087). MIPS Technologies.
- Programming Environments Manual for 32-Bit Implementations of the PowerPC Architecture. IBM/Freescale, 2005. [15](http://refspecs.linuxfoundation.org/PPC_hrm.2005mar31.pdf)
- Book E: Enhanced PowerPC Architecture, Version 1.0. Motorola/IBM, 2002. [11](https://www.nxp.com/docs/en/user-guide/BOOK_EUM.pdf)
- e500 Core Family Reference Manual (E500CORERM). Freescale, 2005. [13](https://www.nxp.com/docs/en/reference-manual/E500CORERM.pdf)
- RISC-V Instruction Set Manual Volume I: Unprivileged ISA. RISC-V International.
- RISC-V Instruction Set Manual Volume II: Privileged Architecture, v20240411. [23](https://docs.riscv.org/reference/isa/v20240411/_attachments/riscv-privileged.pdf)
- RISC-V Calling Conventions (riscv-cc.adoc). [21](https://docs.riscv.org/reference/abi/riscv-cc-procedure-calling-convention.html)

### ABI Documents

- System V Application Binary Interface: MIPS Processor Supplement. [5](https://d3s.mff.cuni.cz/files/teaching/nswi200/202324/doc/mips-abi.pdf)
- PowerPC e500 ABI User's Guide (E500ABIUG). Freescale. [14](https://www.nxp.com/docs/en/reference-manual/E500ABIUG.pdf)
- 64-bit PowerPC ELF Application Binary Interface Supplement 1.7. [17](https://refspecs.linuxfoundation.org/ELF/ppc64/PPC-elf64abi-1.7.html)
- RISC-V ELF PSABI Specification. [22](https://riscv-non-isa.github.io/riscv-elf-psabi-doc/)

### Tool Documentation

- Ghidra: Processor modules in `Ghidra/Processors/`. MIPS (mips.sinc), PPC (ppc.sinc), RISCV (riscv.sinc)
- radare2: `r2book` at https://book.rada.re
- binwalk: https://github.com/ReFirmLabs/binwalk
- Practical Reverse Engineering (DatanoiseTV). Covers MIPS, RISC-V, Xtensa, 8051. [1](https://datanoisetv.github.io/practical-reverse-engineering/)

### Game Console RE

- "Console Hacking 2008: Wii Fail" by marcan/bushing. 25C3. [32](https://marcan.st/uploads/25c3_console_hacking/)
- PS3 Architecture: A Practical Analysis. Rodrigo Copetti. [42](http://blink.copetti.org/writings/consoles/playstation-3/)
- Xbox 360 CPU: Application-Customized CPU Design. IBM Fall Processor Forum 2005. [41](https://web.archive.org/web/20080122021306/http:/www-128.ibm.com/developerworks/power/library/pa-fpfxbox/)

### Bug Reports & Fixes (Tool Limitations)

- Ghidra MIPS n32 ABI calling conv issues: [#1693](https://github.com/NationalSecurityAgency/ghidra/issues/1693), [#1895](https://github.com/NationalSecurityAgency/ghidra/issues/1895)
- Ghidra MIPS delay slot arg drop: [#2622](https://github.com/NationalSecurityAgency/ghidra/issues/2622)
- Ghidra MIPS16 delay slot context: [#862](https://github.com/NationalSecurityAgency/ghidra/issues/862)
- Ghidra PPC branch LK semantics: [#5218](https://github.com/NationalSecurityAgency/ghidra/issues/5218)
- Ghidra RISC-V PR: [#932](https://github.com/NationalSecurityAgency/ghidra/pull/932)
- radare2 6.1.6: RISC-V/MIPS stack value metadata [29](https://github.com/radareorg/radare2/releases/tag/6.1.6)
- RISC-V GNU tools priv-spec/arch disassembler options [25](https://sourceware.org/pipermail/binutils/2022-November/124527.html)

### Firmware RE Walkthroughs

- TP-Link TL-WR940N exploit (CVE-2024-54887): [37](https://infosecwriteups.com/reversing-discovering-and-exploiting-a-tp-link-router-vulnerability-cve-2024-54887-341552c4b104)
- TP-Link Archer C7 firmware analysis: [36](https://sergioprado.blog/reverse-engineering-router-firmware-with-binwalk/)
- Mitrastar router MIPS ROP chain: [38](https://github.com/0xedh/mistrastar-mips-exploit)
- BL602 WiFi reverse engineering: [43](https://lupyuen.github.io/articles/wifi)
- ESP32-C3 ROM bootloader RE: [33](https://github.com/TristanWebber/ESP32C3-ROM-bootloader)
- BL602 firmware image format: [44](https://www.maero.dk/bl602-firmware-image-format/)
- Devolution unpacking on Wii (QEMU + GDB): [30](http://oct0xor.github.io/2018/05/06/unpacking_devolution/)
- TP-Link WR720N VxWorks RE (Binary Ninja): [31](https://cavefxa.com/posts/router-hacking0/)

---

> **Last updated**: 2026-06-21. Architecture references reflect current ratified specs (RISC-V Priv 1.12, MIPS32 R6, Power ISA 3.1).
