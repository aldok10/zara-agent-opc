# Microcontroller Firmware Reverse Engineering

TL;DR: MCU firmware is bare-metal code with fixed memory maps, no ASLR, peripheral access via MMIO registers. Target architectures: AVR, STM32 (ARM Cortex-M), ESP32 (Xtensa), PIC. Ghidra + SVD files are the primary toolchain.

---

## Architecture Quick Reference

| Family | ISA | Word | Flash Base | Key Tool |
|--------|-----|------|-----------|----------|
| AVR | AVR8 | 8/16-bit | 0x0000 | avrdude, Ghidra AVR8 |
| STM32 | ARM Thumb-2 | 32-bit | 0x08000000 | OpenOCD, Ghidra ARM:LE:32:Cortex |
| ESP32 | Xtensa LX6 | 32-bit | 0x400D0000 (IROM) | esptool.py, Ghidra Xtensa |
| PIC 8-bit | PIC | 8/14/16-bit | word-addressed | pk2cmd, Ghidra PIC |
| PIC 32-bit | MIPS32 | 32-bit | 0xBD000000 | Ghidra MIPS:LE:32 |

## Firmware Image Formats

| Format | Detection | Conversion |
|--------|-----------|------------|
| Intel HEX | Starts with `:` | `objcopy -I ihex -O binary` |
| ELF | `file` shows ELF | Best source (has symbols) |
| Raw Binary | No metadata | Must determine load address |

ARM vector table signature: offset 0 = initial SP, offset 4 = reset handler (bit 0 set for Thumb).

## Flash Dumping Methods

**SPI Flash (external):**
```bash
flashrom -p ch341a_spi -r flash_dump.bin
# Always dump multiple times, compare hashes
```

**JTAG/SWD (STM32):**
```bash
openocd -f interface/stlink.cfg -f target/stm32f1x.cfg \
  -c "init; halt; flash read_bank 0 firmware.bin 0 0x10000; shutdown"
```

**ISP/ICSP (AVR):**
```bash
avrdude -p atmega328p -c usbasp -U flash:r:flash_dump.hex:i
```

**ESP32:**
```bash
esptool.py --port /dev/ttyUSB0 read_flash 0 0x400000 flash_dump.bin
```

## Read Protection Bypass

| MCU | Protection | Bypass |
|-----|-----------|--------|
| AVR | Lock bits (LB1/LB2) | HVPP, glitch |
| STM32 RDP-1 | Debug disabled | UV light, voltage glitch, cold boot |
| STM32 RDP-2 | Permanent | Decap only |
| ESP32 | Flash encryption (AES-XTS) | eFuse glitching, CPA |
| PIC | Code Guard (CP) | UV on CP cell, decap |

## STM32 Memory Map

| Region | Address | Purpose |
|--------|---------|---------|
| Flash | 0x08000000 | Code + rodata |
| SRAM | 0x20000000 | Stack, heap, .data |
| Peripherals | 0x40000000 | GPIO, USART, SPI |
| System | 0xE0000000 | NVIC, SCB, SysTick |

Vector table at 0x08000000: SP, Reset, NMI, HardFault...

## ESP32 Flash Layout

```
0x0000  -> Bootloader
0x8000  -> Partition table (magic 0x50AA)
0x9000  -> NVS
0x10000 -> Application
0x200000 -> OTA partition
```

## Ghidra Workflow

1. Load as Raw Binary, select correct processor
2. Set base address (e.g. 0x08000000 for STM32)
3. Load SVD file for peripheral register naming
4. Run auto-analysis (aggressive function finding)
5. Look for STR/LDR to peripheral address range

SVD files turn `DAT_40020000` into `USART1->SR`.

## Peripheral Identification

Common STM32F4 bases:
```
0x40020000 = GPIOA
0x40020400 = GPIOB
0x40023800 = RCC
0x40011000 = USART1
0x40010400 = SPI1
```

## Bootloader Analysis

1. Find reset vector entry point
2. Dump first 8-16KB of flash
3. Look for: UART/USB read routines, flash erase/write, signature checks
4. Common vulns: no signature verification, buffer overflows, rollback attacks

## Identifying MCU from Dump

1. Vector table analysis (ARM starts with SP + Reset)
2. Instruction patterns (Xtensa: L32R + literal pools; AVR: RJMP)
3. Known strings: "ESP32", "STMicroelectronics"
4. Peripheral address ranges from STR/LDR targets
5. Entropy: high = encrypted, low with patterns = plaintext

## Key Tools

| Tool | Purpose |
|------|---------|
| Ghidra | Primary SRE, all architectures |
| IDA + SVD plugin | Best ARM decompiler |
| binwalk | Firmware carving, entropy |
| radare2 | Scriptable, ARM/AVR support |
| objdump | Quick disassembly triage |
| strings | Find identifiers, URLs |
