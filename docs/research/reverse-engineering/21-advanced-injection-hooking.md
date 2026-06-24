# Advanced DLL Injection & API Hooking Techniques

Deep reference for DLL injection methods beyond LoadLibrary, covering reflective injection,
manual mapping, API hooking (IAT/EAT/inline), process tampering (hollowing, ghosting,
doppelganging, herpaderping), and DLL hijacking/sideloading. Focus: how each technique works
at the byte level, detection surface, and RE implications.

---

## 1. Classic DLL Injection (Baseline)

The standard injection technique that all others improve upon:

```
1. OpenProcess(target_pid)           -> hProcess
2. VirtualAllocEx(hProcess, ...)     -> remoteBuf (RWX in target)
3. WriteProcessMemory(hProcess, remoteBuf, dllPath, ...)
4. CreateRemoteThread(hProcess, ..., LoadLibraryA, remoteBuf)
```

The injected DLL appears in the target's module list (PEB.Ldr), triggers `DLL_PROCESS_ATTACH`,
and is visible to tools like Process Explorer. Every improvement below aims to reduce one or
more of these detection surfaces.

MITRE ATT&CK: T1055.001 (Dynamic-link Library Injection).

### Detection surface
- `VirtualAllocEx` + `WriteProcessMemory` + `CreateRemoteThread` call sequence
- New module in PEB.Ldr linked list
- DLL file on disk
- Thread start address pointing to `LoadLibraryA`/`LdrLoadDll`

---

## 2. Reflective DLL Injection

**Inventor**: Stephen Fewer (2009). The technique eliminates the need for a DLL file on disk
and avoids `LoadLibrary` entirely.

**How it works**:
1. The DLL contains a special exported function (`ReflectiveLoader`) that acts as its own
   PE loader.
2. The injector allocates memory in the target process and writes the raw DLL bytes there.
3. Instead of calling `LoadLibrary`, the injector starts a thread at the `ReflectiveLoader`
   export offset within the written image.
4. `ReflectiveLoader` (now running inside the target) does what `ntdll!LdrLoadDll` would:
   - Finds its own base address (walks backward from current EIP/RIP looking for `MZ`)
   - Parses its own PE headers
   - Allocates a new region at the preferred `ImageBase` (or relocates)
   - Copies sections from raw to virtual layout
   - Processes the relocation table (applies delta)
   - Resolves imports (walks IAT, calls `GetProcAddress` for each)
   - Calls TLS callbacks
   - Calls `DllMain(DLL_PROCESS_ATTACH)`

**Key advantage**: The DLL never touches disk and never appears in `PEB.Ldr` module list.
No `LoadLibrary` call is made. The only forensic artifact is a RWX memory region with PE
structure.

