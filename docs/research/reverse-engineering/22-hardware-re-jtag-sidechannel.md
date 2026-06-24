# Hardware Reverse Engineering — JTAG, SWD, Logic Analysis, Side-Channel & Fault Injection

A working reference for analysts examining embedded devices, firmware, and hardware
security mechanisms during authorized testing. Covers debug interface protocols,
probing methodology, logic analysis, side-channel cryptanalysis, fault injection
techniques, PCB-level RE, and the tool ecosystem.

Primary sources: IEEE 1149.1 JTAG standard [1][2][3], ARM CoreSight/SWD documentation
[4][5][6], OpenOCD user guide [7], ChipWhisperer/NewAE documentation [8][9][10], Kocher
et al. DPA paper [11], sigrok/PulseView [12][13], STM32 reference manuals [14][15],
Bus Pirate docs [16], and various hardware security research papers [17][18][19][20].

Voltage warnings throughout: most embedded targets run at **1.8V–3.3V** I/O. Connecting
a 5V probe to a 1.8V ball grid array pin destroys the target. Always verify VREF first
with a multimeter.

---

## 1. JTAG (IEEE 1149.1)

JTAG began as a board-level test standard in the 1980s and was formalized as IEEE 1149.1
in 1990. It defines a **Test Access Port (TAP)** and a **boundary scan architecture** that
lets software control and observe IC pins without physical bed-of-nails testers [1][2].
Today it is the dominant debug interface for microcontrollers, FPGAs, SoCs, and
application processors.

### 1.1 TAP Signals

Five signals make up the JTAG port:

| Signal | Name | Direction | Description |
|--------|------|-----------|-------------|
| TCK | Test Clock | Host → Target | Clock, typically 1–50 MHz |
| TMS | Test Mode Select | Host → Target | Sampled on TCK rising edge; steers TAP state machine |
| TDI | Test Data In | Host → Target | Serial data input; sampled on TCK rising edge |
| TDO | Test Data Out | Target → Host | Serial data output; driven on TCK falling edge |
| TRST | Test Reset (optional) | Host → Target | Async reset to the TAP controller (active-low) |
| SRST | System Reset (optional) | Host → Target | Resets the target system, not just the TAP |

Voltage levels: TCK/TMS/TDI are **sampled on TCK rising edge**. TDO is driven on **TCK
falling edge** (pipelined from the previous rising edge). ARM standard connectors use
VTREF (pin 1) as a reference voltage — the debug probe samples VTREF to match its I/O
buffers to the target voltage [4][5].

TDO is typically pulled HIGH on the target. TRST is optional (many devices power up with
the TAP in reset state by default and TMS=1 for 5 TCK cycles achieves the same).

### 1.2 TAP State Machine

The TAP controller is a 16-state finite state machine. TMS at each TCK rising edge
determines the next state:

```
                         +----+
                         | 1  |--- TMS=1 always moves toward
                         +----+   Test-Logic-Reset
                             |
                      +------+------+
                      |             |
                      v             v
                 +---------+   +----------+
                 | Test-   |   | Test-    |
                 | Logic-  |   | Logic-   |
                 | Reset   |<--| Reset    |  (TMS=1)
                 +---------+   +----------+
                      |   (TMS=0)
                      v
                +-----------+
                | Run-Test/ |
                | Idle      |
                +-----------+
                /            \
        (TMS=1)              (TMS=1)
              /                \
              v                  v
       +----------+          +----------+
       | Select-  |          | Select-  |
       | DR-Scan  |          | IR-Scan  |
       +----------+          +----------+
            |                      |
            v                      v
       +---------+            +---------+
       | Capture-|            | Capture-|
       | DR      |            | IR      |
       +---------+            +---------+
            |                      |
            v                      v
       +---------+            +---------+
       | Shift-DR|            | Shift-IR|
       +---------+            +---------+
        |        \            |        \
        v         \           v         \
   +--------+   +------+  +--------+   +------+
   | Exit1- |   | Pause|  | Exit1- |   | Pause|
   | DR     |   | -DR  |  | IR     |   | -IR  |
   +--------+   +------+  +--------+   +------+
        |                      |
        v                      v
   +---------+            +---------+
   | Update- |            | Update- |
   | DR      |            | IR      |
   +---------+            +---------+
```

The key insight: **TMS=1 for 5 consecutive TCK cycles** from any state guarantees return
to Test-Logic-Reset. During **Shift-DR** and **Shift-IR**, TDO outputs the LSB of the
selected data/instruction register on each TCK falling edge, while TDI is sampled on the
rising edge to shift in the next bit [1][3].

### 1.3 Instruction Register (IR) and Data Register (DR)

The IR selects which DR is active between TDI and TDO. Standard mandatory instructions:

| Instruction | IR Code (example) | Selected DR | Purpose |
|-------------|-------------------|-------------|---------|
| BYPASS | 0xFF (all-1s) | 1-bit bypass register | Bypass the device in a JTAG chain |
| IDCODE | 0x01 | IDCODE register (32-bit) | Read device identifier |
| SAMPLE/PRELOAD | 0x02 | Boundary scan register | Snapshot pins / preload data |
| EXTEST | 0x00 | Boundary scan register | Drive output pins, read input pins |
| INTEST | 0x03 (example) | Boundary scan register | Test core logic via boundary cells |
| USERCODE | 0x08 (example) | 32-bit user code register (FPGAs) | Read programmable ID |

The **IDCODE** register is the first thing any JTAG probe reads. It is accessible
without shifting the IR because the TAP controller powers up with IDCODE selected
(mandatory per IEEE 1149.1). The 32-bit IDCODE format:

```
Bit 31:28 | Bit 27:12 | Bit 11:1 | Bit 0
  Version   Part Number   Mfr ID    LSB=1
```

Example: an STM32F407 IDCODE might return `0x2BA01477` (version=2, part=0xBA01,
manufacturer=ST=0x020, LSB=1) [1][3].

### 1.4 Boundary Scan Description Language (BSDL)

A BSDL file describes the JTAG behavior of a specific device in VHDL-like syntax. It is
required by the IEEE 1149.1 standard and published by most silicon vendors for their
JTAG-compliant parts [2][3].

Minimal BSDL structure:

```bsdl
entity STM32F407 is
  generic (PHYSICAL_PIN_MAP : string := "LQFP176");
  port (
    TCK, TMS, TDI  : in bit;
    TDO            : out bit;
    -- ...
  );
  use STD_1149_1_2001.all;
  attribute COMPONENT_CONFORMANCE of STM32F407 : entity is "STD_1149_1_2001";
  attribute PIN_MAP of STM32F407 : entity is PHYSICAL_PIN_MAP;
  -- Boundary register cell definitions
  attribute BOUNDARY_LENGTH of STM32F407 : entity is 340;
  attribute BOUNDARY_REGISTER of STM32F407 : entity is
    "0 (BC_1, *, internal, X)," &
    "1 (BC_1, *, control, 1)," &
    "2 (BC_1, PAD_1, input, X)," &
    ...
  ;
end STM32F407;
```

The **BOUNDARY_REGISTER** attribute describes every cell in order (LSB first in the shift
chain). Each entry specifies: cell number, cell type, associated pin, function
(input/output/control/internal), and safe state. BSDL files enable automated test pattern
generation (ATP G) for board-level interconnect testing [2].

### 1.5 JTAG Daisy-Chaining

Multiple JTAG devices share TCK, TMS, and optionally TRST. TDO of one device connects to
TDI of the next:

```
         +--------+     +--------+     +--------+
 TDI --->| Device |---->| Device |---->| Device |---> TDO
         |  #1    |     |  #2    |     |  #3    |
 TCK --->|        |     |        |     |        |
 TMS --->|        |     |        |     |        |
         +--------+     +--------+     +--------+
```

In a chain, BYPASS registers create a long shift register between TDI and TDO. To reach
a specific device, shift N bits to bypass N-1 devices. OpenOCD uses `jtag newtap`
declarations per device and handles chain discovery automatically via IDCODE scans [7].

### 1.6 JTAG Clock Speeds and Probing

Practical JTAG clock speeds by adapter:

