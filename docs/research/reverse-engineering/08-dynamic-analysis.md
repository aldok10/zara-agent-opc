# Dynamic Analysis for Reverse Engineering

Scope: authorized analysis only. Run untrusted binaries inside an isolated VM with no host shares, snapshots before each run, and a controlled (or faked) network. Dynamic analysis observes a binary *while it executes* — the complement to static analysis, where you read code without running it. The two are strongest together: static finds the interesting routine, dynamic confirms what it actually does at runtime.

This reference covers debuggers, runtime instrumentation (Frida), behavioral monitoring, sandboxes, network interception, and DLL-specific harnessing. All work assumes a disposable analysis VM.

---

## 1. Mental Model: What Dynamic Analysis Buys You

Static analysis tells you what *could* happen. Dynamic analysis tells you what *did* happen on this run, with real inputs. It defeats most obfuscation that survives static review:

- Packed/encrypted code unpacks itself in memory — you dump it after the unpack stub runs.
- String decryption routines produce plaintext you can read at a breakpoint instead of reversing the cipher.
- Configuration, C2 domains, and keys materialize in memory or registers at the moment of use.
- Anti-analysis logic (sandbox checks, debugger detection) is visible as branches you can patch live.

The cost: the sample runs. Containment discipline is non-negotiable.

---

## 2. Debuggers

### 2.1 Tool Selection Table

