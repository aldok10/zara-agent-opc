# RTOS Reversing & IoT/Embedded Security

TL;DR: RTOS identification and reversing (FreeRTOS TCB, ThreadX, Zephyr),
IoT/embedded security vulnerabilities, secure boot chains, TrustZone,
ARM Trusted Firmware, and anti-analysis techniques.

See also: arm64-uefi-protocols.md, arm64-architecture-registers.md, arm64-instructions-calling.md, arm64-thumb-firmware-methodology.md

---

## 13. RTOS Reversing

### 13.1 FreeRTOS TCB structure

FreeRTOS's `tskTaskControlBlock` is the central data structure for task management.
The first member is `pxTopOfStack` (pointer to the last saved context) [20]:

```c
// FreeRTOS TCB (simplified, version dependent)
typedef struct tskTaskControlBlock {
    volatile StackType_t *pxTopOfStack;   // +0x00: top of stack
    ListItem_t xStateListItem;            // +0x04: state list
    ListItem_t xEventListItem;            // +0x14: event list
    UBaseType_t uxPriority;               // +0x24: task priority
    StackType_t *pxStack;                 // +0x28: stack start
    char pcTaskName[configMAX_TASK_NAME_LEN]; // +0x2C: name
    // ... platform-specific fields follow
} tskTCB;
```

**Finding FreeRTOS in firmware:**
1. Search for the PendSV handler (context switch).
2. Look for `pxCurrentTCB` — a global pointer to the currently running TCB.
3. The TCB list appears as a circular doubly-linked list via `xStateListItem`.
4. Task names in `.rodata` (strings like "IDLE", "main", "LED Task").
5. `vTaskDelay`, `xQueueSend`, `xTaskCreate` calls found via API strings.

### 13.2 ThreadX block/byte pools

ThreadX uses pool-based memory management [22]. Key structures:

```c
// TX_BLOCK_POOL structure offset layout
typedef struct TX_BLOCK_POOL_STRUCT {
    UINT    tx_block_pool_id;           // +0x00: 0x424C4F43 ("BLOC")
    CHAR    *tx_block_pool_name;        // +0x04: pool name pointer
    UINT    tx_block_pool_available;    // +0x08: available blocks
    UINT    tx_block_pool_total;        // +0x0C: total blocks
    TX_BLOCK_POOL *tx_block_pool_next;  // +0x10: linked list
    // ...
};
```

**Identifying ThreadX:**
1. Pool ID constants: `0x424C4F43` ("BLOC" for block pools), `0x42595445` ("BYTE")
   appearing in data sections.
2. `tx_kernel_enter` — the entry function (analogous to `main`).
3. All blocks have a magic number at offset 0.
4. Thread names in strings referenced from `TX_THREAD` structures.

### 13.3 Zephyr RTOS

Zephyr uses a unified kernel with `k_thread` structures. Identifying features:
- `k_thread_entry_t` function pointers in the thread struct.
- `_kernel` global symbol referencing the current CPU state.
- Thread names in `.gnu.linkonce.this_module` sections.
- Zephyr uses device tree (DT) for hardware description — strings like `&uart0` in
  binary data are a strong signal.

### 13.4 RTOS-aware debugging

OpenOCD can be configured for RTOS-aware debugging with FreeRTOS support:

```bash
openocd -f interface/stlink-v2.cfg -f target/stm32f4x.cfg \
  -c "init" -c "reset halt" \
  -c "rtos create 0"              # enables RTOS detection
```

GDB then shows thread info via `info threads`. However, this only works when symbols
are present. Without symbols, you must:
1. Locate the PendSV handler in the vector table.
2. Trace the context switch code to find the TCB list.
3. Parse TCBs by known offsets.

---

## 14. IoT/Embedded Security

### 14.1 Common vulnerabilities

| Vulnerability | Example | RE indicator |
|--------------|---------|-------------|
| Hardcoded keys | `const uint8_t aes_key[16] = {0x00, ...}` | Look for 16/32-byte constants in `.rodata` used as AES key schedule input |
| Debug ports enabled | UART shell on TX/RX | UART `\n` login prompt, shell commands in strings |
| Unsigned firmware | No signature check in update routine | Search for signature verification functions; missing = unsigned |
| Buffer overflow | `strcpy(dst, src)` in network handler | `strcpy`, `sprintf`, `vsprintf` usage on network buffers |
| Command injection | `system(user_input)` | `system()`, `popen()`, `exec*()` with user-controlled args |
| Insecure OTA | Update fetched over HTTP | URL strings with `http://`, no TLS, no cert pinning |
| Backdoor accounts | Hardcoded password check | `strcmp(password, "admin123")` patterns in authentication code |

