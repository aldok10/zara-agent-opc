# DLL Injection & API Hooking Techniques

TL;DR: Injection puts code into another process. Hooking intercepts function calls. Detection surface varies: reflective injection leaves no module in PEB.Ldr; process ghosting deletes the file before execution.

---

## Injection Techniques Comparison

| Technique | File on disk | In PEB.Ldr | LoadLibrary | New thread | MITRE |
|-----------|:-----------:|:----------:|:-----------:|:----------:|-------|
| Classic DLL injection | yes | yes | yes | yes | T1055.001 |
| Reflective injection | no | no | no | yes | T1620 |
| Manual mapping | no | no | no | yes | - |
| Process hollowing | yes (legit) | yes (wrong) | no | no | T1055.012 |
| Process ghosting | deleted | yes | no | yes | - |
| Process doppelganging | never committed | yes | no | yes | T1055.013 |
| Process herpaderping | overwritten | yes | no | yes | - |
| DLL sideloading | yes (proxy) | yes | yes | no | T1574.002 |
| APC / Early Bird | no | no | no | no | T1055.004 |
| Thread hijacking | no | no | no | no | T1055.003 |

---

## Reflective DLL Injection

ReflectiveLoader (inside the DLL itself) does what ntdll!LdrLoadDll would:
1. Find own base (walk backward looking for `MZ`)
2. Parse own PE headers
3. Allocate at preferred ImageBase (or relocate)
4. Copy sections raw -> virtual
5. Apply relocations (base delta)
6. Resolve imports via host process modules
7. Call TLS callbacks + DllMain

**Detection**: Large RWX region with PE headers, no backing file, thread start in unbacked memory.

**Variants**: sRDI (converts any DLL to shellcode), RDI with direct syscalls.

---

## Manual Mapping

Injector acts as PE loader from outside the target:
1. Read DLL into local memory
2. `VirtualAllocEx` in target (SizeOfImage)
3. Copy sections to correct virtual offsets
4. Process relocations
5. Resolve imports (walk target's PEB.Ldr)
6. Execute TLS + DllMain via thread/APC
7. Optionally wipe PE headers

No ReflectiveLoader export needed. Can inject any standard DLL.

---

## API Hooking

### IAT Hooking

Overwrite IAT slot (function pointer) in the importing module.
- Scope: only affects the patched module
- Detection: compare IAT vs target DLL export table

### EAT Hooking

Modify exporting DLL's Export Address Table RVA.
- Scope: affects future `GetProcAddress` calls (not already-resolved imports)

### Inline Hooking (Detours/Trampoline)

Overwrite first bytes of target function with `jmp HookFunction`. Original bytes saved in trampoline.

```
x86: E9 <rel32>           (5 bytes)
x64: mov rax, <addr64>; jmp rax  (12 bytes)
  or: jmp [rip+0]; .quad addr    (14 bytes)
```

**Libraries**: Microsoft Detours (MIT), MinHook, PolyHook2

**Detection**: Scan function prologues for jmp/call; compare in-memory vs on-disk .text

---

## Process Hollowing (RunPE)

1. `CreateProcess(legit.exe, CREATE_SUSPENDED)`
2. `NtQueryInformationProcess` -> PEB -> ImageBaseAddress
3. `NtUnmapViewOfSection` (unmap legitimate image)
4. `VirtualAllocEx` at same base
5. `WriteProcessMemory` (write malicious PE)
6. Update PEB ImageBaseAddress if needed
7. `SetThreadContext` (set entry point)
8. `ResumeThread`

**Detection**: Process image path != in-memory content, NtUnmapViewOfSection on suspended process.

---

## Process Ghosting (2021)

1. Create file, write malicious payload
2. Mark file for deletion (NtSetInformationFile)
3. Create image section (NtCreateSection SEC_IMAGE) - succeeds on delete-pending file
4. Close file handle - file deleted from disk
5. Create process from section
6. Create thread

**Result**: Running process with no backing file. AV cannot scan what doesn't exist.

---

## Process Doppelganging

Uses NTFS Transactions:
1. `NtCreateTransaction`
2. `CreateFileTransacted` + write malicious content
3. `NtCreateSection(SEC_IMAGE)` from transacted file
4. `NtRollbackTransaction` - changes never committed
5. Create process from section

**Detection**: Deprecated TxF API usage, minifilter intercepts.

---

## Process Herpaderping

Exploits timing gap between process creation and AV file scan:
1. Write malicious content to file
2. Create section from file
3. Create process from section
4. **Overwrite file** with legitimate binary
5. Create thread

When AV scans the file (triggered by process creation), it finds clean content.

---

## DLL Sideloading

Place malicious DLL with expected name alongside legitimate signed EXE.

**Search order**: App dir > System32 > Windows > CWD > PATH

**DLL Proxy**: Malicious DLL forwards all original exports to real DLL while running own payload.

**Detection**: Unsigned DLLs loaded by signed executables from unusual paths.

---

## Early Bird APC Injection

1. `CreateProcess(SUSPENDED)` - new process
2. Allocate + write shellcode in new process
3. `QueueUserAPC(shellcode, mainThread)`
4. `ResumeThread`

APC fires BEFORE entry point, before EDR DLLs are initialized. Bypasses early userland hooks.

---

## Thread Execution Hijacking

1. `OpenThread` + `SuspendThread`
2. `VirtualAllocEx` + `WriteProcessMemory` (shellcode)
3. `GetThreadContext` -> save state
4. `SetThreadContext` -> RIP = shellcode
5. `ResumeThread`

No new thread creation event. Harder to detect than CreateRemoteThread.
