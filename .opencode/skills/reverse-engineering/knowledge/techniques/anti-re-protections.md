# Anti-Reverse-Engineering Techniques: A Detection Reference

> **Scope and intent.** Defensive knowledge for *authorized* analysis. The goal is to
> **recognize** protection and evasion techniques inside obfuscated binaries during legitimate
> malware triage, incident response, and software-security review. Every section is written
> from the analyst's seat: what the technique looks like, and **how it is detected**.

Sources are cited inline as `[n](url)` and listed at the bottom.

---

## 0. The detection mindset

A protected binary leaks signal. The analyst's job is to read the leak:

- **Statistical signal.** High section entropy, tiny import tables, no recognizable strings.
- **Structural signal.** Odd section names, mismatched raw/virtual sizes, suspicious entry points.
- **Behavioral signal.** Memory becoming executable at runtime, `VirtualProtect` flips, self-decryption.
- **API signal.** Imports of `IsDebuggerPresent`, `NtQueryInformationProcess`, `CPUID` use, `rdtsc` loops.

No single indicator is proof. Detection is **corroboration of multiple weak signals** into a confident verdict [[3]](https://web.cecs.pdx.edu/~dmcgrath/courses/malware/anti_analysis.html).

---

## 1. Packers and protectors

A packer compresses/encrypts the original image and prepends an unpacking stub that restores it
at runtime; a protector adds anti-analysis layers (anti-debug, VM, license checks) on top
[[2b]](https://inventivehq.com/blog/malware-unpacking-guide).

### 1.1 Identification workflow

| Step | Tool | What you look at |
|------|------|------------------|
| Triage signature scan | **Detect It Easy (DIE)**, PEiD, `file` | Packer/compiler signatures, linker hints |
| Entropy profile | DIE entropy view, `binwalk -E` | Packed sections approach ~8.0 bits/byte |
| Section anatomy | PE-bear, CFF Explorer, `pefile` | Names, raw vs. virtual size, RWX flags |
| Import survey | CFF Explorer, `dumpbin /imports` | Tiny IAT = imports resolved at runtime |
| Entry-point context | disassembler | Stub jumps far away, then tail-jump to OEP |

DIE is the modern default because it combines signatures, entropy graphs, and scriptable detectors;
PEiD is legacy but still useful for classic signatures
[[4b]](https://lobehub.com/skills/mukul975-anthropic-cybersecurity-skills-analyzing-packed-malware-with-upx-unpacker).

### 1.2 Packer/protector fingerprints

| Product | Section-name tells | Other signals | Notes |
|---------|--------------------|--------------|-------|
| **UPX** | `UPX0`, `UPX1` (sometimes `UPX2`) | `UPX!` magic in the PE header; `UPX0` has raw size 0 but large virtual size | Self-test/unpack with `upx -t` / `upx -d`. Renamed sections defeat name match but the `UPX!` struct (checksums, packed/unpacked sizes) often remains [[8](https://unprotect.it/technique/anti-upx-unpacking/)] |
| **ASPack** | `.aspack`, `.adata` | High entropy, small import set | Classic PEiD signature |
| **MPRESS** | `.MPRESS1`, `.MPRESS2` | LZMA-style high entropy | Lightweight compressor |
| **Themida / WinLicense** | section names with embedded **space runs** (e.g. 3 and 8 spaces in v2.1) | Very high entropy, large stub, heavy anti-debug + VM | CAPA rule keys on the space-padded section names [[5]](https://unprotect.it/detection-rule/detect-themida-packer/) |
| **VMProtect** | `.vmp0`, `.vmp1`, `.vmp2` | Bytecode VM, mutated/virtualized regions, `VirtualProtect` rights flipping per region | Section names are the primary tell; CAPA matches `vmp0/1/2` [[3b](https://sachiel-archangel.medium.com/analysis-of-vmprotect-0b28c8e47ca5)][[7](https://unprotect.it/detection-rule/detect-vmprotect/)] |
| **Enigma** | `.enigma1`, `.enigma2` | Virtualization + mutation, license layer | Compare-table for Enigma/Themida/VMProtect in [[8b]](https://reverseengineering.stackexchange.com/q/16753) |
| **Obsidium** | obfuscated/randomized section names | Anti-debug heavy, polymorphic stub | Detected via DIE heuristics + behavior |

### 1.3 Generic "this is packed" heuristics

- **Entropy spike.** A `.text`-like section near **7.8 to 8.0** bits/byte is compressed or encrypted, not code. Multi-layer packers show stacked high-entropy regions [[9b]](https://www.mdpi.com/1099-4300/19/3/125/xml).
- **Tiny IAT.** Two or three imports (`LoadLibraryA`, `GetProcAddress`, maybe `VirtualAlloc`/`VirtualProtect`) means imports are rebuilt at runtime.
- **Raw vs. virtual mismatch.** A section with raw size 0 (or tiny) but large virtual size is an unpack target buffer (classic `UPX0`).
- **Entry point outside known code.** Entry sits in the stub section; the real OEP is reached after a tail jump.
- **Writable + executable sections.** RWX (or sections later flipped to executable) signal runtime code generation [[6](https://reverseengineering.stackexchange.com/questions/17604/finding-oep-in-a-vmprotect-v3-0-protected-malware)].

### 1.4 Unpacking-vantage detection

A practical runtime tell: breakpoint on `VirtualProtect`/`NtProtectVirtualMemory`. Many protectors
decrypt a section, set it executable, run it, then restore the original protection. Watching those
right-changes locates the decrypted OEP region
[[6]](https://reverseengineering.stackexchange.com/questions/17604/finding-oep-in-a-vmprotect-v3-0-protected-malware).

---

## 2. Anti-debugging

Debuggers change the runtime environment in observable ways; protected code probes for those
changes [[3]](https://web.cecs.pdx.edu/~dmcgrath/courses/malware/anti_analysis.html). Detection
from the analyst side = spotting the probe in code, or recognizing the API import.

### 2.1 API-based debugger checks

| Check | Mechanism | Analyst-side detection |
|-------|-----------|------------------------|
| `IsDebuggerPresent()` | Returns `PEB->BeingDebugged` | Import name in IAT; `call IsDebuggerPresent; test al,al` pattern [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| `CheckRemoteDebuggerPresent()` | Wraps `NtQueryInformationProcess(ProcessDebugPort)` | IAT entry; out-param compared to TRUE [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| `NtQueryInformationProcess(ProcessDebugPort=7)` | Returns `-1` if debugged | `push 7` before the call; result compared to `-1` [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| `...(ProcessDebugFlags=0x1f)` | Returns 0 when debugged | `push 1Fh`; checks for zero [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| `...(ProcessDebugObjectHandle=0x1e)` | Non-null handle when a debug object exists | `push 1Eh`; checks handle != 0 [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| `NtQuerySystemInformation(SystemKernelDebuggerInformation=0x23)` | Detects a kernel debugger | class constant `0x23` in code [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |

### 2.2 Manual PEB / structure checks (no API import, so harder to spot)

These read kernel-shared structures directly, so there is **no IAT entry** to flag. Detect them by
the characteristic segment-register reads:

| Technique | Signature to recognize | Meaning |
|-----------|------------------------|---------|
| **PEB BeingDebugged** | `fs:[30h]` (x86) / `gs:[60h]` (x64), then byte at `+2` | Reads `PEB->BeingDebugged` directly [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| **NtGlobalFlag** | PEB offset `0x68` (x86) / `0xBC` (x64), mask `0x70` | `FLG_HEAP_ENABLE_TAIL_CHECK|FREE_CHECK|VALIDATE_PARAMS` set when spawned by a debugger [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| **Heap Flags / ForceFlags** | Heap base + version-specific offset | `Flags != HEAP_GROWABLE` or `ForceFlags != 0` under a debugger [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| **Heap tail patterns** | scan for `0xABABABAB` / `0xFEEEFEEE` | Debug-heap fill bytes [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| **KUSER_SHARED_DATA** | fixed read at `0x7FFE02D4` | Version-stable kernel-debugger flag check [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |

> Recognition tip: any direct `fs:[30h]` / `gs:[60h]` access followed by an offset compare is an
> anti-debug PEB probe even when no debug API is imported.

### 2.3 Breakpoint detection

| Type | How the code finds it | Analyst-side detection |
|------|-----------------------|------------------------|
| **Software breakpoint (INT3 / `0xCC`)** | Self-scans its own `.text` for `0xCC` bytes, or checksums code | Look for a read loop over code memory comparing bytes to `0xCC`, or a CRC over the code section [[3c]](https://anti-debug.checkpoint.com/techniques/process-memory.html) |
| **Hardware breakpoint** | Reads debug registers **Dr0–Dr3 / Dr7** via `GetThreadContext` | `CONTEXT.Dr*` access; if Dr7 nonzero, HW breakpoints set [[3c]](https://anti-debug.checkpoint.com/techniques/process-memory.html) |
| **Code checksum** | Hashes a region and compares to a stored value | Constant hash compared against freshly computed one; integrity-guard pattern |

### 2.4 Timing checks (`rdtsc` and friends)

Single-stepping or breakpoints add huge wall-clock gaps. Code reads the timestamp counter before
and after a short region; an abnormally large delta implies a debugger
[[5c]](https://undercodetesting.com/the-hidden-threat-mastering-anti-debug-timing-checks-in-malware-and-drm-analysis-video/).

- **Signature:** two `rdtsc` instructions bracketing a small block, then a subtract and a
  threshold compare. Also `QueryPerformanceCounter`, `GetTickCount`, `timeGetTime` pairs.
- **Detection:** flag back-to-back `rdtsc` with a delta comparison; common in VMProtect-era stubs
  [[4c]](https://sachiel-archangel.medium.com/anti-debug-techniques-of-vmprotect-f1e343ee0fb2).

### 2.5 Exception / trap-based tricks

- **INT3 / INT 2D / ICEBP (`0xF1`)** trigger exceptions handled differently when a debugger is
  attached; control flow forks on whether the handler runs.
- **`SetUnhandledExceptionFilter` abuse**, `CloseHandle` on invalid handle (raises an exception
  only under a debugger). Recognize via SEH setup wrapping a deliberately faulting instruction
  [[9](https://github.com/LordNoteworthy/al-khaser/wiki/Anti-Debugging-Tricks)].

---

## 3. Anti-VM and anti-sandbox

The binary fingerprints the environment and refuses to detonate inside analysis VMs/sandboxes.
Maps to MITRE ATT&CK **T1497.001 System Checks**
[[4d]](https://attack.mitre.org/techniques/T1497/001).

### 3.1 Categories of artifact checks

| Category | What is probed | Detection signature |
|----------|----------------|---------------------|
| **CPUID hypervisor bit** | `CPUID` leaf 1, ECX bit 31 (hypervisor-present); leaf `0x40000000` vendor string (`VMwareVMware`, `KVMKVMKVM`, `Microsoft Hv`, `XenVMMXenVMM`) | `cpuid` with `eax=1` then `bt ecx,31`, or `eax=0x40000000` and string compares [[7e]](https://evasions.checkpoint.com/src/Evasions/techniques/cpu.html) |
| **Timing of CPUID** | `CPUID` is intercepted by the hypervisor, so it is unusually slow; measured with `rdtsc` | `rdtsc`/`cpuid`/`rdtsc` sequence with a threshold (see PoC) [[5d]](https://github.com/TheDuchy/rdtsc-cpuid-vm-check) |
| **Hardware/product strings** | `wmic csproduct get name`, SMBIOS, registry "VMware"/"VirtualBox"/"Hyper-V" | WMI queries; registry reads under `HARDWARE\DESCRIPTION\System` [[3d]](https://answers.securityscientist.net/q/21935/how-does-t1082-support-sandbox-and-vm-detection) |
| **MAC address OUI** | VM vendor OUI prefixes (00:05:69, 00:0C:29, 00:50:56 = VMware; 08:00:27 = VirtualBox) | adapter enumeration + prefix compare |
| **Device / driver artifacts** | files/keys like `VBoxGuest`, `vmtoolsd`, `vmmouse`, `\\.\VBoxMiniRdrDN` | service/driver/file existence checks [[10d]](https://attack.mitre.org/detectionstrategies/DET0168/) |
| **Behavioral / human checks** | mouse movement, recent docs, uptime, CPU core count, RAM size | calls to `GetCursorPos` over time, `GetTickCount` uptime gate, low-resource bail-out [[3d]](https://answers.securityscientist.net/q/21935/how-does-t1082-support-sandbox-and-vm-detection) |

> Sophistication note: mature samples combine **multiple vectors** (string + CPUID + timing +
> mouse) so spoofing one artifact does not defeat them
> [[3d]](https://answers.securityscientist.net/q/21935/how-does-t1082-support-sandbox-and-vm-detection).
> Sandboxes counter by spoofing realistic values pulled from physical machines
> [[6d]](https://support.recordedfuture.com/hc/en-us/articles/10208468997267-Recorded-Future-Sandbox-Preventing-Anti-Virtual-Machine-Malware-Techniques).

---

## 4. Code virtualization (VM-based protection)

The strongest commercial layer. Selected functions are compiled to a **custom bytecode** and
executed by an **embedded interpreter**; the original native instructions never appear in the binary
[[6v]](https://www.emergentmind.com/topics/virtualization-based-obfuscation)[[9v]](https://www.infosecinstitute.com/resources/general-security/tutorial-building-reverse-engineering-simple-virtual-machine-protection/).

### 4.1 Conceptual architecture

```
            +-----------------------------+
 bytecode ->|  VM entry (vmenter)         |  saves native context, sets up VM regs
            +--------------+--------------+
                           v
            +-----------------------------+
            |  Dispatcher / fetch loop    |<-----------------+
            |  read opcode -> index table |                  |
            +--------------+--------------+                  |
                           v                                 |
            +-----------------------------+                  |
            |  Handler[i] (one per opcode)| -- do work -----+  (return to dispatch)
            |  ADD, LOAD, STORE, XOR ...  |
            +--------------+--------------+
                           v
            +-----------------------------+
            |  VM exit (vmexit)           |  restores native context
            +-----------------------------+
```

Almost all handlers return to a **central dispatch point**, the structural tell of a bytecode VM
[[10v]](https://reverseengineering.stackexchange.com/q/30350).

### 4.2 How VMProtect / Themida do it (conceptually)

- **Virtual registers** held in a context block; VMProtect 2 distinguishes volatile vs.
  non-volatile registers and uses **rolling decryption** of the bytecode stream so each handler
  decrypts the next [[2v]](https://www.scribd.com/document/513339360/VMProtect-2-Detailed-Analysis-of-the-Virtual-Machine-Architecture-Back-Engineering).
- **Per-build instruction set.** The opcode→handler mapping is randomized per build, defeating
  static handler signatures [[1v]](https://www.javascriptobfuscator.com/docs/VMProtection.aspx).
- **Mutation + virtualization tiers.** Themida/VMProtect offer "mutation" (semantics-preserving
  assembly rewriting) and full "virtualization"; mutation alone drastically varies output per
  compile [[8b]](https://reverseengineering.stackexchange.com/q/16753).

### 4.3 Detecting virtualized code

| Signal | What you see |
|--------|--------------|
| **Dispatch loop** | A tight loop: fetch byte, index a handler table, indirect `jmp`/`call`, return to top [[10v]](https://reverseengineering.stackexchange.com/q/30350) |
| **Handler table** | Array of code pointers (the opcode table) |
| **vmenter / vmexit** | Big context save/restore (many `push`/`mov` to a struct) at function boundaries |
| **Bytecode region** | A high-entropy data blob fed to the loop (the program in VM ISA) |
| **`.vmpX` sections** | VMProtect's named sections (see §1.2) |
| **Devirtualization tooling** | Triton-based VMProtect devirtualizers exist as a reference for how lifting is done [[4v]](https://github.com/JonathanSalwan/VMProtect-devirtualization)[[5v]](https://www.mitchellzakocs.com/blog/vmprotect3) |

---

## 5. Control-flow and code obfuscation

These layers don't hide *that* code exists, they make it unreadable. Recognition is mostly visual
(CFG shape) plus pattern matching.

### 5.1 Control-flow flattening (CFF)

Natural nested branches are replaced by a single `switch`-style **dispatcher** with a state
variable; every basic block sets the next state and jumps back to the dispatcher
[[2c]](https://blogs.vmware.com/security/2019/02/defeating-compiler-level-obfuscations-used-in-apt10-malware.html).

- **Detection:** the CFG collapses into a star/hub shape: one dispatcher block with many successors
  and predecessors, a state variable repeatedly compared to constants. Seen in Emotet, oxLoader,
  APT10 tooling [[5e]](https://www.sophos.com/en-us/blog/attacking-emotets-control-flow-flattening)[[4e]](https://www.elastic.co/security-labs/oxloader-malware-loader-infostealer).
- **Tooling:** ESET's `stadeo` deobfuscates CFF and strings; symbolic/CoT recovery is an active
  research area [[10e]](https://github.com/eset/stadeo)[[1e]](https://arxiv.org/html/2604.15390v1).

### 5.2 Opaque predicates

A branch whose outcome is **always known** at obfuscation time (e.g. `x*x >= 0`) but looks
data-dependent, inflating the CFG with dead paths
[[2c]](https://blogs.vmware.com/security/2019/02/defeating-compiler-level-obfuscations-used-in-apt10-malware.html).

- **Detection:** branches with one statically-unreachable side; algebraic identities
  (`(x^2+x)%2==0`), constant-folding or SMT solving proves the predicate constant. Common
  alongside API hashing in BazarLoader [[7e]](https://unit42.paloaltonetworks.com/bazarloader-anti-analysis-techniques/).

### 5.3 Junk code and MBA

- **Junk/dead code:** inserted no-ops and bogus computations that never affect output. Detect via
  dataflow/liveness: results are never used.
- **Mixed Boolean-Arithmetic (MBA):** simple ops rewritten as tangled arithmetic+bitwise
  identities; seen with CFF in modern loaders [[4e]](https://www.elastic.co/security-labs/oxloader-malware-loader-infostealer).

### 5.4 String encryption

Plaintext strings are encrypted/encoded and decrypted on demand, so static strings reveal nothing.

- **Detection:** few/no readable strings in `strings` output; a small **decryptor routine** called
  with a blob + key before each use. Recover by emulating/scripting the decryptor (FLOSS, `stadeo`)
  [[10e]](https://github.com/eset/stadeo).

### 5.5 API hashing / dynamic import resolution

Instead of importing `CreateProcessW`, the code stores a **hash** of the name and walks loaded
modules' export tables at runtime to resolve it. Defeats static IAT analysis
[[7e]](https://unit42.paloaltonetworks.com/bazarloader-anti-analysis-techniques/).

- **Detection signature:** a near-empty IAT; a hashing routine (ROR13, CRC32, FNV, djb2) over
  ASCII export names; a PEB walk of `Ldr` module list. Recognize the resolver loop and the constant
  hash table.
- **Recovery:** compute the same hash over known export names to build a hash→API map (HashDB,
  capa) [[2a]](https://github.com/fireeye/capa-rules/blob/master/anti-analysis/anti-debugging/debugger-detection/check-for-peb-ntglobalflag-flag.yml).

---

## 6. Self-modifying code, encrypted sections, TLS tricks

| Technique | What it does | Detection |
|-----------|--------------|-----------|
| **Self-modifying code (SMC)** | Rewrites its own instructions at runtime; static disasm is wrong | Writes into `.text`/executable memory; `VirtualProtect` to RWX then execute; static vs. runtime disasm diverges [[4e]](https://www.elastic.co/security-labs/oxloader-malware-loader-infostealer) |
| **Encrypted sections** | A section is ciphertext until a stub decrypts it in place | High entropy at rest; a decrypt loop populates it; section flagged W then X |
| **TLS callbacks** | TLS-directory callbacks run **before** the entry point, so anti-debug fires before you reach `main` | Inspect the PE TLS directory (`AddressOfCallBacks`); set BPs on TLS callbacks, not just OEP |
| **Stolen bytes / OEP hiding** | Stub copies the first OEP instructions elsewhere to confuse dumpers | OEP region looks incomplete; reconstruct via the `VirtualProtect`/tail-jump vantage [[6]](https://reverseengineering.stackexchange.com/questions/17604/finding-oep-in-a-vmprotect-v3-0-protected-malware) |

> Practical rule: if the entry point is reached but the binary behaves before it, **check the TLS
> directory first**. TLS callbacks are the most-missed early execution vector.

---

## 7. Entropy, imports, and "few imports" as a protection signal

Three cheap static signals, in priority order, that scream "protected":

1. **High entropy.** Code sections at **7.8–8.0** bits/byte are encrypted/compressed, not
   instructions. Multi-layer packing shows multiple high-entropy bands
   [[9b]](https://www.mdpi.com/1099-4300/19/3/125/xml).
2. **Sparse / weird imports.** A real app imports dozens to hundreds of functions. An IAT with only
   `LoadLibrary`/`GetProcAddress`/`VirtualAlloc` means imports are resolved dynamically (packing or
   API hashing) [[7e]](https://unit42.paloaltonetworks.com/bazarloader-anti-analysis-techniques/).
3. **Anomalous PE structure.** Non-standard section names, raw≪virtual sizes, RWX sections,
   entry point in a packer stub, overlay data after the last section.

A quick DIE pass surfaces all three at once: signature + entropy graph + import count
[[4b]](https://lobehq.com)[[1b]](https://github.com/PhylumChordata/Reverse-Engineering-Malware/blob/main/sections-and-packer-detection.md).

---

## 8. Cross-technique detection cheat-sheet

| You observe... | Likely technique | Confirm with |
|----------------|------------------|--------------|
| Section ~8.0 entropy, raw size 0 | Packer unpack buffer | DIE entropy + section table |
| `UPX0`/`UPX1`, `UPX!` magic | UPX | `upx -t` |
| `.vmp0/1/2`, dispatch loop | VMProtect virtualization | section names + handler table |
| Space-padded section names | Themida | CAPA Themida rule [[5]](https://unprotect.it/detection-rule/detect-themida-packer/) |
| `fs:[30h]`+`[+2]` compare | PEB BeingDebugged check | manual disasm [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| `push 7/1Eh/1Fh` before NtQueryInformationProcess | debug-port/object/flags check | API + constant [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html) |
| back-to-back `rdtsc` + threshold | timing anti-debug/anti-VM | disasm [[5c]](https://undercodetesting.com/the-hidden-threat-mastering-anti-debug-timing-checks-in-malware-and-drm-analysis-video/) |
| `cpuid eax=0x40000000` + string cmp | hypervisor vendor check | disasm [[7e]](https://evasions.checkpoint.com/src/Evasions/techniques/cpu.html) |
| Hub-and-spoke CFG, state var | control-flow flattening | CFG view [[5e]](https://www.sophos.com/en-us/blog/attacking-emotets-control-flow-flattening) |
| Empty IAT + hashing loop + PEB walk | API hashing | resolver disasm [[7e]](https://unit42.paloaltonetworks.com/bazarloader-anti-analysis-techniques/) |
| Writes to `.text` then executes | self-modifying code | runtime memory BP |
| TLS `AddressOfCallBacks` populated | TLS-callback anti-debug | PE TLS directory |

---

## 9. Reference tooling (analyst side)

- **Detect It Easy (DIE)** — signatures, entropy, scriptable detectors.
- **PEiD / CFF Explorer / PE-bear** — PE structure, sections, imports.
- **`pefile` (Python)** — programmatic header/section/entropy inspection.
- **x64dbg + ScyllaHide** — debugging with anti-anti-debug hiding [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html).
- **capa** — capability + anti-analysis rule matching [[2a]](https://github.com/fireeye/capa-rules).
- **stadeo** (ESET) — CFF + string deobfuscation [[10e]](https://github.com/eset/stadeo).
- **VMProtect-devirtualization** (Triton) — VM lifting reference [[4v]](https://github.com/JonathanSalwan/VMProtect-devirtualization).
- **al-khaser** — catalog of anti-debug/anti-VM tricks for test corpora [[9]](https://github.com/LordNoteworthy/al-khaser/wiki/Anti-Debugging-Tricks).
- **Check Point evasions/anti-debug encyclopedias** — authoritative technique references [[1]](https://anti-debug.checkpoint.com/techniques/debug-flags.html)[[7e]](https://evasions.checkpoint.com/src/Evasions/techniques/cpu.html).

---

## Sources

1. Check Point — Anti-Debug: Debug Flags. https://anti-debug.checkpoint.com/techniques/debug-flags.html
2. capa-rules — anti-analysis / NtGlobalFlag. https://github.com/fireeye/capa-rules/blob/master/anti-analysis/anti-debugging/debugger-detection/check-for-peb-ntglobalflag-flag.yml
3. PSU — Anti-Analysis Techniques. https://web.cecs.pdx.edu/~dmcgrath/courses/malware/anti_analysis.html
3b. Sachiel — Analysis of VMProtect. https://sachiel-archangel.medium.com/analysis-of-vmprotect-0b28c8e47ca5
3c. Check Point — Process Memory (breakpoints). https://anti-debug.checkpoint.com/techniques/process-memory.html
3d. Security Scientist — T1082 sandbox/VM detection. https://answers.securityscientist.net/q/21935/how-does-t1082-support-sandbox-and-vm-detection
4b. LobeHub — Analyzing packed malware with UPX. https://lobehub.com/skills/mukul975-anthropic-cybersecurity-skills-analyzing-packed-malware-with-upx-unpacker
4c. Sachiel — Anti-Debug techniques of VMProtect. https://sachiel-archangel.medium.com/anti-debug-techniques-of-vmprotect-f1e343ee0fb2
4d. MITRE ATT&CK — T1497.001 System Checks. https://attack.mitre.org/techniques/T1497/001
4e. Elastic Security Labs — oxLoader. https://www.elastic.co/security-labs/oxloader-malware-loader-infostealer
4v. JonathanSalwan — VMProtect-devirtualization. https://github.com/JonathanSalwan/VMProtect-devirtualization
5. Unprotect — Detect Themida Packer (CAPA). https://unprotect.it/detection-rule/detect-themida-packer/
5c. UndercodeTesting — Anti-Debug Timing Checks. https://undercodetesting.com/the-hidden-threat-mastering-anti-debug-timing-checks-in-malware-and-drm-analysis-video/
5d. TheDuchy — rdtsc-cpuid-vm-check PoC. https://github.com/TheDuchy/rdtsc-cpuid-vm-check
5e. Sophos — Attacking Emotet's Control Flow Flattening. https://www.sophos.com/en-us/blog/attacking-emotets-control-flow-flattening
5v. Mitchell Zakocs — Virtualization-Based Obfuscation Pt.2 (VMProtect 3). https://www.mitchellzakocs.com/blog/vmprotect3
6. RE StackExchange — Finding OEP in VMProtect v3.0. https://reverseengineering.stackexchange.com/questions/17604/finding-oep-in-a-vmprotect-v3-0-protected-malware
6d. Recorded Future — Preventing Anti-VM techniques. https://support.recordedfuture.com/hc/en-us/articles/10208468997267-Recorded-Future-Sandbox-Preventing-Anti-Virtual-Machine-Malware-Techniques
6v. EmergentMind — Virtualization-Based Obfuscation. https://www.emergentmind.com/topics/virtualization-based-obfuscation
7. Unprotect — Detect VMProtect (CAPA). https://unprotect.it/detection-rule/detect-vmprotect/
7e. Check Point evasions — CPU/CPUID. https://evasions.checkpoint.com/src/Evasions/techniques/cpu.html ; Unit42 — BazarLoader anti-analysis. https://unit42.paloaltonetworks.com/bazarloader-anti-analysis-techniques/
8. Unprotect — Anti-UPX Unpacking. https://unprotect.it/technique/anti-upx-unpacking/
8b. RE StackExchange — Enigma/Themida/VMProtect compared. https://reverseengineering.stackexchange.com/q/16753
9. al-khaser — Anti-Debugging Tricks wiki. https://github.com/LordNoteworthy/al-khaser/wiki/Anti-Debugging-Tricks
9b. MDPI — Packer Detection via Entropy Analysis. https://www.mdpi.com/1099-4300/19/3/125/xml
1e. arXiv — CoT in Control Flow Deobfuscation. https://arxiv.org/html/2604.15390v1
1v. JavaScriptObfuscator — VM Protection docs. https://www.javascriptobfuscator.com/docs/VMProtection.aspx
2b. InventiveHQ — Unpacking & Deobfuscating Malware guide. https://inventivehq.com/blog/malware-unpacking-guide
2c. VMware — Defeating Compiler-Level Obfuscations (APT10). https://blogs.vmware.com/security/2019/02/defeating-compiler-level-obfuscations-used-in-apt10-malware.html
2v. Back Engineering — VMProtect 2 VM Architecture analysis. https://www.scribd.com/document/513339360/VMProtect-2-Detailed-Analysis-of-the-Virtual-Machine-Architecture-Back-Engineering
9v. InfoSec Institute — Building & RE Simple VM Protection. https://www.infosecinstitute.com/resources/general-security/tutorial-building-reverse-engineering-simple-virtual-machine-protection/
10v. RE StackExchange — Detecting virtualized code in assembly. https://reverseengineering.stackexchange.com/q/30350
10e. ESET — stadeo deobfuscator. https://github.com/eset/stadeo
10d. MITRE ATT&CK — DET0168 sandbox evasion detection. https://attack.mitre.org/detectionstrategies/DET0168/
1b. PhylumChordata — sections-and-packer-detection. https://github.com/PhylumChordata/Reverse-Engineering-Malware/blob/main/sections-and-packer-detection.md
