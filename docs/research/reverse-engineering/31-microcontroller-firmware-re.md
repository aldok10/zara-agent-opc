# Microcontroller Firmware Reverse Engineering

**Audience:** Security researchers, embedded engineers, RE practitioners  
**Prerequisites:** Basic assembly knowledge, familiarity with Linux command line  
**Covers:** AVR (Arduino), STM32 (ARM Cortex-M), ESP32 (Tensilica Xtensa), PIC (8/16/32-bit)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Firmware Image Formats](#2-firmware-image-formats)
3. [Flash Dumping & Acquisition](#3-flash-dumping--acquisition)
4. [Toolchains & Analysis Workflows](#4-toolchains--analysis-workflows)
5. [Per-Architecture Reversing Guide](#5-per-architecture-reversing-guide)
6. [Bootloader Reversing](#6-bootloader-reversing)
7. [Firmware Encryption & Defeating Read Protection](#7-firmware-encryption--defeating-read-protection)
8. [Peripheral Mapping & Hardware Identification](#8-peripheral-mapping--hardware-identification)
9. [References](#9-references)

---

## 1. Architecture Overview

Microcontrollers span radically different ISAs, memory models, and security postures. Understanding the target architecture is step zero. AVR and PIC are Harvard architectures with separate code/data buses. STM32 (ARM Cortex-M) and ESP32 use modified Harvard or unified memory maps.

| Family | ISA | Word Size | Endianness | Common Toolchain | Flash Range |
|--------|-----|-----------|------------|------------------|-------------|
| AVR (ATmega, ATtiny) | AVR | 8/16-bit | Little | avr-gcc, avrdude | 1-256 KB |
| STM32 (Cortex-M0/3/4/7) | ARM Thumb/Thumb-2 | 32-bit | Little | arm-none-eabi-gcc, openocd | 16-2048 KB |
| ESP32 | Xtensa LX6 | 32-bit | Little | xtensa-esp32-elf-gcc, esptool | 4-16 MB ext |
| ESP32-S2/S3/C3 | Xtensa/RISC-V | 32-bit | Little | idf.py, esptool | 2-16 MB ext |
| PIC 8-bit (16F, 18F) | PIC | 8/14/16-bit | Little | XC8, pk2cmd | 1-128 KB |
| PIC 32-bit (32MZ) | MIPS32 | 32-bit | Little | XC32, ipe | 32-2048 KB |

**Key differences from general-purpose RE:** firmware is bare-metal or RTOS-based, no ASLR, fixed memory maps, no standard library (or a stripped newlib), and peripheral access is through memory-mapped registers [1](https://github.com/swisskyrepo/HardwareAllTheThings/blob/main/docs/firmware/firmware-reverse-engineering.md).

---

## 2. Firmware Image Formats

### 2.1 Intel HEX (.hex)

ASCII transport format, one record per line. Still the most common distribution format for 8-bit MCUs.

```
:100000000C9445000C944E000C9451000C94540060
:100010000C9457000C945A000C945D000C94600050
:0400000300000000F9
:00000001FF
```

Record structure: `:LLAAAATT[DD...]CC`

| Field | Bytes | Meaning |
|-------|-------|---------|
| `:`   | 1     | Start code |
| `LL`  | 1     | Data length (bytes) |
| `AAAA`| 2     | Load address (16-bit) |
| `TT`  | 1     | Record type (00=data, 01=EOF, 02/04=ext addr) |
| `DD..`| N     | Payload |
| `CC`  | 1     | Checksum (two's complement sum) |

Extended linear address records (type 04) enable addressing above 64 KB [2](https://en.wikipedia.org/wiki/Intel_HEX). Type 05 (start linear address) is used for 32-bit entry points.

### 2.2 ELF (.elf)

Standard object/executable format for compiled firmware. Contains headers, section table, symbol table, and debug info. Unlike Intel HEX, ELF preserves:
- Section names (.text, .data, .rodata, .bss)
- Symbol names (if not stripped)
- Relocation information
- Debug sections (DWARF)

Toolchains emit ELF first, then convert to HEX or binary for flashing. Always try to obtain the ELF file -- it massively accelerates analysis by giving Ghidra/IDA entry points and symbol names [3](https://stackoverflow.com/questions/32005154/how-to-convert-elf-file-to-binary-file).

### 2.3 Raw Binary (.bin)

A flat memory image with no metadata. The analyst must determine:
- Load address (where in memory the binary expects to execute from)
- Entry point (often the reset vector)
- Whether the image is a full flash dump, a partition, or a bootloader

**Conversion between formats:**

```bash
# Intel HEX -> Binary
objcopy -I ihex -O binary firmware.hex firmware.bin

# ELF -> Binary
arm-none-eabi-objcopy -O binary firmware.elf firmware.bin

# ELF -> Intel HEX
arm-none-eabi-objcopy -O ihex firmware.elf firmware.hex

# Binary -> Intel HEX (with known base address)
objcopy -I binary -O ihex --change-addresses 0x08000000 firmware.bin firmware.hex
```

### 2.4 Format Detection

```bash
# Check file type
file firmware.bin
xxd firmware.bin | head -20

# Check for known signatures
binwalk firmware.bin
```

Common signatures in flash dumps: U-Boot header (`UB`), ESP32 partition table (`AA 50`), ARM vector table (initial SP + reset vector at offset 0-4).

---

## 3. Flash Dumping & Acquisition

### 3.1 SPI Flash (External Memory)

ESP32 and many Linux-capable MCUs use external SPI NOR flash. The flash chip is a separate IC with a known part number [4](https://reverseengineering.stackexchange.com/questions/2337/how-to-dump-flash-memory-with-spi).

**Hardware needed:**
- SOIC-8 test clip (Pomona 5250 or clone)
- CH341A programmer, Bus Pirate, or FT232H
- Breadboard + jumper wires

**Process:**

1. Identify the flash chip on the PCB (look for 8-pin SOIC near the MCU)
2. Read the part number, check datasheet for voltage (3.3V vs 1.8V)
3. Clip on, verify continuity
4. Dump with flashrom or a custom script:

```bash
# CH341A + flashrom
flashrom -p ch341a_spi -r flash_dump.bin

# Bus Pirate
flashrom -p buspirate_spi:dev=/dev/ttyUSB0 -r flash_dump.bin

# Verify against multiple reads
flashrom -p ch341a_spi -r flash_dump_2.bin
md5sum flash_dump*.bin
```

**Caveats:** Some boards have in-circuit programming issues -- adjacent components can interfere. Desoldering the chip is the nuclear option. Always dump the chip multiple times and compare hashes [5](https://blog.haicen.me/posts/extracting-firmware-spi-flash/).

### 3.2 JTAG / SWD (Debug Interface)

ARM Cortex-M (STM32, nRF, LPC) exposes Serial Wire Debug (SWD) on 2 pins (SWDIO, SWCLK). Full JTAG uses 4-5 pins (TCK, TMS, TDI, TDO, nTRST or nSRST) [6](https://github.com/f3nter/HardBreak/blob/main/hardware-hacking/interface-interaction/jtag-swd/extract-firmware-using-jtag-swd.md).

**Tools:** OpenOCD, J-Link, ST-Link, Black Magic Probe.

```bash
# OpenOCD + ST-Link dump
openocd -f interface/stlink.cfg -f target/stm32f1x.cfg \
  -c "init" \
  -c "halt" \
  -c "flash read_bank 0 firmware.bin 0 0x10000" \
  -c "shutdown"

# J-Link commander
JLinkExe -device STM32F407VG -if SWD -speed 4000
# Then: connect, halt, savebin firmware.bin 0x08000000 0x100000
```

**Readout Protection (RDP):** STM32 implements RDP levels 0 (none), 1 (debug disabled), and 2 (permanent). Level 1 can sometimes be downgraded by exploiting the bootloader, glitching the voltage, or applying UV light to the die [7](https://community.penthertz.com/t/breaking-stm32-readout-protection-from-uv-light-to-cpu-state-tracing/27).

### 3.3 ISP / ICSP (In-System Programming)

AVR uses SPI-based ISP (MOSI, MISO, SCK, RESET). PIC uses ICSP (PGC, PGD).

**AVR dump with avrdude:**

```bash
# Read entire flash
avrdude -p atmega328p -c usbasp -U flash:r:flash_dump.hex:i

# Read as raw binary
avrdude -p atmega328p -c arduino -P /dev/ttyUSB0 -b 115200 \
  -U flash:r:flash_dump.bin:r
```

**PIC dump with pk2cmd:**

```bash
pk2cmd -P PIC18F4550 -GFirmware.hex -Y
```

**Lock bits:** AVR lock bits (LB1, LB2) prevent flash readback. If set, the chip must be erased before reprogramming, destroying the firmware. Some AVR models have a "JTAG disable" fuse that can be temporarily bypassed with HV (high-voltage) programming [8](https://www.evilmadscientist.com/2011/avr-basics-reading-and-writing-flash-contents/).

### 3.4 Bootloader Exploits

When direct hardware access is limited, exploit the bootloader:

- **DFU (Device Firmware Update):** many MCUs expose DFU over USB. If the bootloader doesn't authenticate properly, arbitrary reads are possible.
- **UART shell:** a firmware update routine accessible over UART may accept a read command.
- **Fault injection:** voltage or clock glitches can skip read-protection checks during bootloader execution [9](https://www.researchgate.net/publication/347323382_Fill_your_Boots_Enhanced_Embedded_Bootloader_Exploits_via_Fault_Injection_and_Binary_Analysis).

**Dumping from a live bootloader:**

```bash
# Check for UART boot interface
screen /dev/ttyUSB0 115200
# Hit Enter, look for a boot prompt
# If it accepts hex upload, use it to dump memory regions
```

### 3.5 PCB-Level Identification

Before dumping, survey the board:

1. **Locate the MCU:** largest IC, often with visible markings
2. **Identify the flash chip:** 8-pin SOIC near MCU = external SPI flash
3. **Trace programming headers:** 4-6 pin headers with VCC/GND/CLK/DATA
4. **Check for test points:** vias labeled SWD_CLK, SWD_DIO, TX, RX
5. **Visual inspection:** decap and read die with microscope (destructive, last resort)

---

## 4. Toolchains & Analysis Workflows

### 4.1 Ghidra

NSA's open-source SRE framework. The most important tool for MCU firmware RE due to its extensibility and free cost [10](https://undercodetesting.com/mastering-ghidra-the-ultimate-guide-to-firmware- reverse-engineering-for-security-researchers-video/).

**Processor support:**

| Arch | Ghidra Language ID | Notes |
|------|-------------------|-------|
| AVR | AVR8 | Full support, all variants |
| ARM Cortex-M | ARM:LE:32:Cortex | Thumb/Thumb-2 |
| Xtensa LX6 | Xtensa | ESP32 — use ESP32 Ghidra plugin |
| PIC 8-bit | PIC12/16/18 | Partial |
| PIC 24-bit | PIC24 | Available |
| MIPS32 | MIPS:LE:32 | PIC32 |

**Setup for MCU work:**

1. Install Ghidra, load firmware as "Raw Binary" (or ELF if available)
2. Select correct language/processor
3. Set base address match the MCU's flash base (e.g., 0x08000000 for STM32)
4. Run auto-analysis (aggressive instruction analysis, function identification)

**Critical plugins:**
- [Ghidra STM32 Loader](https://github.com/wrongbaud/ghidra-stm32) — parses STM32 vector tables, maps peripherals [11](https://wrongbaud.github.io/posts/writing-a-ghidra-loader/)
- [ESP32 Flash Loader](https://github.com/esp32/ghidra-esp32-plugin) — loads ESP32 flash images with IRAM/DRAM splitting
- SVD-Loader — imports CMSIS-SVD files for peripheral register naming [12](https://blog.attify.com/analyzing-bare-metal-firmware-binaries-in-ghidra/)

**SVD file integration:**

SVD (System View Description) files describe memory-mapped registers for ARM Cortex-M MCUs. Loading them into Ghidra renames thousands of peripheral addresses from `DAT_40020000` to `USART1->SR`.

```bash
# Download SVD files from vendor packs
# ST: https://github.com/STMicroelectronics/cmsis_device_f4
# Generic: https://github.com/posborne/cmsis-svd
```

### 4.2 IDA Pro

Industry-standard, expensive, but has the best decompiler for ARM and Xtensa. Hex-Rays ARM decompiler handles Cortex-M Thumb code exceptionally well. IDA can load SVD files via the `svd` plugin [13](https://olof-astrand.medium.com/reverse-engineering-of-esp32-flash-dumps-with-ghidra-or-ida-pro-8c7c58871e68).

### 4.3 Radare2 / Rizin

Free, scriptable, supports 60+ architectures. Better for automation than interactive analysis but has a steep learning curve.

```bash
# Open firmware as raw binary with ARM Cortex-M arch
r2 -a arm -b 16 firmware.bin

# In r2 shell:
# Analyze
aaaa
# Seek to entry (reset vector at offset 4 in ARM)
s 4
# See instructions
pd 20
# List functions
afl
# Seek to specific function
s sym.main
# Decompile
pdd
```

Radare2 works well for ARM (including Thumb detection) and AVR. For AVR, use `-a avr -b 8` [14](https://github.com/ifding/radare2-tutorial).

### 4.4 objdump (binutils)

Quick disassembly for initial triage. No decompilation, no cross-references.

```bash
# ARM Thumb disassembly
arm-none-eabi-objdump -d -m arm --force-thumb firmware.elf

# AVR disassembly
avr-objdump -d firmware.elf

# Raw binary disassembly with known architecture
arm-none-eabi-objdump -D -b binary -m arm --force-thumb firmware.bin

# Show all sections
arm-none-eabi-objdump -x firmware.elf
```

Add `-S` to mix source lines (if debug info present). Add `-M force-thumb` for ARM Cortex-M to avoid ARM/Thumb interworking confusion [15](https://s-o-c.org/how-to-use-arm-toolchains-for-disassembly/).

### 4.5 Binwalk

Firmware carving and signature detection tool. Scans for filesystems, compression headers, bootloaders, and known signatures within a binary blob.

```bash
# Scan for embedded files
binwalk firmware.bin

# Extract all detected filesystems
binwalk -Me firmware.bin

# Only display entropy
binwalk -E firmware.bin
```

Binwalk is essential when dealing with firmware images that wrap multiple components (bootloader + partition table + app + OTA). It detects SquashFS, JFFS2, CramFS, LZMA, gzip, and dozens of MCU-specific signatures [16](https://github.com/ReFirmLabs/binwalk).

### 4.6 Other Useful Tools

| Tool | Purpose | Command Example |
|------|---------|-----------------|
| strings | Dump ASCII/UTF-16 strings | `strings -n 6 firmware.bin` |
| xxd | Hex dump | `xxd firmware.bin \| head -50` |
| hexdump | Canonical hex+ASCII | `hexdump -C firmware.bin \| head` |
| unblob | Better firmware extraction | `unblob firmware.bin` |
| Firmadyne | Emulation + analysis | `python squashfs-root.py` |
| QEMU | User/system mode emulation | `qemu-system-arm -M stm32vldiscovery` |

---

## 5. Per-Architecture Reversing Guide

### 5.1 AVR (Arduino)

**Memory map:**

| Region | Address | Size |
|--------|---------|------|
| Flash (ROM) | 0x0000 | Up to 256 KB |
| SRAM | 0x0100+ | Up to 16 KB |
| EEPROM | 0x0000 (separate bus) | Up to 4 KB |
| I/O Registers | 0x0020-0x005F | 64 bytes |
| Ext I/O | 0x0060-0x00FF | 160 bytes |

**Register file:** R0-R31. R28-R29 = Y pointer, R30-R31 = Z pointer. Most instructions are 16-bit, some 32-bit.

**Identify Arduino binaries:**
- Bootloader at 0x7E00 (ATmega328P) — signature: Arduino/Genuino
- Vector table at 0x0000: RJMP to reset, RJMP to ISRs
- Known patterns: `delay()`, `digitalWrite()`, `Serial.print()` consume predictable instruction sequences

**AVR lock bits:**

| LB Mode | Function |
|---------|----------|
| LB1=0, LB2=0 | No protection |
| LB1=1, LB2=0 | Flash read/write disabled via ISP |
| LB1=1, LB2=1 | Also verify disabled, chip erase required |

If both LB1 and LB2 are set, the only recovery is chip-erase (destroys all data) [17](https://reverseengineering.stackexchange.com/questions/1698/bypassing-copy-protection-in-microcontrollers-using-glitching).

**Dumping with lock bits set:** try high-voltage parallel programming (HVPP) or use a glitch to skip the lock-bit check during boot. Some AVRs (e.g., ATmega32) have a known vulnerability where lock bits are only checked on the first access, so rapid power cycling can bypass them.

**Ghidra workflow:**
```
1. Load as Raw Binary → AVR8 → 16-bit
2. Base address: 0x0000
3. Create a memory region for I/O registers (0x0020-0x005F) as data
4. Analyze: aggressive function finding, stack references
5. Look for `STS`/`LDS` instructions to identify peripheral writes
```

### 5.2 STM32 (ARM Cortex-M)

**Memory map:**

| Region | Address | Purpose |
|--------|---------|---------|
| Flash | 0x08000000 | Code + read-only data |
| SRAM | 0x20000000 | Stack, heap, .data, .bss |
| Peripherals | 0x40000000 | GPIO, USART, SPI, I2C, timers |
| System | 0xE0000000 | NVIC, SCB, SysTick |

**Vector table at 0x08000000:**
- Offset 0: Initial stack pointer (MSP)
- Offset 4: Reset handler address (with bit 0 = 1 for Thumb)
- Offset 8: NMI handler
- Offset 12: HardFault handler

The VTABLE must have bit 0 set on every entry (Thumb interwork constraint). If you see even addresses in the vector table, the firmware is corrupt or the base address is wrong [18](https://medium.com/techmaker/reverse-engineering-stm32-firmware-578d53e79b3).

**Identify peripherals by register access:**

Firmware that writes to 0x40020000 is configuring GPIOA (if an STM32F4). The peripheral base addresses are MCU-family-specific. Cross-reference against the reference manual.

```python
# Common STM32F4 peripheral base addresses
PERIPHERAL_BASES = {
    0x40020000: 'GPIOA',
    0x40020400: 'GPIOB',
    0x40023800: 'RCC',
    0x40011000: 'USART1',
    0x40010400: 'SPI1',
    0x40012C00: 'TIM1',
}
```

**RDP levels and exploitation:**

| Level | Name | Behavior |
|-------|------|----------|
| 0 | No protection | Full debug access |
| 1 | Read protection | SWD/JTAG blocked, flash reads fail |
| 2 | Permanent | RDP cannot be reversed, JTAG permanently disabled |

Level 1 bypass techniques:
- **UV light:** erase RDP Option Bytes by exposing the die to UV (if OTP not blown)
- **Voltage glitching:** corrupt the read-protection check during boot
- **Cold boot:** read SRAM remnants after warm reset [19](https://hackaday.com/2023/02/05/need-to-dump-a-protected-stm32f0x-use-your-pico/)
- **CPU state tracing:** use a debugger to halt the CPU mid-execution and read flash via DMA [7]

**STM32F0x protected dump (with RP2040):**

The Raspberry Pi Pico (RP2040) can act as a glitcher + SWD interface to dump level-1 protected STM32F0x parts. The glitch is triggered during the boot ROM sequence before the option bytes are evaluated [19].

### 5.3 ESP32

**Memory map:**

| Region | Address | Size | Notes |
|--------|---------|------|-------|
| IRAM (cache) | 0x40070000 | ~192 KB | .text, vectors |
| DRAM (cache) | 0x3FFE0000 | ~200 KB | .rodata, .bss, .data |
| DROM (flash) | 0x3F400000 | Up to 4 MB | Constant data |
| IROM (flash) | 0x400D0000 | Up to 4 MB | Code in flash cache |

**Flash layout:**
```
0x0000 → Bootloader (first stage)
0x8000 → Partition table
0x9000 → NVS region
0x10000 → Application (factory)
0x200000 → OTA partition
```

**Partition table parsing:**

The default partition table is at offset 0x8000 with a magic of 0x50AA. Parsing it reveals where the app, OTA, and data partitions live:

```python
import struct
with open('flash_dump.bin', 'rb') as f:
    f.seek(0x8000)
    magic = struct.unpack('<I', f.read(4))[0]
    assert magic == 0x50AA, "Not an ESP32 partition table"
```

**Xtensa LX6 quirks:**
- Variable-length instruction encoding (24-bit most common, 16-bit for narrow)
- Windowed register file (AR0-AR63, with 16-entry window)
- No traditional PC-relative addressing—uses L32R with literal pools
- Interrupts use special entry/exit sequences (RSYNC, RSIL)

**Ghidra analysis:**

Use the [ESP32 Ghidra plugin](https://github.com/esp32/ghidra-esp32-plugin) or follow the ELF-reconstruction approach:

1. Use `esptool.py` to read the flash
2. Convert to ELF with the flash loader script
3. Load ELF into Ghidra (preserves IROM/DROM split)
4. Set memory map: IRAM at 0x40070000, DROM at 0x3F400000, IROM at 0x400D0000

Without the plugin, load as a raw binary and manually partition memory regions.

```bash
# Dump full flash
esptool.py --port /dev/ttyUSB0 read_flash 0 0x400000 flash_dump.bin

# Read only the app partition (after partition table parsing)
esptool.py --port /dev/ttyUSB0 read_flash 0x10000 0x1F0000 app.bin
```

**ESP32 security features** [20](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/flash-encryption.html):

| Feature | Key stored in | Bypass difficulty |
|---------|---------------|-------------------|
| Flash encryption | eFuse BLK1 | Hard (glitching) |
| Secure boot | eFuse BLK2 | Very hard |
| Both enabled | BLK1 + BLK2 | Extreme |

Flash encryption uses AES-XTS-128 with a key burned into eFuses. If the eFuse is not write-protected, key extraction via power glitching is possible. The "LimitedResults" Pwn2Own 2019 attack demonstrated voltage glitching on ESP32-V1 to extract both flash encryption and secure boot keys from eFuses [21](https://eprint.iacr.org/2023/090).

### 5.4 PIC (8/16/32-bit)

**PIC 8-bit memory model (Harvard):**

| Memory | Address Bus | Notes |
|--------|-------------|-------|
| Program Flash | 14/16-bit words (not bytes!) | Code resides here |
| Data RAM | 8-bit | GPRs + SFRs |
| EEPROM | 8-bit, separate | Persistent data |

**Key architecture difference:** PIC instructions are word-addressable, not byte-addressable. A PIC16F877A has 8K words of program memory (14,336 bytes). Dumping as raw bytes without word alignment creates nonsense disassembly.

**ICSP dumping:**

PIC uses In-Circuit Serial Programming (ICSP) on two pins: PGC (clock) and PGD (data). Protocol is serial, 4-bit commands.

```bash
# With PICkit3
pk2cmd -P PIC18F4550 -GFirmware.hex -Y
# Or with ipe
ipecmd -P18F4550 -GFirmware.hex -Y
```

**Code Guard / Config Fuses:**

PIC devices have configuration fuses stored at a dedicated address. Relevant bits:

| Bit | Effect |
|-----|--------|
| CP | Code Protection (prevents flash read) |
| DEBUG | Debug Enable |
| WREN | Table Write Enable |
| LVP | Low-Voltage Programming |

When CP is set, the ICSP interface returns 0s or garbage. A chip erase is required to clear CP, which wipes the firmware [22](https://onlinedocs.microchip.com/oxy/GUID-8E1E8B4B-5120-4A69-A289-B3B99701DAC7-en-US-2/GUID-6419787A-F424-4530-A73D-3F995E70330E.html).

**Defeating PIC code protection:**

- **UV light:** early PICs stored the CP bit in an EPROM cell. UV exposure cleared it without full erase. The "bunnie" attack on PIC 18F1320 used focused UV to clear code protection while preserving the firmware [23](https://www.bunniestudios.com/blog/hacking-the-pic-18f1320/).
- **Semiconductor decap:** physically remove the die, read flash contents with a microprobe or SEM (destructive, expensive).
- **Glitching:** power or clock glitches during configuration word fetch can skip the CP check.
- **Side-channel:** monitor power consumption during boot to infer instruction sequences.

**PIC 32-bit (MIPS32):**

| Region | Address |
|--------|---------|
| Flash | 0xBD000000 (kseg0) |
| Boot Flash | 0xBFC00000 |
| RAM | 0x80000000 |

PIC32 uses MIPS32 microAptiv core. The boot memory at 0xBFC00000 contains the bootloader. Ghidra loads PIC32 with `MIPS:LE:32:microAptiv` architecture.

---

## 6. Bootloader Reversing

Bootloaders are the first code running on the MCU. They set up clocks, configure security, validate application images, and provide update channels.

### 6.1 Bootloader Types

| Type | MCU Family | Characteristics |
|------|------------|-----------------|
| Mask ROM | STM32, ESP32 | Hardcoded, cannot modify, checked against tampering |
| Flash bootloader | AVR, PIC | Lives at a fixed flash offset, user-flashable |
| Secondary bootloader | ESP32 (bootloader.bin) | In flash, manages OTA, partition table |

### 6.2 Bootloader Analysis Techniques

1. **Locate:** find the reset vector entry point. On ARM, dereference offset 4 in the vector table. On AVR, the reset handler is at address 0x0000 (RJMP target).
2. **Dump the bootloader region:** typically the first 8-16 KB of flash.
3. **Identify the update mechanism:** look for UART/USB/SDCard read routines, flash erase/write sequences.
4. **Find authentication checks:** string searches for expected firmware signatures, hash comparisons, public key material.

```bash
# Extract bootloader (first 16KB)
dd if=flash_dump.bin of=bootloader.bin bs=1 count=16384
# Search for potential signing keys
strings bootloader.bin | grep -E '^[A-Za-z0-9+/]{20,}={0,2}$'
```

### 6.3 Bootloader Vulnerabilities

- **Lack of signature verification:** the bootloader will flash any image you provide
- **Buffer overflows:** in command parsing (variable-length fields without bounds checks)
- **Rollback attacks:** if version downgrades aren't prevented, older (vulnerable) firmware can be reinstalled
- **Debug interface left open:** if the bootloader doesn't disable SWD/JTAG, you can halt the CPU mid-boot [24](https://scriptingxss.gitbook.io/firmware-security-testing-methodology/)
- **Downgrade via unprotected OTA:** modify the version metadata to bypass integrity checks

### 6.4 Reversing a Bootloader Update Flow

The general bootloader loop (pseudocode after RE):

```
1. Check GPIO pin/boot pad for update mode
2. If normal boot:
   a. Read application vector table
   b. Validate CRC/signature
   c. Jump to application reset handler
3. If update mode:
   a. Initialize peripheral (UART/SPI/USB)
   b. Receive header: length, CRC, version
   c. Erase application region
   d. Write received data to flash
   e. Jump to application
```

Identifying the CRC check function simplifies crafting valid update payloads.

---

## 7. Firmware Encryption & Defeating Read Protection

### 7.1 Protection Mechanisms Overview

| MCU | Protection Type | Strength | Bypass Methods |
|-----|----------------|----------|----------------|
| AVR | Lock bits (LB1/LB2) | Low-Medium | HVPP, chip erase (destructive), glitch |
| STM32 | RDP Level 1/2 | Medium-High | UV (older), glitch, cold boot, decap |
| ESP32 | Flash encryption (AES-XTS) | High | eFuse glitching, CPA on ESP32-C3/C6 |
| PIC | Code Guard fuses | Medium | UV on CP cell, decap, glitch |
| PIC32 | Secure Boot + Code Guard | High | Bootloader bugs, side-channel |

### 7.2 Flash Encryption (ESP32)

ESP32's flash encryption encrypts all off-chip flash contents using AES-XTS-128. The key is stored in eFuse block BLK1 [25](https://hackmag.com/security/esp32-hack/).

**Architecture:**
- Key derivation: AES-256 encrypts the flash address to produce a per-block tweak
- Encryption unit sits between the CPU cache and the SPI flash controller
- The CPU reads encrypted data through a transparent decryption path
- External SPI flash readers see only ciphertext

**Bypass approaches:**
- **eFuse glitching:** prevent the write-once bit from being set, allowing key extraction [21]
- **Readout via CPU:** if you can execute arbitrary code (via bootloader exploit), the CPU decrypts data automatically
- **Correlation power analysis (CPA):** on ESP32-C3/C6, CPA can recover the encryption key by measuring power during AES operations [26](https://documentation.espressif.com/AR2023-007%20Security%20Advisory%20Concerning%20Bypassing%20Secure%20Boot%20and%20Flash%20Encryption%20using%20CPA%20and%20FI%20attack%20on%20ESP32-C3%20and%20ESP32-C6%20EN.html)
- **Secure boot bypass via glitch:** fault-inject the secure boot verification to jump to arbitrary shellcode, then exfiltrate the decryption key [27](https://courk.cc/breaking-flash-encryption-of-espressif-parts)

### 7.3 Side-Channel & Fault Injection

For protected MCUs where logical bypass fails, physical attacks come in:

| Attack | Equipment | Success Rate |
|--------|-----------|-------------|
| Voltage glitching | ChipWhisperer, FPGA | High (known good parameters needed) |
| EM fault injection | EM probe + amplifier | Medium (requires fine positioning) |
| Clock glitching | FPGA or clock generator | Medium (frequency/timing sweep) |
| Laser fault injection | Laser diode + microscope | High (very expensive) |
| UV erase of CP bits | UV-C LED/lamp | Medium (tedious targeting, older chips) |
| Decap + microprobing | FIB, SEM | Very high (destructive, $10k+) |

Most modern MCUs (post-2020) have countermeasures: glitch detectors, redundant comparison, encrypted buses, and die-level shields.

### 7.4 Firmware Decryption Analysis

When you successfully extract encrypted firmware, further analysis requires understanding the decryption scheme:

1. **Identify the encryption algorithm:** AES-CBC, AES-XTS, custom XOR, rolling XOR
2. **Find the key:** eFuse dump, stored in flash header, derived from serial number
3. **Determine the IV/nonce:** often derived from block address or partition offset
4. **Build a decryption tool:**

```python
# Example: simple XOR-based firmware encryption (common in budget IoT)
def decrypt_firmware(ciphertext, key):
    return bytes(c ^ key[i % len(key)] for i, c in enumerate(ciphertext))

# AES-128-CBC with known key (from reversed bootloader)
from Crypto.Cipher import AES
def decrypt_aes_cbc(ciphertext, key, iv):
    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    return cipher.decrypt(ciphertext)
```

---

## 8. Peripheral Mapping & Hardware Identification

### 8.1 Memory-Mapped I/O

MCUs control peripherals by reading/writing at fixed memory addresses. In the disassembly, writes to peripheral addresses are the key to understanding hardware interaction.

**Identify peripheral writes:**

In Ghidra or IDA, create bookmarks at every `STR` instruction whose target falls in the peripheral address range. Cross-reference these with the vendor reference manual.

```bash
# Search for peripheral writes in raw binary (ARM STR instruction encoding)
# STR Rd, [Rn, #offset] — 0xSTR + Rn encoding
arm-none-eabi-objdump -d firmware.elf | grep -E '(str|ldr).*x[0-9a-f]{8}'
```

**Common peripheral init sequence patterns:**

1. **GPIO:** write MODER, OTYPER, OSPEEDR, PUPDR registers
2. **UART:** write BRR (baud rate), CR1 (enable), CR2 (stop bits), CR3 (flow control)
3. **Timer:** write PSC (prescaler), ARR (auto-reload), CCRx (compare channels)
4. **SPI:** write CR1 (master/slave, baud, CPOL, CPHA), CR2 (DMA, interrupts)
5. **ADC:** write SMPR (sampling time), SQR (sequence register), CR2 (start conversion)

### 8.2 CMSIS-SVD for ARM (STM32, nRF, NXP)

SVD files map numeric addresses to human-readable peripheral register names.

```xml
<!-- Example SVD entry for USART1 -->
<peripheral>
  <name>USART1</name>
  <baseAddress>0x40011000</baseAddress>
  <registers>
    <register>
      <name>SR</name>       <!-- Status Register -->
      <addressOffset>0x00</addressOffset>
      <fields>
        <field>
          <name>RXNE</name>   <!-- Read Data Register Not Empty -->
          <bitOffset>5</bitOffset>
          <bitWidth>1</bitWidth>
        </field>
      </fields>
    </register>
  </registers>
</peripheral>
```

Loading SVD into Ghidra turns:
- `0x40011000` → `USART1_BASE`
- `0x40011000 + 0x00` → `USART1->SR`
- `bit 5` → `USART1_SR_RXNE`

### 8.3 Identifying Pin Functions from Firmware

By reversing the GPIO initialization code, you can determine which physical pins the firmware uses and for what purpose:

1. Find the GPIO clock enable (RCC->AHB1ENR for STM32F4)
2. Find the pin mode configuration (GPIOx->MODER)
3. Find the alternate function mapping (GPIOx->AFRL/AFRH)

This information is critical when you need to interact with the device (trigger UART, sniff SPI, inject I2C).

### 8.4 Identifying the MCU from a Dump

If the MCU markings are sanded off, determine the architecture from the firmware:

1. **Vector table analysis:** ARM Cortex-M starts with SP + Reset vector at 0x00000000 or 0x08000000
2. **Instruction patterns:** Xtensa has distinctive `L32R` + literal pools; AVR uses `RJMP`/`RCALL` heavily
3. **Known bootloader strings:** `ESP32`, `STMicroelectronics`, `Microchip`
4. **Peripheral address ranges:** decode from STR/LDR target addresses
5. **Entropy analysis:** high entropy across all bytes = encrypted; low entropy with patterns = plaintext

```bash
# Check entropy with binwalk
binwalk -E firmware.bin

# Search for known MCU identifiers
strings firmware.bin | grep -iE '(stm32|esp32|atmega|pic18|pic32)'
```

---

## 9. References

1. SwisskyRepo, "Hardware All The Things — Firmware Reverse Engineering" [link](https://github.com/swisskyrepo/HardwareAllTheThings/blob/main/docs/firmware/firmware-reverse-engineering.md)
2. Wikipedia, "Intel HEX" [link](https://en.wikipedia.org/wiki/Intel_HEX)
3. Stack Overflow, "How to convert ELF to binary file" [link](https://stackoverflow.com/questions/32005154/how-to-convert-elf-file-to-binary-file)
4. Reverse Engineering Stack Exchange, "How to dump flash memory with SPI" [link](https://reverseengineering.stackexchange.com/questions/2337/how-to-dump-flash-memory-with-spi)
5. H. Chen, "Extracting firmware images from SPI flash" [link](https://blog.haicen.me/posts/extracting-firmware-spi-flash/)
6. f3nter/HardBreak, "Extract firmware using JTAG/SWD" [link](https://github.com/f3nter/HardBreak/blob/main/hardware-hacking/interface-interaction/jtag-swd/extract-firmware-using-jtag-swd.md)
7. Penthertz Community, "Breaking STM32 readout protection: from UV light to CPU state tracing" [link](https://community.penthertz.com/t/breaking-stm32-readout-protection-from-uv-light-to-cpu-state-tracing/27)
8. Evil Mad Scientist, "AVR Basics: reading and writing flash contents" [link](https://www.evilmadscientist.com/2011/avr-basics-reading-and-writing-flash-contents/)
9. ResearchGate, "Enhanced Embedded Bootloader Exploits via Fault Injection and Binary Analysis" [link](https://www.researchgate.net/publication/347323382_Fill_your_Boots_Enhanced_Embedded_Bootloader_Exploits_via_Fault_Injection_and_Binary_Analysis)
10. Undercode Testing, "Mastering Ghidra: the ultimate guide to firmware reverse engineering" [link](https://undercodetesting.com/mastering-ghidra-the-ultimate-guide-to-firmware-reverse-engineering-for-security-researchers-video/)
11. wrongbaud, "Writing a Ghidra Loader: STM32 Edition" [link](https://wrongbaud.github.io/posts/writing-a-ghidra-loader/)
12. Attify Blog, "Analyzing bare metal firmware binaries in Ghidra" [link](https://blog.attify.com/analyzing-bare-metal-firmware-binaries-in-ghidra/)
13. O. Astrand, "Reverse engineering of ESP32 flash dumps with Ghidra or IDA Pro" [link](https://olof-astrand.medium.com/reverse-engineering-of-esp32-flash-dumps-with-ghidra-or-ida-pro-8c7c58871e68)
14. ifding, "Radare2 tutorial" [link](https://github.com/ifding/radare2-tutorial)
15. S-o-c.org, "How to use ARM toolchains for disassembly" [link](https://s-o-c.org/how-to-use-arm-toolchains-for-disassembly/)
16. ReFirmLabs, "Binwalk — firmware analysis tool" [link](https://github.com/ReFirmLabs/binwalk)
17. Reverse Engineering Stack Exchange, "Bypassing copy protection in microcontrollers using glitching" [link](https://reverseengineering.stackexchange.com/questions/1698/bypassing-copy-protection-in-microcontrollers-using-glitching)
18. TechMaker, "Reverse engineering STM32 firmware" [link](https://medium.com/techmaker/reverse-engineering-stm32-firmware-578d53e79b3)
19. Hackaday, "Need to dump a protected STM32F0x? Use your Pico!" [link](https://hackaday.com/2023/02/05/need-to-dump-a-protected-stm32f0x-use-your-pico/)
20. Espressif, "ESP-IDF Flash Encryption Guide" [link](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/flash-encryption.html)
21. LimitedResults, "Breaking the Flash Encryption Feature of Espressif Parts" [link](https://courk.cc/breaking-flash-encryption-of-espressif-parts)
22. Microchip, "Advanced Code Security Features in 8-bit PIC Family Microcontrollers" [link](https://onlinedocs.microchip.com/oxy/GUID-8E1E8B4B-5120-4A69-A289-B3B99701DAC7-en-US-2/GUID-6419787A-F424-4530-A73D-3F995E70330E.html)
23. bunnie, "Hacking the PIC 18F1320" [link](https://www.bunniestudios.com/blog/hacking-the-pic-18f1320/)
24. OWASP, "Firmware Security Testing Methodology (FSTM)" [link](https://scriptingxss.gitbook.io/firmware-security-testing-methodology/)
25. HackMag, "Extracting flash encryption and secure boot keys" [link](https://hackmag.com/security/esp32-hack/)
26. Espressif, "Security Advisory — Bypassing Secure Boot and Flash Encryption on ESP32-C3/C6" [link](https://documentation.espressif.com/AR2023-007%20Security%20Advisory%20Concerning%20Bypassing%20Secure%20Boot%20and%20Flash%20Encryption%20using%20CPA%20and%20FI%20attack%20on%20ESP32-C3%20and%20ESP32-C6%20EN.html)
27. Courk, "Breaking Flash Encryption of Espressif Parts" [link](https://courk.cc/breaking-flash-encryption-of-espressif-parts)
28. Rapid7, "Extracting Firmware from Microchip PIC Microcontrollers" [link](https://www.rapid7.com/blog/post/2019/04/30/extracting-firmware-from-microcontrollers-onboard-flash-memory-part-3-microchip-pic-microcontrollers/)
29. Rapid7, "Extracting Firmware from Atmel Microcontrollers" [link](https://www.rapid7.com/blog/post/2019/04/16/extracting-firmware-from-microcontrollers-onboard-flash-memory-part-1-atmel-microcontrollers/)
30. Espressif, "ESP Flash Download Tool — Flash Encryption + Secure Boot" [link](https://developer.espressif.com/blog/flash-encryption-and-secure-boot/)
31. O. Astrand, "Analyzing a Bluetooth ESP32 program with Ghidra in 2026" [link](https://olof-astrand.medium.com/analyzing-a-bluetooth-esp32-program-with-ghidra-in-2026-9bec59965e51)
32. Antmicro, "GhirDL — Ghidra plugin for register description files" [link](https://antmicro.com/blog/2025/09/girdl-ghidra-renode-integration)
33. Wikipedia, "ARM Cortex-M SVD" [link](https://en.wikipedia.org/wiki/System_View_Description)
34. Nozomi Networks, "Extracting Firmware from OT Devices for Vulnerability Research" [link](https://www.nozominetworks.com/blog/methods-for-extracting-firmware-from-ot-devices-for-vulnerability-research)
35. Rapid7, "Extracting Firmware from Nordic RF Microcontrollers" [link](https://www.rapid7.com/blog/post/2019/04/23/extracting-firmware-from-microcontrollers-onboard-flash-memory-part-2-nordic-rf-microcontrollers/)

---

> **See also:** [16-arm64-embedded-firmware-re.md](./16-arm64-embedded-firmware-re.md), [22-hardware-re-jtag-sidechannel.md](./22-hardware-re-jtag-sidechannel.md), [27-uefi-bios-firmware-re.md](./27-uefi-bios-firmware-re.md)