| Tool | Platform | License | Best For | Notes |
|------|----------|---------|----------|-------|
| x64dbg / x32dbg | Windows | Open source (GPLv3) | The default for Windows usermode RE | Active, scriptable, plugin ecosystem; replaces OllyDbg [2](https://www.scribd.com/document/835922318/An-Introduction-To-x64dbg) |
| WinDbg / WinDbg Preview | Windows | Free (MS) | Kernel debugging, TTD, deep OS work | TTD is the standout feature [3](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-overview/) |
| OllyDbg | Windows (x86 only) | Free (legacy) | Reading old tutorials/plugins | 32-bit only, unmaintained; use x32dbg instead |
| gdb + GEF/pwndbg/peda | Linux (+macOS) | Open source | ELF, exploit dev, CTF | Plugins make raw gdb usable [1](https://github.com/pwndbg/pwndbg/blob/dev/README.md) |
| lldb | macOS, Linux | Open source | Mach-O, native macOS targets | pwndbg now supports lldb too [2](https://1337skills.com/cheatsheets/pwndbg/) |

### 2.2 x64dbg — The Windows Workhorse

x64dbg has three parts: the debug engine (DBG), the GUI, and a bridge between them [9](https://www.scribd.com/document/356662011/x64dbg). The 64-bit binary is `x64dbg`; the 32-bit is `x32dbg`. Match the bitness to your target.

Core workflow:

1. **Load** the target (File > Open) or attach to a running process (File > Attach).
2. **Initial break**: by default it breaks at the system breakpoint, then TLS callbacks, then the entry point. Adjust under Options > Preferences.
3. **Navigate** the CPU view (disassembly), dump (memory), stack, and registers panes.
4. **Set breakpoints** and run.

Breakpoint types in x64dbg:

| Type | How | When to use |
|------|-----|-------------|
| Software (INT3) | `F2` on an instruction, or `bp <addr>` | General-purpose; modifies the byte at the address |
| Hardware | `bph <addr>` or right-click > Breakpoint > Hardware | Max 4 (uses DR0–DR3); survives self-modifying code that would clobber an INT3 [10](https://www.codereversing.com/archives/594) |
| Memory | right-click in dump > Breakpoint > Memory, Access/Write | Break when a region is read/written/executed |
| Conditional | set `$breakpointcondition` expression | Break only when a condition holds [1](https://help.x64dbg.com/en/latest/introduction/ConditionalBreakpoint.html) |

Conditional breakpoints: set the system variable `$breakpointcondition` to the break expression, and optionally `$breakpointlogcondition` plus a log string for silent logging without stopping [1](https://help.x64dbg.com/en/latest/introduction/ConditionalBreakpoint.html). Example: break on `CreateFileW` only when the filename argument matches a pattern — far faster than hitting every call.

Hardware breakpoints are implemented with the x86/x64 debug registers DR0–DR3 holding the address and DR7 controlling enable/type/length [10](https://www.codereversing.com/archives/594). They do not modify code, so they are essential against packers and self-checking code.

Stepping commands:

| Action | Shortcut | Command |
|--------|----------|---------|
| Step into | `F7` | `sti` |
| Step over | `F8` | `sto` |
| Run | `F9` | `run` |
| Run to return | `Ctrl+F9` | `rtr` |
| Run to selection | `F4` | — |
| Execute till user code | — | skip system DLLs |

Watching state: registers update live in the registers pane; right-click a register to follow it in the dump or modify it. The "Follow in Dump" action on a pointer reveals buffers. The call stack pane reconstructs the return-address chain so you can see who called the current function. Conditional tracing (Trace > Trace into/over with a condition) records execution until a condition is met — useful for finding where a value changes.

x64dbg scripting and the command bar let you automate setup; the command reference is the in-app help and the official docs.

### 2.3 WinDbg + Time-Travel Debugging (TTD)

WinDbg (and WinDbg Preview / the modern WinDbg) supports **Time Travel Debugging**: record a trace of a process's full execution, then replay it forwards *and backwards* deterministically [3](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-overview/). This is transformative for RE because you can run the sample once, capture everything, and analyze offline without re-running the malware.

Recording a trace:

- In WinDbg: File > Start debugging > Launch executable (advanced), check **Record with Time Travel Debugging** [8](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/time-travel-debugging-record).
- Or use the command-line utility `TTD.exe` to record a process to a `.run` trace file [7](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/time-travel-debugging-ttd-exe-command-line-util).

Replay commands:

| Command | Meaning |
|---------|---------|
| `g` | Go forward |
| `g-` | Go backward |
| `p` / `t` | Step over / into (forward) |
| `p-` / `t-` | Step over / into (backward) |
| `!tt <pos>` | Travel to a trace position |
| `dx @$cursession.TTD...` | Query the TTD data model |

The TTD data model exposes calls, memory accesses, and events as queryable objects via the `dx` command, JavaScript, or C++ [10](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-object-model). Timelines give a visual map of breakpoints, memory read/writes, function calls/returns, and exceptions across the run [1](https://learn.microsoft.com/is-is/windows-hardware/drivers/debuggercmds/windbg-timeline-preview). You can query "every call to `VirtualAlloc`" and pivot directly to each, which is how analysts efficiently locate payload-staging events such as process hollowing [4](https://cloud.google.com/blog/topics/threat-intelligence/time-travel-debugging-using-net-process-hollowing/).

Typical TTD triage: travel to an exception or a key API event, then single-step *backward* until the faulting/interesting code is in scope, inspect locals, form a hypothesis, and replay to confirm [6](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/time-travel-debugging-walkthrough). Traces are shareable, so one analyst can record and others can investigate.

WinDbg conditional breakpoints use the `bp <addr> "<commands>"` form, or `j`/`.if` for conditions; the `dx`-based condition with `bp /w` breaks only "when" the expression is true [5](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/setting-a-conditional-breakpoint).

### 2.4 OllyDbg (Legacy)

OllyDbg is a 32-bit-only usermode debugger that shaped a generation of Windows RE tutorials and plugins. It is unmaintained and cannot debug 64-bit targets. Use it only to follow legacy material; for real work, x32dbg is the modern successor with a deliberately familiar layout.

### 2.5 gdb + GEF / pwndbg / peda (Linux)

Raw gdb is powerful but unfriendly for RE. Three plugin layers fix that:

| Plugin | Focus | Notes |
|--------|-------|-------|
| pwndbg | Exploit dev + RE, fast & modern | Now supports both GDB and LLDB; aims to replace the older single-file plugins [3](http://pwndbg.re/stable/) |
| GEF | Single-file, broad arch support | `gef` by hugsy; easy drop-in [4](https://github.com/hugsy/gef) |
| PEDA | Original Python exploit-dev assistant | Older; pwndbg/GEF are the active successors |

All three add context views (registers, stack, disassembly, backtrace) on each stop and helpers for heap/GOT/PLT inspection [1](https://github.com/pwndbg/pwndbg/blob/dev/README.md).

Essential gdb commands for RE:

| Goal | Command |
|------|---------|
| Break at function | `break main` / `b *0x401000` |
| Hardware breakpoint | `hbreak <loc>` |
| Watchpoint (data) | `watch <expr>` (write), `rwatch` (read), `awatch` (access) |
| Step | `stepi` / `step`, `nexti` / `next` |
| Continue | `continue` |
| Registers | `info registers`, `p/x $rax` |
| Examine memory | `x/16xw <addr>`, `x/s <addr>` |
| Backtrace | `bt`, `frame <n>` |
| Modify | `set $rax = 0`, `set {int}0x... = 5` |

Watchpoints use hardware debug registers when available; force software-only with `set can-use-hw-watchpoints 0` if the platform misbehaves [6](https://stackoverflow.com/questions/3470704/gdb-problem-setting-hardware-watchpoint-how-to-set-software-watchpoint). Hardware watchpoints are cheap; software watchpoints single-step and are slow.

### 2.6 lldb (macOS / Linux)

lldb is the LLVM debugger, native to macOS and the default for Mach-O. Command mapping is close to gdb but with its own verbs: `b <sym>`, `r`, `n`/`s`, `si`/`ni`, `c`, `register read`, `memory read -fx -c16 <addr>`, `watchpoint set variable <v>`, `bt`. pwndbg's LLDB support brings a richer RE context to lldb sessions [2](https://1337skills.com/cheatsheets/pwndbg/).

---

## 3. Frida — Dynamic Instrumentation

Frida injects a JavaScript engine into a target process so you can hook, trace, and rewrite behavior at runtime without recompiling or patching on disk [2](https://learnfrida.info/). It works across Windows, Linux, macOS, Android, and iOS. The agent (your JS) runs *inside* the target; a controlling script or the CLI drives it.

### 3.1 Core APIs

| API | Purpose |
|-----|---------|
| `Module.getExportByName(mod, name)` / `findExportByName` | Resolve an exported function's address [2](https://learnfrida.info/) |
| `Interceptor.attach(addr, callbacks)` | Hook entry (`onEnter`) and exit (`onLeave`) of a function |
| `Interceptor.replace(addr, NativeCallback)` | Replace a function wholesale |
| `NativeFunction(addr, ret, [args])` | Call native functions from JS |
| `NativePointer`, `Memory.read*/write*` | Read/write process memory |
| `Stalker` | Instruction-level code tracing engine [2](https://learnfrida.info/) |

`getExportByName` throws if the symbol is missing; `findExportByName` returns null — pick based on whether absence is fatal [2](https://learnfrida.info/).

### 3.2 Hooking an Exported DLL Function

The canonical pattern: resolve the export, attach, read args in `onEnter`, read/modify the return in `onLeave`.

```js
// Hook an exported function from a target DLL, trace args + return
const addr = Module.getExportByName("target.dll", "DecryptConfig");
Interceptor.attach(addr, {
  onEnter(args) {
    // args[n] are NativePointer; interpret per the function's ABI
    this.outBuf = args[1];                 // stash a pointer for onLeave
    console.log("DecryptConfig called, in=", args[0].readUtf8String());
  },
  onLeave(retval) {
    console.log("ret =", retval.toInt32());
    console.log("plaintext =", this.outBuf.readUtf8String());
    // retval.replace(0);                  // optionally force success
  }
});
```

Reading a UTF-16 WinAPI string argument uses `args[n].readUtf16String()`; numbers passed by value are read with `.toInt32()`/`.toUInt32()`, by reference with `.readU32()` etc. [2](https://learnfrida.info/). To bend behavior, modify return values in `onLeave` (`retval.replace(...)`) or rewrite arguments before the call. A classic case is hooking `CryptDecrypt` to capture plaintext after decryption [2](https://learnfrida.info/).

### 3.3 frida-trace — Zero-Code Tracing

`frida-trace` auto-generates per-function handler scripts and prints calls live [4](http://frida.re/docs/quickstart):

```bash
# Trace every function whose name matches a glob, by export
frida-trace -p <pid> -i "Decrypt*" -i "Crypt*"
# Trace WinAPI calls
frida-trace -p <pid> -i "CreateFileW" -i "WriteFile"
# Spawn and trace
frida-trace -f target.exe -i "send" -i "recv"
```

It writes editable `__handlers__/*.js` stubs you can extend to dump buffers or stacks. "Started tracing N functions" confirms attachment [4](http://frida.re/docs/quickstart).

### 3.4 Stalker — Instruction-Level Tracing

Stalker is Frida's code-tracing engine: it follows threads instruction by instruction, letting you record every call, basic block, or instruction, with register and argument context [2](https://learnfrida.info/). It is the basis for call-graph reconstruction and deobfuscation (e.g., unwinding control-flow-flattened code), as seen in tooling that defeats OLLVM by tracing calls, args, and registers [9](https://github.com/CYRUS-STUDIO/frida_stalker). Stalker is powerful but heavy: scope it to a single thread and a narrow address range or it floods.

### 3.5 Useful CodeShare

`@oleavr/who-does-it-call` reveals what a given function calls the next time it runs, including by export glob like `exports:*!open*` [3](https://codeshare.frida.re/@oleavr/who-does-it-call/). Run via `frida --codeshare oleavr/who-does-it-call -f <binary>`.

---

## 4. Behavioral Monitoring (Windows)

These tools observe a process from the outside — no debugger attach required — and answer "what files, registry keys, DLLs, and network endpoints did it touch?"

| Tool | Vendor | Observes | Key Use |
|------|--------|----------|---------|
| Process Monitor (ProcMon) | Sysinternals | File system, registry, process/thread, image loads, some network — real time [1](https://technet.microsoft.com/sysinternals/processmonitor.aspx) | Behavioral timeline; find dropped files, persistence, missing DLLs [4](https://www.geeksforgeeks.org/ethical-hacking/malware-analysis-using-process-monitor-procmon/) |
| Process Explorer | Sysinternals | Process tree, loaded DLLs, handles, strings | Inspect a live process; "find DLL/handle" search |
| Process Hacker / System Informer | Open source | Like Procexp + more (services, memory, threads) | Deeper memory inspection, string scraping, dump |
| API Monitor | rohitab | API calls with full args/returns across thousands of APIs | Watch specific DLL/API usage with decoded parameters |

### 4.1 ProcMon Workflow

1. Snapshot the VM. Launch ProcMon, then run the sample.
2. ProcMon captures everything — it floods. Immediately **filter** (Ctrl+L): `Process Name is <sample>.exe` is the first filter [7](https://adamtheautomator.com/procmon/).
3. Add filters by operation: `Operation is WriteFile` to find drops, `Operation is RegSetValue` to find persistence, `Operation contains TCP` for network.
4. Use the column for **Result** to spot `NAME NOT FOUND` (missing DLL / search-order hijack opportunities) and `PATH NOT FOUND` [2](https://umatechnology.org/unleashing-the-power-of-procmon-a-comprehensive-guide-to-mastering-process-monitor/).
5. Each event has a **stack trace** tab showing the call chain that triggered it — pivot back to the responsible module.
6. Save as PML for offline analysis; ProcMon separates user space (apps/services) from kernel space (drivers/IO) activity [9](https://medium.com/@nasbench/hunting-malware-with-windows-sysinternals-process-monitor-e67476f44514).

ProcMon reveals dropped files, registry persistence, process creation, and network activity from a suspicious binary in a VM [4](https://www.geeksforgeeks.org/ethical-hacking/malware-analysis-using-process-monitor-procmon/). Pair it with TCPView (live connections), Autoruns (persistence), and Sysmon (logged telemetry) for a complete Sysinternals hunting kit [3](https://windowsforum.com/threads/windows-threat-hunting-with-sysinternals-process-explorer-tcpview-autoruns-procmon-sysmon.399412/).

### 4.2 Process Explorer / System Informer

Process Explorer shows the live process tree, the DLLs each process has loaded (lower pane > DLL view), open handles, and per-process strings. System Informer (the maintained fork of Process Hacker) adds richer memory inspection, the ability to read/edit process memory, dump regions, and inspect threads with stacks — handy for grabbing an unpacked image from a running sample.

### 4.3 API Monitor

API Monitor hooks a target and logs API calls with decoded arguments and return values across a large built-in API database. Filter to the DLL or API family of interest (crypto, file, registry, network) to watch exactly how the sample uses a specific export, including buffer contents passed in and out.

---

## 5. Automated Sandboxes

Sandboxes detonate a sample in an instrumented VM and produce a behavioral report: API calls, dropped files, network IOCs, screenshots, memory dumps, and a verdict. Use them for fast triage before manual debugging.

| Sandbox | License | Strengths | Notes |
|---------|---------|-----------|-------|
| CAPE | Open source | Config extraction, automatic unpacking, memory dumps, forensic detail | Evolution of Cuckoo; the modern self-hosted default [7](https://capev2.readthedocs.io/en/latest/introduction/what.html) [10](https://medium.com/@rizqisetyokus/building-capev2-automated-malware-analysis-sandbox-part-1-da2a6ff69cdb) |
| Cuckoo | Open source | The original automated analysis system | Largely superseded by CAPE/forks for new deployments [1](https://cybersectools.com/compare/cape-vs-cuckoo-sandbox) |
| ANY.RUN | Commercial (free tier) | **Interactive** browser-based analysis, live MITM | Click through the malware in real time [8](https://cybersectools.com/compare/anyrun-vs-cuckoo-sandbox) |
| Joe Sandbox | Commercial (community tier) | Deep multi-OS reports, ML scoring | Polished verdicts; community edition available [4](https://cybersectools.com/compare/cape-vs-joe-sandbox-ml) |

CAPE is open source and gives the forensic detail (behavioral analysis + memory dumps) that incident response and threat-intel work needs, where commercial sandboxes often hide reasoning behind a simplified verdict [5](https://cybersectools.com/compare/cape-vs-joe-security-joe-sandbox). A typical self-host is CAPEv2 on Ubuntu with a Windows 10 guest VM [10](https://medium.com/@rizqisetyokus/building-capev2-automated-malware-analysis-sandbox-part-1-da2a6ff69cdb). ANY.RUN's interactivity is its differentiator: you drive the sample live and watch network traffic via its built-in MITM proxy [2](https://thehackernews.com/2023/12/how-to-analyze-malwares-network-traffic.html).

Caveat: capable malware detects sandboxes (timing, artifacts, user-interaction checks) and stays dormant. A clean report is not proof of safety. Combine sandbox triage with manual dynamic analysis.

---

## 6. Network Analysis

DLLs and binaries that do network I/O reveal C2, exfil, and downloaders over the wire. Standard setup: route the analysis VM's traffic through a proxy/capture host with a fake DNS so nothing escapes.

| Tool | Layer | Use |
|------|-------|-----|
| Wireshark | L2–L7 packet capture | Ground-truth pcap; protocol dissection; see raw TCP/UDP, DNS, TLS handshakes |
| mitmproxy | HTTP(S)/TCP/UDP intercepting proxy | TLS interception, inspect/modify/replay requests, scriptable in Python [4](https://synacktiv.com/en/publications/mitmproxy-for-fun-and-profit-interception-and-analysis-of-application-traffic) |
| Fiddler | HTTP(S) proxy | Windows-friendly GUI for HTTP debugging |
| INetSim / FakeNet-NG | Service emulation | Fake DNS/HTTP/SMTP so isolated malware "talks" and reveals intent |

mitmproxy is a programmable, TLS-capable intercepting proxy that terminates connections to observe and modify traffic [9](https://blog.shellnetsecurity.com/posts/2026/mitmproxy-security-regression-harness/); it works at HTTP/HTTPS and down to raw TCP/UDP [4](https://synacktiv.com/en/publications/mitmproxy-for-fun-and-profit-interception-and-analysis-of-application-traffic). Inspecting TLS requires the client to trust the proxy's CA certificate; the cleanest VM setup runs mitmproxy on the host and redirects the guest's traffic transparently via iptables, installing the proxy CA in the guest [8](https://anadoxin.org/blog/intercepting-ssl-traffic/). For TLS you cannot decrypt at the proxy, log the session keys (SSLKEYLOGFILE) and feed them to Wireshark to decrypt the pcap [6](https://www.koyeb.com/blog/inspect-tls-encrypted-traffic-using-mitmproxy-and-wireshark). In a sandbox, a MITM proxy lets analysts read request/response contents, IPs, and URLs in real time to identify C2 and stolen data [2](https://thehackernews.com/2023/12/how-to-analyze-malwares-network-traffic.html).

Workflow: start capture (Wireshark + mitmproxy) → run sample → observe DNS lookups, connection attempts, HTTP requests, TLS SNI → extract IOCs → optionally use FakeNet/INetSim to coax dormant downloaders into revealing payloads.

---

## 7. DLL-Specific Dynamic Analysis

DLLs do not run on their own — they need a host process to load them and call their exports. Four ways to get a DLL executing under observation:

### 7.1 rundll32.exe

`rundll32` calls an exported function with a specific signature [8](https://stackoverflow.com/questions/9096193/):

```
rundll32.exe C:\path\sample.dll,ExportName <optional args>
```

The export must match the rundll32 calling convention (`void CALLBACK ExportNameW(HWND, HINSTANCE, LPWSTR, int)`) for clean invocation [8](https://stackoverflow.com/questions/9096193/). Many malicious DLLs are built to be rundll32-callable. Find the export name/ordinal first with a PE viewer; if only an ordinal exists, call `sample.dll,#1`. This is the standard quick method to analyze a DLL with rundll32 [10](https://www.oreilly.com/library/view/learning-malware-analysis/9781788392501/28f3bf6b-aa5b-4f2e-8b23-3a95e48163a6.xhtml). Debug it by launching rundll32 under x64dbg/WinDbg and setting a breakpoint at the export or in `DllMain`.

### 7.2 regsvr32.exe

For COM DLLs exposing `DllRegisterServer`:

```
regsvr32 /s C:\path\sample.dll          # calls DllRegisterServer
regsvr32 /u C:\path\sample.dll          # calls DllUnregisterServer
```

Use when the malware's logic lives in the registration entry points. (Also a known LOLBin technique — analyze in a VM.)

### 7.3 LoadLibrary + GetProcAddress Custom Harness

For full control, write a tiny loader that loads the DLL, resolves the export, and calls it with exactly the arguments you want — the Win32 run-time dynamic linking pattern [1](https://docs.microsoft.com/en-us/windows/win32/dlls/using-run-time-dynamic-linking):

```c
#include <windows.h>
#include <stdio.h>

typedef int (*ExportFn)(const char *input);   // match the real signature

int main(void) {
    HMODULE h = LoadLibraryA("sample.dll");    // DllMain runs here
    if (!h) { printf("load failed: %lu\n", GetLastError()); return 1; }

    ExportFn fn = (ExportFn)GetProcAddress(h, "TargetExport");
    if (!fn) { printf("export not found\n"); FreeLibrary(h); return 1; }

    int r = fn("controlled input");            // breakpoint here in the debugger
    printf("returned %d\n", r);

    FreeLibrary(h);                            // optional
    return 0;
}
```

The flow is exactly LoadLibrary → GetProcAddress (by name or ordinal) → call via the function pointer → FreeLibrary [2](https://docs.microsoft.com/en-us/windows/win32/dlls/about-dynamic-link-libraries). GetProcAddress accepts a function name or an export ordinal [7](https://learn.microsoft.com/en-us/cpp/build/getprocaddress?view=msvc-170). A custom harness lets you feed precise inputs, call exports in a chosen order, and attach a debugger to *your* process (cleaner symbol handling than debugging rundll32, where the source-level breakpoints do not map to the DLL automatically [5](https://stackoverflow.com/questions/20786705/debugging-a-native-dll-using-rundll32-exe-fail-to-load-symbols)).

Note: `DllMain` executes during `LoadLibrary` — set a breakpoint *before* the load completes (break on the LoadLibrary return or on the DLL's entry point) if the malicious logic is in `DllMain` rather than an export.

### 7.4 Frida Against a Loaded DLL

Once any host (rundll32, your harness, or the real application) has the DLL mapped, attach Frida and hook exports by name as in section 3.2 — no debugger stepping needed to trace arguments and returns [6](https://frida.re/docs/examples/windows/).

---

## 8. Combining Static + Dynamic

The highest-leverage technique is using static analysis to *locate* and dynamic analysis to *extract*:

1. **Statically** identify the interesting routine — e.g., a string-decryption or config-decryption function (cross-references to crypto APIs, an XOR loop, a call before a `connect`).
2. **Set a breakpoint** at the routine's exit (or the buffer it writes) in x64dbg/WinDbg/gdb, or hook it with Frida.
3. **Run** the sample with real inputs until the breakpoint hits.
4. **Dump** the plaintext from the output buffer / register. The cipher never has to be reversed by hand.

Variants of this pattern:

- **Unpacking**: breakpoint after the unpack stub (e.g., on the OEP, or on `VirtualProtect`/`VirtualAlloc` of the new region), then dump the unpacked image from memory with Scylla (x64dbg plugin) or System Informer.
- **Config extraction**: hook the decrypt routine, capture the decoded C2/keys — exactly what CAPE automates for known families [7](https://capev2.readthedocs.io/en/latest/introduction/what.html).
- **TTD config hunt**: record one TTD trace, then query the data model for every call to the decrypt function and read each output offline [4](https://cloud.google.com/blog/topics/threat-intelligence/time-travel-debugging-using-net-process-hollowing/).
- **Anti-analysis bypass**: find the sandbox/debugger check statically, then patch the branch live (NOP the jump, or force the return value with Frida `retval.replace`) to reach the real payload.

The loop is: static narrows the search space, dynamic confirms ground truth, and findings from dynamic (new addresses, new functions) feed back into static. Neither alone is sufficient against modern protected binaries.

---

## 9. Quick Reference: Pick the Tool

| Situation | Reach for |
|-----------|-----------|
| Windows usermode, general RE | x64dbg / x32dbg |
| Need to replay execution / hard-to-reproduce bug | WinDbg TTD |
| Linux ELF / CTF / exploit dev | gdb + pwndbg or GEF |
| macOS Mach-O | lldb (+ pwndbg) |
| Hook/trace functions without patching disk | Frida (`Interceptor`, frida-trace) |
| Instruction-level trace / deobfuscation | Frida Stalker |
| "What did it touch?" file/registry/process | ProcMon + Process Explorer / System Informer |
| Decoded API calls with arguments | API Monitor |
| Fast automated triage report | CAPE (self-host) / ANY.RUN / Joe Sandbox |
| Inspect network / C2 / exfil | Wireshark + mitmproxy (+ FakeNet/INetSim) |
| Run a DLL's exports | rundll32 / regsvr32 / LoadLibrary harness |

---

## Containment Checklist (Always)

- Isolated VM, host-only or faked network, no shared folders/clipboard.
- Clean snapshot before each detonation; revert after.
- Disable guest additions/integration that bridge to the host.
- Assume the sample detects analysis; corroborate sandbox verdicts with manual work.
- Never analyze live malware on a host you care about, and only on samples you are authorized to handle.
