# Common Firmware Architectures & MITRE ATT&CK for Embedded

> **TL;DR:** Cortex-M/R/A firmware architecture patterns, bare-metal vs RTOS identification,
> FreeRTOS context switch patterns, and MITRE ATT&CK techniques specific to embedded/IoT targets.

> **Cross-reference:** Siblings: `arm64-architecture-registers.md`, `arm64-instructions-calling.md`,
> `arm64-thumb-firmware-methodology.md`, `arm64-tooling-shellcode.md`, `arm64-rtos-iot-uefi.md`

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
