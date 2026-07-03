# Unpacking: Generic Workflow, UPX & Anti-Debugging

TL;DR: Protection layer model, generic OEP-finding and memory-dump workflow, UPX manual/auto unpack, and defeating anti-debug/anti-VM checks.
See also: `unpacking-imports-cflow-vmp.md`

---

## 1. Mental Model: Layers of Protection

Treat a protected binary as an onion. Each layer needs a different technique, and you
peel them in order:

| Layer | What it does | Defeat with |
|-------|--------------|-------------|
| Compression packer (UPX, aspack) | Shrinks + hides code, unpacks at runtime | Static unpack, OEP dump |
| Crypter / runtime packer | Decrypts payload in memory | Dynamic dump at OEP |
| Anti-debug / anti-VM | Detects analysis environment | ScyllaHide, TitanHide, patching |
| Import obfuscation | Hides API calls (no clean IAT) | IAT reconstruction, API hash resolution |
| String / data obfuscation | Encrypts config, C2, strings | FLOSS, decryption scripts |
| Control-flow obfuscation | Flattening, opaque predicates, junk | Symbolic execution, pattern passes |
| Virtualization (VMProtect, Themida) | Translates code to a custom bytecode VM | Devirtualizers, tracing, manual VM RE |

The deeper the layer, the more expensive it is to defeat. Most real work stops at "good
enough for the question I'm answering" rather than perfect reconstruction.

---

## 2. Generic Unpacking Workflow

