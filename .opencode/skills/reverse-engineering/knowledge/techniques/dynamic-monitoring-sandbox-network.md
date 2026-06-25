# Dynamic Analysis: Behavioral Monitoring, Sandboxes, Network & DLL Harnessing

TL;DR: ProcMon/Process Explorer/API Monitor for behavioral observation, automated sandboxes (CAPE/ANY.RUN), network interception (Wireshark/mitmproxy), and DLL-specific dynamic analysis methods.
See also: `dynamic-debuggers-frida.md`

---

## 4. Behavioral Monitoring (Windows)

| Tool | Observes | Key Use |
|------|----------|---------|
| Process Monitor (ProcMon) | File system, registry, process/thread, image loads | Behavioral timeline; find dropped files, persistence |
| Process Explorer | Process tree, loaded DLLs, handles, strings | Inspect a live process |
| System Informer | Like Procexp + memory inspection, threads, dumps | Deeper memory inspection |
| API Monitor | API calls with full args/returns | Watch specific DLL/API usage |

### 4.1 ProcMon Workflow

1. Snapshot the VM. Launch ProcMon, then run the sample.
2. Immediately **filter**: `Process Name is <sample>.exe`.
3. Add filters by operation: `WriteFile`, `RegSetValue`, `TCP`.
4. Use **Result** column to spot `NAME NOT FOUND` (missing DLL / search-order hijack opportunities).
5. Each event has a **stack trace** tab showing the call chain.

---

## 5. Automated Sandboxes

| Sandbox | License | Strengths |
|---------|---------|-----------|
| CAPE | Open source | Config extraction, automatic unpacking, memory dumps, forensic detail |
| ANY.RUN | Commercial (free tier) | **Interactive** browser-based analysis, live MITM |
| Joe Sandbox | Commercial (community tier) | Deep multi-OS reports, ML scoring |

Caveat: capable malware detects sandboxes and stays dormant. A clean report is not proof of safety.

---

## 6. Network Analysis

| Tool | Layer | Use |
|------|-------|-----|
| Wireshark | L2-L7 packet capture | Ground-truth pcap; protocol dissection |
| mitmproxy | HTTP(S)/TCP/UDP intercepting proxy | TLS interception, inspect/modify/replay, scriptable |
| INetSim / FakeNet-NG | Service emulation | Fake DNS/HTTP/SMTP so isolated malware "talks" |

Workflow: start capture (Wireshark + mitmproxy) -> run sample -> observe DNS lookups, connections, HTTP requests, TLS SNI -> extract IOCs -> optionally use FakeNet/INetSim to coax dormant downloaders.

---

## 7. DLL-Specific Dynamic Analysis

DLLs do not run on their own -- they need a host process. Four ways to get a DLL executing:

### 7.1 rundll32.exe

```
rundll32.exe C:\path\sample.dll,ExportName <optional args>
```

The export must match the rundll32 calling convention. Find the export name/ordinal first with a PE viewer; if only an ordinal exists, call `sample.dll,#1`. Debug it by launching rundll32 under x64dbg.

### 7.2 regsvr32.exe

```
regsvr32 /s C:\path\sample.dll          # calls DllRegisterServer
```

Use when the malware's logic lives in the registration entry points.

### 7.3 LoadLibrary + GetProcAddress Custom Harness

```c
#include <windows.h>
#include <stdio.h>

typedef int (*ExportFn)(const char *input);

int main(void) {
    HMODULE h = LoadLibraryA("sample.dll");    // DllMain runs here
    if (!h) { printf("load failed: %lu\n", GetLastError()); return 1; }

    ExportFn fn = (ExportFn)GetProcAddress(h, "TargetExport");
    if (!fn) { printf("export not found\n"); FreeLibrary(h); return 1; }

    int r = fn("controlled input");            // breakpoint here
    printf("returned %d\n", r);
    FreeLibrary(h);
    return 0;
}
```

A custom harness lets you feed precise inputs and attach a debugger to *your* process.

Note: `DllMain` executes during `LoadLibrary` -- set a breakpoint *before* the load completes if the malicious logic is in `DllMain` rather than an export.

### 7.4 Frida Against a Loaded DLL

Once any host has the DLL mapped, attach Frida and hook exports by name -- no debugger stepping needed.

---

## 8. Combining Static + Dynamic

The highest-leverage technique: static to *locate*, dynamic to *extract*:

1. **Statically** identify the interesting routine (e.g., a string-decryption function).
2. **Set a breakpoint** at the routine's exit or hook it with Frida.
3. **Run** the sample until the breakpoint hits.
4. **Dump** the plaintext from the output buffer.

Variants:
- **Unpacking**: breakpoint after the unpack stub, then dump with Scylla.
- **Config extraction**: hook the decrypt routine, capture decoded C2/keys.
- **Anti-analysis bypass**: patch the branch live to reach the real payload.

---

## 9. Quick Reference: Pick the Tool

| Situation | Reach for |
|-----------|-----------|
| Windows usermode, general RE | x64dbg / x32dbg |
| Need to replay execution | WinDbg TTD |
| Linux ELF / CTF / exploit dev | gdb + pwndbg or GEF |
| Hook/trace functions without patching disk | Frida |
| "What did it touch?" file/registry/process | ProcMon + Process Explorer |
| Fast automated triage report | CAPE / ANY.RUN / Joe Sandbox |
| Inspect network / C2 / exfil | Wireshark + mitmproxy |
| Run a DLL's exports | rundll32 / regsvr32 / LoadLibrary harness |

---

## Containment Checklist (Always)

- Isolated VM, host-only or faked network, no shared folders/clipboard.
- Clean snapshot before each detonation; revert after.
- Disable guest additions/integration that bridge to the host.
- Never analyze live malware on a host you care about.