**Reference implementation**: [stephenfewer/ReflectiveDLLInjection](https://github.com/stephenfewer/reflectivedllinjection)

**Used by**: Metasploit (all Meterpreter payloads use reflective injection), Cobalt Strike
(beacon DLL), many APT toolkits.

MITRE ATT&CK: T1620 (Reflective Code Loading).

### Variants
- **sRDI** (Shellcode Reflective DLL Injection): converts any DLL into position-independent
  shellcode that self-loads. No export needed in the DLL itself.
- **RDI with syscalls**: replaces `VirtualAlloc`/`NtAllocateVirtualMemory` with direct
  syscall stubs to bypass userland hooks.

### Detection
- Large RWX memory regions with PE signatures (MZ/PE headers)
- Memory not backed by a file on disk (no corresponding module in `PEB.Ldr`)
- Thread start address in unbacked memory
- ETW `Microsoft-Windows-Threat-Intelligence` provider can detect

---

## 3. Manual Mapping

Manual mapping is similar to reflective injection but the mapping is done by the injector
(not by code inside the target). The injector acts as a custom PE loader from outside.

**Steps**:
1. Read the DLL file into local memory
2. `VirtualAllocEx` in target process (size = `SizeOfImage`)
3. Copy PE sections to correct virtual offsets in target
4. Process relocations (apply base delta)
5. Resolve imports: for each imported function, get its address in the target's context
   (walk target's `PEB.Ldr` to find loaded modules, parse their export tables)
6. Write resolved IAT entries
7. Execute TLS callbacks via `CreateRemoteThread` or APC
8. Execute `DllMain` via thread/APC
9. Optionally: wipe PE headers from the allocated region to hide the MZ signature

**Advantages over reflective DLL injection**:
- No `ReflectiveLoader` export needed in the DLL
- Can inject any standard DLL without modification
- Injector controls the entire process, can add anti-detection steps

**Key implementations**:
- [TheCruZ/Simple-Manual-Map-Injector](https://github.com/TheCruZ/Simple-Manual-Map-Injector)
- [thetobysiu/ManualMapInjection](https://github.com/thetobysiu/ManualMapInjection)

### Kernel-mode manual mapping
Variant where a kernel driver performs the mapping, bypassing all userland detection:
- Uses `ZwAllocateVirtualMemory` from kernel
- No cross-process API calls visible to EDR
- [mactec0/Kernelmode-manual-mapping-through-IAT](https://github.com/mactec0/Kernelmode-manual-mapping-through-IAT)

---

## 4. API Hooking Techniques

API hooking intercepts function calls by modifying code or data structures. Three primary
methods target different PE structures.

### 4.1 IAT Hooking (Import Address Table)

The IAT contains pointers to imported functions. After the loader resolves imports, each
IAT slot holds the real address of the target function. IAT hooking overwrites these
pointers.

```c
// Find the IAT entry for MessageBoxA in target module
PIMAGE_THUNK_DATA thunk = /* walk PE headers to find IAT slot */;
DWORD oldProtect;
VirtualProtect(&thunk->u1.Function, sizeof(PVOID), PAGE_READWRITE, &oldProtect);
thunk->u1.Function = (ULONG_PTR)&MyHookFunction;
VirtualProtect(&thunk->u1.Function, sizeof(PVOID), oldProtect, &oldProtect);
```

**Scope**: Only intercepts calls from the specific module whose IAT was modified. Other
modules calling the same API are unaffected.

**Detection**: Compare IAT entries against the export table of the target DLL. Mismatches
indicate hooking.

MITRE: T1056.004 (Credential API Hooking), T1574.001 (DLL Search Order Hijacking - related)

### 4.2 EAT Hooking (Export Address Table)

Instead of patching the caller's IAT, modify the target DLL's EAT so that future
`GetProcAddress` calls return the hook address.

```c
// In the exporting DLL's EAT, change the RVA for "MessageBoxA"
PDWORD addressOfFunctions = /* parse export directory */;
DWORD hookRVA = (DWORD)((ULONG_PTR)hookFunc - moduleBase);
addressOfFunctions[targetIndex] = hookRVA;
```

**Scope**: Affects all future `GetProcAddress` lookups for that export. Does NOT affect
modules that already resolved the address (their IAT slots are already filled).

**Use case**: Hooking functions that are resolved dynamically at runtime (via
`LoadLibrary` + `GetProcAddress`) rather than through static imports.

### 4.3 Inline Hooking (Splicing / Detours / Trampoline)

The most powerful and common method. Overwrites the first bytes of the target function
with a jump to the hook. A "trampoline" preserves the original bytes so the hook can
call the original function.

```
Original function:              After hooking:
push rbp                        jmp HookFunction     (5 bytes on x86, 12-14 on x64)
mov rbp, rsp                    <nop padding>
sub rsp, 0x20                   ...
...

Trampoline (generated):
push rbp                        ; original bytes moved here
mov rbp, rsp
jmp OriginalFunction+5          ; jump back past the hook
```

**Libraries**:
- **Microsoft Detours**: The original. Supports x86/x64/ARM/ARM64. Open source (MIT).
  Uses transaction API: `DetourTransactionBegin` / `DetourAttach` / `DetourTransactionCommit`.
  [github.com/microsoft/Detours](https://github.com/microsoft/Detours/wiki/)
- **MinHook**: Minimalistic, header-only-ish. x86/x64. Very popular in game hacking and
  security tools. [TsudaKageworkers/MinHook](https://github.com/TsudaKageworkers/MinHook)
- **PolyHook2**: Advanced, supports hardware breakpoint hooks, VEH hooks, and more.

**x64 challenges**:
- No short relative jump (5-byte `E9`) can reach all of 64-bit address space
- Solutions: 12-byte `mov rax, addr; jmp rax` or 14-byte `jmp [rip+0]; .quad addr`
- Must handle RIP-relative instructions displaced from their original location

**Detection**:
- Scan function prologues for `jmp`/`call` instructions (especially `E9`, `FF 25`)
- Compare in-memory code against on-disk `.text` section
- Check for `PAGE_EXECUTE_READWRITE` on code pages

---

## 5. Process Hollowing (RunPE)

Classic technique to run malicious code disguised as a legitimate process.

MITRE ATT&CK: T1055.012

**Steps**:
1. `CreateProcess(legitimateExe, ..., CREATE_SUSPENDED)` - spawn suspended
2. `NtQueryInformationProcess` - get PEB address, read `ImageBaseAddress`
3. `NtUnmapViewOfSection(hProcess, imageBase)` - unmap the legitimate image
4. `VirtualAllocEx(hProcess, imageBase, maliciousSize, ...)` - allocate at same base
5. `WriteProcessMemory` - write malicious PE sections
6. Update PEB `ImageBaseAddress` if base differs
7. `SetThreadContext` - set RCX/EAX (entry point) in the main thread context
8. `ResumeThread` - execute the malicious code

**Result**: Process appears as `svchost.exe` (or whatever was launched) in Task Manager,
but is actually running completely different code.

**Detection**:
- Process with image path not matching in-memory content
- `NtUnmapViewOfSection` called on a newly created suspended process
- Discrepancy between `PEB.ImageBaseAddress` and the actual mapped image
- ETW events for `NtUnmapViewOfSection` + `NtAllocateVirtualMemory` sequence

---

## 6. Process Ghosting

Newest variant (2021, Gabriel Landau / Elastic Security). Exploits the fact that Windows
prevents file deletion only after a process image section is created from it.

**Steps**:
1. Create a file and write malicious payload to it
2. Mark file for deletion (`NtSetInformationFile` with `FileDispositionInformation`)
3. Create an image section from the file (`NtCreateSection(SEC_IMAGE)`) - this succeeds
   even though the file is delete-pending
4. Close the file handle - file is now deleted from disk
5. Create a process from the section (`NtCreateProcessEx`)
6. Assign process parameters (PEB setup)
7. Create the initial thread

**Result**: A running process whose backing image no longer exists on disk. AV/EDR cannot
scan the file because it's gone. The process appears legitimate but there's no file to
inspect.

**Detection**:
- Process with no backing file (MFT entry deleted)
- `FILE_DELETE_ON_CLOSE` / delete-pending files used with `NtCreateSection`
- Kernel callbacks (`PsSetCreateProcessNotifyRoutineEx`) see the creation

---

## 7. Process Doppelganging

Presented at BlackHat Europe 2017 (enSilo). Uses NTFS Transactions to create a "phantom"
file that is never committed to disk.

MITRE ATT&CK: T1055.013

**Steps**:
1. `NtCreateTransaction` - create a TxF transaction
2. `CreateFileTransacted` - create/open a file within the transaction
3. Write malicious payload to the transacted file
4. `NtCreateSection(SEC_IMAGE)` from the transacted file
5. `NtRollbackTransaction` - rollback, so the file changes are never committed to disk
6. `NtCreateProcessEx` from the section
7. Create thread, set parameters

**Result**: Similar to ghosting but uses NTFS transactions. The malicious content
never exists as a committed file. AV scanning the filesystem sees nothing.

**Implementations**:
- [hasherezade/transacted_hollowing](https://github.com/hasherezade/transacted_hollowing)
  (hybrid: hollowing + doppelganging)

**Detection**:
- Deprecated TxF API usage (`NtCreateTransaction`, `CreateFileTransacted`)
- Minifilter driver can intercept transacted operations
- ETW traces for transaction creation followed by process creation

---

## 8. Process Herpaderping

Presented by Johnny Shaw (2020). Exploits the timing gap between process creation and
the AV/EDR scanning the backing file.

**Steps**:
1. Write malicious content to a file
2. Create an image section from the file (`NtCreateSection(SEC_IMAGE)`)
3. Create a process from the section
4. **Before creating the thread**: overwrite the file content with a legitimate binary
5. Create the initial thread

**Result**: When AV/EDR scans the file (triggered by process creation), it finds
legitimate content. But the process image section (already in memory) contains the
original malicious code.

**Key insight**: The kernel caches the section; modifying the file after section creation
does not affect the in-memory image.

**Implementation**: [jxy-s/herpaderping](https://github.com/jxy-s/herpaderping)

---

## 9. DLL Sideloading & Search Order Hijacking

Not injection per se, but a technique to get a DLL loaded by a legitimate application.

### 9.1 DLL Search Order Hijacking

Windows searches for DLLs in this order (simplified):
1. Application directory
2. System directory (`C:\Windows\System32`)
3. 16-bit system directory
4. Windows directory
5. Current directory
6. PATH directories

An attacker places a malicious DLL with the same name as a legitimate one in a
higher-priority search location.

MITRE ATT&CK: T1574.001

### 9.2 DLL Sideloading

A specific variant where the attacker:
1. Identifies a legitimate signed application that loads a specific DLL
2. Places both the legitimate EXE and a malicious DLL (with the expected name) in a
   controlled directory
3. Runs the legitimate EXE, which loads the attacker's DLL

The malicious DLL typically proxies all original exports to the real DLL while also
executing its own payload. This is called a "DLL proxy."

MITRE ATT&CK: T1574.002

### 9.3 Phantom DLL Hijacking

Targets DLLs that an application tries to load but don't exist on the system. The
application handles the `LoadLibrary` failure gracefully, but if the attacker provides
the DLL, it gets loaded with the application's privileges.

Common targets: old API sets, optional feature DLLs, DLLs from removed software.

**Detection**:
- Unsigned DLLs loaded by signed executables
- DLLs loaded from unusual paths (user-writable directories)
- Procmon: `LoadImage` events with paths outside normal system directories

---

## 10. Thread Execution Hijacking

MITRE ATT&CK: T1055.003

Instead of creating a new thread (easily detected), hijack an existing thread:

1. `OpenThread` on a target thread
2. `SuspendThread` - pause it
3. `VirtualAllocEx` + `WriteProcessMemory` - write shellcode
4. `GetThreadContext` - save current state
5. `SetThreadContext` - set RIP/EIP to shellcode address
6. `ResumeThread` - thread now executes shellcode

**Advantage**: No new thread creation event. Harder to detect than `CreateRemoteThread`.

---

## 11. APC Injection & Early Bird

MITRE ATT&CK: T1055.004

### Standard APC Injection
1. Allocate + write shellcode in target process
2. `QueueUserAPC(shellcodeAddr, hThread, ...)` on an alertable thread
3. When the thread enters an alertable wait state, the APC executes

**Limitation**: Thread must be in an alertable state (`SleepEx`, `WaitForSingleObjectEx`,
`SignalObjectAndWait`, etc.).

### Early Bird Injection
1. `CreateProcess(..., CREATE_SUSPENDED)` - new process with suspended main thread
2. Allocate + write shellcode in the new process
3. `QueueUserAPC(shellcodeAddr, hThread, ...)` on the suspended thread
4. `ResumeThread` - thread wakes, APC fires BEFORE the entry point

**Why "early bird"**: The malicious code runs before any userland hooks (EDR DLLs)
are initialized in the new process. The process's `ntdll!LdrInitializeThunk` dispatches
queued APCs before reaching the application entry point.

**Detection**:
- APC queued to a suspended process's thread immediately after creation
- Process creation in suspended state followed by memory write + APC queue
- ETW: thread APC dispatch before `DllMain` of injected EDR DLL

---

## 12. Comparison Matrix

| Technique | File on disk | In PEB.Ldr | LoadLibrary called | New thread | Kernel needed |
|-----------|:-----------:|:----------:|:-----------------:|:----------:|:-------------:|
| Classic DLL injection | yes | yes | yes | yes | no |
| Reflective injection | no | no | no | yes | no |
| Manual mapping | no | no | no | yes | no |
| Process hollowing | yes (legit) | yes (wrong) | no | no (hijack) | no |
| Process ghosting | deleted | yes | no | yes | no |
| Process doppelganging | never committed | yes | no | yes | no |
| Process herpaderping | overwritten | yes | no | yes | no |
| DLL sideloading | yes (proxy) | yes | yes (by app) | no | no |
| APC / Early Bird | no | no | no | no (APC) | no |
| Thread hijacking | no | no | no | no (reuse) | no |

---

## Sources

1. Stephen Fewer, "Reflective DLL Injection" - https://github.com/stephenfewer/reflectivedllinjection
2. MITRE ATT&CK T1620, "Reflective Code Loading" - https://attack.mitre.org/techniques/T1620/
3. Depth Security, "Reflective DLL Injection In C++" - https://depthsecurity.com/blog/reflective-dll-injection-in-c
4. Rapid7 Metasploit, "Using ReflectiveDLL Injection" - https://github.com/rapid7/metasploit-framework/wiki/Using-ReflectiveDLL-Injection
5. Unprotect Project, "Reflective DLL Injection" - https://www.unprotect.it/technique/reflective-dll-injection/
6. Trend Micro, "Reflective Loading Runs Netwalker" - https://www.trendmicro.com/en_gb/research/20/e/netwalker-fileless-ransomware-injected-via-reflective-loading.html
7. quantumcore, "ReflectiveDLLInjectionTutorial" - https://github.com/quantumcore/ReflectiveDLLInjectionTutorial
8. MITRE ATT&CK T1055.001, "DLL Injection" - https://attack.mitre.org/techniques/T1055/001/
9. TheCruZ, "Simple-Manual-Map-Injector" - https://github.com/TheCruZ/Simple-Manual-Map-Injector
10. thetobysiu, "ManualMapInjection" - https://github.com/thetobysiu/ManualMapInjection
11. mactec0, "Kernelmode-manual-mapping-through-IAT" - https://github.com/mactec0/Kernelmode-manual-mapping-through-IAT
12. TrustedSec, "Process Injection Mapped Sections" - https://trustedsec.com/blog/malware-series-process-injection-mapped-sections
13. Medium (s12deff), "Reflective DLL Injection / Manual Mapping" - https://medium.com/@s12deff/reflective-dll-injection-e2955cc16a77
14. SecurityTimes, "Path to Process Injection - Bypass Userland API Hooking" - https://securitytimes.medium.com/path-to-process-injection-bypass-userland-api-hooking-a8a49ae5def6
15. Microsoft Detours Wiki - https://github.com/microsoft/Detours/wiki/
16. ResearchGate, "Detours: Binary Interception of Win32 Functions" - https://www.researchgate.net/publication/2791922
17. StackOverflow, "Detours vs MinHook" - https://stackoverflow.com/questions/63968797
18. 1337skills, "Detours Cheatsheet" - https://1337skills.com/cheatsheets/detours/
19. Sophos, "Finding Minhook in a sideloading attack" - https://www.sophos.com/en-us/blog/finding-minhook-in-a-sideloading-attack-and-sweden-too
20. RedFoxSec, "IAT, Inline & Kernel Hooks Explained" - https://www.redfoxsec.com/blog/api-hooking-iat-inline-and-kernel-hooks-detection-exploitation-defense-guide
21. SecurityMaven, "Anatomy of IAT and EAT Hooking" - https://securitymaven.medium.com/anatomy-of-iat-and-eat-hooking-9612eb15baf1
22. HackMag, "Taking Control of Any Windows Application" - https://hackmag.com/security/winapi-hooks
23. CodeReversing, "Import Address Table Hooks" - https://www.codereversing.com/archives/597
24. Unprotect Project, "IAT Hooking" - https://unprotect.it/technique/iat-hooking/
25. GitHub Gist (TheWover), "EAT and IAT hook" - https://gist.github.com/TheWover/ae7f75b8a48d3b2d5b1fe60672918a27
26. NVISO Labs, "Dynamic Invocation in .NET to bypass hooks" - https://blog.nviso.eu/2020/11/20/dynamic-invocation-in-net-to-bypass-hooks/
27. MITRE ATT&CK T1055.012, "Process Hollowing" - https://attack.mitre.org/techniques/T1055/012/
28. SecurityScientist, "12 Q&A About Process Hollowing" - https://www.securityscientist.net/blog/12-questions-and-answers-about-process-hollowing-t1055-012/
29. anticheat.ac, "Anatomy of Process Hollowing" - https://anticheat.ac/blog/processhollowing
30. Microsoft Security Blog, "Using process creation properties to catch evasion techniques" - https://www.microsoft.com/en-us/security/blog/2022/06/30/using-process-creation-properties-to-catch-evasion-techniques/
31. Medium (s12deff), "Ghostly Hollowing" - https://medium.com/@s12deff/ghostly-hollowing-3de4831c7a83
32. Gabriel Landau / Elastic, "Process Ghosting" (original research)
33. MITRE ATT&CK T1055.013, "Process Doppelganging" - https://attack.mitre.org/wiki/Technique/T1186
34. TrainSec, "NTFS Transactions and Process Doppelganging" - https://trainsec.net/library/windows-internals/ntfs-transactions-in-windows-kernel-transaction-manager-createfiletransacted-and-process-doppelganging/
35. SecurityScientist, "12 Q&A About Process Doppelganging" - https://www.securityscientist.net/blog/12-questions-and-answers-about-process-doppelganging-t1055-013/
36. Fortinet, "GandCrab / TxHollower" - https://www.fortinet.com/blog/threat-research/gandcrab-doppelganged-his-shell
37. hasherezade, "transacted_hollowing" - https://github.com/hasherezade/transacted_hollowing
38. The Hacker News, "Process Doppelganging" - https://thehackernews.com/2017/12/malware-process-doppelganging.html
39. HackMag, "Disguising Windows Processes" - https://hackmag.com/security/doppelganging-process
40. Picus Security, "T1055.013 Process Doppelganging" - https://www.picussecurity.com/resource/blog/t1055-013-process-doppelganging
41. Johnny Shaw, "herpaderping" - https://github.com/jxy-s/herpaderping
42. Hagrid29, "herpaderply_hollowing" (hybrid) - https://github.com/Hagrid29/herpaderply_hollowing
43. MITRE ATT&CK T1574.001, "DLL Search Order Hijacking" - https://attack.mitre.org/techniques/T1574/001/
44. MITRE ATT&CK T1574.002, "DLL Side-Loading" - https://attack.mitre.org/techniques/T1574/002
45. Palo Alto Unit 42, "Intruders in the Library (DLL Hijacking)" - https://origin-unit42.paloaltonetworks.com/dll-hijacking-techniques/
46. Bitdefender, "What is DLL Sideloading" - https://techzone.bitdefender.com/en/tech-explainers/what-is-dll-sideloading.html
47. KeepNet Labs, "DLL Hijacking: Definition, Variations" - https://keepnetlabs.com/blog/dll-hijacking
48. Checkpoint, "10 Years of DLL Hijacking" - https://research.checkpoint.com/2017/10
49. Cybereason, "DLL Side-Loading Widely (Ab)Used" - https://www.cybereason.com/blog/threat-analysis-report-dll-side-loading-widely-abused
50. Securonix, "Detecting DLL Sideloading Techniques" - https://www.securonix.com/blog/detecting-dll-sideloading-techniques-in-malware-attack-chains/
51. Google Cloud / Mandiant, "DLL Abuse Techniques Overview" - https://cloud.google.com/blog/topics/threat-intelligence/abusing-dll-misconfigurations
52. MITRE ATT&CK T1055.003, "Thread Execution Hijacking" - https://attack.mitre.org/techniques/T1055/003/
53. MITRE ATT&CK T1055.004, "APC Injection" - https://attack.mitre.org/techniques/T1055/004
54. SecurityScientist, "12 Q&A About APC Injection" - https://www.securityscientist.net/blog/12-questions-and-answers-about-asynchronous-procedure-call-t1055-004/
55. The Hacker News, "Early Bird Code Injection" - https://thehackernews.com/2018/04/early-bird-code-injection.html
56. FluxSec, "Strategy for Early Bird APC Queue Injection" - https://fluxsec.red/early-bird-apc-queue-injection
57. AbdouRoumi, "Early_Bird_APC_Injection" - https://github.com/AbdouRoumi/Early_Bird_APC_Injection
58. cocomelonc, "APC injection technique" - https://cocomelonc.github.io/tutorial/2021/11/11/malware-injection-3.html
59. benjitrapp, "Early Bird & Early Cascade Injection" - https://benjitrapp.github.io/attacks/2026-01-19-early-bird-cascade/
60. boku7, "HOLLOW (APC + suspended process)" - https://github.com/boku7/HOLLOW
61. MITRE ATT&CK T1056.004, "Credential API Hooking" - https://attack.mitre.org/techniques/T1056/004/
62. ring0lab, "Reflective DLL Injection (RedTeam tactics)" - https://github.com/ring0lab/RedTeam-Tactics-and-Techniques/blob/master/offensive-security/code-injection-process-injection/reflective-dll-injection.md
63. SecurityScientist, "What Is Early Bird Injection" - https://answers.securityscientist.net/q/24483/what-is-early-bird-injection-and-why-is-it-especially-dangerous
64. Twingate, "What is Process Hollowing" - https://www.twingate.com/blog/glossary/process%20hollowing
65. TechTarget, "SynAck Ransomware Process Doppelganging" - https://www.techtarget.com/searchSecurity/answer/How-does-the-SynAck-ransomware-use-Process-Doppelgaenging
66. KindaTechnical, "DLL Hijacking and Unquoted Service Paths" - http://kindatechnical.com/penetration-testing/dll-hijacking-and-unquoted-service-paths.html
67. BlackHat, "Advanced Process Tampering Techniques" - https://blackhat.com/sponsor-posts/09122023-manageengine.html