### 14.2 Secure Boot chain

A typical secure boot chain on ARM Cortex-A [23]:

```
Boot ROM (on-chip) → verifies → TF-A BL1 (boot loader stage 1)
  → verifies → TF-A BL2 (platform init + SPM)
    → verifies → BL31 (EL3 runtime firmware)
      → verifies → BL32 (TrustZone OS, optional)
        → verifies → BL33 (UEFI or U-Boot)
          → verifies → Linux kernel
```

Each stage verifies the next via digital signature (RSA/ECDSA) before jumping.
RE approach: work backwards from the most accessible stage (U-Boot or kernel) and
trace the verification chain. Look for:
- Public key storage (DER-encoded RSA keys, ECC curve parameters).
- Hash check functions (SHA-256 context init + update + final).
- Signature verification (RSA PKCS#1 v1.5 or PSS, ECDSA).
- BootROM entry points that call flash read + signature check.

### 14.3 TrustZone

ARM TrustZone splits the processor into **Normal World** (REE — Rich Execution
Environment, e.g. Linux) and **Secure World** (TEE — Trusted Execution Environment,
e.g. OP-TEE, Trusty, QSEE) [24].

**For RE:**
- Normal World code runs at EL0/EL1; Secure World at EL1(S)/EL3.
- Transition via SMC (Secure Monitor Call) instruction.
- The Secure Monitor (EL3, typically TF-A) handles SMC dispatch.
- TrustZone-aware firmware has two sets of exception vectors (VBAR_EL1, VBAR_EL3).
- Memory regions marked as "Secure" are inaccessible from Normal World — you cannot
  dump Secure World memory via Linux /dev/mem.

**Analyzing TrustZone firmware:**
- Extract the Secure World image (usually a separate partition in SPI flash).
- Look for SMC handler dispatch tables: EL3 code that reads X0 and branches to
  a function pointer array.
- OP-TEE binary can be identified by strings like "OP-TEE", "tee_pager".
- For locked-down devices (e.g., Qualcomm QSEE), the Secure World is proprietary
  and rarely documented — analyze its SMC interface from the Normal World side.

### 14.4 ARM Trusted Firmware (TF-A)

TF-A is the reference implementation for ARMv8-A secure world firmware [23]. RE
identifiers:

- BL1 at `0x00000000` or ROM base (on-chip boot ROM).
- BL2 at a fixed offset in flash (platform-specific).
- BL31 (EL3 runtime) at a defined DRAM/SPM location.
- FIP (Firmware Image Package) containing all BLx images concatenated.

FIP parsing: `fiptool` (from TF-A) lists and extracts images:

```bash
fiptool info fip.bin
fiptool unpack fip.bin
```

### 14.5 Anti-analysis techniques

**TrustZone obfuscation**: Critical code runs in Secure World where debug access is
blocked. The Normal World sees only SMC calls and opaque data.

**ARM Jazelle** (DBX — Direct Bytecode eXecution): Hardware Java bytecode execution
on some ARMv5/v6 cores. Extremely rare but can be used to hide logic in Java bytecode
that the CPU executes natively. Ghidra/IDA do not support Jazelle disassembly.

**JTAG/SWD lock**: RDP2 on Cortex-M makes the debug port permanently inaccessible.
Recovery requires hardware fault injection.

**Firmware encryption**: Firmware images encrypted with AES/XOR. decryption key may
be derived from device UID, embedded in boot ROM, or provided externally.

**Self-modifying code**: Cortex-M can execute from RAM. Firmware that copies code
to SRAM and executes it (common for flash wait-state optimization) can also hide
logic in ram-executed blocks.

**PAC/BTI** (Pointer Authentication / Branch Target Indicator): ARMv8.3-A+ hardware
control flow integrity. Makes ROP/JOP exploitation much harder and confuses RE by
corrupting backtrace info when functions use PAC [25].

---

## Sources

20. FreeRTOS Task Control Block (TCB) — https://www.freertos.org/implementing-a-FreeRTOS-task.html
21. QEMU System Emulation for Arm — https://www.qemu.org/docs/master/system/target-arm.html
22. Azure RTOS ThreadX documentation — https://learn.microsoft.com/en-us/azure/rtos/threadx/
23. Trusted Firmware-A Documentation — https://trustedfirmware-a.readthedocs.io/
24. ARM TrustZone for Cortex-A — https://www.arm.com/technologies/trustzone-for-cortex-a
25. Armv8.3-A Pointer Authentication, "PAC/BTI" — https://developer.arm.com/architectures/cpu-architecture/a-profile