| Adapter | Max TCK | Notes |
|---------|---------|-------|
| FT2232H (direct bitbang) | 15–30 MHz | Limited by USB latency |
| FT2232H (MPSSE) | 30 MHz | Hardware-assisted bit streaming |
| J-Link | 15–50 MHz | Varies by model |
| ST-Link/V2 | 4–8 MHz | Firmware-limited |
| ST-Link/V3 | 24 MHz | Improved signal integrity |
| Bus Pirate (bitbang) | 100 kHz–1 MHz | Software bitbang, slow |
| Raspberry Pi GPIO | 8–25 MHz | Direct register access |

Start probing at **low speed (100 kHz)** with short wires. Increase only when
communication is stable. Long wires + high speed = reflections and CRC errors on SWD [7].

---

## 2. Serial Wire Debug (SWD)

ARM introduced SWD as a 2-pin alternative to JTAG for power- and pin-constrained Cortex-M
devices. It is part of the ARM CoreSight debug architecture and uses a **single
bidirectional data pin (SWDIO)** and a **clock pin (SWCLK)** [4][5].

### 2.1 SWD vs JTAG Signal Comparison

| Feature | JTAG | SWD |
|---------|------|-----|
| Minimum pins | 4 (TCK, TMS, TDI, TDO) | 2 (SWCLK, SWDIO) |
| Bidirectional data | No (separate TDI/TDO) | Yes (SWDIO) |
| Daisy-chain | Yes | No (point-to-point) |
| Max throughput | Higher (separate data paths) | Lower (half-duplex) |
| Debug features | Full (boundary scan, etc.) | Debug only (no boundary scan) |
| Protocol layer | State machine driven | Packet-based (request/response) |
| Still possible | IR and DR operations | AP/DP register access |

SWCLK is the shared TCK signal on Cortex-M debug connectors (pin 9 on the 10-pin Cortex
header). SWDIO is shared with TMS. The connector pinout is designed so SWD and JTAG share
the same physical footprint — known as **SWJ-DP** (Serial Wire/JTAG Debug Port) [5][6].

### 2.2 ARM 10-Pin Cortex Debug Connector (Common)

```
  +-------------------+
  | 1 VREF    | 2 SWDIO/TMS |
  | 3 GND     | 4 SWCLK/TCK |
  | 5 GND     | 6 TDO/SWO   |
  | 7 KEY (NC)| 8 TDI       |
  | 9 GND     | 10 nRESET   |
  +-------------------+
```

VTREF (pin 1) is the target voltage reference — the debug probe reads this to set its
I/O buffer voltage. ARM recommends 100kΩ pull-up/pull-down resistors on SWDIO, SWCLK,
and TDO [4][5]. The key pin (7) is removed to prevent reverse insertion.

### 2.3 SWD Protocol

SWD is a packet-based serial protocol with three phases per transaction:

**1. Request Phase (8 bits, host drives SWDIO):**

```
Bit 7:1    | Bit 1 | Bit 0
 APnDP     | RnW   | Start
```

Technical details: bit 0 is always 1 (Start), bit 1 is RnW (1=read, 0=write),
bit 2 is APnDP (0=Debug Port, 1=Access Port). Bits 3:5 encode the register address
(A[3:1]). Bit 6 is reserved. Bit 7 is parity over bits 1:6.

**2. Acknowledge Phase (3 bits, target drives SWDIO):**

| Response | Meaning |
|----------|---------|
| OK (001) | Transfer succeeded |
| WAIT (010) | Target busy, retry |
| FAULT (100) | Error condition |

SWD uses **3-cycle turnaround** (no drives) between request/ack and ack/data phases.

**3. Data Phase (33 bits):**
- **Write**: Host drives 32 data bits + 1 parity bit
- **Read**: Target drives 32 data bits + 1 parity bit

The parity bit covers the 32 data bits (odd parity). If parity mismatches, the
transaction must be retried.

After each transaction, a **4-cycle idle period** (SWDIO driven low for 4 SWCLK cycles)
must elapse before the next request [4][6].

### 2.4 DP and AP Register Addressing

The Debug Port (DP) has a fixed register map:

| Address (A[3:1]) | Register | Description |
|-------------------|----------|-------------|
| 000 | DP_IDCODE | Read-only: debug port ID |
| 001 | DP_CTRL/STAT | Control/status (power-up req, transaction count) |
| 010 | DP_RESEND | Read-only: re-read last AP response |
| 011 | DP_SELECT | Selects current AP and bank |
| 100 | DP_RDBUFF | Read-only: buffered AP read, used for pipelining |
| 101 | DP_TARGETID | Target device ID (discovery) |
| 110 | DP_DLPID | Debug port low-power ID |
| 111 | DP_EVENT | Event register |

The Access Port (AP) is selected via DP_SELECT. Cortex-M devices typically have a
MEM-AP (Memory Access Port) at AP index 0. The MEM-AP provides memory-mapped access to
the entire system address space including flash, SRAM, and peripheral registers [6][14].

Transaction pipeline trick: issue a read request to AP, then issue a DP_RDBUFF read to
retrieve the result while the AP read completes. This eliminates the WAIT penalty.

### 2.5 SWJ-DP Switching

On a Cortex-M SWJ-DP, the debug port powers up in JTAG mode. To enter SWD mode:

1. Send 50+ TCK cycles with TMS=1 (get into Test-Logic-Reset)
2. Send the **SWJ-DP switch sequence** on TMS/SWDIO:
   `0xE79E 0xFFFF` (a 16-bit sequence encoding the magic 0xE79E followed by 16 ones)
3. The port switches to SWD mode and sends the SWD IDCODE request

If the switch sequence is sent again, the port stays in SWD mode (idempotent). To return
to JTAG, send the JTAG switch sequence instead [5][7].

---

## 3. Debugging Hardware with OpenOCD

OpenOCD (Open On-Chip Debugger) is the de facto open-source debug server. It handles JTAG
and SWD communication, flash programming, breakpoints, and provides a GDB server on
port 3333 [7].

### 3.1 Configuration Files

OpenOCD uses a layered config system in Tcl:

```
openocd.cfg (user's top-level)
  |
  +-- interface/<adapter>.cfg  (e.g. stlink.cfg, jlink.cfg)
  +-- target/<cpu>.cfg         (e.g. stm32f4x.cfg)
  +-- board/<board>.cfg        (combines interface + target)
```

A minimal board config for an STM32F4 Discovery:

```tcl
# board/stm32f4discovery.cfg
source [find interface/stlink-v2-1.cfg]
source [find target/stm32f4x.cfg]

adapter speed 4000   ;# 4 MHz TCK/SWCLK
reset_config srst_nogate
```

### 3.2 TAP Declaration for Daisy Chains

```tcl
# Declare two devices on the same JTAG chain
jtag newtap stm32 tap -irlen 4 -expected-id 0x2BA01477
jtag newtap fpga tap -irlen 8 -expected-id 0x100A00FF

# Configure the target CPU
target create stm32.cpu cortex_m -endian little \
  -chain-position stm32.tap
```

The `-expected-id` is optional but recommended — OpenOCD will error on mismatch,
preventing accidental flash corruption on the wrong device [7].

### 3.3 Flash Programming

```bash
# Write a binary to flash at address 0x08000000
openocd -f board/stm32f4discovery.cfg -c \
  "program firmware.bin 0x08000000 verify reset exit"

# Erase entire flash
openocd -f board/stm32f4discovery.cfg -c \
  "init; stm32f4x mass_erase 0; exit"

# Read flash to file
openocd -f board/stm32f4discovery.cfg -c \
  "init; dump_image flash_dump.bin 0x08000000 0x100000; exit"
```

OpenOCD supports auto-detection of flash geometry for most targets via the CFI (Common
Flash Interface) or target-specific flash drivers. The `program` command performs erase,
write, and optional verify in one step [7].

### 3.4 GDB Integration

```bash
# Start OpenOCD in one terminal
openocd -f board/stm32f4discovery.cfg &

# Connect GDB in another
arm-none-eabi-gdb firmware.elf
(gdb) target remote :3333
(gdb) monitor reset halt
(gdb) load
(gdb) continue
```

OpenOCD forwards GDB's "monitor" commands as OpenOCD commands. Useful ones:

```gdb
monitor reset halt          # Halt at reset vector
monitor reset init          # Run init scripts then halt
monitor flash write_image firmware.bin 0x08000000
monitor stm32f1x unlock 0  # Disable RDP on STM32F1
monitor reg                 # Show all core registers
```

