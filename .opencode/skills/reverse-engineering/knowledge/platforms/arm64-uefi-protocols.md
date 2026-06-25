# UEFI Firmware RE & Common Embedded Protocols

TL;DR: UEFI firmware analysis (PI phases, FV/FFS structure, GUIDs, parsing tools),
common embedded protocols (UART, SPI, I2C, CAN bus), logic analysis workflow,
and ARM32/ARM64 quick reference card.

See also: arm64-rtos-iot.md, arm64-architecture-registers.md, arm64-instructions-calling.md, arm64-thumb-firmware-methodology.md

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
26. Embedded Security, "Embedded Communication Protocols" — https://embeddedsecurity.io/protocols
27. Kinda Technical, "Communication Protocols: UART, SPI, I2C, and CAN Bus" — https://kindatechnical.com/low-level-computing/lesson-87-communication-protocols-uart-spi-i2c-and-can-bus.html
28. Cortex-M Vector Table, Arm Developer — https://developer.arm.com/documentation/dui0471/m/handling-processor-exceptions/vector-table-for-armv6-m-and-armv7-m-profiles
29. JTAG and SWD debugging techniques — https://arshon.com/blog/jtag-and-swd-debugging-techniques/
30. Cortex-M0 Vector Table Management with a Bootloader — https://s-o-c.org/cortex-m0-vector-table-management-with-a-bootloader/
31. Quarkslab, "Nerd Life: Weeks of Firmware Teardown" — https://blog.quarkslab.com/nerd-life-weeks-firmware-teardown-we-were-right.html
32. Usedbytes, "Reverse engineering keyboard firmware with Ghidra" — https://blog.usedbytes.com/2020/03/reverse-engineering-keyboard-firmware-with-ghidra-part-3/
33. STM32 SWD Firmware Extraction via OpenOCD — https://industrialmonitordirect.com/blogs/knowledgebase/stm32-swd-firmware-extraction-via-openocd-tutorial
