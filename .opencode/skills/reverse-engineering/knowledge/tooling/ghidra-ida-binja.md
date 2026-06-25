# Native (C/C++) Binary Decompilers — Reference

Scope: tools and theory for decompiling native machine code (PE/ELF/Mach-O, x86/x64/ARM/MIPS) back to readable pseudo-C. For authorized analysis only: malware triage, vulnerability research on owned/licensed binaries, interop, and forensics. Managed bytecode (.NET IL, Java) is a separate problem with near-lossless decompilers (dnSpy, ILSpy, CFR) and is out of scope except where it changes tool choice.

Last verified: 2026-06. Ghidra current release line 11.x/12.x [3](https://www.ghidradocs.com/); IDA current line 9.x [9](https://docs.hex-rays.com/9.0/user-guide/configuration/command-line-switches).

---

## TL;DR Tool Picker

| You have | Use first | Why |
|----------|-----------|-----|
| Stripped native DLL/EXE, no budget | Ghidra | Free, strong decompiler, scriptable headless [5](https://github.com/NationalSecurityAgency/ghidra) |
| Native, budget, want best UX/accuracy | IDA Pro + Hex-Rays | Industry baseline, best CFG + FLIRT [10](https://hex-rays.com/) |
| Scriptable IL pipeline / automation-heavy | Binary Ninja | Clean BNIL (LLIL/MLIL/HLIL) API [9](https://dev-docs.binary.ninja/dev/bnil-overview.html) |
| Free GUI on top of open engine | Cutter (rizin) | radare2/rizin power, friendlier UI [2](https://appsecsanta.com/mobile-security-tools/ghidra-alternatives) |
| .NET / managed DLL | dnSpy / ILSpy / dotPeek | IL is near-lossless; do NOT use a native decompiler |
| Just compare engines fast | Dogbolt | Runs many decompilers on one upload [6](https://dogbolt.org/faq) |

First triage step for any DLL: confirm managed vs native (see [Choosing a Tool](#choosing-the-right-tool-for-a-dll)). Picking wrong wastes the most time.

---

## How a Decompiler Works (Pipeline)

Decompilation is a multi-stage lift from bytes to pseudo-C. Each stage loses or guesses information.

```
bytes → disassembly → IR/lifting → CFG recovery → data-flow/SSA
      → type & variable recovery → control-flow structuring → pseudo-C
```

1. Load & parse. Headers (PE/ELF/Mach-O), sections, imports/exports, relocations, entry point. Symbols if present.
2. Disassembly. Bytes → instructions. Two classic strategies:
   - Linear sweep: decode sequentially. Fast, but misreads inlined data as code [6](https://www.usenix.org/legacyurl/disassembly-challenges).
   - Recursive descent: follow control flow from entry/known targets. More accurate but stumbles on indirect/computed jumps. Modern tools combine both plus heuristics.
3. Lifting to IR. Per-architecture instructions are translated to an architecture-neutral intermediate representation. Ghidra uses P-code; Binary Ninja uses BNIL; RetDec uses LLVM IR. IR normalizes flag effects, addressing modes, and instruction variants so later passes are arch-independent [10](https://www.nccgroup.com/us/research-blog/earlyremoval-in-the-conservatory-with-the-wrench-exploring-ghidra-s-decompiler-internals-to-make-automatic-p-code-analysis-scripts/).
4. CFG recovery. Split into basic blocks, recover edges (jumps, calls, fall-through), resolve switch/jump tables. Indirect jumps are the hard part.
5. Data-flow analysis. Often via SSA (Static Single Assignment): track value definitions/uses, propagate constants, eliminate dead code, fold flags into conditionals. Boomerang and Binary Ninja both lean on SSA [10](http://boomerang.sourceforge.net/).
6. Type & variable recovery. Reconstruct stack/register variables, infer widths and signedness, propagate types from known API signatures, rebuild structs/arrays/pointers. This is the least reliable stage [4](https://arxiv.org/html/2603.08225).
7. Control-flow structuring. Turn the graph back into `if/else/for/while/switch`, removing `goto` where provable. Binary Ninja documented a full restructuring pass for HLIL [9](https://binary.ninja/2024/06/19/restructuring-the-decompiler.html).
8. Emit pseudo-C. Render names, casts, and comments. Apply demangling.

### Why Output Is Imperfect (Fundamental Limits)

- Code vs data is undecidable. Distinguishing instructions from embedded data in the general case is provably undecidable; linear sweep over-reads, recursive descent under-reads [6](https://www.usenix.org/legacyurl/disassembly-challenges).
- Irreversible semantic loss. Compilation discards identifiers, comments, original types, and high-level syntax. No decompiler can recover what the compiler deleted; it can only plausibly reconstruct [3](https://arxiv.org/html/2605.11501).
- Optimization destroys structure. Inlining, loop unrolling, vectorization, instruction scheduling, and tail-call merging make 1:1 source mapping impossible.
- Indirect control flow. Function pointers, vtables, jump tables, and computed gotos defeat static edge recovery.
- Type ambiguity. A 4-byte stack slot could be `int`, `float`, a pointer, or a struct field. Recovery is heuristic and an active research area; even ML approaches report partial accuracy [1](https://arxiv.org/html/2503.07243)[7](https://ar5iv.labs.arxiv.org/html/2304.03854).
- Correctness vs readability tradeoff. Research notes a decompiler can rarely maximize both functional correctness and human readability at once [5](https://arxiv.org/html/2509.22114v1).

Practical takeaway: treat pseudo-C as a high-quality hypothesis, not ground truth. Cross-check against disassembly, dynamic behavior, and known API signatures.

---

## Symbol, Type, and Name Recovery

| Concern | What helps | Notes |
|---------|-----------|-------|
| Symbols | PDB (Windows), DWARF (ELF), exports, RTTI | Stripped binaries lose all internal symbols |
| Library function ID | FLIRT (IDA), FunctionID (Ghidra), WARP/Signature libs | Match statically-linked libc/CRT funcs to names |
| Type/struct recovery | API signature propagation, RTTI, type libraries | Largest residual error source [4](https://arxiv.org/html/2603.08225) |
| Crowd/shared knowledge | Lumina (IDA), collaborative DBs | Pull names/types matched by other analysts [9](https://hex-rays.com/pricing) |
| C++ name demangling | Itanium (GCC/Clang), MSVC manglers | Built into all major tools; recovers params/namespaces |
| C++ class layout | RTTI parsing, vtable analysis | Recovers class hierarchies when RTTI present |

Signature databases in detail:
- FLIRT (Fast Library Identification and Recognition Technology) — IDA pattern signatures that name statically-linked library functions, so you do not re-reverse `printf` [3](http://www.alternativeto.net/software/ida/).
- FunctionID — Ghidra's equivalent: hash-based function fingerprinting built from known libraries; ships with a manager to create/apply `.fidb` databases [5](https://github.com/NationalSecurityAgency/ghidra).
- Lumina — IDA's cloud metadata service; pushes/pulls function names and types matched against a shared server (public Hex-Rays or private Lumina add-on) [9](https://hex-rays.com/pricing).
- WARP — Binary Ninja's signature/matching system for function recognition across binaries.

---

## Ghidra (NSA)

Open-source SRE framework, Apache 2.0, Java-based with a strong decompiler. The default free choice [5](https://github.com/NationalSecurityAgency/ghidra).

Key components:
- Decompiler — produces C-like pseudocode from P-code, all supported arches at no cost.
- P-code — Ghidra's IR. A register-transfer-style language all instructions lift to; analysis passes and scripts can operate on P-code directly for arch-independent tooling [10](https://www.nccgroup.com/us/research-blog/earlyremoval-in-the-conservatory-with-the-wrench-exploring-ghidra-s-decompiler-internals-to-make-automatic-p-code-analysis-scripts/).
- FunctionID — function fingerprint matching to name library code.
- Version Tracking — compares two builds and propagates analysis (names, types, comments) from a source program to a destination via "correlators" that match functions/data; built for tracking patches and updates [1](https://www.mintlify.com/NationalSecurityAgency/ghidra/features/version-tracking)[4](https://www.lrqa.com/en/cyber-labs/version-tracking-in-ghidra/).
- Scripting — Java natively; Python via Jython (legacy 2.7), PyGhidra (CPython 3 bridge), or Ghidrathon (CPython 3 with modern libraries).

### Headless: Decompile a DLL

`analyzeHeadless` runs the full pipeline without the GUI [9](https://nationalsecurityagency-ghidra.mintlify.app/scripting/headless).

```bash
# Syntax
$GHIDRA_INSTALL_DIR/support/analyzeHeadless <project_dir> <project_name> [options]

# Import + auto-analyze a DLL, run a post-script to dump pseudocode, then drop the project
analyzeHeadless /tmp/ghproj DllAnalysis \
  -import /path/to/target.dll \
  -overwrite \
  -postScript DecompileToC.java /out/target.c \
  -scriptPath /scripts \
  -log /tmp/ghidra.log \
  -deleteProject
```

Pure-Python alternative with PyGhidra (CPython 3, analyze=True runs auto-analysis) [9](https://nationalsecurityagency-ghidra.mintlify.app/scripting/headless):

```python
import pyghidra, sys
pyghidra.start()
with pyghidra.open_program(sys.argv[1], analyze=True) as flat:
    program = flat.getCurrentProgram()
    from ghidra.app.decompiler import DecompInterface
    from ghidra.util.task import ConsoleTaskMonitor
    ifc = DecompInterface(); ifc.openProgram(program)
    for func in program.getListing().getFunctions(True):
        res = ifc.decompileFunction(func, 60, ConsoleTaskMonitor())
        if res.decompileCompleted():
            print(res.getDecompiledFunction().getC())
```

A minimal post-script (Java) iterates functions and calls `DecompInterface.decompileFunction(...)`, writing `getDecompiledFunction().getC()` to the path passed as `getScriptArgs()[0]`. Community headless decompile scripts exist ready-made [6](https://github.com/galoget/ghidra-headless-scripts).

Useful flags: `-processor x86:LE:64:default`, `-loader BinaryLoader -loader-baseAddr 0x...` for raw firmware, `-noanalysis`, `-analysisTimeoutPerFile 300`, `-recursive`, `-max-cpu N`, `-readOnly`, `-process` (operate on already-imported programs) [9](https://nationalsecurityagency-ghidra.mintlify.app/scripting/headless).

Strengths: free, multi-arch, scriptable, Version Tracking, big community. Weaknesses: JVM startup overhead, decompiler output often slightly noisier than Hex-Rays, slower interactive feel.

---

## IDA Pro + Hex-Rays Decompiler

The commercial baseline. IDA does disassembly/analysis; the Hex-Rays decompiler add-on produces pseudocode (per-arch licensed: x86/x64, ARM/ARM64, MIPS, PPC) [10](https://hex-rays.com/).

- IDAPython — primary scripting API (also IDC, the legacy C-like language) [6](https://hex-rays.com/blog/extending-idc-and-idapython).
- FLIRT — library function signature recognition [3](http://www.alternativeto.net/software/ida/).
- Lumina — shared function metadata (names/types) from a server [9](https://hex-rays.com/pricing).
- Tiers: IDA Free (limited, evaluation), IDA Classroom, IDA Pro, OEM. Decompilers and Lumina are paid features/add-ons [9](https://hex-rays.com/pricing).

### Headless / Batch: Decompile a DLL

Batch mode requires the `-Ohexrays` switch; works with text (`idat`) and GUI builds [2](https://docs.hex-rays.com/docs/user-guide/decompiler/batch).

```bash
# Decompile all functions to a .c file via the built-in batch trigger
idat64 -Ohexrays:outfile.c:ALL -A target.dll

#  -A         autonomous/non-interactive (no dialogs)
#  -Ohexrays  invoke the decompiler plugin in batch
#  :outfile.c output path
#  :ALL       decompile all functions (or list specific names)
```

```bash
# General batch analysis: generate IDB + ASM headlessly, then run an IDAPython dumper
idat64 -B target.dll                                  # -B batch: makes .i64/.idb + .asm [9]
idat64 -A -Sdecompile_all.py target.dll               # run a script non-interactively
```

`decompile_all.py` (IDAPython) decompiles every function and writes pseudocode:

```python
import ida_auto, ida_hexrays, idautils, ida_funcs, ida_pro
ida_auto.auto_wait()                       # wait for auto-analysis
ida_hexrays.init_hexrays_plugin()
with open("out.c", "w") as fh:
    for ea in idautils.Functions():
        cf = ida_hexrays.decompile(ea)     # may be None on failure
        if cf:
            fh.write("// %s\n%s\n" % (ida_funcs.get_func_name(ea), str(cf)))
ida_pro.qexit(0)                           # required to exit headless cleanly
```

Community batch tools wrap this for multi-file/import decompilation with xref + stack-var annotations [1](https://github.com/tintinweb/ida-batch_decompile)[4](https://github.com/JCGdev/IDAFunctionsDecompiler).

Key switches: `-B` batch (IDB+ASM), `-A` autonomous, `-c` new database, `-S<script>` run script, `-Ohexrays:...` decompiler batch, `-p<processor>` [9](https://docs.hex-rays.com/9.0/user-guide/configuration/command-line-switches).

Strengths: best-in-class CFG recovery, cleanest pseudocode, mature FLIRT/Lumina, huge plugin ecosystem. Weaknesses: expensive, per-architecture decompiler licensing, proprietary.

Free alternatives to IDA, ranked by community: Ghidra (closest in capability, free+OSS), radare2/rizin + Cutter, Hopper (cheap, macOS/Linux), Binary Ninja (paid but cheaper), angr (programmatic), JEB, Malcat, x64dbg (dynamic) [2](https://appsecsanta.com/mobile-security-tools/ghidra-alternatives)[3](http://www.alternativeto.net/software/ida/)[4](https://alternativeto.net/software/ida/?feature=decompiling&license=free).

---

## Binary Ninja

Commercial, with a clean programmatic API and a layered IL. Decompiler covered for all official and community architectures at one price (any arch that lifts to BNIL is decompiled) [1](https://binary.ninja/features/)[6](https://binary.ninja/2020/05/11/decompiler-stable-release.html).

### BNIL — the IL family

A tree-based, architecture-independent IR stack. Each level is a higher abstraction [9](https://dev-docs.binary.ninja/dev/bnil-overview.html):

| Level | What it is | Use it for |
|-------|-----------|-----------|
| Lifted IL | Direct 1:1 lift of native semantics | Architecture/lifting debugging |
| LLIL | Lifted minus NOPs, flags folded into conditionals | Low-level analysis, flag logic |
| LLIL SSA | SSA form of LLIL | Precise def/use at low level |
| Mapped MLIL | Translation layer LLIL↔MLIL | Rarely needed directly |
| MLIL | Registers/memory → typed variables, params, data flow, const-prop | Most analysis work |
| MLIL SSA | SSA form of MLIL | Data-flow heavy scripts |
| HLIL | Adds high-level control flow, dead-code/var passes, AST | Reading, structuring, final output |

ILs render like pseudocode with shorthand: signed `s<=` vs unsigned `u>=` comparisons, `sx`/`zx` for sign/zero extend, size suffixes `.b/.w/.d/.q`, float prefix `f` and `.s/.d/.t` sizes, variable bit-offsets `var:$offset`, and macros like `COMBINE`, `LOWD`, `HIGHD`, `ROL/ROR`, `TEST_BIT` [9](https://docs.binary.ninja/dev/bnil-overview.html).

API notes: iterate top-level instructions for LLIL/MLIL; HLIL is deeply tree-based so prefer the AST/visitors there. Visitor variants: `visit`, `visit_all`, `visit_operands` [9](https://docs.binary.ninja/dev/bnil-overview.html). Decompiler output switches on-demand between C and any BNIL level [1](https://binary.ninja/features/). Binary Ninja publicly documented restructuring its decompiler for better HLIL control-flow recovery [9](https://binary.ninja/2024/06/19/restructuring-the-decompiler.html).

Headless: the Python API (`binaryninja` module, commercial/headless license) opens a binary and exposes `bv.functions[i].hlil` for export; community plugins like BinjaHLILDump dump whole-binary HLIL to a directory [8](https://github.com/atxsinn3r/BinjaHLILDump).

Strengths: best automation/IL ergonomics, flat per-seat pricing across all arches, strong API. Weaknesses: paid, smaller signature ecosystem than IDA, decompiler younger than Hex-Rays.

### Cutter (rizin GUI)

Free, open-source GUI over rizin (a maintained radare2 fork). Integrates decompilers (e.g., the rizin-Ghidra/jsdec backends). Good free middle ground between raw radare2 CLI and a polished GUI [2](https://appsecsanta.com/mobile-security-tools/ghidra-alternatives).

---

## Open-Source Decompilers (Standalone)

| Tool | IR / approach | State | Best for | Limits |
|------|---------------|-------|----------|--------|
| RetDec (Avast) | LLVM IR, retargetable | Maintained, widely used | Scriptable pipelines, multi-arch, LLVM tooling | Output less clean than Ghidra/IDA; struct recovery weak [3](https://github.com/avast/retdec) |
| Reko | Own IR, SSA data-flow; GUI/CLI/.NET lib | Actively maintained | Many CPU/exe formats; embeddable .NET library | Smaller community; pseudocode rougher [4](https://github.com/uxmal/reko)[8](https://umatechnology.org/reko-a-multiplatform-decompilation-tool/) |
| Snowman | QtCreator-based, C++ output | Largely dormant | Quick x86/x64/ARM one-offs, IDA plugin | Stagnant; limited type recovery |
| Boomerang | SSA data-flow, retargetable | Historic/dormant | Academic reference for SSA decompilation | Effectively abandoned; fragile [10](http://boomerang.sourceforge.net/) |
| angr | VEX IR, symbolic execution | Active (research) | Programmatic analysis, symbolic/CFG, not pretty C | Not a polished pseudocode UI |

RetDec is the most practical standalone: machine-code decompiler built on LLVM, retargetable across architectures, scriptable as a CLI [2](https://github.com/avast/retdec/blob/master/README.md)[3](https://github.com/avast/retdec). Reko stands out for breadth of CPU/format support and for being usable as a .NET library inside your own tooling [1](https://github.com/uxmal/reko/blob/master/doc/guide/reko.md). Boomerang is the canonical SSA-decompilation research codebase but is not production-ready today [10](http://boomerang.sourceforge.net/).

Comparison shortcut: Dogbolt (Decompiler Explorer) runs multiple decompilers on one uploaded binary so you can diff their output side by side before committing to a tool [6](https://dogbolt.org/faq).

---

## Choosing the Right Tool for a DLL

Decision order:

1. Managed or native? Check for a CLR header / `mscoree`/`.NET` imports. If managed (.NET), use dnSpy/ILSpy/dotPeek — native decompilers will produce garbage. If native, continue.
2. Architecture & format. Confirm x86/x64/ARM(64)/etc. and PE/ELF/Mach-O so you can set the processor explicitly when auto-detect fails (Ghidra `-processor`, IDA `-p`).
3. Symbols available? If a matching PDB/DWARF exists, load it first; everything downstream improves. Stripped → rely on FLIRT/FunctionID/WARP.
4. Budget & workflow.
   - Free + scriptable → Ghidra (headless), Cutter for GUI, RetDec for LLVM pipelines.
   - Best accuracy/UX, have budget → IDA Pro + Hex-Rays.
   - Automation-first, IL ergonomics → Binary Ninja.
5. Size & scale. Huge or many files → headless batch (Ghidra `analyzeHeadless -recursive -max-cpu`, IDA `-Ohexrays:...:ALL`, parallelize with `parallel`); set per-file timeouts.
6. Verify. Diff against disassembly, run two engines (or Dogbolt) on critical functions, and confirm behavior dynamically when safe. Never trust a single pseudo-C listing.

For a typical stripped native x64 DLL with no budget: Ghidra headless, FunctionID for library naming, Version Tracking if you also have a previous build to port names from.

---

## Authorized-Use & Safety Notes

- Only decompile binaries you own, are licensed to analyze, or have explicit authorization to examine (malware research, your own products, CTFs, vuln research under scope). Decompiling third-party software can violate license terms or law depending on jurisdiction.
- Detonate/analyze malware only in isolated VMs/sandboxes; static decompilation is safer than execution but loaders/scripts can still reach out.
- Treat all decompiler output as untrusted hypotheses; do not copy reconstructed code into production without independent reimplementation.

---

## Sources

- Ghidra repo & framework [5](https://github.com/NationalSecurityAgency/ghidra); docs [3](https://www.ghidradocs.com/); Headless Analyzer [9](https://nationalsecurityagency-ghidra.mintlify.app/scripting/headless); headless scripts [6](https://github.com/galoget/ghidra-headless-scripts); P-code internals [10](https://www.nccgroup.com/us/research-blog/earlyremoval-in-the-conservatory-with-the-wrench-exploring-ghidra-s-decompiler-internals-to-make-automatic-p-code-analysis-scripts/); Version Tracking [1](https://www.mintlify.com/NationalSecurityAgency/ghidra/features/version-tracking)[4](https://www.lrqa.com/en/cyber-labs/version-tracking-in-ghidra/).
- Hex-Rays/IDA: site [10](https://hex-rays.com/); pricing/Lumina [9](https://hex-rays.com/pricing); IDAPython [6](https://hex-rays.com/blog/extending-idc-and-idapython); batch operation [2](https://docs.hex-rays.com/docs/user-guide/decompiler/batch); command-line switches [9](https://docs.hex-rays.com/9.0/user-guide/configuration/command-line-switches); batch tools [1](https://github.com/tintinweb/ida-batch_decompile)[4](https://github.com/JCGdev/IDAFunctionsDecompiler).
- Binary Ninja: features [1](https://binary.ninja/features/); BNIL overview [9](https://dev-docs.binary.ninja/dev/bnil-overview.html); HLIL/MLIL docs [2](https://docs.binary.ninja/dev/bnil-hlil.html)[7](https://docs.binary.ninja/dev/bnil-mlil.html); decompiler restructuring [9](https://binary.ninja/2024/06/19/restructuring-the-decompiler.html); HLIL dump plugin [8](https://github.com/atxsinn3r/BinjaHLILDump).
- Open source: RetDec [3](https://github.com/avast/retdec); Reko [4](https://github.com/uxmal/reko)[1](https://github.com/uxmal/reko/blob/master/doc/guide/reko.md)[8](https://umatechnology.org/reko-a-multiplatform-decompilation-tool/); Boomerang [10](http://boomerang.sourceforge.net/); Dogbolt [6](https://dogbolt.org/faq).
- Theory: disassembly undecidability [6](https://www.usenix.org/legacyurl/disassembly-challenges); semantic loss & neural decompilation [3](https://arxiv.org/html/2605.11501)[5](https://arxiv.org/html/2509.22114v1); type recovery [1](https://arxiv.org/html/2503.07243)[4](https://arxiv.org/html/2603.08225)[7](https://ar5iv.labs.arxiv.org/html/2304.03854).
- Alternatives/landscape [2](https://appsecsanta.com/mobile-security-tools/ghidra-alternatives)[3](http://www.alternativeto.net/software/ida/)[4](https://alternativeto.net/software/ida/?feature=decompiling&license=free).