### 3.5 Reset Handling

OpenOCD distinguishes several reset types:

| Method | Signal | Behavior |
|--------|--------|----------|
| `reset halt` | SRST + TAP reset | Pulses SRST, reconnects, halts at reset vector |
| `reset init` | SRST + TAP reset | Same as halt but runs board init scripts |
| `reset run` | SRST only | Pulses SRST, lets target run freely |
| `sysresetreq` | AIRCR.SYSRESETREQ (Cortex-M) | Software reset via memory-mapped register |

Correct reset config is critical. Many boards have SRST gated through a level shifter
that also gates the JTAG signals. Setting `reset_config srst_nogate` tells OpenOCD to
use only the TAP reset sequence (TMS=1 x5) instead of toggling SRST [7].

### 3.6 Speed Tuning

```tcl
# Try increasing speed, fall back on failure
adapter speed 1000  # Start at 1 MHz
# ... after successful communication:
adapter speed 8000  # 8 MHz if signals are clean
```

For JTAG, maximum frequency is bounded by the round-trip delay: `f_max <= 1/(2 * t_pd)`
where `t_pd` is the propagation delay on TDO. For SWD, the bidirectional handshake is
more tolerant but TDO turnaround timing still matters [7].

---

## 4. Logic Analysis for Reverse Engineering

Logic analyzers capture **digital** signal timing and decode higher-level protocols. For
hardware RE, they are the primary tool for understanding unknown bus traffic [12][13].

### 4.1 Sampling Rate Tradeoffs

| Sample Rate | Max resolvable signal | Risk |
|-------------|----------------------|------|
| 1 MSa/s | ~500 kHz (SPI ~500 kbps) | Misses fast edges |
| 24 MSa/s | ~12 MHz | Good for 4 MHz SPI, most UART |
| 100 MSa/s | ~50 MHz | Covers high-speed SPI, parallel buses |
| 500 MSa/s | ~250 MHz | Requires expensive hardware |

Nyquist rule: sample at **4–5x** the signal clock rate to reliably reconstruct edges.
At 2x (Nyquist minimum), edge jitter exceeds one bit period [12].

For UART at 115200 baud: any logic analyzer above 1 MSa/s works.
For SPI at 24 MHz: need at least 100 MSa/s to see individual bit cells.

### 4.2 Triggering

Good triggering is the difference between hours of scrolling and seconds of analysis:

- **Rising/falling edge**: simple, catches bus transitions
- **Pulse width**: trigger on glitches shorter than N ns
- **Pattern**: trigger on a specific bit combination across channels
- **Protocol-level**: trigger on I2C address match, SPI CS assert, UART byte
- **Sequential**: trigger A, then trigger B, then capture

Protocol-level triggering (available on Saleae Logic Pro, DSLogic, and PulseView via
decoder filters) is the most powerful for RE — e.g., "capture when I2C address 0x50
is read" [13].

### 4.3 Protocol Decoding with Sigrok/PulseView

Sigrok is the open-source signal analysis software suite. PulseView is its GUI. It
supports 130+ protocol decoders written in Python [12][13].

```bash
# Capture with a supported logic analyzer
sigrok-cli --driver fx2lafw --config samplerate=24M \
  --channels D0=RX,D1=TX --output-format vcd \
  --frames 1000000 --continuous > capture.vcd

# Decode UART in real time
sigrok-cli --driver fx2lafw --config samplerate=24M \
  --channels D0=RX --protocol-decoders uart:baudrate=115200 \
  --channels D0=RX

# List available decoders
sigrok-cli --list-decoders
```

Common protocol decoders for hardware RE:

| Protocol | Decoder Name | Channels Needed | Typical Pins |
|----------|-------------|-----------------|--------------|
| UART | `uart` | 1–2 | TX, RX |
| SPI | `spi` | 3–4 | CLK, MOSI, MISO, CS |
| I2C | `i2c` | 2 | SCL, SDA |
| 1-Wire | `onewire` | 1 | DQ |
| CAN | `can` | 1 | CAN_H (via transceiver) |
| SDIO | `sdcard_spi` | 4–6 | CLK, CMD, DAT0-3 |
| JTAG | `jtag` | 4 | TCK, TMS, TDI, TDO |
| SWD | `swd` | 2 | SWCLK, SWDIO |
| Manchester | `manchester` | 1 | Encoded signal |
| IR remote | `ir_nec` | 1 | IR receiver output |

### 4.4 Practical Workflow

1. **Identify candidates**: probe test points, vias, and component pads with a multimeter
   for continuity and voltage
2. **Connect channels**: minimum 4 channels for SPI, 2 for UART/I2C. Ground reference is
   mandatory
3. **Set sampling rate**: 4x the expected protocol clock. When unknown, start at max rate
4. **Capture and decode**: let the decoder annotate the waveform. Verify a few decoded
   bytes against the raw signal
5. **Refine trigger**: add a pattern trigger once you understand the normal traffic
6. **Export**: save decoded output as CSV, VCD, or annotated screenshots

### 4.5 Hardware Options

| Device | Max Rate | Channels | Cost | Open Source |
|--------|----------|----------|------|-------------|
| Saleae Logic 8 | 100 MSa/s | 8 | $399 | No (closed binary) |
| Saleae Logic Pro 16 | 500 MSa/s | 16 | $1499 | No |
| DSLogic Plus | 400 MSa/s | 16 | $299 | Yes (partially) |
| FX2-based (CY7C68013A) | 24 MSa/s | 8 | $10–15 | Yes (sigrok) |
| USBee DX clones | 24 MSa/s | 8 | $8–20 | Yes (sigrok) |
| Bus Pirate v5/v6 | 10 MSa/s | 4 | ~$65 | Yes |

The cheap FX2-based "24 MHz 8-channel" analyzers (sold as Saleae clones) are sufficient
for most embedded RE tasks under 12 MHz and are fully supported by sigrok [12].

---

## 5. UART/Serial Reverse Engineering

UART (Universal Asynchronous Receiver-Transmitter) is the most common debug interface
after JTAG/SWD. It requires only TX and RX (and GND) and often exposes bootloaders,
debug shells, or manufacturing test terminals [16].

### 5.1 Finding UART Pads on PCBs

UART pads are often labeled on the PCB silkscreen as `TX`, `RX`, `TXD`, `RXD`, `UART`,
`DBG`, `DEBUG`, `CONSOLE`, or `SERIAL`. When unlabeled:

1. **Look for 4-hole groupings**: GND, VCC, TX, RX is a common layout
2. **Check for series resistors** (typically 0–100Ω) near the SoC — these are often
   UART lines with series termination
3. **Probe with a logic analyzer**: connect all candidate pads and trigger on any
   activity post-power-on. TX typically shows periodic bursts during boot
4. **Continuity check to SoC pins**: a pad connected to a pin labeled `PA9`/`PA10`
   (common STM32 UART) or `UART0_TX` in a datasheet is a strong signal
5. **Voltage check**: TX idles HIGH. With a multimeter, a pin floating near VDD (3.3V)
   or VDD/2 (1.8V in some SoCs) is likely TX or RX

### 5.2 Identifying TX vs RX

- **TX** shows activity on power-up/reboot without any external connection
- **RX** shows no activity unless something is transmitting to it
- Logic analyzer on both: the pin with boot-time data is TX
- Multimeter in DC mode: TX toggles between VCC and 0V during boot (average voltage
  will be ~VCC/2 at high baud rates); RX is steady at VCC (idle HIGH) until probed

### 5.3 Baud Rate Detection

```python
# Measure the width of the shortest pulse on TX
# For standard UART: bit_time = shortest_pulse_width (start bit = 1 bit time)
baud = int(1 / bit_time)
# Match to standard rates: 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600
```

Sigrok's UART decoder can auto-detect baud rate. Saleae Logic also has auto-baud.
Failing that, the oscilloscope cursor measurement on the start bit width gives the exact
bit period: `baud = 1 / t_bit`.

Common baud rates in embedded devices: **115200** (de facto standard), **57600**,
**38400**, **9600** (legacy), **921600** (high-speed bootloaders).

### 5.4 Voltage Levels

