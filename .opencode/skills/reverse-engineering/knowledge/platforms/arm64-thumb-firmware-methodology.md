# Thumb/Thumb-2, Firmware RE Methodology & Extraction

> **TL;DR:** Thumb/Thumb-2 encoding details, IT blocks, UAL, firmware reverse engineering
> methodology (vector tables, base addresses, VTOR, interrupt handlers, memory-mapped
> peripherals), and firmware extraction techniques (JTAG/SWD, UART, flash desoldering).

> **Cross-reference:** Siblings: `arm64-architecture-registers.md`, `arm64-instructions-calling.md`,
> `arm64-firmware-architectures-mitre.md`, `arm64-tooling-shellcode.md`, `arm64-rtos-iot-uefi.md`

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
