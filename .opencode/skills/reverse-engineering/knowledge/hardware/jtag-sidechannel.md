# JTAG, SWD, Logic Analysis & Side-Channel Attacks

TL;DR: JTAG/SWD are debug interfaces for firmware extraction and live debugging. Logic analyzers decode unknown bus protocols. Side-channel attacks (DPA/CPA) recover crypto keys from power traces. Fault injection bypasses read protection.

---

## JTAG (IEEE 1149.1)

5 signals: TCK (clock), TMS (state machine), TDI (data in), TDO (data out), TRST (optional reset)

**TAP state machine**: TMS=1 for 5 TCK cycles = guaranteed reset. Shift-DR/Shift-IR for data transfer.

**IDCODE** (32-bit): `[Version:4][PartNumber:16][MfrID:11][LSB=1:1]`

Daisy-chain: TDO of one device -> TDI of next. BYPASS register passes through.

## SWD (ARM Cortex-M)

2 pins: SWCLK + SWDIO (bidirectional). Point-to-point only (no chain).

10-pin Cortex connector: Pin1=VREF, Pin2=SWDIO, Pin4=SWCLK, Pin10=nRESET

Packet: Request(8b) -> Ack(3b) -> Data(33b). Responses: OK(001), WAIT(010), FAULT(100).

SWJ-DP switch to SWD: 50+ TCK with TMS=1, then magic sequence 0xE79E.

## OpenOCD Quick Reference

```bash
# Flash programming
openocd -f board/stm32f4discovery.cfg -c "program firmware.bin 0x08000000 verify reset exit"

# Flash dump
openocd -f board/stm32f4discovery.cfg -c "init; dump_image flash_dump.bin 0x08000000 0x100000; exit"

# GDB connection
openocd -f board/stm32f4discovery.cfg &
arm-none-eabi-gdb firmware.elf -ex "target remote :3333"
```

Start at low speed (100 kHz), increase when stable.

## UART Discovery

Finding pads: Look for 4-hole groupings, series resistors near SoC, TX idles HIGH.

TX vs RX: TX shows activity on boot without connection. RX is steady at VCC.

Baud detection: Measure shortest pulse width. `baud = 1/bit_time`. Common: 115200, 9600.

Voltage: 3.3V CMOS most common. RS-232 needs MAX232. Never connect 3.3V adapter to 1.8V target.

## SPI Flash Dumping

SOIC-8 pinout: CS(1), MISO(2), WP(3), GND(4), MOSI(5), CLK(6), HOLD(7), VCC(8)

```bash
flashrom -p ch341a_spi -r firmware.bin    # CH341A programmer
flashrom -p buspirate_spi:dev=/dev/ttyUSB0 -r firmware.bin  # Bus Pirate
```

CH341A: 3.3V only, max ~4 MHz. For 1.8V chips use level shifter or Bus Pirate v5/v6.

Always disconnect target power when using SOIC-8 clip (prevents bus contention).

## Logic Analysis

Nyquist: sample at 4-5x signal clock. UART@115200 = any >1 MSa/s. SPI@24MHz = need 100 MSa/s.

```bash
# sigrok UART decode
sigrok-cli --driver fx2lafw --config samplerate=24M --channels D0=RX \
  --protocol-decoders uart:baudrate=115200
```

Cheap FX2 analyzers ($10-15, 24 MSa/s) sufficient for most embedded RE under 12 MHz.

## Side-Channel Attacks

| Attack | Traces Needed | Equipment |
|--------|--------------|-----------|
| SPA | 1 trace | Oscilloscope |
| DPA (AES) | 50-200 (software) | ChipWhisperer |
| CPA (AES) | 10-50 (software) | ChipWhisperer |
| Template | 1-10 traces | Matched profiling device |

**CPA on AES**: For each key byte (0-255), predict Hamming weight of S-box output, correlate with power samples. Correct key produces spike at computation time.

**ChipWhisperer platform**: CW1173 (Lite): 10-bit ADC, 105 MSa/s. CW308 UFO: interchangeable targets.

## Fault Injection

| Method | Parameters | Target |
|--------|-----------|--------|
| Voltage glitch | 0.3-1.8V drop, 10-200ns | STM32 RDP bypass |
| Clock glitch | Extra edge / shortened cycle | External clock targets |
| EMFI | Localized EM pulse | Multi-core SoC targeting |
| Laser | Sub-micron precision | Requires decap ($50K+) |

**STM32 RDP Bypass**: Glitch during boot ROM option-byte read. If read returns 0x00 instead of 0xBB (RDP-1), debug port enables without flash erase.

```python
for glitch_offset in range(100, 500, 5):
    for glitch_width in range(10, 100, 5):
        configure_glitch(offset=glitch_offset, width=glitch_width)
        power_cycle_target()
        if swd_idcode_read():
            dump_flash()
            break
```

## Tool Selection

| Task | Best Tool | Budget Alt |
|------|-----------|-----------|
| JTAG/SWD debug | J-Link / ST-Link V3 | Bus Pirate |
| Pin identification | JTAGulator | Manual probing |
| SPI flash dump | CH341A + flashrom | Bus Pirate |
| Protocol analysis | Saleae Logic | FX2 + sigrok ($10) |
| Power analysis | ChipWhisperer | DIY oscilloscope |
| Voltage glitch | ChipWhisperer | MOSFET + FPGA |
| EM fault | ChipSHOUTER ($1500) | PicoEMP ($100) |

## Quick Reference

| Protocol | Pins | Max Speed |
|----------|------|-----------|
| JTAG | TCK,TMS,TDI,TDO+GND | 50 MHz |
| SWD | SWCLK,SWDIO+GND | 50 MHz |
| UART | TX,RX+GND | 10+ Mbps |
| SPI | CS,CLK,MOSI,MISO+GND | 100 MHz |
| I2C | SCL,SDA+GND | 3.4 MHz |

Voltage warning: Most targets 1.8-3.3V. Connecting 5V to 1.8V pin destroys the target. Always verify VREF first.