The core idea: a packed program must, at some point, decompress or decrypt the original
code into memory and jump to it. Catch it right after that moment, dump memory, and
rebuild a valid PE [2](https://www.infosecinstitute.com/resources/malware-analysis/recognizing-packed-malware-and-its-unpacking-approaches-part-2/).

### 2.1 Recognize that it is packed

Signals before you ever run it:

- **High entropy** sections (close to 8.0 bits/byte) indicate compression or encryption [3](https://www.researchgate.net/publication/224204820_Generic_unpacking_using_entropy_analysis).
- **Few imports** in the IAT (often just `LoadLibrary` + `GetProcAddress`, or `VirtualAlloc` / `VirtualProtect`).
- **Weird section names** (`UPX0`, `UPX1`, `.vmp0`, `.themida`, `.aspack`).
- **Tiny `.text`, huge `.data`**, or a writable+executable section.
- **Entry point outside the main code section**, or a section with raw size 0 but large virtual size.

Tools: PEiD / Detect It Easy (DIE), `pe-bear`, `pestudio`, `capa` (see section 8).

### 2.2 Find the OEP (Original Entry Point)

The unpacking stub runs first, reconstructs the original program, then transfers control
to the OEP via a "tail jump" -- usually a `jmp`/`ret`/`call` far from the stub, landing in
freshly written memory [5](https://medium.com/@nebdar/malware-basics-manually-unpacking-5-malware-samples-with-x32-64dbg-pma-labs-4c9b540b5456).

Practical techniques to locate the OEP:

1. **Hardware breakpoint on the stack ("ESP trick" / pushad-popad).** Many stubs `pushad`
   on entry and `popad` before jumping to OEP. Step over `pushad`, set a hardware
   breakpoint on the saved stack pointer, run; you break right before the tail jump.
2. **Breakpoint on memory-write APIs.** Set breakpoints on `VirtualAlloc`,
   `VirtualProtect`, `WriteProcessMemory`. When the stub flips a section from writable
   back to executable, you are near the handoff [9](https://reverseengineering.stackexchange.com/questions/17604/finding-oep-in-a-vmprotect-v3-0-protected-malware).
3. **Section-hop / "run until different section".** Set a memory breakpoint on execute
   over the original code section; the first execute there is the OEP.
4. **Entropy-based generic unpackers.** Automated tools detect the entropy drop when code
   is decompressed and snapshot at that point -- ~72% OEP-location success across 110
   samples in one study [3](https://www.researchgate.net/publication/224204820_Generic_unpacking_using_entropy_analysis).
5. **Tail-jump heuristic.** Scroll the stub to a lone `jmp`/`push+ret` that targets an
   address far from the current section.

### 2.3 Dump the process from memory

Once paused at (or just past) the OEP, dump the in-memory image. The running process
holds the *decrypted* original code, so the dump is your unpacked specimen [2](https://www.infosecinstitute.com/resources/malware-analysis/recognizing-packed-malware-and-its-unpacking-approaches-part-2/).

- **Scylla** (attach to the live process, set OEP, dump) -- the de-facto x86/x64 dumper.
- **x64dbg -> Scylla plugin** (built in via the Scylla button).
- **PE-sieve** for injected/hollowed payloads (dumps implanted PEs without a debugger) [7](https://1337skills.com/cheatsheets/pe-sieve/).
- **Process Hacker** for manual region dumps and module monitoring [8](https://www.embeeresearch.io/unpacking-malware-using-process-hacker-and-memory-inspection/).

Important: attach to the **running** process. If you attach while paused at the stub and
try to grab the IAT, Scylla will not find a valid import table at the (not-yet-reached)
OEP [2](https://www.infosecinstitute.com/resources/malware-analysis/recognizing-packed-malware-and-its-unpacking-approaches-part-2/).

### 2.4 Fix the IAT / reconstruct imports

A raw memory dump has runtime-resolved import pointers but no valid Import Directory.
Without repair the dump will not load or disassemble cleanly.

1. In **Scylla** (or ImpREC), set the OEP, click **IAT Autosearch**, then **Get Imports**.
2. Resolve any invalid/unknown thunks (delete or manually fix entries pointing to the
   packer stub or to garbage).
3. Click **Fix Dump** -- Scylla rebuilds the import directory and adds a new section, then
   writes a loadable PE.
4. Verify in `pe-bear`: imports resolve to named functions, entry point sits in real code.

| Import-fixing tool | Notes |
|--------------------|-------|
| **Scylla** | Modern, x86 + x64, integrated in x64dbg. First choice. |
| **ImpREC** (Import REConstructor) | Classic x86-only; still useful on legacy samples. |
| **PE-sieve `/imp`** | Rebuilds import tables for dumped/injected modules automatically [4](https://github.com/hasherezade/pe-sieve/wiki/4.3.-Import-table-reconstruction-(imp)). |
| **pe-bear** | GUI PE editor to inspect/repair headers, sections, directories [6](https://github.com/hasherezade/pe-bear). |

Tip: disable ASLR on the packed binary first (clear `IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE`
in DLL Characteristics) so addresses are stable across runs and dumps line up cleanly
[3](https://reverseengineering.stackexchange.com/q/19816).

### 2.5 Verify the unpacked result

- Re-run `capa` and `FLOSS` on the dump -- capabilities and strings that were hidden
  should now appear.
- Open in IDA / Ghidra / Binary Ninja: a real entry point, sane function graph,
  resolvable imports.
- Confirm behavior matches a sandbox run of the original.

---

## 3. UPX -- Manual and Automatic

UPX is the most common packer and the easiest to reverse, which makes it the best place
to learn the workflow.

### 3.1 Automatic

```bash
upx -d packed.exe -o unpacked.exe   # native decompression
```

This works only when the UPX metadata is intact.

### 3.2 When `upx -d` fails

Authors deliberately break the UPX header so the official tool refuses to unpack while
the binary still runs and self-unpacks fine at runtime [4](https://reverseengineering.stackexchange.com/revisions/c989bb92-8a2b-460a-af86-7ac1aa5e2dcd/view-source):

- **Corrupted magic / version.** UPX checks for `UPX_MAGIC_LE32`; zero or alter it and
  `upx -d` throws `CantUnpackException: header corrupted` [1](https://unprotect.it/technique/anti-upx-unpacking/).
- **Zero-padded size / checksum fields** in the UPX reference structure trigger the same
  exception [1](https://unprotect.it/technique/anti-upx-unpacking/).
- **Renamed sections** (`UPX0`/`UPX1` -> something else) defeat signature detection.

### 3.3 Manual UPX unpack

Because UPX is structurally simple, manual unpacking is quick [7](https://www.manrajbansal.com/post/manually-unpacking-a-upx-packed-binary):

1. Load in x64dbg. The entry point sits in `UPX1`.
2. The stub starts with `pushad`. Step over it, note ESP.
3. Set a **hardware breakpoint (execute) on the saved ESP region**, or scroll to the
   trailing `popad; jmp <OEP>`.
4. Run. You break at the tail jump; single-step into the OEP in `UPX0`.
5. Dump with Scylla, set OEP, fix IAT.

Two recovery options for a broken header: repair the magic/fields by hand in a hex editor
so `upx -d` works, or just do the manual memory dump above (header-independent).

---

## 4. Defeating Anti-Debugging

Protected samples actively look for a debugger and alter behavior or crash when found.
Common Windows checks: `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`,
`NtQueryInformationProcess` (ProcessDebugPort / ProcessDebugFlags / ProcessDebugObjectHandle),
PEB `BeingDebugged` flag, timing checks (`rdtsc`, `GetTickCount`), `NtSetInformationThread`
(ThreadHideFromDebugger), hardware-breakpoint detection, and self int3 scanning.

### 4.1 ScyllaHide (usermode, ring 3)

ScyllaHide is an open-source usermode anti-anti-debug library that hooks the relevant
NT/kernel32 functions to hide the debugger from the target [2](https://github.com/x64dbg/ScyllaHide/blob/master/README.md).
It ships as a plugin for x64dbg, OllyDbg, IDA, and TitanEngine [3](https://pt.scribd.com/document/692431738/ScyllaHide).

Workflow in x64dbg: install the ScyllaHide plugin, pick a profile (it has presets for
packers/protectors), and run. It transparently spoofs the debug-detection APIs so checks
return "no debugger." For protectors it has named profiles (for example a
**Themida x86/x64** profile) you select before pressing Run [1](https://n0pex3.hashnode.dev/unpack-themida).

### 4.2 TitanHide (kernel mode, ring 0)

When usermode hooks are not enough -- the sample makes direct syscalls or checks below the
API layer -- use **TitanHide**, a kernel driver that hides debugging from ring 0 [10](https://github.com/mrexodia/titanhide).
It intercepts at the syscall level, so usermode evasion of the hooks does not help the
malware. Requires test-signing / a dedicated analysis VM since it loads an unsigned driver.

### 4.3 Manual patching

When you only have one or two checks:

- NOP out the check, or patch the conditional jump that acts on the result.
- Force the return value (`IsDebuggerPresent` -> `xor eax, eax; ret`).
- Flip the PEB `BeingDebugged` byte to 0 manually.
- Set conditional breakpoints that auto-patch results and continue, so you never stop on
  the check.

Reference catalogs of checks and mitigations: the anti-reversing technique guides
[6](https://lobehub.com/de/skills/mowgliph-mowpower-anti-reversing-techniques) and
unprotect.it's database.

### 4.4 Anti-VM / sandbox evasion and hiding the debugger

Anti-VM heuristics look for VM artifacts: MAC OUI prefixes (VMware/VirtualBox), registry
keys, driver names (`vmtoolsd`, `VBoxGuest`), CPUID hypervisor bit, low core/RAM counts,
absence of user activity, known sandbox usernames/hostnames.

Countermeasures:

- **Harden the VM**: randomize MAC, rename suspicious drivers/services, bump CPU/RAM,
  add fake user artifacts (recent files, browser history), patch the CPUID hypervisor bit
  where the hypervisor allows.
- **Patch the checks** in the debugger the same way as anti-debug.
- **Use bare-metal or nested setups** for the most aggressive samples.
- Keep ScyllaHide/TitanHide active so debugger-presence and VM checks are both handled in
  one pass.
