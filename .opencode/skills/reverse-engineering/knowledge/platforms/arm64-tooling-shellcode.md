# ARM Tooling & Shellcode

> **TL;DR:** Complete ARM RE toolchain (Ghidra, IDA, radare2, binwalk, OpenOCD, pwntools,
> QEMU, UEFITool, CHIPSEC), ARM shellcode techniques (PIC, Thumb mode, egghunters),
> and the ARM Linux syscall table.

> **Cross-reference:** Siblings: `arm64-architecture-registers.md`, `arm64-instructions-calling.md`,
> `arm64-thumb-firmware-methodology.md`, `arm64-firmware-architectures-mitre.md`, `arm64-rtos-iot-uefi.md`

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
