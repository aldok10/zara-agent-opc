# MIPS, PowerPC & RISC-V Architecture RE

TL;DR: MIPS has branch delay slots (instruction after branch executes first). PowerPC uses LR/CTR special registers and flexible branching. RISC-V has no delay slots, no flags register, branches compare two registers directly. All three are common in routers, game consoles, and IoT.

---

## Architecture Comparison

| Feature | MIPS (o32) | PowerPC | RISC-V |
|---------|-----------|---------|--------|
| Arg regs | $a0-$a3 (4) | r3-r10 (8) | a0-a7 (8) |
| Callee-saved | $s0-$s7 (8) | r14-r31 (18) | s0-s11 (12) |
| Return addr | $31 (GPR) | LR (SPR) | x1 (GPR) |
| Stack align | 8-byte | 8/16-byte | 16-byte |
| Delay slots | Yes (pre-R6) | No | No |
| Condition flags | No (compare+branch) | CR (8x4-bit fields) | No (reg-vs-reg branch) |
| Endianness | Bi (big common) | Big (classic), LE avail | Little |

## MIPS Key Points

**Delay slots**: Instruction at PC+4 executes BEFORE the branch. Ghidra handles in decompiler; verify in listing view.

```asm
jalr    t9          ; branch
addiu   a3, zero, 0 ; executes FIRST (delay slot)
```

Branch-likely (`beql`/`bnel`): delay slot only executes if branch taken. Removed in R6.

**GOT/GP-relative**: PIC code uses $gp as base for GOT. Prologues load $gp from $t9. Without context, Ghidra shows wrong addresses.

**HI16/LO16 pairs**: `lui` (high 16) + `addiu` (low 16) = 32-bit constant.

**Register convention (o32)**: $v0-$v1 return, $a0-$a3 args, $s0-$s7 callee-saved, $t0-$t9 temp, $gp global pointer, $sp stack, $ra return address.

## PowerPC Key Points

**Branch processor**: LR=return address, CTR=loop counter or indirect target. `bl`=call, `blr`=return, `bctrl`=indirect call.

**Condition Register**: 8 independent 4-bit fields (CR0-CR7). Branch tests single CR bit via BI operand.

**Stack frame**: Back chain (linked list), LR save, parameter save area. `$sp[0]` always points to previous frame.

**Calling**: Params in r3-r10 (GPR) and f1-f13 (FPR). Return in r3-r4.

**Known Ghidra bug**: `bcl` with LK=1 sets LR unconditionally per ISA, but SLEIGH models it conditionally.

## RISC-V Key Points

**No delay slots, no flags**. Branches compare two registers directly: `blt a0, a1, label`.

**Extensions**: I (base), M (mul/div), A (atomics), F/D (float), C (compressed 16-bit), V (vector).

**Privilege levels**: M (machine, mandatory), S (supervisor), U (user). CSRs via csrrw/csrrs/csrrc.

**AUIPC + ADDI**: PC-relative address generation (like MIPS LUI+ADDI but PC-relative).

**JALR with rd=zero**: indirect jump. JALR with rd=ra: indirect call.

Key CSRs: mtvec (trap vector), mepc (exception PC), mcause (trap reason), satp (page table base).

## Tooling

**Ghidra**:
- MIPS: `MIPS:BE:32:default`, handles delay slots in decompiler. Known bug: delay slot args silently dropped.
- PowerPC: `PowerPC:BE:32:default` or `booke`. Known bug: bcl LR semantics.
- RISC-V: `RISCV:LE:32:RV32GC`. C extension integrated.

**radare2**: `-a mips -b 32`, `-a ppc -b 32`, `-a riscv -b 32`. Set `e cfg.bigendian=true` for MIPS/PPC.

**IDA Pro**: First-class MIPS/PPC/RISC-V. Hex-Rays decompiler for all three.

## Firmware Boot Vectors

| Architecture | Reset Vector |
|-------------|-------------|
| MIPS | 0xBFC00000 (uncached) |
| PowerPC (classic) | 0xFFF00100 |
| PowerPC (Book E) | 0x00000100 |
| RISC-V (typical) | 0x80000000 or SoC-specific |

## Common Targets

**MIPS**: TP-Link routers (AR9341, MT7628), Ubiquiti (MT7621), Cisco WRT54G. Bootloader: U-Boot, CFE.

**PowerPC**: Nintendo Wii (Broadway 750CL), Xbox 360 (3x PPE), PS3 (Cell BE), NXP QorIQ/MPC8xxx (networking/automotive).

**RISC-V**: ESP32-C3 (ROM at 0x40000000), BL602 (XIP at 0x23000000), SiFive FU540 (Linux-capable).

## Firmware Analysis Checklist

```
1. Identify architecture (binwalk --opcodes, strings)
2. Find base address (reset vectors, binbloom)
3. Extract filesystem (SquashFS, JFFS2)
4. Identify bootloader (U-Boot magic 0x27051956)
5. Map memory layout from datasheet
6. Locate peripheral registers (GPIO, UART, watchdog)
7. Emulate with QEMU/Firmadyne for dynamic analysis
8. Prioritize: web interface, CGI handlers, auth logic
```

## Branch Delay Slot Matrix

| Architecture | Delay Slot | Compact Branch |
|-------------|-----------|----------------|
| MIPS pre-R6 | Yes (always) | R6 only |
| MIPS R6 | No | Forbidden slot |
| PowerPC | No | N/A |
| RISC-V | No | N/A |

Anti-disassembly trick: Attackers place jumps in delay slots (undefined behavior).
