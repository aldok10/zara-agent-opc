# Windows Kernel Drivers & Rootkit RE

TL;DR: Kernel drivers are PE files with Subsystem=NATIVE(1), entry=DriverEntry, imports from ntoskrnl.exe. RE focuses on IRP dispatch table (MajorFunction[0x0E] for IOCTL). Rootkits use SSDT hooks, DKOM, minifilters, or kernel callbacks. Detect with Volatility 3.

---

## Driver PE Structure

| Attribute | Kernel Driver |
|-----------|--------------|
| Subsystem | IMAGE_SUBSYSTEM_NATIVE (1) |
| Entry point | DriverEntry (or GsDriverEntry wrapper) |
| Imports | ntoskrnl.exe, hal.dll, NDIS.sys, fltmgr.sys |
| Relocations | Required (KASLR) |
| Checksum | Required for signing |

## DriverEntry Pattern

```c
NTSTATUS DriverEntry(PDRIVER_OBJECT DriverObject, PUNICODE_STRING RegistryPath) {
    IoCreateDevice(...);
    IoCreateSymbolicLink(...);
    DriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL] = MyDeviceControl;
    DriverObject->DriverUnload = MyUnload;
    return STATUS_SUCCESS;
}
```

GsDriverEntry: two-call stub, second call is real DriverEntry. No DriverUnload = can't unload (anti-forensics).

## IRP Dispatch & IOCTL

DRIVER_OBJECT at +0x70: MajorFunction array (28 entries). IRP_MJ_DEVICE_CONTROL = index 0x0E.

IOCTL code (32-bit): `[DeviceType:16][Access:2][FunctionCode:12][Method:2]`

| Method | Buffer Source | Risk |
|--------|--------------|------|
| METHOD_BUFFERED (0) | SystemBuffer | Safe-ish |
| METHOD_NEITHER (3) | Irp->UserBuffer | Highest risk |

**Finding IOCTLs in disassembler:**
1. Find DriverEntry -> MajorFunction[0x0E] handler
2. Apply PIRP type to second parameter
3. Trace to CurrentStackLocation -> Parameters.DeviceIoControl.IoControlCode
4. Look for `cmp eax, 0x...` chains (IOCTL comparison)

## Driver Signing & PatchGuard

x64 Windows 10+: WHQL signature mandatory. VBS+HVCI makes unsigned unloadable.

PatchGuard protects: SSDT, IDT, GDT, kernel .text, HalDispatchTable, MSR registers. Triggers bugcheck 0x109 on detection (delayed random timer).

HVCI: Pages never both writable and executable. Breaks runtime patching rootkits.

## Kernel Callbacks

| API | Intercepts |
|-----|-----------|
| PsSetCreateProcessNotifyRoutine | Process start/exit |
| ObRegisterCallbacks | Handle open/duplicate |
| CmRegisterCallback | Registry modification |
| FltRegisterFilter | File I/O (minifilter) |
| PsSetLoadImageNotifyRoutine | Module load |

## Rootkit Techniques

**SSDT Hooking**: Replace SSDT function pointer. x64 uses 32-bit relative offsets. PatchGuard-protected.

**DKOM (Direct Kernel Object Manipulation)**:
- Process hiding: Unlink EPROCESS->ActiveProcessLinks from PsActiveProcessHead
- Token theft: Copy SYSTEM token to target EPROCESS
- Driver hiding: Unlink from PsLoadedModuleList

**IRP Hooks**: Replace DriverObject->MajorFunction pointer, or stack device object above target.

**Minifilter**: Register PreOperation for IRP_MJ_DIRECTORY_CONTROL to hide files. Uses supported API (no PatchGuard risk).

| Technique | PatchGuard Risk | Detection |
|-----------|----------------|-----------|
| SSDT hook | High | `windows.ssdt` |
| DKOM | Low (data only) | `psxview` cross-ref |
| IRP hook | Low | `windows.driverirp` |
| Minifilter | None | `fltmc`, `callbacks` |
| ObRegisterCallbacks | None | `windows.callbacks` |

## Volatility 3 Detection Workflow

```bash
# Hidden processes
vol -f mem.dmp windows.pslist     # Standard list
vol -f mem.dmp windows.psscan     # Pool tag scan (finds DKOM-hidden)

# Hidden drivers
vol -f mem.dmp windows.modscan    # Find unlinked modules

# SSDT hooks
vol -f mem.dmp windows.ssdt       # Address outside ntoskrnl = hooked

# Callback anomalies
vol -f mem.dmp windows.callbacks  # Unknown callback addresses

# IRP hooks
vol -f mem.dmp windows.driverirp  # Dispatch outside driver range

# Code injection
vol -f mem.dmp windows.malfind    # Executable non-backed pages
```

## WinDbg Essentials

```
lm                    # List loaded modules
!drvobj <driver>      # Driver object + IRP table
!ioctldecode <value>  # Decode IOCTL
dt nt!_DRIVER_OBJECT  # Structure layout
dt nt!_EPROCESS       # Process structure
bp <module>!<func>    # Set breakpoint
```

## RE Tools

| Tool | Purpose |
|------|---------|
| IDA + Driver Buddy Reloaded | IOCTL decode, dangerous opcode flags |
| Ghidra + ntddk_64.gdt | Free, structure typing |
| WinDbg (kernel debug) | Dynamic analysis |
| Volatility 3 | Memory forensics |
| Driver Verifier | Stress testing, bug detection |
| IOCTLpus | Send arbitrary IOCTLs |
| OSR Loader | Load/unload test drivers |

## Key Offsets (x64)

```
DRIVER_OBJECT:
  +0x18  DriverStart
  +0x20  DriverSize
  +0x68  DriverUnload
  +0x70  MajorFunction[28]

IRP -> Tail.Overlay.CurrentStackLocation -> Parameters.DeviceIoControl.IoControlCode
```
