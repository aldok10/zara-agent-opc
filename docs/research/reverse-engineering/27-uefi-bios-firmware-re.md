# UEFI / BIOS Firmware Reverse Engineering

**Audience:** DLL/malware RE specialists expanding into firmware land
**Prerequisites:** x86/64 asm, PE format, Windows internals
**Goal:** Read firmware dumps like you read DLLs

---

## 1. UEFI Boot Phases Overview

The UEFI Platform Initialization (PI) spec divides boot into phases, each handing off to the next via data structures [1](https://uefi.org/specs/PI/1.8A/V2_Overview.html):

| Phase | Name | Purpose | Who runs it | Memory |
|-------|------|---------|-------------|--------|
| SEC | Security | Root of trust, cache-as-RAM (CAR) setup | CPU reset vector | CAR |
| PEI | Pre-EFI Init | Memory discovery + basic HW init | PEI Modules (PEIMs) | CAR / RAM |
| DXE | Driver Exec Env | Full platform initialization | DXE Drivers | Full RAM |
| BDS | Boot Dev Select | Boot policy, OS loader selection | BDS driver | Full RAM |
| RT | Runtime | OS-visible services, ExitBootServices() | RT drivers | Virtual mem |
| AL | After Life | Platform shutdown / reboot path | FW | N/A |

**RE perspective:** You'll spend 80% of your time in DXE (largest codebase), 15% in PEI (early init, arch-specific), and 5% in SMM (ring -2, accessed via SMI handlers). SEC is microcode/assembly and rarely needs reversing unless you're doing Boot Guard research [2](https://binary.ninja/2024/08/23/uefi-firmware-analysis.html).

### Handoff Chain

```
SEC → PEI → DXE → BDS → OS
        ↓       ↓
      HOBs    System Table
```

- HOBs (Hand-Off Blocks): position-independent data structure list passed from PEI to DXE [3](https://uefi.org/specs/PI/1.8A/V2_Overview.html)
- System Table: main exported API surface in DXE context, contains Boot Services, Runtime Services, and protocol database

---

## 2. Firmware File System (FFS)

Firmware images are organized as **Firmware Volumes (FVs)** which contain **Firmware File System (FFS)** files [4](https://tianocore-docs.github.io/edk2-BuildSpecification/draft/2_design_discussion/22_uefipi_firmware_images.html).

### Volume Layout

```
+----------------------------+
|  Firmware Volume (FV)      |
|  +----------------------+  |
|  | FFS File             |  |
|  | +------------------+ |  |
|  | | Section          | |  |
|  | | (PE32, TE, RAW, | |  |
|  | |  HII, GUID, etc)| |  |
|  | +------------------+ |  |
|  +----------------------+  |
+----------------------------+
```

### FFS File Types

| File Type | Value | Contents |
|-----------|-------|----------|
| RAW | 0x01 | Raw binary (PEIM, microcode) |
| FREEFORM | 0x02 | Untyped payload |
| SECURITY | 0x03 | Certificate or hash |
| PEI_DXE_COMBO | 0x07 | Combined PEI/DXE driver |
| DRIVER | 0x08 | PE32+ DXE driver |
| PEIM | 0x07 | PEI module |
| FREEFORM_SUBTYPE_GUID | 0x0A | GUID-subtyped freeform |
| FFS_PAD | 0xF0 | Padding |

### Section Types

| Section Type | ID | Content |
|-------------|-----|---------|
| PE32 | 0x10 | PE32/PE32+ image |
| TE | 0x12 | Terse Executable |
| RAW | 0x19 | Raw binary data |
| GUID_DEFINED | 0x1B | GUID-defined encoding |
| FFS_UI | 0x15 | Unicode string name |
| FV_IMAGE | 0x17 | Nested firmware volume |
| COMPRESSION | 0x1C | LZMA/ZLIB compressed |

**Key insight:** Each DXE driver or PEIM you want to reverse lives inside an FFS file, wrapped in sections. Use tooling (below) to extract.

---

## 3. PEI Modules (PEIMs)

PEI runs from CAR (Cache-as-RAM) before actual DRAM exists. PEIMs are position-independent and must fit in tight space [5](https://uefi.org/specs/PI/1.8A/V1_PEIMs.html).

### PEIM Characteristics

- Entry point: `PeimEntryPoint` -- receives `EFI_PEI_FILE_HANDLE` and `CONST EFI_PEI_SERVICES **`
- No global variables (no writable memory initially) -- uses PEI Services for memory allocation
- Format: TE image (preferred) or PE32 -- TE dominates in practice due to size
- Dispatched by PEI Foundation (PEI Core) based on dependency expressions
- Communicate via **PPIs** (PEI-to-PEI Interfaces) -- protocol-like GUID structures

### PEI Dependency Section (depex)

Format: opcodes evaluated by a stack machine [6](https://tianocore-docs.github.io/edk2-BuildSpecification/draft/2_design_discussion/25_generic_build_process.html)

| Opcode | Description |
|--------|-------------|
| OPCODE_BEFORE | Before all modules |
| OPCODE_AFTER | After all modules |
| OPCODE_PUSH | Push GUID onto stack |
| OPCODE_AND | Pop two, push AND |
| OPCODE_OR | Pop two, push OR |
| OPCODE_NOT | Pop one, push NOT |
| OPCODE_TRUE | Push TRUE |
| OPCODE_FALSE | Push FALSE |
| OPCODE_END | End of expression |

**RE approach:** PEIMs are small (4-32KB typically). The challenge is no writable globals and CAR-based execution. You'll mostly identify what PPIs they install or consume.

---

## 4. DXE Drivers

DXE is where most firmware lives. EDK2 builds these as PE32+ DLL-style images with well-known entry points [7](https://tianocore-docs.github.io/edk2-UefiDriverWritersGuide/draft/3_foundation/36_protocols_and_handles).

### DXE Driver Types

| Type | Entry Point Style | Constructor Protocol |
|------|------------------|---------------------|
| UEFI_DRIVER | `UefiDriverEntryPoint` | Full UEFI driver model |
| DXE_DRIVER | `DxeDriverEntryPoint` | DXE native driver |
| SMM_DRIVER | `SmmDriverEntryPoint` | SMM resident driver |
| RUNTIME_DRIVER | `RuntimeDriverEntryPoint` | Persists after OS boot |
| APPLICATION | `ShellAppEntryPoint` / OS Loader | Temporary |

### Entry Point Signature

For UEFI 2.x, all DXE entry points follow:

```c
typedef EFI_STATUS (*ENTRY_POINT)(
    IN EFI_HANDLE           ImageHandle,
    IN EFI_SYSTEM_TABLE     *SystemTable
);
```

### depex (DXE version -- same as PEI depex but evaluated by DXE dispatcher)

DXE depex uses identical opcodes. The dependency grammar follows:

```
"DEPENDENCY" "{" VendorGuid "AND" VendorGuid "OR" ... "}"
```

From a RE standpoint, depex tells you what protocols the driver consumes. The dispatcher stalls the driver until all dependencies are met.

### FV Filesystem Parsing for DXE

When you open an FV in UEFITool, look for files of type `EFI_FV_FILETYPE_DRIVER` (0x08). Extract the PE32+ section and load into IDA/Ghidra with correct subsystem type:

```text
Subsystem: EFI_BOOT_SERVICE_DRIVER (0x0B)
           or EFI_RUNTIME_SERVICE_DRIVER (0x0C)
           or EFI_APPLICATION (0x0A)
```

---

## 5. UEFI PE Format vs Standard Windows PE

UEFI uses PE32/PE32+ as its executable format -- it's the same COFF/PE spec [8](https://uefi.org/specs/UEFI/2.10/02_Overview.html). But there are critical differences in practice.

### Subsystem Values

| Subsystem | Value | UEFI Usage |
|-----------|-------|------------|
| IMAGE_SUBSYSTEM_EFI_APPLICATION | 0x0A | UEFI apps, OS loaders |
| IMAGE_SUBSYSTEM_EFI_BOOT_SERVICE_DRIVER | 0x0B | Boot-time DXE drivers |
| IMAGE_SUBSYSTEM_EFI_RUNTIME_DRIVER | 0x0C | Runtime DXE drivers |
| IMAGE_SUBSYSTEM_EFI_ROM | 0x0D | Option ROMs |

Compare to Windows PE: `IMAGE_SUBSYSTEM_WINDOWS_CUI` (3), `IMAGE_SUBSYSTEM_WINDOWS_GUI` (2).

### UEFI PE Differences from Windows PE

| Aspect | Windows PE | UEFI PE |
|--------|-----------|---------|
| Subsystem | GUI/CUI (2,3) | EFI_* (0xA-0xD) |
| Import library | ntdll.dll, kernel32.dll | None (no DLL linking) |
| Exports | Optional | Required for protocol registration |
| Relocations | Optional for EXE | Required (always use /DYNAMICBASE) |
| TLS | Yes | Rarely used |
| Debug directory | Common | Present in dev builds, stripped in prod |
| Resource section | `.rsrc` | Present in HII drivers |
| Section names | `.text`, `.rdata`, `.data`, `.reloc` | Same (EDK2 conventions) |
| IAT | Resolved by OS loader | Resolved by DXE dispatcher |

**Critical implication:** UEFI drivers have **no import address table** in the Windows sense. Instead, they call through the **System Table** -- a structure passed at entry. All protocol functions are resolved dynamically via `LocateProtocol()` / `HandleProtocol()` calls with GUIDs [9](https://dev.to/machinehunter/how-to-reverse-uefi-modules-dxe-driver-54fb).

### How to Spot a UEFI Driver in IDA

1. Open `.efi` file
2. Check `IMAGE_NT_HEADERS.OptionalHeader.Subsystem`
3. Subsystem in range 0xA-0xD = UEFI module
4. If the loader pegs it as a Windows driver, manually override the subsystem

### Common UEFI Sections

| Section | Content |
|---------|---------|
| `.text` | Executable code |
| `.data` | Read-write globals |
| `.rdata` | Read-only data, string literals |
| `.reloc` | Base relocations (mandatory) |
| `.debug` | Debug symbols (FV = stripped; development builds may have it) |
| `.sec` | Security-related certs |
| `.sdxe` | Combined SMM/DXE sections |
| `.build` | Build info (toolchain, timestamps) |

---

## 6. TE (Terse Executable) Format

TE is a stripped-down PE variant used in PEI and sometimes SMM for space efficiency [10](https://uefi.org/specs/PI/1.8A/V1_TE_Image.html).

### TE vs PE Headers Comparison

| Field | PE32+ offset | TE offset | Notes |
|-------|-------------|-----------|-------|
| DOS header | 0x00 | Removed | Not present |
| PE signature | 0x80 | 0x00 | "VZ" magic instead of "PE\0\0" |
| COFF header | 0x84 | 0x02 | Same format, immediately after signature |
| Optional header | 0x94 | 0x12 | Stripped -- only SizeOfHeaders + Subsystem + ImageBase |
| Sections | After optional | After optional | Same COFF section headers |
| Data directories | Full | Removed | TE has zero data directories |

**TE magic:** `VZ` (0x5A56), not `PE\0\0`. The "Terse" name is a play on "V" being next to "T" and "Terse" meaning concise.

**When you find a `VZ` binary:**
1. Identify it via hex search (`56 5A` on little-endian)
2. Know that it lacks data directory entries (no IAT, no import/export tables)
3. EDK2's `BaseTools` can convert TE to PE32+ for easier loading in IDA

---

## 7. GUIDs, Protocols, and Handles

The entire UEFI ecosystem runs on GUID-addressed interfaces [11](https://tianocore-docs.github.io/edk2-UefiDriverWritersGuide/draft/3_foundation/34_handle_database.html).

### Core Data Model

```
Handle (opaque integer key)
  ↓
  └── Protocol (GUID-name, interface struct pointer)
  ↓
  └── Protocol (different GUID, different struct)
```

### How Protocol Resolution Works

```c
// Locate protocol by GUID -- the most common pattern
EFI_GUID gEfiSimpleFileSystemProtocolGuid = {0x0964e5b22,...};

EFI_SIMPLE_FILE_SYSTEM_PROTOCOL *fs;
gBS->LocateProtocol(&gEfiSimpleFileSystemProtocolGuid, NULL, (void**)&fs);
```

- `gBS` = pointer to `EFI_BOOT_SERVICES` table (part of System Table)
- Protocol GUIDs are how drivers find each other at runtime

### Key GUIDs for RE (by category)

**Boot Services Protocols:**

| GUID String | Protocol Name | RE Relevance |
|-------------|---------------|--------------|
| 095BF1D4-3B4D-4C82-9E33-0C0A89EF6C7D | `gEfiLoadedImageProtocolGuid` | Find module base/size |
| 0964E5B22-6459-11D2-8E39-00A0C969723B | `gEfiSimpleFileSystemProtocolGuid` | File I/O |
| 5B1B31A1-9562-11D2-8E3F-00A0C969723B | `gEfiBlockIoProtocolGuid` | Disk access |
| D7F9D2D1-B74F-4E04-93E8-E2AAC2FBC6AF | `gEfiGraphicsOutputProtocolGuid` | Framebuffer output |
| 26BACCC0-6F1E-11D4-BC2A-0080C73C8881 | `gEfiDevicePathProtocolGuid` | Device identification |
| 400C7ADF-2061-4C4A-84CF-589FE2B4AB1A | `gEfiSecurityArchProtocolGuid` | Secure Boot checks |
| 94A3488A-EC7E-467B-8FC6-7522C6F43EB8 | `gEfiSecurity2ArchProtocolGuid` | Secure Boot 2 checks |
| 7D6CEE85-31AE-4EC2-9356-7D6BCC8FB8A4 | `gEfiHiiDatabaseProtocolGuid` | HII forms |
| 2045B6D7-9A9B-4D1F-B8A7-5B6EE3F1C755 | `gEfiSmmCommunicationProtocolGuid` | SMM trampoline |

**Runtime Services Protocols:**

| GUID String | Protocol Name | RE Relevance |
|-------------|---------------|--------------|
| 8868E871-E4F1-11D3-BC22-0080C73C8881 | `gEfiVariableArchProtocolGuid` | NVRAM variables |
| 51D05024-CDF2-4E9F-B61A-DFA0C9C0CCE2 | `gEfiVariableWriteArchProtocolGuid` | Writing NVRAM |
| 6B38B2D0-039A-48EE-8B9A-4CED13382F9C | `gEfiFirmwareManagementProtocolGuid` | Firmware update |

### How to Find GUIDs in a Binary

```
strings driver.efi | grep -i "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

In IDA: search for known GUID byte patterns (16 byte sequences). EfiXplorer auto-labels them.

### Protocol Registration Pattern (DXE)

Drivers usually:
1. Call `gBS->InstallProtocolInterface()` or `InstallMultipleProtocolInterfaces()`
2. Pass a PROTOCOL_INTERFACE structure containing function pointers
3. These function pointers are the API surface of the driver

**RE pattern:** Install calls are heavily inlined via EDK2 macros. Look for a function that allocates a structure, fills it with function pointers, and passes it to a GUID-identified call.

---

## 8. Toolchain for UEFI RE

### Extraction & Parsing

**UEFITool / UEFIExtract** [12](https://github.com/LongSoft/UEFITool)

- View and extract individual FFS files from a firmware image
- Parse FV, FFS, sections, and decompress
- Extract PE32+/TE/Raw sections per file
- CLI mode via `UEFIExtract` for batch extraction
- Identify file types, GUIDs, and nesting

```
# Batch extract all PE32 images from firmware.bin
UEFIExtract firmware.bin extract all
```

**uefi-firmware-parser** (Python) [13](https://github.com/theopolis/uefi-firmware-parser)

- Parse FV, FFS, TE, PE32+, and various section types
- Extract GUID-based dependency trees
- Output JSON for programmatic analysis

```
pip install uefi-firmware-parser
uefi-firmware-parser firmware.bin --json
```

**CHIPSEC** (platform security assessment) [14](https://github.com/chipsec/chipsec)

Run on a live system to dump/validate firmware:
- SPI flash reading (via `/dev/mem` or `ICH9` HW sequencing)
- SPI descriptor parsing (FD, ME, GbE, BIOS regions)
- NVRAM variable enumeration
- Known rootkit detection (LoJax, ThinkPwn)
- SMI handler enumeration
- PCR/TPM attestation state

```
python chipsec_main.py -m tools.uefi.scan_all
python chipsec_main.py -m common.spi_desc
python chipsec_main.py -m common.bios_wp
```

The CHIPSEC static analysis skill [15](https://lobehub.com/skills/aiskillstore-marketplace-chipsec) can also run offline on dumped firmware images.

### Static Analysis

**IDA Pro + efiXplorer** by Binarly [16](https://github.com/binarly-io/efiXplorer)

- Loader module (efiXloader) handles PE32+ and TE
- Auto-recognizes UEFI protocols by GUID
- Renames functions matching known EDK2 patterns
- Parses dependency expressions (depex)
- Builds cross-references for protocol usage

```
Plugins → efiXplorer → Scan Image
```

**Ghidra** (NSA)

- Built-in PE loader handles subsystem identification
- Use `UEFI FFS` or `UEFI Volume` as a container if loading raw images
- Manual: extract PE32+ via UEFITool, load as PE, set `ImageBase` and `Subsystem`
- Community scripts for protocol GUID labeling [17](https://github.com/ANSSI-FR/ghidra-uefi)
- `Load UEFI Volume` script for whole-image loading

**Binary Ninja + UEFI plugin** [18](https://binary.ninja/2024/08/23/uefi-firmware-analysis.html)

- Native UEFI analysis (2024+ release)
- FV file parsing, GUID labeling, protocol call detection
- Good for automated driver identification

**efiXloader2** [19](https://github.com/p-state/ida-efitools2)

- Alternative IDA loader with TE support
- Unpacks EDK2 FFS sections
- Applies subsystem type automatically

### Dynamic Analysis / Emulation

**QEMU + OVMF** (edk2 from Tianocore)

- Build a UEFI development target: `OvmfPkg/build.sh`
- Boot with `-bios ovmf.fd` and debug via GDB
- Limited for prod firmware (custom chipsets don't boot under QEMU)

**SentinelOne's emulation approach** [20](https://labs.sentinelone.com/moving-from-manual-re-of-uefi-modules-to-dynamic-emulation-of-uefi-firmware/)

- Extracted DXE drivers rehosted in unicorn/panada emulator
- Fills System Table + Boot Services with stubs
- Traces protocol calls, captures I/O
- Useful for understanding driver behavior without hardware

**Intel Simics** / **FirmWire** (firmware emulation framework)

- Emulates entire firmware image with hardware model
- Good for complex rehosting (phone, embedded UEFI)
- Steep learning curve but most accurate

---

## 9. SPI Flash Dumping Methods

Modern firmware lives on SPI NOR flash. Access is locked down by the chipset.

### Hardware Methods

**CH341A Programmer** (< $10) [21](https://www.blackhillsinfosec.com/dumping-firmware-with-the-ch341a-programmer/)

- SOIC-8/SOIC-16 test clip clips onto the flash chip on the motherboard
- Voltage issues: CH341A outputs 5V by default; SPI flash is 3.3V (or 1.8V on modern boards)
- Use 3.3V adapter or a level shifter; 1.8V adapter for AMD AM4/AM5
- Dump: `flashrom -p ch341a_spi -r firmware.bin`
- Limitations: requires physical access, board disassembly, risk of damaging chip

| Programmer | Voltage | Speed | Reliability |
|-----------|---------|-------|------------|
| CH341A | 5V (mod) | Slow | Low (voltage issues) |
| Dediprog SF100/SF600 | 1.8V/3.3V | Fast | High (industry std) |
| TL866 series | 3.3V | Medium | Medium |
| FT2232H | Configurable | Fast | High |

**Dediprog SF100/SF600** ($300+)

- Industry standard for firmware engineers
- Supports 1.8V natively (modern platforms)
- Software: Dediprog SPI_Flash_Tool
- Used by motherboard OEMs

**clip vs desolder:** Test clips work for dumps; desoldering is safer for writes (clip contact can glitch).

### Software Methods

**flashrom** (open source, linux) [22](https://flashrom.org/)

```
# Read entire SPI flash
sudo flashrom -p internal -r bios.bin

# Read only BIOS region (requires unlocked descriptor)
sudo flashrom -p internal --ifd -i bios -r bios_region.bin

# Read with external programmer
flashrom -p ch341a_spi -r dump.bin
```

- Uses chipset's SPI controller (HW sequencing on recent Intel)
- Respects BIOS region protection (will fail/warn if locked)
- Intel chipsets: `internal` programmer accesses via LPC/FWH or SPI registers

**Intel FPT (Flash Programming Tool)** [23](https://bittention.com/programs/intel-fpt/)

- Part of Intel ME System Tools
- Works through ME interface, can access all regions
- Requires ME firmware to be functional
- Usage on Windows: `fptw64.exe -d bios.bin -BIOS`
- Full SPI: `fptw64.exe -d full.bin`

**intel_bios_dumper** (Python) [24](https://linuxcommandlibrary.com/man/intel_bios_dumper)

- Reads via `/dev/mem` mapping SPI MMIO region
- Parses Intel Flash Descriptor to find region boundaries
- Dumps complete image if access permissions allow

### SPI Flash Descriptor (Intel)

The first 4KB of flash is the Flash Descriptor (FD). It defines [25](https://winraid.level1techs.com/t3553f39-Guide-Unlock-Intel-Flash-Descriptor-Read-Write-Access-Permissions-for-SPI-Servicing):

```
FD:
  +0x00: Descriptor Signature (0x0FF0A55A)
  +0x04: Version + Reserved
  +0x08: FLASH Map (region offsets + sizes)
  +0x0C-0xFC: Region access permissions (FLMSTRn)
  +0x100+: ME region (CSE firmware)
  +Offset: BIOS region
  +Offset: GbE region
```

| Region | Purpose | RE Interest |
|--------|---------|-------------|
| Descriptor | Permissions, layout map | High -- controls what you can dump |
| BIOS | UEFI firmware | High -- where DXE/PEI lives |
| ME (CSE) | Management Engine | Medium -- black box, encrypted |
| GbE | Gigabit Ethernet NVRAM | Low -- MAC/config |

**Locking mechanism:** The FD has per-region read/write permissions (FLMSTR registers). If the BIOS region is read-locked, software dumps will return `0xFF` (erased) or `0x00`. Physical dump via programmer bypasses this.

### Locking Bypass Techniques

- **Descriptor unlock:** Modify FD read permissions in dump, reflash (requires two HW accesses)
- **SMM manipulation:** Known SMI callout vulnerabilities to disable BIOS lock [26](https://eclypsium.com/blog/smm-callout-vulnerabilities-in-uefi/)
- **SPI controller reconfiguration:** Set `BIOS_CNTL` register (requires kernel driver or `/dev/mem` write)

---

## 10. UEFI Rootkits: Analysis Methodology

Only five in-the-wild UEFI bootkits have been publicly documented (2018-2024) [27](https://www.welivesecurity.com/2021/10/05/uefi-threats-moving-esp-introducing-especter-bootkit/).

### Known Families

| Name | Year | Discoverer | Target | Persistence | Secure Boot |
|------|------|-----------|--------|-------------|-------------|
| LoJax | 2018 | ESET | Windows | SPI flash write | Bypassed |
| MosaicRegressor | 2019 | Kaspersky | Windows | SPI flash | N/A |
| ESPecter | 2021 | ESET | Windows | ESP partition | N/A |
| FinSpy bootkit | 2021 | Kaspersky | Windows | SPI + ESP | Varied |
| BlackLotus | 2023 | ESET | Windows | ESP + BCD | Bypassed |
| Bootkitty | 2024 | ESET | Linux | ESP (PoC) | Self-signed only |

### LoJax (APT28 / Fancy Bear / Sednit)

The first UEFI rootkit found in the wild [28](https://www.eset.com/me/whitepapers/lojax-first-uefi-rootkit-found-in-the-wild-courtesy-of-the-sednit-group/).

**Infection flow:**

```
1. LoJack (Computrace) agent on Windows
2. Agent writes UEFI module to SPI flash via SMI call
3. On reboot, UEFI module runs during DXE phase
4. Module drops Windows agent (trojanized LoJack) to disk
5. Disk-level agent survives OS reinstall
```

**RE methodology used by ESET:**
1. Dump SPI flash via Intel FPT + CHIPSEC
2. Compare with known-good vendor image (hash difference)
3. Carve the injected module from the BIOS region
4. Extract PE32+ via UEFITool
5. Load in IDA with efiXplorer -- identify protocol calls
6. Trace the dropped disk agent (trojanized Computrace)

**Detection artifacts:**
- Unexpected FFS file in BIOS region with unknown GUID
- SPI flash content differs from factory image
- CHIPSEC UEFI scan flags anomalous modules [29](https://andreafortuna.org/2026/06/12/uefi-bootkits/)

### ESPecter (ESP-resident bootkit)

Targets the EFI System Partition (ESP) rather than SPI flash [27](https://www.welivesecurity.com/2021/10/05/uefi-threats-moving-esp-introducing-especter-bootkit/) [30](https://andreafortuna.org/2026/06/12/uefi-bootkits/).

**Difference from LoJax:**
- No SPI flash write (avoids SPI lock issues)
- Modifies the **bootloader** on the ESP
- Hooks `EFI_SECURITY_ARCH_PROTOCOL` to bypass Secure Boot
- Intercepts `EFI_SIMPLE_FILE_SYSTEM_PROTOCOL` to hide files

**RE approach:**
1. Mount ESP, extract `EFI/Microsoft/Boot/bootmgfw.efi`
2. Compare with known-good via hash or PE structure analysis
3. The patched version has modified import table or section injection
4. Analyze the IAT modifications -- what APIs are hooked?
5. Trace hook targets: protocol functions in System Table

### BlackLotus (first Secure Boot-bypassing bootkit)

"BlackLotus is the first known UEFI bootkit that can bypass UEFI Secure Boot on fully patched Windows 11 systems" [31](https://www.eset.com/us/about/newsroom/research/eset-research-analyzes-blacklotus-a-uefi-bootkit-that-can-bypass-uefi-secure-boot-on-fully-patched-systems/).

**Technique:**
1. Exploits CVE-2022-21894 (Secure Boot bypass)
2. Deploys to ESP as a malicious bootloader
3. Uses a vulnerable, still-trusted Windows bootloader that doesn't validate policy
4. Bootkit launches before OS security stack initializes
5. Drops kernel-mode driver to disable Defender, etc.

**Bootkitty** (first Linux UEFI bootkit, 2024) [32](https://www.welivesecurity.com/en/eset-research/bootkitty-analyzing-first-uefi-bootkit-linux/):
- Hooks `EFI_SECURITY2_ARCH_PROTOCOL` and `EFI_SECURITY_ARCH_PROTOCOL`
- Patches GRUB verifier checks
- Self-signed cert -- requires Secure Boot disabled or attacker cert installed (PoC stage)

### General UEFI Rootkit RE Workflow

```
SPI dump → UEFITool extraction → Module analysis → Protocol trace → Payload chain
```

1. **Acquire firmware** -- hardware dump (bypasses SW protections) or software (if descriptor allows)
2. **Identify anomalies** -- `UEFITool` compare against known-good; look for unknown FFS files/GUIDs
3. **Extract suspect modules** -- PE32+ or TE sections from anomalous FFS entries
4. **Analyze PE header** -- subsystem, entry point, section layout
5. **Load in IDA/Ghidra** -- use efiXplorer or UEFI Ghidra scripts for GUID labeling
6. **Map protocol usage** -- identify `LocateProtocol`, `InstallProtocol`, `HandleProtocol` calls
7. **Trace dropped payload** -- disk-level agent, kernel module, or registry persistence
8. **Check ESP** -- compare bootmgfw.efi/bootx64.efi against known-good hashes
9. **Check NVRAM** -- `chipsec` variable enumeration for suspicious boot entries
10. **Document hook chain** -- which protocol functions are intercepted and what they redirect to

---

## 11. Secure Boot Internals for RE

Secure Boot is UEFI's trust model, but it's regularly bypassed. Understanding the internals is essential for rootkit analysis [33](https://uefi.org/specs/UEFI/2.10/02_Overview.html).

### Key Concepts

| Term | Definition |
|------|-----------|
| PK | Platform Key -- top-level trust anchor |
| KEK | Key Exchange Key -- intermediate CA |
| db | ALLOW list -- signed images allowed to boot |
| dbx | DENY list -- revoked signatures/hashes |
| Image | Every PE/PE32+ signed with SHA-256 hashes or auth data |
| SetupMode | If PK is absent, system is in setup mode (all unsigned images allowed) |

### How Secure Boot Works at Boot

```
SEC/PEI → DXE dispatcher checks each driver signature
            ↓
          Check dbx first (revoked?)
            ↓
          Check db (allowed?)
            ↓
          If neither, check if image is signed by KEK or PK
            ↓
          If unverified → load allowed? (depends on policy)
```

### RE-Relevant Secure Boot Bypasses

| Vulnerability | Type | Impact | Firmed? |
|--------------|------|--------|---------|
| CVE-2022-21894 | Boot policy bypass | Load untrusted bootloader | Revoked via dbx |
| CVE-2024-7344 | Boot manager bypass | Untrusted code during boot | Pending |
| CVE-2023-24932 | BlackLotus vector | BCD manipulation | Revoked |
| LogoFAIL | Image parser vuln | Payload during logo display | OEM-specific |
| Baton Drop | Boot manager flow | Chain of trust breakage | Patch in progress |

### Recovery Bypass Vector

Many bypasses follow this pattern:

```
Vulnerable bootloader (still in db) → loads policy from BCD
                                     → BCD points to attacker bootloader
                                     → attacker bootmgfw.efi sideloads rootkit
```

The vulnerable bootloader is still signed by a trusted key, so it passes Secure Boot. It then loads the attacker's unsigned bootloader because it doesn't validate the boot policy file [34](https://arstechnica.com/information-technology/2023/03/unkillable-uefi-malware-bypassing-secure-boot-enabled-by-unpatchable-windows-flaw/).

### Bootkit Detection by Secure Boot Attestation

- TPM PCR 0, 2, 4, 7 measure firmware components
- BlackLotus leaves traces in PCR measurements (used by Windows Defender System Guard)
- CHIPSEC can query TPM quote for remote attestation

---

## 12. Bootkit Technical Deep Dive

### SMM Rootkits (Ring -2)

System Management Mode runs at the highest x86 privilege level [35](https://github.com/Cr4sh/SmmBackdoor).

- Triggered via System Management Interrupt (SMI)
- OS is transparent to SMM execution (state saved/resumed)
- SMM code resides in SMRAM (locked after boot)
- SMI handlers are registered via `EFI_SMM_SW_DISPATCH2_PROTOCOL`

**RE approach to SMM:**
1. Dump SMRAM region (requires special access)
2. Identify SMI handler dispatch table in UEFI firmware
3. Each handler registered with a GUID and entry point
4. Entry points are standard DXE drivers loaded into SMRAM
5. Extract via UEFITool -- look for files with `EFI_FV_FILETYPE_COMBINED_MM_DXE` type
6. Analyze communication buffer between OS (ring 0) and SMM (ring -2)

**Known SMM vulnerabilities:**
- **SMM Callout:** SMI handler calls back into untrusted memory [26](https://eclypsium.com/blog/smm-callout-vulnerabilities-in-uefi/)
- **SMRAM bypass:** Cache poisoning to execute from non-SMRAM regions
- **Variable override:** NVRAM manipulation via SMM communication buffer

### ESP Bootkits vs SPI Flash Bootkits

| Aspect | ESP Bootkit | SPI Flash Bootkit |
|--------|-------------|-------------------|
| Persistence | ESP partition (disk) | SPI flash chip |
| Write access | OS writeable (mount ESP) | Requires SPI unlock / SMI |
| Detection | Standard AV/EDR | Only firmware dump |
| Survives disk format | No | Yes |
| Survives BIOS flash | Yes (reinstalls) | No |
| Real-world example | ESPecter, BlackLotus | LoJax, MosaicRegressor |

### UEFI Module Tampering Indicators

When analyzing a suspicious UEFI module, check these in order:

1. **GUID collision** -- two files with same `EFI_FV_FILETYPE_GUID`? Injected module often uses known GUID
2. **UI string mismatch** -- extracted `.efi` name vs expected name
3. **DepEx anomaly** -- unusual dependency sequence (empty or ALL BEFORE)
4. **Section count** -- unexpected raw sections beyond `.text/.data/.reloc`
5. **Entry point hash** -- compare to known-good via vendor database
6. **Subsystem mismatch** -- a module claiming to be DXE driver but missing Boot Service table references
7. **Relocation section** -- absent in malicious builds (malware compiled with /FIXED)

---

## 13. References

1. UEFI PI Spec v1.8, Overview of Boot Phases. https://uefi.org/specs/PI/1.8A/V2_Overview.html
2. Binary Ninja Blog, "Advanced UEFI Analysis with Binary Ninja" (2024). https://binary.ninja/2024/08/23/uefi-firmware-analysis.html
3. UEFI PI Spec v1.8, Hand-Off Blocks (HOBs). https://uefi.org/specs/PI/1.8A/V2_Overview.html
4. EDK II Build Spec, Firmware Images. https://tianocore-docs.github.io/edk2-BuildSpecification/draft/2_design_discussion/22_uefipi_firmware_images.html
5. UEFI PI Spec v1.8, PEIMs. https://uefi.org/specs/PI/1.8A/V1_PEIMs.html
6. EDK II Build Spec, Generic Build Process. https://tianocore-docs.github.io/edk2-BuildSpecification/draft/2_design_discussion/25_generic_build_process.html
7. EDK II UEFI Driver Writer's Guide, Protocols and Handles. https://edk2-docs.gitbook.io/edk-ii-uefi-driver-writer-s-guide/3_foundation/36_protocols_and_handles
8. UEFI Spec 2.10, Overview. https://uefi.org/specs/UEFI/2.10/02_Overview.html
9. MachineHunter, "How to Reverse UEFI Modules (DXE Driver)". https://dev.to/machinehunter/how-to-reverse-uefi-modules-dxe-driver-54fb
10. UEFI PI Spec v1.8, TE Image. https://uefi.org/specs/PI/1.8A/V1_TE_Image.html
11. EDK II UEFI Driver Writer's Guide, Handle Database. https://tianocore-docs.github.io/edk2-UefiDriverWritersGuide/draft/3_foundation/34_handle_database
12. LongSoft/UEFITool on GitHub. https://github.com/LongSoft/UEFITool
13. theopolis/uefi-firmware-parser on GitHub. https://github.com/theopolis/uefi-firmware-parser
14. CHIPSEC Platform Security Framework. https://github.com/chipsec/chipsec
15. CHIPSEC Static Firmware Analysis Skill. https://lobehub.com/skills/aiskillstore-marketplace-chipsec
16. binarly-io/efiXplorer on GitHub. https://github.com/binarly-io/efiXplorer
17. ANSSI-FR/ghidra-uefi on GitHub. Community UEFI scripts for Ghidra.
18. p-state/ida-efitools2 on GitHub. https://github.com/p-state/ida-efitools2
19. Black Hills Infosec, "Dumping Firmware With the CH341A Programmer". https://www.blackhillsinfosec.com/dumping-firmware-with-the-ch341a-programmer/
20. SentinelOne Labs, "Moving from Manual RE to Dynamic Emulation of UEFI Firmware". https://labs.sentinelone.com/moving-from-manual-re-of-uefi-modules-to-dynamic-emulation-of-uefi-firmware
21. flashrom. https://flashrom.org/
22. Intel FPT (Flash Programming Tool). https://bittention.com/programs/intel-fpt/
23. intel_bios_dumper. https://linuxcommandlibrary.com/man/intel_bios_dumper
24. Win-Raid Forum, "Unlock Intel Flash Descriptor Permissions". https://winraid.level1techs.com/t3553f39-Guide-Unlock-Intel-Flash-Descriptor-Read-Write-Access-Permissions-for-SPI-Servicing
25. Eclypsium, "SMM Callout Vulnerabilities in UEFI". https://eclypsium.com/blog/smm-callout-vulnerabilities-in-uefi/
26. WeLiveSecurity, "UEFI Threats Moving to the ESP: Introducing ESPecter Bootkit" (2021). https://www.welivesecurity.com/2021/10/05/uefi-threats-moving-esp-introducing-especter-bootkit/
27. ESET Whitepaper, "LoJax: First UEFI Rootkit Found in the Wild". https://www.eset.com/me/whitepapers/lojax-first-uefi-rootkit-found-in-the-wild-courtesy-of-the-sednit-group/
28. Andrea Fortuna, "UEFI Bootkits: Firmware Implants and Artifacts" (2026). https://andreafortuna.org/2026/06/12/uefi-bootkits/
29. ESET Research, "BlackLotus: UEFI Bootkit Bypassing Secure Boot". https://www.eset.com/us/about/newsroom/research/eset-research-analyzes-blacklotus-a-uefi-bootkit-that-can-bypass-uefi-secure-boot-on-fully-patched-systems/
30. ESET Research, "Bootkitty: Analyzing the First UEFI Bootkit for Linux" (2024). https://www.welivesecurity.com/en/eset-research/bootkitty-analyzing-first-uefi-bootkit-linux/
31. ESET Research, "Under the Cloak of UEFI Secure Boot: CVE-2024-7344". https://www.welivesecurity.com/en/eset-research/under-cloak-uefi-secure-boot-introducing-cve-2024-7344/
32. Ars Technica, "Stealthy UEFI Malware Bypassing Secure Boot" (2023). https://arstechnica.com/information-technology/2023/03/unkillable-uefi-malware-bypassing-secure-boot-enabled-by-unpatchable-windows-flaw/
33. Cr4sh/SmmBackdoor. https://github.com/Cr4sh/SmmBackdoor
34. Margin Research, "Emulating and Exploiting UEFI Firmware" (2023). https://margin.re/2023/09/emulating-and-exploiting-uefi-firmware/
35. Quarkslab, "Using an Unimpressive Bug in EDK II to Do Some Fun Exploitation". https://blog.quarkslab.com/for-science-using-an-unimpressive-bug-in-edk-ii-to-do-some-fun-exploitation.html
36. BleepingComputer, "BootKitty UEFI Malware Exploits LogoFAIL" (2024). https://www.bleepingcomputer.com/news/security/bootkitty-uefi-malware-exploits-logofail-to-infect-linux-systems/
37. UEFI Spec 2.10, Services - Boot Services. https://uefi.org/specs/UEFI/2.9_A/07_Services_Boot_Services.html
38. Phrack #66, "A Real SMM Rootkit: Reversing and Hooking BIOS SMI Handlers". https://phrack.org/issues/66/11