| Standard | Logic LOW | Logic HIGH | Notes |
|----------|-----------|------------|-------|
| 3.3V CMOS | 0–0.8V | 2.0–3.6V | Most common in modern embedded |
| 1.8V CMOS | 0–0.4V | 1.2–2.0V | Low-power SoCs (ESP32-S3, nRF52) |
| RS-232 | +3 to +15V | -3 to -15V | Legacy serial (PC COM port), needs MAX232 |
| TTL | 0–0.8V | 2.0–5.0V | Older 5V systems |

Connecting a 3.3V UART adapter to a 1.8V UART will damage the 1.8V device. Use a level
shifter or a probe like the Shikra/Tigard that auto-levels via VTREF sensing.

### 5.5 Connecting and Interacting

```bash
# Using screen (macOS/Linux) — 115200 baud, 8N1
screen /dev/ttyUSB0 115200

# Using picocom
picocom -b 115200 /dev/ttyUSB0

# Using minicom
minicom -D /dev/ttyUSB0 -b 115200

# Send a break signal (useful for bootloader interrupts)
# In screen: Ctrl+A → Ctrl+F → sendbreak
```

Bootloader interaction patterns:

- **U-Boot**: press any key during "Hit any key to stop autoboot" prompt
- **ARM BootROM**: connect TX to RX (loopback) or send `0x00` repeatedly
- **Manufacturing terminals**: often require a specific magic sequence (e.g.
  `<Ctrl+C>` or `<BREAK>` then a password)
- **ODM bootloaders**: some use baud negotiation — send `0x55` (no parity) to
  trigger auto-baud

### 5.6 JTAG/SWD over UART

Some devices expose debug interfaces over a UART-like protocol. For example:

- **TI CC253x** bootloader: UART-based firmware update at 115200
- **ESP32** serial bootloader: UART at 115200, sends SLIP-encapsulated frames
- **Qualcomm EDL (Emergency Download)**: UART at specific baud (varies, typically
  115200 or 921600) with proprietary framing

These are not JTAG/SWD but provide equivalent access for firmware extraction.

---

## 6. SPI Flash Dumping

Extracting firmware from SPI flash is one of the most direct paths to understanding an
embedded device's software [17][18].

### 6.1 Identifying SPI Flash Chips

Common markings on SOIC-8 SPI flash chips:

| Part Number | Size | Voltage | Common In |
|-------------|------|---------|-----------|
| Winbond 25Q32 | 4 MB | 2.7–3.6V | Routers, IoT |
| Winbond 25Q64 | 8 MB | 2.7–3.6V | Consumer electronics |
| Winbond 25Q128 | 16 MB | 2.7–3.6V | Higher-end routers, APs |
| Macronix MX25L256 | 32 MB | 2.7–3.6V | NAS devices |
| Spansion S25FL512 | 64 MB | 2.7–3.6V | Industrial |
| Micron N25Q series | varies | 1.8V or 3.3V | Mobile, low-power |
| GD25Q series | varies | 2.7–3.6V | Budget devices |

Look for an 8-pin SOIC package near the main SoC, sometimes labeled "FLASH", "SPI", or
"U3/U4/U5". The pinout (top view, dot = pin 1):

```
    +------+
CS  -|1   8|- VCC
MISO-|2   7|- HOLD/WP
WP  -|3   6|- CLK
GND -|4   5|- MOSI
    +------+
```

### 6.2 SOIC-8 Clips vs Desoldering

| Method | Risk | Effort | When to use |
|--------|------|--------|-------------|
| SOIC-8 test clip | Low (spring-loaded) | Low | Chip accessible, power off target |
| Desolder + read | Medium (thermal damage) | Medium | Vias hidden under chip, clip doesn't fit |
| In-circuit (via SPI pins) | Low | Low | Chip in-circuit, target can be powered externally |
| Hot air removal | High (component shift) | High | QFN/BGA flash, no clip option |

The SOIC-8 clip (Pomona 5250 or generic) is the first tool to try. It clips over the
chip without removing it. If the target is still powered, the clip may back-power the
chip and cause bus contention — always **disconnect target power** when using a clip.

### 6.3 Using flashrom

```bash
# Detect chip
flashrom -p ch341a_spi -V

# Read entire flash to file (may take minutes for 16MB)
flashrom -p ch341a_spi -r firmware.bin

# Read with progress indicator
flashrom -p ch341a_spi -r firmware.bin --progress

# Verify against known-good image
flashrom -p ch341a_spi -v known_good.bin

# List supported programmers
flashrom --list-supported
```

Flashrom supports many programmers: `ch341a_spi`, `ft2232_spi`, `buspirate_spi`,
`pickit2_spi`, `raspberry_hw_spi`, and `linux_spi` (via /dev/spidev) [18].

### 6.4 CH341A Programmer

The CH341A is a $3 USB-to-serial chip repurposed for SPI flash. It has limitations:

