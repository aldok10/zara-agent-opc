# ARM Architecture Overview & Register Set

> **TL;DR:** ARM architecture variants (ARMv7/v8/v9), processor modes, exception levels,
> endianness, NEON/SIMD, and the complete ARM32/ARM64 register sets with roles and preservation rules.

> **Cross-reference:** Siblings: `arm64-instructions-calling.md`, `arm64-thumb-firmware-methodology.md`,
> `arm64-firmware-architectures-mitre.md`, `arm64-tooling-shellcode.md`, `arm64-rtos-iot-uefi.md`

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
