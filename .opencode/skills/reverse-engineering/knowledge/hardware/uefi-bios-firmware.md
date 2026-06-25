# UEFI/BIOS Firmware Reverse Engineering

TL;DR: UEFI firmware is PE-based modules organized in Firmware Volumes. DXE drivers are the main RE target. Use UEFITool to extract, IDA+efiXplorer or Ghidra to analyze. Rootkits persist in SPI flash or ESP.

---

## Boot Phases

| Phase | Purpose | RE Focus |
|-------|---------|----------|
| SEC | Root of trust, Cache-as-RAM | 5% (microcode/asm) |
| PEI | Memory discovery, basic HW init | 15% (early init) |
| DXE | Full platform init, drivers | 80% (main codebase) |
| BDS | Boot device selection | OS loader |
| SMM | Ring -2, SMI handlers | High-value target |

## Firmware File System (FFS)

Structure: Firmware Volume > FFS File > Sections (PE32/TE/RAW/compressed)

Key file types: DRIVER (0x08), PEIM (0x07), APPLICATION

Section types: PE32 (0x10), TE (0x12), COMPRESSION (0x1C), GUID_DEFINED (0x1B)

## PE Format Differences (UEFI vs Windows)

| Aspect | Windows PE | UEFI PE |
|--------|-----------|---------|
| Subsystem | GUI/CUI (2,3) | EFI_* (0xA-0xD) |
| Imports | DLL linking | None (System Table calls) |
| Relocations | Optional | Required (always) |
| IAT resolution | OS loader | DXE dispatcher via GUIDs |

Subsystem values: 0x0A=App, 0x0B=Boot Driver, 0x0C=Runtime Driver, 0x0D=ROM

## TE (Terse Executable)

Magic: `VZ` (0x5A56). Stripped PE for PEI/SMM. No data directories, no DOS header.

## GUID Protocol System

All UEFI interaction via GUID-addressed interfaces:
```
gBS->LocateProtocol(&gEfiSimpleFileSystemProtocolGuid, NULL, (void**)&fs);
```

Key GUIDs for RE:
- `gEfiLoadedImageProtocolGuid` - module base/size
- `gEfiSimpleFileSystemProtocolGuid` - file I/O
- `gEfiSecurityArchProtocolGuid` - Secure Boot checks
- `gEfiSmmCommunicationProtocolGuid` - SMM trampoline
- `gEfiFirmwareManagementProtocolGuid` - firmware update

## Toolchain

| Tool | Purpose |
|------|---------|
| UEFITool/UEFIExtract | Parse FV, extract PE32/TE sections |
| uefi-firmware-parser | Python-based, JSON output |
| CHIPSEC | SPI dump, BIOS lock check, rootkit scan |
| IDA + efiXplorer | Auto GUID labeling, protocol tracking |
| Ghidra + UEFI scripts | Community GUID scripts |
| Binary Ninja UEFI plugin | Native FV parsing |
| QEMU + OVMF | Dynamic analysis |

## SPI Flash Dumping

Hardware: CH341A ($10, 3.3V mod needed), Dediprog SF600 ($300+, 1.8V native)

Software: `flashrom -p internal -r bios.bin` or `fptw64.exe -d full.bin`

Intel Flash Descriptor at offset 0: signature 0x0FF0A55A, defines region permissions.

If BIOS region is read-locked: software dumps return 0xFF. Physical programmer bypasses.

## UEFI Rootkits

| Name | Year | Persistence | Technique |
|------|------|-------------|-----------|
| LoJax | 2018 | SPI flash write | Injected DXE module |
| ESPecter | 2021 | ESP partition | Hooks Security protocol |
| BlackLotus | 2023 | ESP + BCD | CVE-2022-21894 bypass |
| Bootkitty | 2024 | ESP (Linux PoC) | Hooks GRUB verifier |

## Rootkit RE Workflow

```
SPI dump -> UEFITool compare vs known-good -> Extract suspect PE32+
-> IDA/Ghidra + efiXplorer -> Map protocol usage -> Trace payload
```

Detection indicators:
- Unknown FFS file GUID in BIOS region
- SPI flash differs from factory image
- CHIPSEC flags anomalous modules
- ESP bootloader hash mismatch

## Secure Boot

Trust chain: PK > KEK > db (allow) / dbx (deny)

Bypass pattern: Vulnerable bootloader (still in db) loads attacker BCD -> sideloads rootkit

## SMM (Ring -2)

- Triggered via SMI, OS is transparent
- SMRAM locked after boot
- Handlers registered via `EFI_SMM_SW_DISPATCH2_PROTOCOL`
- Vulnerabilities: SMM Callout (calls untrusted memory), SMRAM cache poisoning

## DXE Driver Entry Point

```c
EFI_STATUS DriverEntry(EFI_HANDLE ImageHandle, EFI_SYSTEM_TABLE *SystemTable);
```

Pattern: InstallProtocolInterface with function pointer struct = driver's API surface.