- **3.3V only** — will damage 1.8V flash chips unless a level shifter is used
- **Max speed ~4 MHz** — adequate for 16MB reads (~30 seconds)
- **Pin 3 (WP#) and pin 7 (HOLD#)** must be pulled HIGH for writes. Many cheap
  CH341A boards omit pull-up resistors — add 10kΩ if writes fail
- The "black CH341A" (with 3.3V regulator) is preferred over the "green CH341A" (5V
  only with a 3.3V output pin that can't source enough current)

For 1.8V chips: use the CH341A with a level shifter (e.g., TXS0108E breakout), or
switch to a Bus Pirate v5/v6 with its configurable I/O voltage [16][17].

### 6.5 Bus Pirate SPI Flashing

```bash
# Connect Bus Pirate to SPI flash
# In the Bus Pirate terminal:
# 1. Enter SPI mode: 'm' → '4' → select speed
# 2. Enable power supplies: 'W'
# 3. Set CS: '[' to enable, ']' to disable
# 4. Use flashrom:
flashrom -p buspirate_spi:dev=/dev/ttyUSB0 -r firmware.bin
```

The Bus Pirate also supports 1.8V operation on v5/v6 (programmable I/O voltage) [16].

### 6.6 Dealing with Voltage Mismatches

| Target Voltage | Safe Programmers | Level Shifter Required? |
|---------------|-----------------|------------------------|
| 5.0V | Bus Pirate (5V tolerant), CH341A (3.3V pins tolerate 5V) | No |
| 3.3V | CH341A, Bus Pirate, FT2232H | No |
| 2.5V | Bus Pirate v5/v6, FT2232H (adjustable) | Yes for CH341A |
| 1.8V | Bus Pirate v5/v6, FT2232H (1.8V mode) | Yes for CH341A |
| 1.2V | Dedicated low-voltage programmer only | Yes |

Using flashrom with `--verbose` will show detected chip voltage. If the chip is
unexpectedly unresponsive at 3.3V but responds at 1.8V, it is a 1.8V chip.

---

## 7. Side-Channel Attacks

Side-channel attacks exploit **physical leakage** from a device during computation.
Power consumption, electromagnetic radiation, timing, and acoustic emissions all carry
information about the data being processed [9][11].

### 7.1 Simple Power Analysis (SPA)

SPA interprets power traces **visually**. Different instructions consume different
amounts of power. A single power trace can reveal:

- **Conditional branches**: taken vs not-taken paths have different power profiles
- **Operation type**: multiplication vs addition (visible as wider power spikes)
- **Loop iterations**: repeated power patterns reveal loop bounds
- **DES/3DES rounds**: 16 distinct round structures visible in the trace

SPA can break a DES implementation with **a single trace** if the key schedule
instructions are identifiable and key bits control which instructions execute [11].

Common SPA countermeasure: **constant-time code** (same instruction sequence regardless
of data values). Recognizing constant-time from standard code via SPA is how evaluators
identify masked implementations.

### 7.2 Differential Power Analysis (DPA)

Kocher, Jaffe, and Jun introduced DPA in 1999 [11]. It uses **statistical analysis** of
many traces to recover secret key material even when individual traces appear noise.

**The DPA attack on AES (simplified):**

1. Capture N power traces `T_i[1..k]` for N different plaintexts (or ciphertexts)
2. For each key byte hypothesis `h` (0–255), predict an intermediate value `v` that
   depends on both the known plaintext and `h` (e.g., the first SubBytes output)
3. Divide traces into two sets based on `v`'s predicted Hamming weight (or LSB):
   - Set 0: traces where the predicted bit = 0
   - Set 1: traces where the predicted bit = 1
4. Compute the differential trace: `D_h[t] = mean(Set 1[t]) - mean(Set 0[t])`
5. The correct key byte produces a clear **spike** in `D_h` at the time the target
   intermediate value is computed; wrong key bytes produce noise

The Hamming weight model (power is proportional to the number of 1-bits being switched)
is the most effective for CMOS devices. The Hamming distance model (power is proportional
to the number of bit transitions) works better for some architectures [9][11].

### 7.3 Correlation Power Analysis (CPA)

CPA improves on DPA by using **Pearson correlation** between the power model and each
sample point, rather than a binary partition:

```python
import numpy as np

def cpa_attack(traces, plaintexts, key_byte_guess):
    best_corr = 0
    best_key = 0
    for key in range(256):
        # Predict Hamming weight of S-box output for each trace
        pred = [hamming_weight(aes_sbox[p ^ key]) for p in plaintexts]
        # Correlate with each sample point
        for sample in range(traces.shape[1]):
            corr = np.corrcoef(pred, traces[:, sample])[0, 1]
            if abs(corr) > abs(best_corr):
                best_corr = corr
                best_key = key
    return best_key, best_corr
```

CPA typically requires **1/3 to 1/10 fewer traces** than DPA for equivalent success
rates because the correlation metric captures more information than a binary partition
[9].

Typical trace counts for an AES-128 attack:

| Target | Traces (DPA) | Traces (CPA) | Notes |
|--------|-------------|-------------|-------|
| Software AES (8-bit MCU) | 50–200 | 10–50 | Weak leakage, very visible |
| Hardware AES (ASIC) | 1K–10K | 500–5K | Lower SNR, requires averaging |
| Masked AES (software) | 10K–100K | 5K–50K | Random masks reduce correlation |
| Masked AES (hardware) | 100K–1M+ | 50K–500K | Glitches in power, harder to filter |

### 7.4 Electromagnetic (EM) Emission Analysis

EM analysis measures the **magnetic field** near the chip die instead of the supply
current. Advantages:

- **Spatial resolution**: an EM probe (100μm tip) can target individual voltage
  regulator domains or clock trees on the die
- **Localized measurement**: captures signals that are invisible in total current
  (e.g., a single pipeline stage)
- **No galvanic contact**: measurement is non-invasive, no power supply modification

Disadvantages: requires precise probe positioning (micromanipulator), probe-to-die
distance directly affects SNR, and decapping is often needed for high-resolution EM
mapping [9].

The ChipWhisperer CW308 has an EM probe attachment and is cleared for EM measurements
down to ~50μm resolution with appropriate positioning.

### 7.5 Template Attacks

Template attacks are the most powerful form of profiling side-channel analysis:

1. **Profiling phase**: use a fully controlled device (same model, known key) to build
   a multivariate Gaussian noise model for each key-dependent operation
2. **Attack phase**: use the templates to classify traces from the target device

Template attacks can recover AES keys with **1–10 traces** if the profiling device
matches the target electrically (same wafer batch, same supply voltage, same
temperature). This is the strongest known side-channel attack methodology [9].

### 7.6 Timing Analysis

Timing attacks exploit **data-dependent execution time**. Classic examples:

- **RSA**: modular exponentiation time is proportional to the number of 1 bits in the
  exponent (square-and-multiply)
- **AES**: T-tables accessed with key-dependent indices cause cache hits/misses
  (timing varies ~10–50 ns per access)
- **Password comparison**: `strcmp` returns early on first mismatch byte

Remote timing attacks over a network can recover RSA private keys with thousands of
measurements and statistical noise reduction.

### 7.7 ChipWhisperer Platform

The ChipWhisperer (NewAE Technology) is the leading open-source side-channel platform [8][9][10]:

| Board | Type | Key Features |
|-------|------|-------------|
| CW1173 (ChipWhisperer-Lite) | Scope + target | 10-bit ADC, 105 MSa/s, integrated glitcher |
| CW308 UFO | Target board | Interchangeable target modules (STM32F3, AVR, XMEGA, etc.) |
| CW1173 (ChipWhisperer-CW308) | Scope only | For use with UFO target board |
| CW1200 (ChipWhisperer-Pro) | Scope | 10-bit ADC, programmable sampling clock |
| CW308T-STM32F | Target module | STM32F303, Cortex-M4 |
| CW308T-ATMEGA328P | Target module | Arduino-compatible AVR |
| CW501 (ChipWhisperer-Nano) | All-in-one | Low-cost starter, 10 MSa/s |

Python API example:

```python
import chipwhisperer as cw

scope = cw.scope()                     # Initialize scope
target = cw.target(scope)              # Initialize target connection

scope.gain.gain = 30                   # Set amplifier gain (dB)
scope.adc.samples = 5000               # Samples per capture
scope.adc.offset = 1000                # Offset after trigger

for i in range(100):
    key, pt = random_key_plaintext()
    target.set_key(key)
    trace = scope.capture()
    scope.arm()
    target.simplesend(pt)
    trace = scope.capture()
    # trace is a numpy array of ADC samples
    save_trace(trace, key, pt)

scope.dispose()
target.dispose()
```

Critical: the **trigger pin** on the target must be connected to the scope. The
trigger fires when the target starts the crypto operation (usually at the very
beginning of encryption). Mis-triggering by even a few cycles shifts the trace and
destroys the correlation [9][10].

---

## 8. Fault Injection

Fault injection (FI) deliberately disrupts normal operation to alter program behavior:
skip instructions, corrupt data, bypass authentication, or read protected memory [22][23].

### 8.1 Voltage Glitching

Dropping the supply voltage briefly below the minimum operating level causes
**timing violations** — flip-flops sample before their inputs have settled. A carefully
timed glitch can:

- Skip a security check instruction (e.g., `if (password_ok) { unlock(); }`)
- Modify the program counter (jump to arbitrary address)
- Corrupt a loop counter (extract more data than permitted)
- Bypass read-out protection (RDP on STM32) [15][22]

Glitch parameters:

| Parameter | Typical Range | Effect |
|-----------|--------------|--------|
| Glitch voltage | 0.3–1.8V below VDD | Deeper glitch = more faults |
| Glitch width | 10–200 ns | Must be shorter than one clock cycle |
| Trigger offset | 0–1000 clock cycles from start | When in the execution to glitch |
| Number of glitches | 1–10 in tight window | Multiple attempts per reset |

Voltage glitching waveform (conceptual):

```
Normal VDD:   ████████████████████████████████████████
Glitch:       ████████████████████     ████████████████
                                    ^^^
                              glitch: 0.8V, 50ns
```

### 8.2 Clock Glitching

A clock glitch injects an **extra clock edge** (or shortens a clock cycle) so the
processor samples the wrong data. This can skip an instruction by causing the timing
sampling window to miss the valid data.

Clock glitching is effective on targets where the clock source is external (crystal,
external oscillator). Targets with internal RC oscillators are harder to glitch because
the clock domain is isolated.

### 8.3 Electromagnetic Fault Injection (EMFI)

EMFI generates a strong, localized magnetic pulse that induces **eddy currents** in
the on-chip metal layers, causing temporary logic errors. The ChipSHOUTER (NewAE)
is a dedicated EMFI tool [22][23].

EMFI characteristics:

| Parameter | ChipSHOUTER | DIY PicoEMP |
|-----------|-------------|-------------|
| Rise time | ~2 ns | ~5 ns |
| Peak field | ~500 V/m at probe tip | ~100 V/m |
| Coil diameter | 1–5 mm | 2–10 mm |
| Positioning accuracy | ~0.5 mm (micron-precision arm) | ~1 mm |
| Cost | ~$1500 | ~$100 |

EMFI has a key advantage over voltage glitching: because the pulse is localized, you
can target a specific processing core or memory block on a multi-core SoC. The
disadvantage is the difficulty of precise probe-to-die positioning.

### 8.4 Sample Attack: Bypassing STM32 Read-Out Protection

STM32 microcontrollers implement RDP (Read-Out Protection) at three levels [14][15]:

| Level | Protection | Bypass |
|-------|-----------|--------|
| 0 | No protection | None needed |
| 1 | Flash not readable via debug (JTAG/SWD disabled unless an unlock sequence succeeds) | Voltage glitch during boot ROM read of option bytes |
| 2 | Permanently locked (RDP level cannot be downgraded) | Requires decapping + direct flash cell read |

The RDP level is checked by a boot ROM routine before enabling the debug port.
Glitching the voltage during a specific clock cycle in the option-byte check can
cause the read to return 0x00 instead of 0xBB (RDP-1 sentinel), bypassing the
protection [15][22].

One published approach:

```python
# Pseudocode for RDP glitch attack
for glitch_offset in range(100, 500, 5):
    for glitch_width in range(10, 100, 5):
        configure_glitch(offset=glitch_offset, width=glitch_width)
        power_cycle_target()
        attempt_swd_connect()
        if swd_idcode_read():
            print(f"Bypassed at offset={glitch_offset}, width={glitch_width}")
            dump_flash()
            break
```

Success rates vary from 1 in 10 to 1 in 1000 glitch attempts depending on the target
die, voltage, temperature, and glitch precision [15][22].

### 8.5 Laser Fault Injection

Laser FI uses a pulsed laser focused on a specific transistor or flip-flop on the die.
It requires **decapping the chip** (removing the epoxy) and an optical table with
micrometer stage control. The spatial resolution can be sub-micron — capable of
targeting a single SRAM cell or pipeline register.

Laser FI is the most precise and most expensive FI method (industrial setups cost
$50K–$500K). It is primarily used in certified security evaluation labs.

### 8.6 Rowhammer

Rowhammer is a **software-only** fault injection technique specific to DRAM. Repeatedly
reading a DRAM row causes charge leakage from adjacent rows, flipping bits without
physical access to the device [20].

Practical applications:

- Privilege escalation (bit flip in page table entry)
- Bypassing kernel ASLR (flip address bit in a pointer)
- Jailbreaking LLMs (flip bits in model weight) [20]

Rowhammer is relevant here because it demonstrates that fault injection is not always
a physical-contact technique — it can be induced remotely through memory access
patterns.

---

## 9. PCB Reverse Engineering

PCB RE reconstructs the schematic, netlist, and layout from a physical board. Useful
for understanding proprietary hardware, extracting firmware pinouts, and identifying
test points [24][25].

### 9.1 Multilayer PCB Trace Tracing

Modern PCBs have 4-16 layers. Outer layers are visible; inner layers are embedded
between prepreg and core material. X-ray CT scanning creates a 3D volume from which
individual layers can be extracted.

Process:

1. **X-ray CT scan**: 5–50μm voxel resolution. A 10cm × 10cm board at 10μm resolution
   produces 20+ GB of data
2. **Layer extraction**: software segments copper traces from substrate based on
   density differences
3. **Netlist extraction**: trace connectivity is reconstructed. Average board with
   1000 nets and ~4000 vias takes 4–8 hours of compute
4. **Schematic recreation**: the hardest step — grouping nets into components and
   functional blocks

Recent work [24] uses ML-based segmentation (U-Net) to automate copper/signal
classification. Accuracy exceeds 95% for boards with 4–8 layers.

### 9.2 Netlist Extraction

A netlist describes all electrical connections. Physical extraction steps:

1. **Layer alignment**: register X-ray images for each layer (vias are fiducials)
2. **Copper segmentation**: threshold-based or ML-based binarization
3. **Connectivity analysis**: traces on same layer that connect at junctions are one net
4. **Via matching**: vias through multiple layers connect nets across layers
5. **Component identification**: match pad patterns to known package footprints
6. **Part identification**: cross-reference markings with distributors (DigiKey, Mouser)

Output: a SPICE or EDIF netlist that can be opened in EDA tools.

### 9.3 Decapping and Die Analysis

Decapping removes the IC package to expose the silicon die for visual analysis [26].

**Chemical decapping:**
- **Ceramic packages**: pry open mechanical
- **Epoxy packages**: hot nitric acid (≥ 90°C) dissolves the epoxy; the die and
  bond wires survive
- **BGA/LGA**: grind from the bottom to expose die, then polish
- Safety: nitric acid fumes are dangerous. Use a fume hood and acid-resistant PPE

**Mechanical decapping:**
- **Dremel with diamond burr**: grind away the epoxy until thin, then sand/polish
- **Wet sanding**: slow, controlled, low risk of die damage
- **Plasma etching**: removes epoxy without acids, but requires specialized equipment

**Focused Ion Beam (FIB):**
- Mills trenches at specific locations on the die to expose traces
- Can cut or deposit conductive material for microprobing
- Typical resolution: 5 nm. Cost: $200–500K per system

For die imaging:

| Technique | Resolution | Used For |
|-----------|-----------|----------|
| Optical microscopy | ~0.3–1 μm | Top metal layer, bond pads |
| Scanning Electron Microscope (SEM) | ~1–10 nm | Transistor-level imaging, metal layers |
| Infrared microscopy | ~1 μm | Through-silicon imaging (active areas) |
| Confocal laser scanning | ~0.2 μm | 3D die surface topography |

### 9.4 Die Shot Analysis

A die shot (die photo) is the starting point for silicon RE. Layers visible from
above (top metal) vs below (substrate) give different information:

- **Top metal**: reveals data bus routing, power distribution, pad ring, some
  wiring patterns. Memory banks (SRAM, flash) are identifiable by regular array
  structures
- **Active layer** (after metal removal): reveals transistors. Standard cells
  (NAND, NOR, DFF) have characteristic patterns

Metal can be stripped layer by layer using HF + HNO₃ mixtures to expose successive
layers, photographing each. This builds a complete 3D reconstruction.

---

## 10. Hardware Security

### 10.1 Secure Boot Chain Analysis

A secure boot chain uses cryptographic signatures at each stage:

```
BootROM (immutable)
  └─ verifies → Bootloader 1 (signed)
                  └─ verifies → Bootloader 2 (signed)
                                  └─ verifies → OS Kernel (signed)
                                                   └─ verifies → Applications
```

The **root of trust** is the BootROM — it is mask-programmed in silicon and
unchangeable [27][28]. Vulnerabilities in secure boot typically fall into:

- **Signature verification bypass**: fault inject during the RSA/ECDSA signature
  check in BootROM
- **Rollback attack**: the version number in the signed image metadata is not
  checked — boot any old signed firmware with known keys
- **Buffer overflow in BootROM**: parse the image header to trigger code execution
  before the signature check
- **Key leak**: private key extracted from a developer build or leaked signing server

### 10.2 eFuse/OTP Reading

eFuses (electronic fuses) and OTP (One-Time Programmable) memory store secure boot keys,
device UIDs, and configuration bits. They are programmed at the factory and cannot be
reset [14][15].

Reading methods:

- **Direct memory access**: eFuse values are mapped into the address space on some
  SoCs (accessible via MEM-AP if RDP is bypassed)
- **Probing bond wires**: eFuse sense lines can sometimes be probed on the package
  pins during programming
- **SEM/voltage contrast**: programmed fuses have different electrical characteristics
  visible under SEM with passive voltage contrast

### 10.3 ARM TrustZone

TrustZone provides **hardware-enforced isolation** between Normal World (rich OS) and
Secure World (trusted OS) on Cortex-A processors [28].

Key security boundaries:

- **Memory**: Secure memory can only be accessed from Secure World. The TZASC
  (TrustZone Address Space Controller) enforces per-region access policies
- **Peripherals**: secure vs non-secure peripheral mapping via the TZPC
- **Interrupts**: secure IRQs have higher priority and are handled in Secure World
- **Debug**: JTAG/SWD access can be restricted to secure/non-secure domains via
  the DBGPRCR register

Breaking TrustZone isolation via hardware:

- **Fault injection** while the secure monitor (SMC handler) processes transitions
- **Cold boot attack**: freeze DRAM, extract secure memory contents from residual
  charge
- **Malicious DMA**: on platforms without an SMMU (System MMU), a USB peripheral
  can DMA into secure memory [28]

### 10.4 TPM/HSM Extraction

TPM (Trusted Platform Module) and HSM (Hardware Security Module) are hardened crypto
coprocessors. Physical attacks on them include:

- **Side-channel**: power/EM analysis during key generation or signing (see §7)
- **Fault injection**: glitch the RNG to produce deterministic "random" numbers
- **Probing**: microprobing SPI or LPC bus between TPM and CPU during boot to
  intercept PCR values or sealed keys
- **Decapping + microprobing**: direct read of flash cells in the TPM's secure memory

### 10.5 STM32 Read-Out Protection (RDP) Deep Dive

STM32 RDP levels in detail [14]:

| RDP Level | Boot Behavior | Debug Access | Bypass via JTAG/SWD |
|-----------|--------------|--------------|---------------------|
| 0 | Normal | Full JTAG/SWD | N/A |
| 1 | Option bytes checked at boot | Debug disabled unless unlock sequence (erase flash) | FA via voltage glitch [15] |
| 2 | Permanent | Debug permanently disabled | Only physical flash extraction |

At RDP-1, a **mass erase** is required to downgrade to RDP-0. This is what makes
voltage glitching effective: if the glitch causes a wrong read of the RDP option byte,
the device boots as if RDP-0, and the debug port is enabled without erasing the
flash.

RDP-2 is set by programming the option bytes to 0xCC. Once set, the JTAG/SWD port is
permanently disabled and level cannot be lowered. The only recovery mechanism is mass
erase, which the boot ROM requires... but only if the debug port is accessible. On
RDP-2 devices, the only way to extract firmware is:

1. **Desolder flash** (if external) and read with a programmer
2. **Decap and** read the internal flash bit cells directly (SEM, voltage contrast)
3. **Laser FIB probe** the flash memory array bus

### 10.6 Fault Analysis (FA) Techniques

Fault Analysis encompasses all FI-based attacks on cryptographic implementations:

- **DFA (Differential Fault Analysis)**: one faulty ciphertext + one correct
  ciphertext can reveal the key. On AES, a single byte fault at the last round
  (Round 10) reduces key search space from 2^128 to 2^8
- **DFA on AES**: inject single-byte fault between MixColumns and AddRoundKey of
  Round 9. The faulty ciphertext constrains the last-round key to 4 possible bytes
  per fault injection. ~8 fault injections recover the full AES-128 key
- **Safe-error attacks**: induce a fault that is ineffective when a bit is 0 and
  effective when the bit is 1 — directly reveals secret bit values
- **Persistent fault injection**: set a fault that persists across power cycles
  (e.g., corrupt flash contents) for repeated measurements

---

## 11. Tools

### 11.1 Bus Pirate

The Bus Pirate (v5, v6) is a universal serial interface tool. It bridges a PC serial
terminal to hardware protocols [16].

Key features:
- Protocols: 1-Wire, I2C, SPI, UART, JTAG (limited), MIDI, serial LEDs
- Voltage: 1.65V–5.5V programmable I/O (v5/v6)
- Logic analyzer: 10 MSa/s, 4 channels
- Flashrom support: works as SPI programmer
- Price: ~$65

```bash
# Bus Pirate terminal interaction (115200 baud via serial)
# Enter SPI mode:
# m (mode select) → 4 (SPI) → select speed → W (power on)
[0x4D 0x34 0x03 0x57]

# Probe SPI flash ID:
# [ (enable CS)
# send read ID command: 0x9F 0x00 0x00 0x00
# ] (disable CS)
0x9F 0x00 0x00 0x00
# Read back: EF 40 18 (Winbond W25Q64)
```

### 11.2 JTAGulator

The JTAGulator semi-automates the discovery of JTAG and UART pins on unknown hardware.
It drives each pin with TMS patterns and listens for TDO responses [19].

Workflow:
1. Connect up to 24 target pins to JTAGulator channels
2. Select JTAG or UART scan mode
3. JTAGulator drives TMS=1 cycles on each pin while monitoring others for TDO
4. Output: identified TCK, TMS, TDI, TDO pins with confidence scores

```
JTAGulator v1.2
Target voltage: 3.29V
JTAG Scan Mode...

Channel 6 → TCK (100%)  [TDO on Ch 6 when TCK toggles]
Channel 7 → TDO (100%)  [Data observed when TMS=1]
Channel 8 → TMS (95%)   [State machine advanced]
Channel 5 → TDI (90%)   [Data shifted through bypass reg]
```

The JTAGulator also supports **VCC/GND identification** (checks for shorts between pins
and GND/VTREF) and **brute force IDCODE scan** (iterates TCK/TMS/TDI combinations).

### 11.3 HydraBus

HydraBus is an open-source multi-tool. It can run HydraFW (custom firmware), Black
Magic Probe firmware (JTAG/SWD debugger), or MicroPython for custom scripting.

Protocols via HydraFW: SPI, I2C, UART, 1-Wire, bitbang, JTAG (limited).
As a Black Magic Probe: full JTAG/SWD debugging with GDB integration.

### 11.4 ChipWhisperer (see §7.7)

### 11.5 Saleae Logic Analyzer

Saleae Logic analyzers (Logic 8, Logic Pro 8, Logic Pro 16) are the industry standard
for protocol analysis. The Logic 2 software provides:

- **Protocol analyzers**: 25+ built-in, community SDK for custom decoders
- **Analog sampling**: Logic Pro series has analog input for voltage analysis
- **Export formats**: CSV, VCD, Saleae binary, MATLAB
- **Cross-triggering**: trigger on one protocol and look at correlated activity on
  another channel

Limitations: proprietary software/hardware, no open-source decoder framework. Sigrok
has limited support for Saleae devices (Saleae clones are fully supported, genuine
Saleae requires proprietary drivers).

### 11.6 OpenOCD (see §3)

### 11.7 UrJTAG

UrJTAG is a command-line JTAG tool focused on **flash programming and device
configuration** rather than debugging [30].

```bash
# Detect JTAG chain
jtag> cable ft2232
jtag> detect
IR length: 4
Chain length: 1
Device ID: 0x2BA01477

# Read flash
jtag> instruction EXTEST 0x00
jtag> shift dr 32
```

UrJTAG excels at programming parallel and SPI flash via JTAG (especially older
NOR flash and CPLD/FPGA configuration flash). It does not support processor
debugging — for that, use OpenOCD [30].

### 11.8 J-Link / ST-Link

**SEGGER J-Link** is the premium debug probe [29]:

| Model | Max SWD Speed | Flash Download | Price |
|-------|---------------|----------------|-------|
| J-Link BASE | 4 MB/s | 15 MB/s (external flash) | ~$350 |
| J-Link PLUS | 15 MB/s | 25 MB/s | ~$600 |
| J-Link ULTRA+ | 15 MB/s | 25 MB/s | ~$1000 |
| J-Link PRO | 15 MB/s | 25 MB/s | ~$1500 |
| J-Link OB (on-board) | 4 MB/s | 15 MB/s | ~$20 |

**ST-Link** is STMicroelectronics' low-cost probe:

| Version | Max SWD | SWO | Power |
|---------|---------|-----|-------|
| ST-Link/V2 | 4 MHz | Yes (limited buffer) | Target powered (3.3V/5V selectable) |
| ST-Link/V2-ISOL | 4 MHz | Yes (isolated) | Isolated target power |
| ST-Link/V3 | 24 MHz | Yes (large buffer) | Full VCC tracking |

ST-Link/V3 is a significant improvement: faster SWCLK, larger trace buffer, and
VREF tracking for level adaptation with 1.8V–3.3V targets.

### 11.9 Shikra

The Shikra (from /dev/ttyS0 / Xipiter) is an FT2232H-based multi-protocol tool. It
exposes both channels of the FT2232H separately: one for JTAG/SWD, one for UART.

Key features:
- Two FT2232H channels, fully independent
- Buffered outputs (can drive long cables)
- Level shifting: 1.8V–5V via VTREF sensing
- OpenOCD compatible (use `interface/ftdi/shikra.cfg`)
- Integrated 10-pin Cortex debug connector

The Shikra's buffered outputs make it more robust for production-level debugging than
the Bus Pirate.

### 11.10 Glasgow Interface Explorer

The Glasgow is an **FPGA-based** interface explorer using a Lattice iCE40 FPGA [31].

Unique advantage: because all protocols are implemented in FPGA fabric (not software
bitbang), Glasgow can handle **high-speed** and **real-time** requirements that
microcontroller-based tools cannot:

- JTAG probe at 60 MHz TCK
- SWD with hardware-assisted turnaround timing
- SPI at 100 MHz
- Bit-accurate protocol capture with nanosecond precision

Glasgow uses a Python-based applet architecture. Each interface type is an applet
loaded onto the FPGA:

```bash
# Run JTAG probe applet
glasgow run interface-jtag-probe --voltage 3.3
# Run SWD bridge for debugging
glasgow run interface-swd-probe --voltage 3.3
```

The Glasgow costs ~$150 and requires an FPGA toolchain (Yosys/nextpnr) for applet
development. Its main limitation is the need for Python 3.9+ and dependencies.

### 11.11 Tool Selection Guide

| Task | Best Tool | Budget Alternative |
|------|-----------|-------------------|
| JTAG/SWD debugging | J-Link or ST-Link/V3 | Bus Pirate (slow but works) |
| Unknown pin identification | JTAGulator | Manual logic analyzer probing |
| SPI flash dumping | CH341A + flashrom | Bus Pirate + flashrom |
| UART console access | USB-UART (CP2102/FT232) | Bus Pirate |
| Protocol analysis | Saleae Logic (100 MSa/s) | FX2 + sigrok ($10) |
| Side-channel power analysis | ChipWhisperer CW308 | DIY with oscilloscope |
| EM fault injection | ChipSHOUTER | PicoEMP (DIY) |
| Voltage fault injection | ChipWhisperer integrated glitcher | Diy glitcher with MOSFET + FPGA |
| General multi-protocol | Shikra or Bus Pirate | FT2232H Mini Module |
| High-speed FPGA-based | Glasgow Interface Explorer | N/A |
| JTAG flash programming | UrJTAG | OpenOCD |
| PCB X-ray CT analysis | Industrial CT scanner (outsource) | N/A |
| Chip decapping | Nitric acid + fume hood | Mechanical grinding |

---

## Quick Reference Card

| Signal / Protocol | Pins | Voltage | Max Speed | Tool |
|-------------------|------|---------|-----------|------|
| JTAG (IEEE 1149.1) | TCK, TMS, TDI, TDO + GND | 1.8–5V (VTREF) | 50 MHz | J-Link, OpenOCD, UrJTAG |
| SWD (ARM) | SWCLK, SWDIO + GND | 1.8–3.3V (VTREF) | 50 MHz | J-Link, OpenOCD |
| UART | TX, RX, (CTS, RTS) + GND | 1.8–5V | 10+ Mbps | USB-UART, Bus Pirate |
| SPI | CS, CLK, MOSI, MISO + GND | 1.8–5V | 100 MHz | CH341A, flashrom |
| I2C | SCL, SDA + GND | 1.8–5V | 3.4 MHz | Bus Pirate, Saleae |
| 1-Wire | DQ + GND | 2.8–5V | 125 kbps | Bus Pirate |
| CAN | CAN_H, CAN_L + GND | diff 2.5V | 1 Mbps | CAN transceiver + Saleae |

| Technique | Equipment needed | Invasiveness | Key parameter |
|-----------|-----------------|-------------|--------------|
| SPA | Oscilloscope 50 MSa/s+, current probe | Non-invasive | Single trace analysis |
| DPA/CPA | Scope + trigger + 10–10K traces | Non-invasive | Statistical partition |
| EMFI | ChipSHOUTER + positioning stage | Non-invasive (no decap) | Coil position, pulse energy |
| Voltage glitching | Fast MOSFET switch + FPGA timing | Invasive (VDD modification) | Glitch width, offset, depth |
| Clock glitching | Clock source switch | Semi-invasive (clock path) | Cycle short/double |
| Laser FI | Pulsed laser + optical bench | Invasive (decap required) | Spot position, pulse energy |
| Microprobing | FIB + probe station | Destructive (via FIB trench) | Signal pad access |

---

## Sources

1. IEEE Std 1149.1-2013, "Standard for Test Access Port and Boundary-Scan Architecture"
   — https://standards.ieee.org/standard/1149_1-2013.html
2. XJTAG, "What is JTAG?" — https://www.xjtag.com/about-jtag/what-is-jtag/
3. Memfault, "Diving into JTAG" (Part 1–3) —
   https://interrupt.memfault.com/blog/diving-into-jtag-part-3
4. ARM, "DSTREAM-PT System and Interface Design Reference: Serial Wire Debug (SWD)"
   — https://developer.arm.com/docs/101714/latest/debug-and-trace-interface/serial-wire-debug-swd-signals
5. ARM, "CoreSight SoC-400 TRM: SWJ-DP Operation" —
   https://developer.arm.com/docs/100536/0302/debug-access-port/swj-dp/operation-in-sw-dp-mode
6. ARM, "Cortex-M1 TRM: SW-DP Protocol Description" —
   https://developer.arm.com/docs/ddi0413/c/debug-access-port/sw-dp/protocol-description
7. OpenOCD User's Guide — https://openocd.org/doc/html/
8. NewAE Technology, "ChipWhisperer Documentation" —
   https://chipwhisperer.readthedocs.io/en/latest/getting-started.html
9. ChipWhisperer Training — https://learn.chipwhisperer.io/
10. NewAE, "ChipWhisperer Wiki (archived)" — https://wiki.newae.com/Training
11. P. Kocher, J. Jaffe, B. Jun, "Differential Power Analysis" (CRYPTO 1999) —
    https://dl.acm.org/doi/10.5555/646764.703989
12. sigrok, "Getting started with a logic analyzer" —
    https://sigrok.org/wiki/Getting_started_with_a_logic_analyzer
13. sigrok, "Protocol Decoder HOWTO" —
    https://sigrok.org/wiki/Protocol_decoder_HOWTO
14. STMicroelectronics, "STM32F4 Reference Manual: Read-Out Protection" —
    https://www.st.com/resource/en/reference_manual/dm00031020.pdf
15. Anvil Secure, "Glitching STM32 Read Out Protection with Voltage Fault Injection" —
    https://www.anvilsecure.com/blog/glitching-stm32-read-out-protection-with-voltage-fault-injection.html
16. Bus Pirate Documentation — https://docs.buspirate.com/
17. Black Hills InfoSec, "Dumping Firmware With the CH341a Programmer" —
    https://www.blackhillsinfosec.com/dumping-firmware-with-the-ch341a-programmer/
18. flashrom, "flashrom README and Manual" — https://flashrom.org/
19. Grand Idea Studio, "JTAGulator" — https://github.com/grandideastudio/jtagulator
20. Wikipedia, "Row hammer" — https://en.wikipedia.org/wiki/Row_hammer
21. Saleae, "What Is a Logic Analyzer?" —
    https://articles.saleae.com/logic-analyzers/what-is-a-logic-analyzer
22. NCC Group, "An Introduction to Fault Injection" (Part 1–3) —
    https://www.nccgroup.com/sg/research-blog/an-introduction-to-fault-injection-part-13/
23. syss.de, "Electromagnetic Fault Injection on nRF54L15" —
    https://blog.syss.com/posts/nrf54-emfi/
24. Nature Scientific Reports, "Automated 3D semantic segmentation of PCB X-ray CT images
    and netlist extraction" — https://www.nature.com/articles/s41598-024-84635-2
25. ASM International, "Non-Destructive PCB Reverse Engineering Using X-Ray Micro Computed
    Tomography" — https://dl.asminternational.org/istfa/proceedings-pdf/ISTFA2015/81030/164/420023/istfa2015p0164.pdf
26. Wikipedia, "Decapping" — https://en.wikipedia.org/wiki/Decapping
27. BSI, "SiSyPHuS Win10: Analysis of TPM Integration and UEFI Secure Boot" —
    https://www.bsi.bund.de/EN/Service-Navi/Publikationen/Studien/SiSyPHuS_Win10/AP5/SiSyPHuS_AP5.html
28. Springer, "Breaking TrustZone memory isolation and secure boot through malicious
    hardware on a modern FPGA-SoC" — https://link.springer.com/10.1007/s13389-021-00273-8
29. SEGGER, "J-Link Debug Probes" — http://www.segger.com/jlink-model-overview.html
30. UrJTAG, "Universal JTAG library, server and tools" — https://urjtag.sourceforge.io/
31. Glasgow Interface Explorer — https://glasgow-embedded.org/
32. Black Hills InfoSec, "Hardware Hacking with Shikra" —
    https://www.blackhillsinfosec.com/hardware-hacking-with-shikra/
33. Hackaday, "JTAGulator Finds Debug Interfaces" —
    https://hackaday.com/2013/10/02/jtagulator-finds-debug-interfaces/
