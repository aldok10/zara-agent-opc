# Unpacking: Import Reconstruction, Control-Flow Recovery & VMProtect

TL;DR: Rebuilding imports after dump, deobfuscating control-flow flattening with symbolic execution, FLOSS/capa for obfuscated strings, API hashing, and VMProtect/Themida devirtualization.
See also: `unpacking-generic-upx-antidebug.md`

---

## 5. Reconstructing Imports After a Dump (Deep Dive)

A memory dump's import handling is the most common failure point. Three situations:

1. **Clean dump, intact IAT pointers.** Scylla IAT Autosearch -> Get Imports -> Fix Dump.
   Done.
2. **Scattered / redirected IAT.** The packer routes imports through its own stubs. You
   must trace each thunk to the real API. PE-sieve `/imp` can rebuild automatically by
   analyzing the call targets [4](https://github.com/hasherezade/pe-sieve/wiki/4.3.-Import-table-reconstruction-(imp)).
3. **No IAT at all -- API hashing.** The binary resolves APIs by hash at runtime and never
   stores names. See section 8.3.

PE-sieve is the workhorse for injected and hollowed payloads: it scans a live process,
recognizes replaced/injected PEs, shellcode, inline hooks, and in-memory patches, and
dumps them with reconstructed imports [7](https://1337skills.com/cheatsheets/pe-sieve/).
Useful switches: `/imp` (import reconstruction), `/dmode` (dump mode: virtual vs raw
alignment), `/shellc` (detect shellcode), `/data` (scan non-executable memory), `/iat`
(detect IAT hooks), `/minidmp` (full minidump), `/refl` (process reflection before scan to
avoid disturbing the target) [5](https://github.com/hasherezade/pe-sieve/wiki).

For process-hollowing cases, combine Process Hacker (monitor modules/threads, dump
regions) with x32/x64dbg to catch the unpacked payload before it executes [8](https://www.embeeresearch.io/unpacking-malware-using-process-hacker-and-memory-inspection/).

---

## 6. Deobfuscation: Control-Flow Recovery

Once unpacked, the code itself may still be obfuscated. The big three: control-flow
flattening, opaque predicates, and instruction substitution / junk.

### 6.1 Control-flow flattening (CFF)

CFF (introduced by OLLVM and used by many commercial protectors) replaces a function's
natural control flow with a state machine: each original basic block gets a numeric
state, and a central **dispatcher** routes execution based on a state variable [1](https://research.openanalysis.net/angr/symbolic%20execution/deobfuscation/research/2022/03/26/angr_notes.html).
The graph becomes a flat "fan" -- every block returns to the dispatcher -- hiding the real
logic.

**Recovery strategy (symbolic execution):**

1. Identify the function entry, the dispatcher address, and the state variable (often
   moved into `eax`/a register before each dispatch) [1](https://research.openanalysis.net/angr/symbolic%20execution/deobfuscation/research/2022/03/26/angr_notes.html).
2. Symbolically execute from the dispatcher with the initial state; run until you reach a
   real (original) basic block -- associate that state value with that block.
3. Continue executing until you return to the dispatcher; solve the symbolic equation for
   the possible next state value(s). One value = unconditional edge; two = conditional
   branch (recover the associated flags to rebuild the `jcc`) [1](https://research.openanalysis.net/angr/symbolic%20execution/deobfuscation/research/2022/03/26/angr_notes.html).
4. Repeat breadth-first over all discovered states to rebuild the true CFG, then patch the
   binary: replace dispatcher jumps with direct jumps between original blocks.

angr handles hard-coded jump tables natively, so you can often run this on the
*un-patched* binary with minimal setup [1](https://research.openanalysis.net/angr/symbolic%20execution/deobfuscation/research/2022/03/26/angr_notes.html).
Use `CALLLESS` state option to skip over function calls during dispatcher tracing.

### 6.2 Symbolic / dynamic-symbolic execution engines

| Engine | Strengths | Typical use |
|--------|-----------|-------------|
| **angr** | Mature Python API, VEX IR, full symbolic exploration, jump-table aware | CFF recovery, path constraints, OEP/state solving [1](https://research.openanalysis.net/angr/symbolic%20execution/deobfuscation/research/2022/03/26/angr_notes.html) |
| **Triton** | DBA + dynamic symbolic execution, taint, fast concolic, LLVM lifting | Tracing real executions, VMProtect pure-function devirt [via Salwan's PoC] |
| **Miasm** | IR, symbolic + dynamic-symbolic engine, reassembly of modified functions | OLLVM deflattening, ESET's Stadeo toolset [8](https://www.welivesecurity.com/2020/08/07/stadeo-deobfuscating-stantinko-and-more/) |

Ready-made tools built on these:

- **MODeflattener** -- deobfuscates OLLVM CFF functions using Miasm [6](https://github.com/mrT4ntr4/MODeflattener).
- **Stadeo** (ESET) -- IDA + Miasm; deflattening, opaque-predicate and constant-unfolding
  passes; reassembles cleaned functions [8](https://www.welivesecurity.com/2020/08/07/stadeo-deobfuscating-stantinko-and-more/).
- **D810** -- IDA Hex-Rays microcode plugin for unflattening at the decompiler level.

### 6.3 Opaque predicates

Opaque predicates are conditions that always evaluate the same way (for example
`(x*x) >= 0`) but look like real branches; the "impossible" path is filled with junk.

Removal approaches:

- **SMT-prove invariance**: ask a solver (Z3, via angr/Triton/Miasm) whether the
  condition can ever take the other branch. If not, the dead edge is junk -- cut it.
- **Pattern passes** for known generator templates (OLLVM's bogus-control-flow uses
  recognizable predicate forms).
- After pruning dead edges, run a standard dead-code-elimination pass to delete the junk
  blocks.

Resistance tiers from LLM/symbolic studies: bogus control flow is *low* resistance,
control-flow flattening *moderate*, instruction substitution / combined techniques *high*
[3](https://arxiv.org/html/2505.19887v1). Plan effort accordingly.

### 6.4 String decryption scripts

Malware frequently decrypts strings on demand with a small routine (XOR key, RC4, custom).
Once you locate the decryptor:

1. Recover the algorithm and key(s) from the disassembly.
2. Reimplement in Python and batch-decrypt every referenced ciphertext, or
3. **Emulate** the decryptor over each call site (Unicorn / Dumpulator / `flare-emu`) to
   avoid reimplementing tricky logic, or
4. Let **FLOSS** do it automatically for common schemes (section 7).
5. Annotate the IDB/Ghidra DB by commenting decrypted values at each xref.

---

## 7. FLOSS -- Obfuscated String Extraction

`strings` only finds plaintext. FLOSS (FLARE Obfuscated String Solver, Mandiant) uses
static heuristics + CPU emulation to recover strings that are built or decoded at runtime
[4](https://cloud.google.com/blog/topics/threat-intelligence/automatically-extracting-obfuscated-strings).

It recovers four classes:

- **Static strings** (like `strings`).
- **Stackstrings** -- built byte-by-byte on the stack at runtime.
- **Tight strings** -- stackstrings constructed in a compact loop; FLOSS 2.0 added these
  [1](https://cloud.google.com/blog/topics/threat-intelligence/floss-version-2).
- **Decoded strings** -- XOR/RC4/custom-decoded via emulation of the decoder routine [2](https://1337skills.com/de/cheatsheets/mandiant-floss/).

Newer versions add improved Go and Rust string extraction, which otherwise come out as
confusing compound blobs [10](https://cloud.google.com/blog/topics/threat-intelligence/extracting-strings-go-rust-executables/).

```bash
floss suspicious.bin                 # all string types
floss --only stack tight suspicious.bin
floss -j suspicious.bin > out.json   # machine-readable for pipelines
```

Run FLOSS on the **unpacked** dump for best results -- the decoders must be present in the
image it emulates.

---

## 8. capa, API Hashing, and Capability Detection

### 8.1 capa

capa (FLARE team) identifies *capabilities* in an executable by matching disassembly
against a curated, community rule set -- instead of relying on hashes/signatures it
describes what a program *can do* (encrypt files, persist, inject, talk HTTP) [2](https://github.com/mandiant/capa/).
Effective for triage: prioritize unknown files and understand role-in-attack quickly
[4](https://cloud.google.com/blog/topics/threat-intelligence/capa-automatically-identify-malware-capabilities).

```bash
capa unpacked.exe                # capability report
capa -v unpacked.exe             # show matched rule logic + addresses
capa -j unpacked.exe > capa.json
```

There is also a **dynamic capa** mode that consumes sandbox traces (for example CAPE),
abstracting capabilities from thousands of traced API calls to speed triage [3](https://cloud.google.com/blog/topics/threat-intelligence/dynamic-capa-executable-behavior-cape-sandbox/).
Rules live in the separate `capa-rules` repo [6](https://github.com/mandiant/capa-rules).

### 8.2 capa as a triage anchor

capa marks the addresses where capabilities live, which tells you *where* to point your
manual analysis and where the obfuscation is likely protecting something important.

### 8.3 API hashing resolution

API hashing removes import name strings entirely: the malware stores a hash of each API
name, walks loaded module export tables at runtime, hashes each export, and matches --
then calls the resolved address [5](https://www.securityscientist.net/blog/12-questions-and-answers-about-dynamic-api-resolution-t1027007/).
No readable `VirtualAlloc` string ever exists in the file (MITRE ATT&CK T1027.007).

To resolve hashes back to names:

- **HashDB** (OALabs) -- a large database of precomputed API-name hashes across many known
  hashing algorithms, with IDA/Binary Ninja plugins. Identify the algorithm, look up the
  hash, get the name [1](https://medium.com/@ckant/automated-shellcode-triage-and-api-hash-resolution-bb706385b6b9).
- **capa + HashDB + disassembler triage**: capa flags the hashing routine, you identify
  the algorithm, HashDB resolves the constants, you annotate the calls [1](https://medium.com/@ckant/automated-shellcode-triage-and-api-hash-resolution-bb706385b6b9).
- **Brute force** for custom algorithms: hash every export of common DLLs with the
  recovered algorithm and build your own lookup table.

A recommended shellcode/loader triage chain: capa (capability + locate hashing) ->
disassembler (Binary Ninja/IDA, identify algorithm) -> HashDB (resolve constants) [1](https://medium.com/@ckant/automated-shellcode-triage-and-api-hash-resolution-bb706385b6b9).

---

## 9. Virtualization-Based Protection: VMProtect & Themida

Virtualizers are the hardest tier. They translate native code into a custom bytecode
interpreted by an embedded VM, so there is no native instruction stream to read -- only a
dispatch loop and handler table you must first understand, then "devirtualize."

### 9.1 Realistic expectations

- Full automatic devirtualization works only against **specific versions** of specific
  protectors. New versions break the tools.
- Output is rarely a clean recompilable binary; you usually get an optimized IR or a
  partial recovery you still read manually.
- For many investigations, full devirtualization is unnecessary -- dynamic tracing of the
  virtualized routine's inputs/outputs answers the question faster.
- Themida/VMProtect also stack anti-debug, anti-VM, mutation, and integrity checks; you
  must clear those first [3](https://any.run/cybersecurity-blog/vmprotect-themida-malware-analysis/).

### 9.2 Tooling

| Tool | Target | Notes |
|------|--------|-------|
| **NoVmp** | VMProtect x64 3.0-3.5 | Static devirtualizer -> optimized VTIL, optional x64 recompile. Needs **unpacked** input; if dumped with Scylla, pass `-base 0x...`. Experimental recompiler is "borderline broken." No stripped-reloc support [2](https://github.com/can1357/NoVmp) |
| **VTIL** | IR backbone | The intermediate language NoVmp and related tools optimize over [2](https://github.com/can1357/NoVmp) |
| **VMProtect-devirtualization** (Salwan) | VMProtect pure functions | Symbolic execution + LLVM lifting; deobfuscates side-effect-free functions [1](https://github.com/JonathanSalwan/VMProtect-devirtualization/blob/main/README.md) |
| **themida-unmutate** | Themida / WinLicense / Code Virtualizer 3.x | Static deobfuscator for **mutation-based** (not full-VM) protection [4](https://github.com/ergrelet/themida-unmutate) |
| **vmp2-devirtualization** | VMProtect 2.x | Community VMP2 research/devirt [9](https://github.com/VMProtectResearch/vmp2-devirtualization) |

### 9.3 Manual / dynamic approach when tools fail

1. Unpack and clear anti-analysis (ScyllaHide/TitanHide).
2. Locate VMEnter (the `push`+`call` into the VM stub) [2](https://github.com/can1357/NoVmp).
3. Trace one execution (Triton / Tiny Tracer / a PIN tool) to capture handler semantics.
4. Reconstruct the handler table -> lift bytecode to IR -> optimize -> read or recompile.
5. Cross-check recovered logic against observed runtime behavior in the sandbox.

This is days-to-weeks of work per routine; scope it to only the routines that matter.

---

## 10. Tool Reference Summary

| Category | Tools |
|----------|-------|
| Packer detection | Detect It Easy (DIE), PEiD, pestudio, `capa`, entropy scan |
| Debugger | x64dbg (+ Scylla, ScyllaHide plugins), WinDbg, IDA debugger |
| Anti-anti-debug | **ScyllaHide** (ring 3), **TitanHide** (ring 0) |
| Memory dump | **Scylla**, **PE-sieve**, Process Hacker, ProcDump |
| Import reconstruction | **Scylla**, ImpREC, PE-sieve `/imp`, pe-bear |
| PE inspection/repair | **pe-bear**, CFF Explorer, PE-bear, 010 Editor |
| Static unpack | `upx -d`, universal/automatic unpackers, custom scripts |
| Symbolic execution | **angr**, **Triton**, **Miasm** |
| CFF unflattening | MODeflattener (Miasm), Stadeo (ESET), D810 (Hex-Rays) |
| Strings | **FLOSS**, `strings`, FLOSS JSON for pipelines |
| Capability ID | **capa**, capa-rules, dynamic capa (CAPE) |
| API hash resolution | **HashDB** (OALabs), capa, brute-force tables |
| Devirtualization | **NoVmp** (+VTIL), themida-unmutate, VMProtect-devirtualization, vmp2-devirtualization |
| Emulation | Unicorn, Dumpulator, flare-emu (string decoder runs) |
| Disassembly/decompile | IDA Pro, Ghidra, Binary Ninja, radare2/Cutter |

---

## 11. End-to-End Checklist

1. **Isolate.** Snapshotted VM, no production network, confirm authorization.
2. **Triage statically.** DIE/entropy -> packer ID; capa + FLOSS for first signal.
3. **Plan layers.** Identify packer, anti-analysis, import obfuscation, CFF, VM.
4. **Neutralize anti-analysis.** ScyllaHide (and TitanHide if syscalls are used).
5. **Unpack.** Find OEP (ESP trick / VirtualProtect bp / entropy) -> dump (Scylla/PE-sieve).
6. **Rebuild imports.** Scylla IAT Autosearch / PE-sieve `/imp`; verify in pe-bear.
7. **Resolve hashed APIs.** capa locates routine -> HashDB resolves -> annotate.
8. **Deobfuscate strings.** FLOSS or scripted/emulated decryptor.
9. **Recover control flow.** angr/Miasm for CFF; SMT-prune opaque predicates.
10. **Devirtualize only if required.** NoVmp / themida-unmutate; otherwise trace dynamically.
11. **Verify.** Re-run capa/FLOSS on the cleaned dump; confirm against sandbox behavior.
12. **Document.** Hashes, OEP, base, IOC strings, capabilities, residual unknowns.

---

### Primary Sources

- Recognizing packed malware & unpacking -- Infosec Institute [2](https://www.infosecinstitute.com/resources/malware-analysis/recognizing-packed-malware-and-its-unpacking-approaches-part-2/)
- Generic unpacking via entropy analysis -- ResearchGate [3](https://www.researchgate.net/publication/224204820_Generic_unpacking_using_entropy_analysis)
- Manual x64dbg unpacking (PMA labs) -- Medium [5](https://medium.com/@nebdar/malware-basics-manually-unpacking-5-malware-samples-with-x32-64dbg-pma-labs-4c9b540b5456)
- Manual UPX unpack -- manrajbansal.com [7](https://www.manrajbansal.com/post/manually-unpacking-a-upx-packed-binary)
- Anti-UPX techniques -- unprotect.it [1](https://unprotect.it/technique/anti-upx-unpacking/)
- ScyllaHide README -- GitHub [2](https://github.com/x64dbg/ScyllaHide/blob/master/README.md); TitanHide -- GitHub [10](https://github.com/mrexodia/titanhide)
- PE-sieve wiki (imp/dmode/shellc) -- GitHub [5](https://github.com/hasherezade/pe-sieve/wiki) / [4](https://github.com/hasherezade/pe-sieve/wiki/4.3.-Import-table-reconstruction-(imp)); pe-bear -- GitHub [6](https://github.com/hasherezade/pe-bear)
- angr CFF deobfuscation -- OALabs Research [1](https://research.openanalysis.net/angr/symbolic%20execution/deobfuscation/research/2022/03/26/angr_notes.html)
- MODeflattener -- GitHub [6](https://github.com/mrT4ntr4/MODeflattener); Stadeo -- WeLiveSecurity [8](https://www.welivesecurity.com/2020/08/07/stadeo-deobfuscating-stantinko-and-more/)
- Obfuscation resistance tiers -- arXiv [3](https://arxiv.org/html/2505.19887v1)
- FLOSS 2.0 / overview -- Google Cloud [1](https://cloud.google.com/blog/topics/threat-intelligence/floss-version-2) / [4](https://cloud.google.com/blog/topics/threat-intelligence/automatically-extracting-obfuscated-strings); Go/Rust strings [10](https://cloud.google.com/blog/topics/threat-intelligence/extracting-strings-go-rust-executables/)
- capa -- GitHub [2](https://github.com/mandiant/capa/); capa overview [4](https://cloud.google.com/blog/topics/threat-intelligence/capa-automatically-identify-malware-capabilities); dynamic capa [3](https://cloud.google.com/blog/topics/threat-intelligence/dynamic-capa-executable-behavior-cape-sandbox/)
- API hash resolution chain -- Medium [1](https://medium.com/@ckant/automated-shellcode-triage-and-api-hash-resolution-bb706385b6b9); T1027.007 explainer [5](https://www.securityscientist.net/blog/12-questions-and-answers-about-dynamic-api-resolution-t1027007/)
- NoVmp/VTIL -- GitHub [2](https://github.com/can1357/NoVmp); VMProtect-devirtualization [1](https://github.com/JonathanSalwan/VMProtect-devirtualization/blob/main/README.md); themida-unmutate [4](https://github.com/ergrelet/themida-unmutate); Themida/VMProtect malware analysis [3](https://any.run/cybersecurity-blog/vmprotect-themida-malware-analysis/)
