# Windows Kernel Drivers & Rootkits: Reverse Engineering Reference

**Audience:** Malware analysts, security researchers, kernel RE engineers
**Focus:** Static/dynamic analysis of .sys files, rootkit internals, detection
**File type:** PE/COFF (drivers share PE structure with user-mode DLLs)

---

## Table of Contents

1. [PE/COFF Structure of Kernel Drivers](#1-pecoff-structure-of-kernel-drivers)
2. [Driver Entry, PnP, and Power](#2-driver-entry-pnp-and-power)
3. [IRP Dispatch Table & IOCTL Handling](#3-irp-dispatch-table--ioctl-handling)
4. [Driver Signing & PatchGuard/KPP](#4-driver-signing--patchguardkpp)
5. [Kernel Callbacks](#5-kernel-callbacks)
6. [Rootkit Techniques](#6-rootkit-techniques)
7. [Detection with Volatility](#7-detection-with-volatility)
8. [Tools of the Trade](#8-tools-of-the-trade)
9. [References](#9-references)

---

## 1. PE/COFF Structure of Kernel Drivers

Driver .sys files are Portable Executable (PE) binaries derived from COFF. They share the same `IMAGE_DOS_HEADER`, `IMAGE_NT_HEADERS`, section table, and import/export machinery as user-mode DLLs [1](https://medium.com/@trmz/deep-dive-into-windows-pe-internals-c0d0ca6e1813). Key differences:

| Attribute | User-mode DLL | Kernel driver (.sys) |
|---|---|---|
| Subsystem | `IMAGE_SUBSYSTEM_WINDOWS_GUI` (2) | `IMAGE_SUBSYSTEM_NATIVE` (1) |
| Entry point | `DllMain` | `DriverEntry` |
| Loader | `LdrLoadDll` | I/O Manager via `NtLoadDriver` |
| Imports | ntdll.dll, kernel32.dll, ... | ntoskrnl.exe, hal.dll, NDIS.sys |
| Checksum | Optional | Required for signed drivers |
| Base relocations | Optional (ASLR) | Required (KASLR) |
| Sections | .text, .data, .rdata, .rsrc | Same, plus often INIT (.idata for import tables) |

### Section Layout

```
.text    -- Executable code (PAGE, EXECUTE+READ)
.rdata   -- Read-only data: import tables, strings
.data    -- Read-write global data
INIT     -- Initialization code (discarded after DriverEntry returns)
.rsrc    -- Resources (version info, manifest)
```

### Import Table

Drivers import from kernel-mode modules. The most critical:

- **ntoskrnl.exe** -- core kernel exports (IoCreateDevice, IoCreateSymbolicLink, ExAllocatePool, ObRegisterCallbacks, CmRegisterCallback, PsCreateSystemThread)
- **hal.dll** -- Hardware Abstraction Layer (HalGetBusData, READ_PORT_UCHAR)
- **NDIS.sys** -- Network driver interface
- **fltmgr.sys** -- Filter manager for minifilter drivers
- **win32k.sys** -- GUI subsystem (shadow SSDT related, rarely imported directly)

Use `dumpbin /imports driver.sys` or Ghidra/IDA's import view to enumerate all dependencies [2](https://voidsec.com/windows-drivers-reverse-engineering-methodology/).

### Key PE Header Differences for RE

When loading a .sys in IDA or Ghidra, check these fields:

```
e_magic         : 0x5A4D  (MZ)
Signature       : 0x00004550  (PE\0\0)
Machine         : 0x8664 (x64) or 0x14C (x86)
Characteristics: IMAGE_FILE_EXECUTABLE_IMAGE | IMAGE_FILE_LARGE_ADDRESS_AWARE | IMAGE_FILE_DEBUG_STRIPPED (often)
Subsystem       : 1 (NATIVE) -- this differentiates .sys from .dll/.exe
DllCharacteristics: IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE (ASLR) -- almost always set on x64
```

Drivers on x64 **must** be relocatable (KASLR) and must have a valid checksum for signing [3](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-requirements--windows-vista-and-later-).

---

## 2. Driver Entry, PnP, and Power

### DriverEntry

Every driver exposes `DriverEntry`, analogous to `main()` or `DllMain`. The I/O Manager calls it during load with two parameters [4](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/driver-entry-points-in-driver-objects):

```c
NTSTATUS DriverEntry(
    PDRIVER_OBJECT  DriverObject,
    PUNICODE_STRING RegistryPath
);
```

Within DriverEntry, a WDM driver typically:

1. Creates a device object via `IoCreateDevice` or `IoCreateDeviceSecure`
2. Creates a symbolic link via `IoCreateSymbolicLink` (the Win32 namespace entry like `\\.\DeviceName`)
3. Populates the `MajorFunction` dispatch table on `DriverObject`
4. Sets `DriverObject->DriverUnload` for cleanup
5. Returns `STATUS_SUCCESS`

```c
NTSTATUS DriverEntry(PDRIVER_OBJECT DriverObject, PUNICODE_STRING RegistryPath) {
    PDEVICE_OBJECT DeviceObject;
    UNICODE_STRING devName = RTL_CONSTANT_STRING(L"\\Device\\MyDriver");
    UNICODE_STRING symLink = RTL_CONSTANT_STRING(L"\\DosDevices\\MyDriver");

    IoCreateDevice(DriverObject, 0, &devName, FILE_DEVICE_UNKNOWN, 0, FALSE, &DeviceObject);
    IoCreateSymbolicLink(&symLink, &devName);

    DriverObject->MajorFunction[IRP_MJ_CREATE]          = MyCreateClose;
    DriverObject->MajorFunction[IRP_MJ_CLOSE]           = MyCreateClose;
    DriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL]  = MyDeviceControl;
    DriverObject->DriverUnload                           = MyUnload;

    return STATUS_SUCCESS;
}
```

### GsDriverEntry

Drivers compiled with `/GS` (buffer security check) export `GsDriverEntry` instead of raw `DriverEntry`. GsDriverEntry calls `__security_init_cookie()` then forwards to the real `DriverEntry` [2](https://voidsec.com/windows-drivers-reverse-engineering-methodology/). In the disassembler, if you see a two-call stub at `entry`, the second call is the real DriverEntry.

### PnP (Plug and Play) Routines

WDM drivers that handle hardware hotplug register these in `DriverObject->MajorFunction`:

| MajorFunction index | Purpose |
|---|---|
| `IRP_MJ_PNP` (0x1B) | PnP state machine -- Start, Stop, Remove, Query |
| `IRP_MJ_POWER` (0x16) | Power state -- S0-S5, D0-D3 |
| `IRP_MJ_SYSTEM_CONTROL` (0x1F) | WMI requests |

PnP dispatch routines receive `IRP_MN_*` minor function codes in `IoStackLocation->MinorFunction` [4](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/introduction-to-driver-objects):

```
IRP_MN_START_DEVICE       (0x00)
IRP_MN_QUERY_STOP_DEVICE  (0x02)
IRP_MN_STOP_DEVICE        (0x03)
IRP_MN_REMOVE_DEVICE      (0x05)
IRP_MN_SURPRISE_REMOVAL   (0x06)
```

When reverse engineering, finding PnP dispatch without hardware handling (no PCI config space access, no `IoReportResourceUsage`) is a strong signal this is a software-only driver -- common for rootkits and utility drivers [5](https://whiteknightlabs.com/2025/10/28/methodology-of-reversing-vulnerable-killer-drivers/).

### Unload Routine

The `DriverUnload` routine (set during DriverEntry) must:

- Delete symbolic link: `IoDeleteSymbolicLink`
- Delete device object: `IoDeleteDevice`
- Free any allocated memory

If a driver has **no** unload routine set, it cannot be stopped or unloaded at runtime. Rootkits often skip setting `DriverUnload` as an anti-forensics measure.

---

## 3. IRP Dispatch Table & IOCTL Handling

### DRIVER_OBJECT Structure

The `_DRIVER_OBJECT` is defined in `wdm.h`. Key fields [6](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_driver_object):

```c
typedef struct _DRIVER_OBJECT {
    CSHORT              Type;              // +0x00
    CSHORT              Size;              // +0x02
    PDEVICE_OBJECT      DeviceObject;      // +0x08 (x64)
    ULONG               Flags;             // +0x10
    PVOID               DriverStart;       // +0x18
    ULONG               DriverSize;        // +0x20
    PVOID               DriverSection;     // +0x28
    PDRIVER_EXTENSION   DriverExtension;   // +0x30
    UNICODE_STRING      DriverName;        // +0x38
    PUNICODE_STRING     HardwareDatabase;  // +0x48
    PFAST_IO_DISPATCH   FastIoDispatch;    // +0x50
    PDRIVER_INITIALIZE  DriverInit;        // +0x58
    PDRIVER_STARTIO     DriverStartIo;     // +0x60
    PDRIVER_UNLOAD      DriverUnload;      // +0x68
    PDRIVER_DISPATCH    MajorFunction[IRP_MJ_MAXIMUM + 1]; // +0x70
} DRIVER_OBJECT;
```

### IRP MajorFunction Table

`MajorFunction` at offset **+0x70** from `DRIVER_OBJECT` is an array of function pointers indexed by IRP major function code. From `wdm.h` [7](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/writing-dispatch-routines):

```c
#define IRP_MJ_CREATE           0x00
#define IRP_MJ_CREATE_NAMED_PIPE 0x01
#define IRP_MJ_CLOSE            0x02
#define IRP_MJ_READ             0x03
#define IRP_MJ_WRITE            0x04
#define IRP_MJ_DEVICE_CONTROL   0x0E
#define IRP_MJ_INTERNAL_DEVICE_CONTROL 0x0F
#define IRP_MJ_SHUTDOWN         0x10
#define IRP_MJ_PNP              0x1B
#define IRP_MJ_POWER            0x16
```

In a disassembler, after applying the `PDRIVER_OBJECT` type (via `ntddk_64.gdt` in Ghidra or loading `ntddk.h` in IDA), offsets from `DriverObject` at +0x70 with offsets +0x00, +0x08, +0x70 (x64, each pointer is 8 bytes) reveal which IRP handlers are registered [8](https://specterops.io/blog/2020/04/15/methodology-for-static-reverse-engineering-of-windows-kernel-drivers/).

### IRP Structure Layout

```
_IRP:
  +0x00  Type             (CSHORT)
  +0x02  Size             (CSHORT)
  +0x08  MdlAddress       (PMDL)
  +0x10  Flags            (ULONG)
  +0x18  AssociatedIrp    (union)
  +0x28  ThreadListEntry  (LIST_ENTRY)
  +0x38  IoStatus         (IO_STATUS_BLOCK)
  +0x40  RequestorMode    (KPROCESSOR_MODE)
  +0x48  PendingReturned  (BOOLEAN)
  +0x50  StackCount       (CCHAR)
  +0x51  CurrentLocation  (CCHAR)
  +0x58  Cancel           (BOOLEAN)
  +0x60  CancelIrql       (KIRQL)
  +0x68  ApcEnvironment   (CCHAR)
  +0x70  AllocationFlags  (UCHAR)
  +0x78  UserIosb         (PIO_STATUS_BLOCK)
  +0x80  UserEvent        (KEVENT*)
  +0x88  Overlay          (union)
  +0x98  CancelRoutine    (PVOID)
  +0xA0  UserBuffer       (PVOID)     -- user-mode buffer pointer
  +0xA8  Tail             (union)
     Tail.Overlay:
       +0x00 DeviceQueueEntry
       +0x08 Thread
       +0x10 AuxiliaryBuffer
       +0x18 IoStatus
       +0x30 ListEntry
       +0x40 CurrentStackLocation  (PIO_STACK_LOCATION)
```

`CurrentStackLocation` at offset +0x40 from `Tail` (which starts at +0xA8 from IRP start) gives the `IO_STACK_LOCATION` structure containing the IOCTL code [8](https://specterops.io/blog/2020/04/15/methodology-for-static-reverse-engineering-of-windows-kernel-drivers/).

```
IO_STACK_LOCATION:
  +0x00  MajorFunction     (UCHAR)
  +0x01  MinorFunction     (UCHAR)
  +0x02  Flags             (UCHAR)
  +0x03  Control           (UCHAR)
  +0x08  Parameters        (union)
     Parameters.DeviceIoControl:
       +0x00  OutputBufferLength (ULONG)
       +0x04  InputBufferLength  (ULONG)
       +0x08  IoControlCode      (ULONG)   // <-- THE IOCTL
       +0x10  Type3InputBuffer   (PVOID)
  +0x28  DeviceObject      (PDEVICE_OBJECT)
  +0x30  FileObject        (PFILE_OBJECT)
```

### IOCTL Code Structure

IOCTLs are 32-bit values encoding four fields [9](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/defining-i-o-control-codes):

```
Bit:  31-16 | 15-14 | 13-2 | 1-0
      [ DevType ] [Access] [Function] [Method ]
```

| Bits | Field | Meaning |
|---|---|---|
| 0-1 | TransferType | 0=Buffered, 1=InDirect, 2=OutDirect, 3=Neither |
| 2-13 | FunctionCode | 0x000-0xFFF (vendor: 0x800+) |
| 14-15 | RequiredAccess | 0=Any, 1=Read, 2=Write, 3=Read/Write |
| 16-31 | DeviceType | e.g., 0x22=FILE_DEVICE_UNKNOWN, 0x8000=vendor-defined |

Decode with `!ioctldecode <IOCTL>` in WinDbg or OSR's online decoder [10](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-ioctldecode).

**Critical for RE:** The TransferType determines how buffers reach the driver.

| Method | How buffers arrive | Risk |
|---|---|---|
| `METHOD_BUFFERED` | I/O manager copies user data to/from `Irp->AssociatedIrp.SystemBuffer` | Safe-ish (copy overhead) |
| `METHOD_IN_DIRECT` | Input: SystemBuffer; Output: MDL (memory descriptor list) to `Irp->MdlAddress` | Medium |
| `METHOD_OUT_DIRECT` | Same as IN_DIRECT, reversed | Medium |
| `METHOD_NEITHER` | User VA in `Irp->UserBuffer`, kernel must probe/lock | **Highest risk** -- no validation by I/O manager [11](https://whiteknightlabs.com/2025/10/28/methodology-of-reversing-vulnerable-killer-drivers/) |

### Finding IOCTL Handlers in the Disassembler

Workflow [8](https://specterops.io/blog/2020/04/15/methodology-for-static-reverse-engineering-of-windows-kernel-drivers/):

1. Find `DriverEntry` (exported or via GsDriverEntry stub)
2. Apply `PDRIVER_OBJECT` type to the first parameter
3. Scroll to the `MajorFunction` table population (offset +0x70 from DriverObject)
4. Locate `MajorFunction[0x0E]` -- this is the `IRP_MJ_DEVICE_CONTROL` handler
5. Jump to that handler; apply `PIRP` type to its second parameter
6. Trace `Irp->Tail.Overlay.CurrentStackLocation` (+0xA8 + 0x40 = +0xE8 from IRP)
7. At offset +0x08 from `CurrentStackLocation` is `Parameters.DeviceIoControl.IoControlCode`
8. The IOCTL is compared against DWORD literals in a switch-chain or binary search tree

In IDA/Ghidra, scan for `cmp eax, 0x......` sequences or long chains of conditional jumps. Driver Buddy Reloaded for IDA auto-decodes all IOCTLs in a dispatch function [12](https://voidsec.com/driver-buddy-reloaded/).

---

## 4. Driver Signing & PatchGuard/KPP

### Kernel-Mode Code Signing

Since Windows Vista x64, all kernel-mode drivers must be digitally signed to load [13](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-policy--windows-vista-and-later-).

| Windows Version | Requirement |
|---|---|
| Vista-7 x64 | Embedded or catalog signature |
| 8+ x64 | Cross-signed with Microsoft-issued certificate |
| 10 1607+ | **WHQL** signature mandatory (EV certificate required) |
| 11 22H2+ | VBS+HVCI enforcement makes unsigned drivers unloadable |

For boot-start drivers, the signature must be **embedded** in the PE file (not a catalog) [14](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/embedded-signatures-in-a-driver-file).

During RE, view the embedded signature via:

```bash
sigcheck -i driver.sys
```

The signature is in the PE `IMAGE_DIRECTORY_ENTRY_SECURITY` (index 4) -- it appears as a detached PKCS#7 blob appended after the last section. Ghidra/IDA may truncate it; use `dd` to extract the full file.

### PatchGuard / Kernel Patch Protection (KPP)

Introduced in x64 Windows Vista, PatchGuard periodically checks the integrity of critical kernel structures [15](https://en.wikipedia.org/wiki/Kernel_Patch_Protection).

**Protected structures:**

- `KeServiceDescriptorTable` (SSDT)
- `KeServiceDescriptorTableShadow` (Shadow SSDT)
- `HalDispatchTable`
- `GDI*` tables in win32k.sys
- `IDT` (Interrupt Descriptor Table)
- `GDT` (Global Descriptor Table)
- Kernel image (.text section)
- Some `MSR` registers (especially `LSTAR`/`0xC0000082`)

**Detection mechanism:**

PatchGuard runs as a DPC (Deferred Procedure Call) on randomized CPUs at unpredictable intervals. It computes cryptographic hashes over protected pages and compares them to snapshots taken during boot [16](https://www.outflank.nl/blog/2026/01/07/patchguard-peekaboo-hiding-processes-on-systems-with-patchguard-in-2026/).

**Response:** On detection, PatchGuard triggers `KeBugCheckEx` with bugcheck code `0x109` (CRITICAL_STRUCTURE_CORRUPTION). The violation is delayed by a randomized timer (minutes to hours) to frustrate correlation [16](https://www.outflank.nl/blog/2026/01/07/patchguard-peekaboo-hiding-processes-on-systems-with-patchguard-in-2026/).

**Bypass approaches:**

| Technique | Mechanism | Status |
|---|---|---|
| KPTI abuse (Meltdown variant) | Read kernel PTEs without syscall, patch before PG checks | Patched in most builds |
| Virtualization-based | Run below hypervisor, shadow kernel pages | Works on non-VBS systems |
| PG thread manipulation | Find PG threads via ETHREAD + APC, suspend/kill | Per-build offset hunting |
| ByePg | Global PG disabling via kernel variable write (Win 8-10, pre-HVCI) | [17](https://github.com/can1357/ByePg) |
| GhostHook | Intel PT / trace-store based execution hijack | [18](https://www.techtarget.com/searchSecurity/answer/How-does-the-GhostHook-attack-bypass-Microsoft-PatchGuard) |

From an RE perspective: rootkits targeting systems **without** PatchGuard (e.g. Windows 7 x86, or with PG bypass) use SSDT hooking freely. On modern x64 systems with VBS/HVCI enabled, driver code must pass Code Integrity checks at load time, making runtime patching significantly harder [19](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/code-integrity-checking).

### HVCI / Memory Integrity

Virtualization-Based Security (VBS) with Hypervisor-Protected Code Integrity (HVCI) enforces that:

- Kernel memory pages are **never** both writable and executable
- All executable pages must pass Code Integrity verification
- Kernel DMA protection prevents physical memory attacks

This breaks most runtime patching rootkits. Detect HVCI status with `msinfo32.exe` -> "Virtualization-based security" or WinDbg: `!systeminfo`.

---

## 5. Kernel Callbacks

Callback registration is the **supported** (non-hooking) way for legitimate drivers and security products to intercept kernel events. Rootkits also use them offensively.

### Process/Thread Callbacks

```c
// Legacy -- since Windows 2000
NTSTATUS PsSetCreateProcessNotifyRoutine(
    PCREATE_PROCESS_NOTIFY_ROUTINE NotifyRoutine,
    BOOLEAN Remove
);

NTSTATUS PsSetCreateThreadNotifyRoutine(
    PCREATE_THREAD_NOTIFY_ROUTINE NotifyRoutine,
    BOOLEAN Remove
);

NTSTATUS PsSetLoadImageNotifyRoutine(
    PLOAD_IMAGE_NOTIFY_ROUTINE NotifyRoutine
);
```

These notify on process creation/termination, thread creation, and module load events. Commonly hooked by EDRs and rootkits for process injection monitoring.

### ObRegisterCallbacks (Vista+)

Registers callback for process/thread/desktop handle operations [20](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obregistercallbacks):

```c
NTSTATUS ObRegisterCallbacks(
    POB_CALLBACK_REGISTRATION CallbackRegistration,
    PVOID *RegistrationHandle
);

typedef struct _OB_CALLBACK_REGISTRATION {
    USHORT Version;           // OB_FLT_REGISTRATION_VERSION
    USHORT OperationRegistrationCount;
    UNICODE_STRING Altitude;  // Altitude string for ordering
    PVOID RegistrationContext;
    OB_OPERATION_REGISTRATION OperationRegistration[];
} OB_CALLBACK_REGISTRATION;

typedef struct _OB_OPERATION_REGISTRATION {
    POBJECT_TYPE *ObjectType;     // PsProcessType, PsThreadType, ExDesktopObjectType
    OB_OPERATION Operations;      // OB_OPERATION_HANDLE_CREATE | OB_OPERATION_HANDLE_DUPLICATE
    POB_PRE_OPERATION_CALLBACK   PreOperation;
    POB_POST_OPERATION_CALLBACK  PostOperation;
} OB_OPERATION_REGISTRATION;
```

**Offensive use:** Pre-operation callback can deny handle opening to protected processes, preventing termination or memory read. EDRs use this to protect their own processes.

**Detection:** The registered callbacks are stored in the kernel's callback list. Volatility's `callbacks` plugin enumerates them.

### CmRegisterCallback (Vista+)

Registry notification callback [21](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmregistercallback):

```c
NTSTATUS CmRegisterCallback(
    PEX_CALLBACK_FUNCTION Function,
    PVOID Context,
    PLARGE_INTEGER Cookie
);
```

The callback receives `REG_NOTIFY_CLASS` notifications: `RegNtPreSetValueKey`, `RegNtPreCreateKey`, `RegNtPreDeleteKey`, etc. Rootkits intercept registry operations to hide autorun entries or redirect key queries.

**Detection:** The registered callbacks are tracked via `CallbackListHead` in `nt!CmpRegisterCallbackInternal`. Volatility's `callbacks` plugin dumps the list.

### Minifilter Callbacks (FltRegisterFilter)

File system minifilter drivers register via `FltRegisterFilter` with a `FLT_REGISTRATION` structure specifying callback pointers for I/O operations [22](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/fltregisterfilter):

```c
FLT_PRE_OPERATION_CALLBACK PreCreate;
FLT_POST_OPERATION_CALLBACK PostCreate;
FLT_PRE_OPERATION_CALLBACK PreRead;
FLT_POST_OPERATION_CALLBACK PostRead;
FLT_PRE_OPERATION_CALLBACK PreWrite;
FLT_POST_OPERATION_CALLBACK PostWrite;
// ... IRP_MJ_CLEANUP, IRP_MJ_CLOSE, IRP_MJ_DIRECTORY_CONTROL, etc.
```

**Rootkit use:** A minifilter at the right altitude can intercept `IRP_MJ_DIRECTORY_CONTROL` to hide files/directories, or `IRP_MJ_CREATE` to prevent file access [23](https://tierzerosecurity.co.nz/2024/09/18/blind-edr-revisited.html). The altitude order determines who wins on conflicts -- EDRs register at low altitudes (e.g., `320000`), rootkits may try higher ones.

### Kernel Callback Table: Summary

| API | Event intercepted | Common altitude range |
|---|---|---|
| `PsSetCreateProcessNotifyRoutine` | Process start/exit | N/A (legacy) |
| `ObRegisterCallbacks` | Handle open/duplicate | `320000`-`360000` (EDR) |
| `CmRegisterCallback` | Registry modification | `320000`-`360000` |
| `FltRegisterFilter` | File I/O operations | `320000`-`360000` (EDR), varies by vendor |
| `PsSetLoadImageNotifyRoutine` | Module load notification | N/A (legacy) |

Rootkits often enumerate and remove these callbacks registered by security software by walking the internal linked lists and unlinking entries [24](https://github.com/test1213145/bypass-RealBlindingEDR).

---

## 6. Rootkit Techniques

### 6.1 SSDT Hooking

The System Service Dispatch Table (SSDT), also called `KeServiceDescriptorTable`, is an array of function pointers indexed by system service number (SSN). Each entry points to the kernel-mode handler for a native API [25](https://www.aldeid.com/wiki/SSDT-System-Service-Descriptor-Table).

```
typedef struct _SERVICE_DESCRIPTOR_TABLE {
    PULONG_PTR ServiceTable;     // Base address of SSDT (array of function pointers)
    PVOID      CounterTable;     // Used for syscall counting (usually NULL)
    ULONG      ServiceLimit;     // Number of entries
    PULONG     NumberOfServices; // Pointer to syscall count
} SERVICE_DESCRIPTOR_TABLE;
```

On x86, the SSDT contains absolute function addresses. On x64, it stores **32-bit relative offsets** from the table base to the actual function -- a consequence of PatchGuard attempting to complicate hook detection [25](https://www.aldeid.com/wiki/SSDT-System-Service-Descriptor-Table).

**Hook mechanism:**

```
Original:  SSDT[N] = &nt!NtQuerySystemInformation
Hooked:    SSDT[N] = &rootkit!FakeNtQuerySystemInformation
```

The rootkit's function either modifies results (to hide processes/files) or logs the call before forwarding to the original.

**Shadow SSDT** (`KeServiceDescriptorTableShadow`) handles GUI-related system calls going into `win32k.sys` [26](https://m0uk4.gitbook.io/notebooks/mouka/windowsinternal/ssdt-hook). It must be accessed from the context of a GUI process (e.g., `csrss.exe` or `winlogon.exe`) because per-session win32k mapping differs. Shadow SSDT hooks can intercept `NtUser*` and `NtGdi*` functions.

**Detection:** Compare in-memory SSDT function pointers against the on-disk `ntoskrnl.exe` image base. Any mismatch is a hook. Volatility's `ssdt` plugin automates this.

### 6.2 DKOM (Direct Kernel Object Manipulation)

DKOM modifies kernel data structures directly in memory without hooking any code path [27](https://en.wikipedia.org/wiki/Direct_kernel_object_manipulation).

**Process Hiding (classic DKOM):**

The kernel maintains a doubly-linked list of `_EPROCESS` structures via `ActiveProcessLinks` (offset +0x2E0 on Windows 10 x64, but varies by build):

```
ListHead: PsActiveProcessHead
  +----+----+    +----+----+    +----+----+
  | P1 |    |<-->| P2 |    |<-->| P3 |    |
  +----+----+    +----+----+    +----+----+
```

DKOM hides a process by unlinking its `ActiveProcessLinks` entry [28](https://nixhacker.com/understanding-windows-dkom-direct-kernel-object-manipulation-attacks-eprocess/):

```c
// Before:
ListRemove(EPROCESS->ActiveProcessLinks);
// After: EPROCESS is no longer reachable via PsActiveProcessHead
// But the EPROCESS object still exists in memory
```

The process continues running but is invisible to taskmgr, `Process Explorer`, and any tool that walks the `ActiveProcessLinks` list.

**Token privilege escalation:** Modify the `_TOKEN` structure inside the target EPROCESS to grant `SeDebugPrivilege` or `SeTakeOwnershipPrivilege` by copying the SYSTEM process token:

```c
// EPROCESS->Token offset varies by build
*(PULONG64)((PUCHAR)TargetEProcess + TokenOffset) = 
    *(PULONG64)((PUCHAR)SystemEProcess + TokenOffset);
```

**Driver/module hiding:** Unlink the `LDR_DATA_TABLE_ENTRY` from `PsLoadedModuleList`. The driver stays loaded and functional but vanishes from `lm` (WinDbg) and module enumeration tools [29](http://secure.lavasoft.com/mylavasoft/securitycenter/whitepapers/an-analysis-of-rootkit-technologies-part-2).

**Detection of DKOM:**

- Cross-reference process lists from different sources: CSRSS handle table vs EPROCESS list vs scheduler data structures
- Volatility's `psxview` plugin lists processes visible via different methods; processes missing from `PsActiveProcessHead` but present elsewhere are hidden
- Compare `PsLoadedModuleList` entries with driver objects in `\Driver` object namespace

### 6.3 IRP Hooks

Instead of modifying the SSDT, a rootkit can hijack a target driver's `MajorFunction` table or the IRP dispatch path.

**Techniques [30](https://blog.talosintelligence.com/exploring-malicious-windows-drivers-part-2/):**

1. **Replace MajorFunction pointer** -- Overwrite `DriverObject->MajorFunction[IRP_MJ_DEVICE_CONTROL]` to point to rootkit code. The rootkit inspects IOCTLs, handles interesting ones, forwards the rest.

2. **Replace device object** -- Create a new device object and stack it above the target. Intercept IRPs via the new device's dispatch.

3. **Replace IRP completion routine** -- Set `Irp->CompletionRoutine` to rootkit code. Called when the lower driver completes the IRP.

4. **IRP hook via I/O completion** -- Intercept `IoCompletion` by registering on the IRP stack location.

**Detection:** Volatility's `driverirp` plugin enumerates all IRP dispatch routines for all loaded drivers and flags any that point outside the driver's expected code range.

### 6.4 Minifilter Rootkits

A file system minifilter can intercept all file I/O at the kernel level [22](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/fltregisterfilter).

**Hiding files:** The minifilter registers a `PreOperation` callback for `IRP_MJ_DIRECTORY_CONTROL`. When a directory enumeration occurs, the callback modifies the returned buffer to remove entries matching the hidden file pattern.

**Hiding process images:** Intercept `IRP_MJ_CREATE` for the EXE path; return `STATUS_OBJECT_NAME_NOT_FOUND` to mask file existence from `CreateFile` calls.

**Detection:** List registered minifilter drivers via `fltmc instances` and their altitudes. Check each altitude against known-good EDRs. Unknown minifilters at suspicious altitudes are rootkit candidates [31](https://undercodetesting.com/unmasking-edrs-how-to-detect-and-analyze-file-system-minifilter-communication-ports/).

### Rootkit Technique Comparison

| Technique | Stealth | PatchGuard risk | Detection method |
|---|---|---|---|
| SSDT hooking | Moderate | High (guarded on x64) | `ssdt` Volatility plugin |
| Shadow SSDT hooking | Moderate | High | `ssdt` + GUI context |
| DKOM | High | Low (manipulates data, not code) | `psxview`, cross-ref |
| IRP hook | Moderate-High | Low (non-PG targets) | `driverirp` Volatility plugin |
| Minifilter | High | None (supported API) | `fltmc`, `callbacks` plugin |
| ObRegisterCallbacks | Moderate-High | None | `callbacks` plugin |
| CmRegisterCallback | Moderate-High | None | `callbacks` plugin |

---

## 7. Detection with Volatility

Volatility 3 (Python 3, symbol-table driven) is the standard for kernel rootkit detection [32](https://volatility3.readthedocs.io/en/stable/).

### Setup Volume Shadow Copy or Live Dump

```
vol -f mem.dmp windows.info
```

### Key Plugins for Rootkit Detection

| Plugin | Purpose | Rootkit signal |
|---|---|---|
| `windows.pslist` | List processes via EPROCESS list [33] | Baseline process list |
| `windows.psscan` | Scan for EPROCESS objects by pool tag | Finds DKOM-hidden processes |
| `windows.pstree` | Tree view, Parent PID mismatches | Reveals PPID spoofing |
| `windows.ssdt` | Dump System Service Dispatch Table [34] | SSDT hooks (mismatch addr) |
| `windows.callbacks` | Enumerate kernel callbacks [35] | Unknown Ob/Cm/image callbacks |
| `windows.driverirp` | IRP dispatch routines per driver [32] | IRP hooks outside driver range |
| `windows.malfind` | Detect injected code (VAD + page check) | Kernel memory injection |
| `windows.modscan` | Scan for unlinked kernel modules | DKOM-hidden drivers |
| `windows.devicetree` | Enumerate device object tree | Suspicious device stacking |
| `windows.drivermodule` | Driver base/driver object relationships | Orphaned driver objects |

### Detection Workflow

**Step 1: Hidden Processes**

```bash
vol -f mem.dmp windows.pslist    # Trusted but unreliable (walks ActiveProcessLinks)
vol -f mem.dmp windows.psscan    # Forensic scan (finds EPROCESS via pool tags)
vol -f mem.dmp windows.pstree    # Parent PID anomalies
```

Compare outputs. Processes in `psscan` but missing from `pslist` are hidden via DKOM.

**Step 2: Hidden Drivers**

```bash
vol -f mem.dmp windows.modscan   # Scan for _LDR_DATA_TABLE_ENTRY
vol -f mem.dmp windows.drivermodule  # Cross-ref driver objects
```

Modules found by `modscan` but not in `modules` list are unlinked from `PsLoadedModuleList` [36](https://blog.1nf1n1ty.team/hacktricks/generic-methodologies-and-resources/basic-forensic-methodology/memory-dump-analysis/volatility-cheatsheet).

**Step 3: SSDT Hooks**

```bash
vol -f mem.dmp windows.ssdt
```

Output shows each syscall entry with its current address and module. If the address falls outside `ntoskrnl.exe`, it's hooked. Also check the Shadow SSDT (automatically enumerated if GUI process context exists).

**Step 4: Callback Anomalies**

```bash
vol -f mem.dmp windows.callbacks
```

Examine `GenericKernelCallback`, `ProcessCallbacks`, `ThreadCallbacks`, `ImageLoadCallbacks`, `RegistryCallbacks`. Unknown callback addresses not belonging to known security products (Windows Defender, EDR vendors) are suspicious [35](https://volatility3.readthedocs.io/en/v2.5.0/volatility3.plugins.windows.callbacks.html).

**Step 5: IRP Hook Scan**

```bash
vol -f mem.dmp windows.driverirp
```

Flags drivers whose dispatch routines point outside the owning driver's memory range. Each MajorFunction index should point into the driver's `.text` section [32](https://volatility3.readthedocs.io/en/stable/).

**Step 6: Code Injection**

```bash
vol -f mem.dmp windows.malfind
```

Scans for kernel memory pages that are executable but not backed by a known module. Useful for finding reflective-loaded rootkits.

### Volatility 2 vs 3

| Aspect | Volatility 2 | Volatility 3 |
|---|---|---|
| Profiles | Manual (`--profile=Win10x64_14393`) | Auto-detect via symbol table |
| Plugin names | `pslist`, `ssdt` | `windows.pslist`, `windows.ssdt` |
| Layer abstraction | Direct KVA scan | Symbol-driven layer manager |
| Win10+ support | Requires manual profile gen | Built-in ISF symbol tables |

For modern Windows 10/11 builds, Volatility 3 is strongly preferred.

---

## 8. Tools of the Trade

### WinDbg (Kernel Debugging)

The essential dynamic analysis tool for kernel drivers [37](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/debug-universal-drivers--kernel-mode-).

**Setup (network debugging):**

```cmd
REM Debuggee (VM):
bcdedit /dbgsettings NET HOSTIP:<DEBUGGER_IP> PORT:50000
bcdedit /debug on

REM Debugger (host):
REM WinDbg -> File -> Attach to Kernel -> Net tab
REM Port: 50000, Key: <from bcdedit /dbgsettings>
```

**Key commands:**

| Command | Purpose |
|---|---|
| `lm` | List loaded modules (drivers) |
| `lmDvm<module>` | Show module details, start/end addresses |
| `!drvobj <driver>` | Display driver object + IRP dispatch table |
| `!devobj <device>` | Show device object, stack |
| `!ioctldecode <value>` | Decode IOCTL code fields |
| `bp <module>!<function>` | Set breakpoint on driver function |
| `bl` / `bc` | List / clear breakpoints |
| `dd / db / dq` | Display memory as DWORD / byte / QWORD |
| `dt nt!_EPROCESS` | Display structure fields |
| `dt nt!_DRIVER_OBJECT` | Display driver object structure |
| `!process 0 0` | List processes |
| `!thread` | Current thread info |
| `!irp <address>` | Decode an IRP structure |
| `!object <address>` | Decode any kernel object |
| `.reload` | Reload symbols |
| `.symfix` | Set symbol path to Microsoft symbol server |
| `ln <address>` | Find nearest symbol to address |

**Breakpoint workflow for rootkit analysis [38](https://medium.com/@0x4ndr3/starting-dynamic-analysis-on-a-windows-x64-rootkit-8c7a74871fda):**

```cmd
lm DvmRTCore64           ; Get driver base address
bp RTCore64!DriverEntry  ; Set breakpoint on entry
g                        ; Go
; (driver loads, breakpoint hits)
bp RTCore64+0x1732       ; Set breakpoint on wrmsr IOCTL handler
!drvobj RTCore64         ; Verify IRP dispatch table
```

### IDA Pro

The industry standard for static RE of kernel modules [8](https://specterops.io/blog/2020/04/15/methodology-for-static-reverse-engineering-of-windows-kernel-drivers/).

**Workflow for drivers:**

1. Load .sys file, select "Microsoft Portable Executable" loader
2. Let auto-analysis complete
3. Load `ntddk.h` type library (File -> Load File -> Parse C Header File)
4. Navigate to `entry` or `GsDriverEntry` export
5. Apply `PDRIVER_OBJECT` to first param, `PIRP` to dispatch params
6. Use cross-references to map IOCTL dispatch

**Plugins:**

- **Driver Buddy Reloaded** -- auto-decodes IOCTLs, flags dangerous opcodes (wrmsr, rdmsr, MmMapIoSpace) [12](https://voidsec.com/driver-buddy-reloaded/)
- **WinIoCtlDecoder** -- decode IOCTL values inline [39](https://github.com/tandasat/WinIoCtlDecoder)
- **NtObj** -- kernel object browsing
- **HexRaysDeob** -- deobfuscation of control-flow flattened code

### Ghidra

Free alternative with strengths in kernel module analysis [40](https://ghidra-sre.org/).

**Setup for drivers:**

1. Import .sys as "PE"
2. Apply `ntddk_64.gdt` from 0x6d696368's ghidra-data repo
3. Right-click GDT -> "Apply Function Data Types"
4. Navigate to `entry` in Symbol Tree -> Exports
5. Re-type first DriverEntry param to `PDRIVER_OBJECT`
6. Use Decompile window to analyze dispatch logic

**Scripting:**

```python
# Ghidra Python (Jython) to find IOCTL comparisons
from ghidra.program.model.lang import OperandType

mon = currentProgram.getMemory()
listing = currentProgram.getListing()
refs = currentProgram.getReferenceManager()

# Find all CMP EAX, const instructions
inst = listing.getInstructions(True)
while inst.hasNext():
    instr = inst.next()
    mnem = instr.getMnemonicString()
    if mnem == "CMP" and instr.getNumOperands() == 2:
        op1 = instr.getOpObjects(0)
        op2 = instr.getOpObjects(1)
        if len(op1) == 1 and len(op2) == 1:
            if str(op1[0]).startswith("EAX"):
                print("0x%08x: CMP EAX, %s" % (instr.getAddress().getOffset(), op2[0]))
```

### Driver Verifier

Built into Windows; stresses drivers to find bugs [41](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/driver-verifier).

```cmd
verifier /standard /driver mydriver.sys
```

Key checks:

- **Pool tracking** -- detects memory leaks and double-frees
- **IRQL checking** -- improper spinlock/IRQL manipulation
- **I/O verification** -- IRP completion/stack misuse
- **Deadlock detection** -- lock ordering violations
- **DMA verification** -- improper DMA buffer use

Rootkits fail Driver Verifier checks immediately when hooked operations create pool corruption or IRQL violations. Use it as a **rootkit stress test**: enable for a suspected driver, observe crash dump for access violations at instruction addresses in the rootkit's memory range.

### Other Tools

| Tool | Purpose |
|---|---|
| [OSRLOADER](https://www.osronline.com/OsrDown.cfm/osrloaderv30.zip) | Load/unload test drivers |
| [IOCTLpus](https://github.com/VoidSec/ioctlpus) | Send arbitrary IOCTLs to drivers [42](https://github.com/VoidSec/ioctlpus) |
| [WinObj](https://learn.microsoft.com/en-us/sysinternals/downloads/winobj) | Explore object manager namespace |
| [Process Hacker](https://processhacker.sourceforge.io/) | Kernel-mode process/thread/object exploration |
| [DriverBuddy](https://github.com/VoidSec/DriverBuddyReloaded) | IDA plugin for IOCTL deobfuscation |
| [msrexec](https://githacks.org/_xeroxz/msrexec) | WRMSR exploit toolkit |
| [ByePg](https://github.com/can1357/ByePg) | PatchGuard bypass PoC |

---

## 9. References

| # | Source |
|---|---|
| [1] | Medium, "Deep Dive into Windows PE Internals" [link](https://medium.com/@trmz/deep-dive-into-windows-pe-internals-c0d0ca6e1813) |
| [2] | VoidSec, "Windows Drivers Reverse Engineering Methodology" [link](https://voidsec.com/windows-drivers-reverse-engineering-methodology/) |
| [3] | Microsoft, "Kernel-Mode Code Signing Requirements" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-requirements--windows-vista-and-later-) |
| [4] | Microsoft, "Driver Entry Points in Driver Objects" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/driver-entry-points-in-driver-objects) |
| [5] | WhiteKnightLabs, "Methodology of Reversing Vulnerable Killer Drivers" [link](https://whiteknightlabs.com/2025/10/28/methodology-of-reversing-vulnerable-killer-drivers/) |
| [6] | Microsoft, "DRIVER_OBJECT structure (wdm.h)" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_driver_object) |
| [7] | Microsoft, "Writing Dispatch Routines" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/writing-dispatch-routines) |
| [8] | SpecterOps, "Methodology for Static Reverse Engineering of Windows Kernel Drivers" [link](https://specterops.io/blog/2020/04/15/methodology-for-static-reverse-engineering-of-windows-kernel-drivers/) |
| [9] | Microsoft, "Defining I/O Control Codes" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/defining-i-o-control-codes) |
| [10] | Microsoft, "!ioctldecode" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-ioctldecode) |
| [11] | Talos Intelligence, "The I/O System, IRPs, Stack Locations, IOCTLs and More" [link](https://blog.talosintelligence.com/exploring-malicious-windows-drivers-part-2/) |
| [12] | VoidSec, "Driver Buddy Reloaded" [link](https://voidsec.com/driver-buddy-reloaded/) |
| [13] | Microsoft, "Driver Signing Policy" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-policy--windows-vista-and-later-) |
| [14] | Microsoft, "Embedded Signatures in a Driver File" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/embedded-signatures-in-a-driver-file) |
| [15] | Wikipedia, "Kernel Patch Protection" [link](https://en.wikipedia.org/wiki/Kernel_Patch_Protection) |
| [16] | Outflank, "PatchGuard Peekaboo: Hiding Processes on Systems with PatchGuard in 2026" [link](https://www.outflank.nl/blog/2026/01/07/patchguard-peekaboo-hiding-processes-on-systems-with-patchguard-in-2026/) |
| [17] | GitHub, "ByePg: Defeating Patchguard" [link](https://github.com/can1357/ByePg) |
| [18] | TechTarget, "How does the GhostHook attack bypass Microsoft PatchGuard?" [link](https://www.techtarget.com/searchSecurity/answer/How-does-the-GhostHook-attack-bypass-Microsoft-PatchGuard) |
| [19] | Microsoft, "Code Integrity Checks" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/code-integrity-checking) |
| [20] | Microsoft, "ObRegisterCallbacks" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obregistercallbacks) |
| [21] | Microsoft, "CmRegisterCallback" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmregistercallback) |
| [22] | Microsoft, "FltRegisterFilter" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltregisterfilter) |
| [23] | TierZero Security, "Blind EDR Revisited" [link](https://tierzerosecurity.co.nz/2024/09/18/blind-edr-revisited.html) |
| [24] | GitHub, "bypass-RealBlindingEDR" [link](https://github.com/test1213145/bypass-RealBlindingEDR) |
| [25] | Aldeid, "SSDT - System Service Descriptor Table" [link](https://www.aldeid.com/wiki/SSDT-System-Service-Descriptor-Table) |
| [26] | m0uk4, "Hook SSDT (Shadow)" [link](https://m0uk4.gitbook.io/notebooks/mouka/windowsinternal/ssdt-hook) |
| [27] | Wikipedia, "Direct kernel object manipulation" [link](https://en.wikipedia.org/wiki/Direct_kernel_object_manipulation) |
| [28] | nixhacker, "Understanding Windows DKOM Techniques (Part 1 - EPROCESS)" [link](https://nixhacker.com/understanding-windows-dkom-direct-kernel-object-manipulation-attacks-eprocess/) |
| [29] | Lavasoft, "An Analysis of Rootkit Technologies: Part 2" [link](http://secure.lavasoft.com/mylavasoft/securitycenter/whitepapers/an-analysis-of-rootkit-technologies-part-2) |
| [30] | Talos Intelligence, "Exploring Malicious Windows Drivers Part 2" [link](https://blog.talosintelligence.com/exploring-malicious-windows-drivers-part-2/) |
| [31] | UnderCodeTesting, "Unmasking EDRs: Analyzing Minifilter Communication Ports" [link](https://undercodetesting.com/unmasking-edrs-how-to-detect-and-analyze-file-system-minifilter-communication-ports/) |
| [32] | Volatility 3 Documentation [link](https://volatility3.readthedocs.io/en/stable/) |
| [33] | 1nf1n1ty Team, "Volatility CheatSheet" [link](https://blog.1nf1n1ty.team/hacktricks/generic-methodologies-and-resources/basic-forensic-methodology/memory-dump-analysis/volatility-cheatsheet) |
| [34] | Volatility 3, "windows.ssdt module" [link](https://volatility3.readthedocs.io/en/stable/volatility3.plugins.windows.ssdt.html) |
| [35] | Volatility 3, "windows.callbacks module" [link](https://volatility3.readthedocs.io/en/v2.5.0/volatility3.plugins.windows.callbacks.html) |
| [36] | Springer, "Volatile Kernel Rootkit Hidden Process Detection" [link](https://link.springer.com/article/10.1186/s13677-023-00549-w) |
| [37] | Microsoft, "Debug Drivers Step-by-Step Lab" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/debug-universal-drivers--kernel-mode-) |
| [38] | 0x4ndr3, "Starting Dynamic Analysis on a Windows x64 Rootkit" [link](https://medium.com/@0x4ndr3/starting-dynamic-analysis-on-a-windows-x64-rootkit-8c7a74871fda) |
| [39] | GitHub, "WinIoCtlDecoder" [link](https://github.com/tandasat/WinIoCtlDecoder) |
| [40] | Ghidra, "Ghidra Data: ntddk_64.gdt" [link](https://github.com/0x6d696368/ghidra-data/blob/master/typeinfo/ntddk_64.gdt) |
| [41] | Microsoft, "Driver Verifier" [link](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/driver-verifier) |
| [42] | GitHub, "IOCTLpus" [link](https://github.com/VoidSec/ioctlpus) |

---

*Generated: 2026-06-21 | 42 inline citations*
