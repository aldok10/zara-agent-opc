# Memory Forensics with Volatility 3

TL;DR: Memory forensics extracts runtime artifacts (processes, network, injected code, credentials, configs) from RAM dumps. Volatility 3 is the standard framework. Key workflow: acquire -> identify OS -> enumerate processes -> find injection -> extract payloads.

---

## Acquisition Tools

| Tool | Platform | Notes |
|------|----------|-------|
| WinPmem | Windows | Signed driver, raw/AFF4 output |
| DumpIt | Windows | One-click, minimal footprint |
| FTK Imager | Windows | GUI + CLI, captures pagefile |
| LiME | Linux | Kernel module, direct phys mem |
| AVML | Linux | No kernel module, uses /proc/kcore |
| OSXPMem | macOS | Requires SIP reduced |
| vmss2core | VMware | Converts .vmss/.vmsn to raw |

**VM snapshots**: VMware .vmem files are directly usable by Volatility.

---

## Volatility 3 Essentials

```bash
vol -f mem.raw windows.pstree       # process tree
vol -f mem.raw windows.pslist       # flat process list
vol -f mem.raw windows.psscan       # scan for hidden processes (DKOM detection)
vol -f mem.raw windows.malfind      # find injected code (RWX regions)
vol -f mem.raw windows.netscan      # network connections
vol -f mem.raw windows.cmdline      # process command lines
vol -f mem.raw windows.dlllist --pid 1234  # loaded DLLs
vol -f mem.raw windows.handles --pid 1234  # open handles
vol -f mem.raw windows.memdump --pid 1234 --dump  # dump process memory
vol -f mem.raw windows.timeliner    # unified timeline
```

### Symbol Tables (ISF/JSON)

Volatility 3 needs ISF files matching the kernel version. Generate custom:
```bash
# Windows
python3 pdbconv.py ntoskrnl.pdb ntoskrnl.json
# Linux
python3 dwarf2json.py --elf /path/to/vmlinux > linux.json
```

---

## Windows Forensics

### Hidden Process Detection

`psscan` finds EPROCESS by pool tag scan (not list walking). Process in `psscan` but NOT in `pslist` = DKOM-hidden.

### Injected Code (malfind)

Detects: RWX anonymous memory (VadS private), PE headers in non-image regions, shellcode patterns.

| Category | Typical Cause |
|----------|--------------|
| Classic shellcode | VirtualAllocEx + WriteProcessMemory + CreateRemoteThread |
| Process hollowing | ZwUnmapViewOfSection + VirtualAllocEx + SetThreadContext |
| Reflective DLL | Manual PE mapping, no backing file |

### Process Hollowing Detection

- `.text` has PAGE_EXECUTE_READWRITE (should be PAGE_EXECUTE)
- cmdline shows normal path but DLLs don't match
- VAD shows VadS Private instead of VadM Mapped at image base

### Network Artifacts

```bash
vol -f mem.raw windows.netscan
# Shows: Proto, LocalAddr, ForeignAddr, State, PID, Owner
```

### Credentials

```bash
vol -f mem.raw windows.hashdump     # NTLM hashes from SAM
vol -f mem.raw windows.cachedump    # Domain cached creds
vol -f mem.raw windows.lsadump      # LSA secrets
```

### Registry

```bash
vol -f mem.raw windows.registry.printkey --key "Microsoft\Windows\CurrentVersion\Run"
```

Key forensic artifacts: ShimCache, AmCache, UserAssist (ROT-13), Shellbags, Prefetch.

---

## Linux Forensics

```bash
vol -f mem.lime linux.pstree        # process tree
vol -f mem.lime linux.psscan        # scan for hidden processes
vol -f mem.lime linux.bash          # bash command history from memory
vol -f mem.lime linux.netstat       # network connections
vol -f mem.lime linux.malfind --pid 1234  # RWX anonymous regions
```

### Kernel Rootkit Detection

| Plugin | Detects |
|--------|---------|
| `linux.check_syscall` | Syscall table hooks |
| `linux.check_modules` | Hidden kernel modules |
| `linux.check_fop` | file_operations hooking |
| `linux.check_idt` | IDT modifications |
| `linux.check_afinfo` | /proc seq_file hooks |

---

## Kernel Mode Analysis (Windows)

```bash
vol -f mem.raw windows.modules      # loaded drivers
vol -f mem.raw windows.callbacks    # kernel callbacks (process/image/registry)
vol -f mem.raw windows.driverirp    # IRP handler hooks
```

### DKOM Detection

| Technique | Detection |
|-----------|-----------|
| EPROCESS unlink | pslist vs psscan discrepancy |
| Hidden driver | modules vs devicetree |
| Token escalation | psscan Token privileges |

### Pool Tag Scanning

```bash
vol -f mem.raw windows.poolscanner --tag Proc  # find all EPROCESS
```

Common tags: `Proc` (EPROCESS), `Thre` (ETHREAD), `File` (_FILE_OBJECT), `Mut` (Mutex)

---

## Malware Config Extraction

### Workflow

1. Identify malicious process (netscan, malfind, pstree anomalies)
2. Dump process memory: `windows.memdump --pid <pid> --dump`
3. Search for C2: `strings pid.*.dmp | grep -E 'https?://|\.com|\.net'`
4. YARA scan: `vol -f mem.raw windows.vadyarascan --pid 1234 --yara-rules family.yara`

### Key Patterns

- C2 domains/IPs in plaintext (decrypted at runtime)
- AES/XOR keys present in memory during execution
- Mutex names (single-instance protection IOCs)
- Registry persistence paths

---

## Timelining

```bash
vol -f mem.raw windows.timeliner --output=csv --output-file timeline.csv
```

Merges: process creation/exit, file access, registry modification, network connections, event logs. Combine with disk artifacts (MFT, USN journal, .evtx) for complete reconstruction.

---

## Process Memory Extraction

```bash
# Full process address space
vol -f mem.raw windows.memdump --pid 1234 --dump

# Specific files loaded by process
vol -f mem.raw windows.dumpfiles --pid 1234

# VAD analysis (find manually-mapped PEs)
vol -f mem.raw windows.vadinfo --pid 1234
# VadS Private + RWX + no backing file = injection
# VadM Mapped = legitimate LoadLibrary
```
