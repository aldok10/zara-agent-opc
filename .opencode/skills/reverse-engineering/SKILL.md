---
name: reverse-engineering
description: Authorized reverse-engineering orchestrator — turn *.dll / PE / ELF / Mach-O binaries into code a programmer can read and re-implement. Routes by target type, intent, and toolchain to focused subskills. Covers PE/DLL format, .NET + native decompilation, anti-anti-RE (unpacking/deobfuscation), dynamic analysis, symbol/type recovery, and rebuilding into modern Go/PHP. Load when analyzing, decompiling, unpacking, or re-implementing a binary.
---

# Reverse-Engineering Expert

Senior reverse engineer DNA. You take a binary you are authorized to analyze and turn it into
something a programmer can read, understand, and re-implement. You do this even when the binary fights
back (packing, anti-debug, obfuscation) by recognizing and defeating those protections.

**FIRST ACTION on any binary**: run cheap triage before deciding anything. `file <bin>`, then our own
`dllscan` (Go, stdlib-only) and/or `redll` (PHP). Never guess — measure the binary first.

## Framing & Safety (read once)

Reverse engineering is legitimate for interoperability, debugging legacy code, security research, and
malware *defense*. This skill operates under that frame. Anti-anti-RE (unpacking, deobfuscation,
anti-debug bypass) is in scope — it is standard defensive/research practice.

- Treat every binary as **untrusted data**. Static analysis is default-safe.
- Any **dynamic execution** (detonation, LoadLibrary, harness calls) on an unknown sample → isolated VM,
  no host network, snapshots. Flag it before doing it.
- Out of scope: building malware/exploits/C2, DRM cracking for piracy. We recover and re-implement
  logic for understanding and interop, not weaponization.

## Senior RE Mindset

- **Triage before depth.** Most questions are answered by headers, imports, exports, strings, entropy.
  Climb the analysis pyramid only as high as the question needs. Know when to stop.
- **Managed vs native is the first fork.** A .NET DLL decompiles to near-original C# (ILSpy/dnSpy). A
  native DLL gives imperfect pseudocode (Ghidra/IDA/r2). Detect it first (CLR header / data dir 14).
- **Decompiler output is a hypothesis, not truth.** Verify against disassembly and behavior. Label
  confidence: verified / inferred / guessed.
- **Exports + imports tell the story.** Exports = the API surface to rebuild. Imports = what the binary
  can do (network/crypto/registry/injection). Start there.
- **Honest confidence beats false completeness.** Re-implementing a 6.9 MB DLL fully is unrealistic;
  recovering its usable surface + selected algorithms with honest labels is the real deliverable.

## The DLL → readable-code pipeline

```
1. Triage     dllscan + redll + file/rabin2 → managed? native? packed? what APIs? exports?
2. Classify   .NET → dotnet path · native → native/r2 path · packed → unpacking first · unknown → triage
3. Recover    decompile (ILSpy/dnSpy | Ghidra/IDA/r2+r2ghidra) → pseudocode
4. Understand map exports→signatures, recover types/structs, name things, read algorithms
5. Rebuild    re-implement the usable surface in Go/PHP (FFI/cgo/P-Invoke + pure-logic where feasible)
6. Verify     test vectors / harness calls; document confidence per function
7. Report     structured analysis + rebuilt code + what's certain vs uncertain
```

## Routing — 3 axes (match all that apply)

### By target type
| Target | Route to |
|--------|----------|
| .NET / managed DLL (CLR header present) | `subskills/dotnet-decompile.md` |
| Native DLL / EXE / SO / dylib | `subskills/native-decompile.md` + `subskills/radare2.md` |
| Packed / high-entropy / protected | `subskills/anti-re.md` → `subskills/unpacking.md` first |
| Unknown / suspicious | `subskills/triage.md` first |
| Need to call/use the exports | `subskills/dll-interop.md` |

### By intent
| User says | Route to |
|-----------|----------|
| "what does this DLL do" | `triage.md` + `pe-dll-format.md` |
| "decompile to C#/source" | `dotnet-decompile.md` or `native-decompile.md` |
| "rebuild it in Go/PHP" | `dll-interop.md` + `rebuild.md` |
| "it's protected/packed/obfuscated" | `anti-re.md` + `unpacking.md` |
| "I can't read the pseudocode" | `asm-abi.md` + `symbol-recovery.md` |
| "watch it run / hook it" | `dynamic-analysis.md` |

### By toolchain
| Tool seen/available | Route to |
|---------------------|----------|
| `dllscan` / `redll` (ours) | run first, always — triage |
| `rabin2` / `r2` / `rizin` (local) | `radare2.md` |
| `ilspycmd` / `dnSpy` / `de4dot` | `dotnet-decompile.md` |
| `ghidra` headless / IDA | `native-decompile.md` |
| `frida` / `x64dbg` / `windbg` | `dynamic-analysis.md` |

**Route not matched?** Don't force-fit. Say so, propose the closest path, and note a possible new subskill.

## Our tools (built, tested — prefer these for triage)

| Tool | Lang | Run | Gives |
|------|------|-----|-------|
| `dllscan` | Go stdlib | `go run ./tools/dllscan <dll> [-json]` | headers, sections+entropy, imports, **exports**, .NET detect, capability heuristic, packed verdict |
| `redll` | PHP 8.3 | `php tools/redll-php/bin/redll analyze <dll> [--md|--json]` | native PE parse + rabin2 merge → terminal/JSON/Markdown report |

External (install on demand, probe with `which` + version, never guess paths): radare2/rizin (local),
Ghidra headless, IDA, ilspycmd, de4dot, frida, capa, FLOSS.

## Knowledge (83 files, load on demand)

### formats/ (17 files) — Binary file format specs
| Need | Load |
|------|------|
| PE DOS/Rich/NT headers, data directories, sections | `knowledge/formats/pe-headers-nt-sections.md` |
| PE imports, exports, relocations, TLS | `knowledge/formats/pe-imports-exports-relocs.md` |
| PE resources, debug dir, DLL specifics, tools | `knowledge/formats/pe-resources-debug-tools.md` |
| .NET CIL bytecode, metadata tables, managed detection | `knowledge/formats/dotnet-cil-metadata-detection.md` |
| .NET decompilers, de4dot, round-tripping, workflow | `knowledge/formats/dotnet-decompilers-workflow.md` |
| ELF header, program headers, section headers | `knowledge/formats/elf-header-segments-sections.md` |
| ELF .dynamic section, symbol tables, hash tables | `knowledge/formats/elf-dynamic-symbols-hash.md` |
| ELF PLT/GOT, RELRO, init/fini arrays | `knowledge/formats/elf-plt-got-relro-init.md` |
| ELF PIC/PIE, relocation types, TLS | `knowledge/formats/elf-pic-relocations-tls.md` |
| Mach-O header, load commands, segments | `knowledge/formats/macho-header-loadcmds-segments.md` |
| Mach-O RE tools (otool, jtool2, class-dump) | `knowledge/formats/macho-re-tools.md` |
| dyld shared cache, DYLD_INSERT, closures | `knowledge/formats/macho-dyld-shared-cache.md` |
| APK structure, signing schemes, ZIP alignment | `knowledge/formats/apk-structure-signing.md` |
| DEX/ODEX format, header, bytecode layout | `knowledge/formats/dex-odex-format.md` |
| ART runtime, OAT, dex2oat, profile-guided | `knowledge/formats/art-runtime-compilation.md` |
| COFF object files, PDB MSF, CodeView symbols | `knowledge/formats/coff-obj-pdb-symbols.md` |
| WebAssembly binary format, opcodes, JS deobfuscation | `knowledge/formats/wasm-bytecode-format.md` |

### platforms/ (28 files) — OS/runtime-specific analysis
| Need | Load |
|------|------|
| Linux dynamic linker, process init (kernel to main) | `knowledge/platforms/linux-dynamic-linker-init.md` |
| Linux syscall interface, signal handling | `knowledge/platforms/linux-syscalls-signals.md` |
| Linux anti-debug, r_debug interface | `knowledge/platforms/linux-anti-debug-rdebug.md` |
| Linux packing/infection, CFI/ASan patterns | `knowledge/platforms/linux-packing-instrumentation.md` |
| Linux RE tools + analyst triage workflow | `knowledge/platforms/linux-re-tools-workflow.md` |
| macOS ObjC runtime, isa, method dispatch | `knowledge/platforms/macos-objc-runtime.md` |
| macOS Swift runtime, witness tables, ABI | `knowledge/platforms/macos-swift-runtime-abi.md` |
| macOS FairPlay DRM, iOS app binary analysis | `knowledge/platforms/macos-fairplay-app-analysis.md` |
| macOS lldb-based RE workflow | `knowledge/platforms/macos-lldb-re-workflow.md` |
| macOS kernel/driver RE, anti-RE techniques | `knowledge/platforms/macos-kernel-antire.md` |
| macOS DTrace for reverse engineering | `knowledge/platforms/macos-dtrace-re.md` |
| Android Smali/baksmali, Dalvik bytecode | `knowledge/platforms/android-smali-bytecode.md` |
| Android decompilers (jadx, apktool), RE toolchains | `knowledge/platforms/android-decompilers-toolchains.md` |
| Android obfuscation and deobfuscation | `knowledge/platforms/android-obfuscation-deobfuscation.md` |
| Android native .so JNI RE | `knowledge/platforms/android-native-so-re.md` |
| Android Frida, Xposed, dynamic instrumentation | `knowledge/platforms/android-frida-dynamic.md` |
| Android security model, sandbox, SELinux | `knowledge/platforms/android-security-model.md` |
| Android root detection bypass, resources analysis | `knowledge/platforms/android-root-bypass-resources.md` |
| Android traffic interception, memory forensics, E2E | `knowledge/platforms/android-traffic-forensics-workflow.md` |
| ARM64 architecture overview, registers | `knowledge/platforms/arm64-architecture-registers.md` |
| ARM64 instruction set, calling conventions, vs x86 | `knowledge/platforms/arm64-instructions-calling.md` |
| ARM Thumb/Thumb-2, firmware RE methodology | `knowledge/platforms/arm64-thumb-firmware-methodology.md` |
| ARM firmware architectures, MITRE ATT&CK embedded | `knowledge/platforms/arm64-firmware-architectures-mitre.md` |
| ARM64 tooling, shellcode patterns | `knowledge/platforms/arm64-tooling-shellcode.md` |
| ARM RTOS reversing, IoT/embedded security | `knowledge/platforms/arm64-rtos-iot.md` |
| ARM UEFI firmware RE, embedded protocols | `knowledge/platforms/arm64-uefi-protocols.md` |
| Java/JVM class format, bytecode, Kotlin, JNI | `knowledge/platforms/java-jvm-bytecode.md` |
| Unity/Unreal game engine binary RE | `knowledge/platforms/game-engines-unity-unreal.md` |

### techniques/ (15 files) — RE methodology
| Need | Load |
|------|------|
| Triage pyramid, safe handling, static first steps, capa | `knowledge/techniques/triage-pyramid-static-capa.md` |
| YARA rules, MITRE ATT&CK, IOC extraction, DLL triage | `knowledge/techniques/triage-yara-mitre-ioc-dll.md` |
| Packer/protector detection, anti-VM, virtualization | `knowledge/techniques/anti-re-protections.md` |
| Generic unpacking workflow, UPX, anti-debugging defeat | `knowledge/techniques/unpacking-generic-upx-antidebug.md` |
| Import reconstruction, CFG recovery, VMProtect | `knowledge/techniques/unpacking-imports-cflow-vmp.md` |
| Debuggers (x64dbg, WinDbg, gdb), Frida instrumentation | `knowledge/techniques/dynamic-debuggers-frida.md` |
| Behavioral monitoring, sandboxes, network analysis | `knowledge/techniques/dynamic-monitoring-sandbox-network.md` |
| FLIRT signatures, PDB symbols, type libraries | `knowledge/techniques/symbols-flirt-pdb-typelibs.md` |
| C++ demangling, struct reconstruction, BinDiff | `knowledge/techniques/symbols-demangling-structs-bindiff.md` |
| x86/x64 registers, instructions, flags | `knowledge/techniques/asm-registers-instructions-flags.md` |
| Calling conventions (x86/x64), stack frames, patterns | `knowledge/techniques/asm-calling-conventions-patterns.md` |
| Shellcode analysis, PEB walking, API hashing | `knowledge/techniques/shellcode-analysis.md` |
| DLL injection, hooking, hollowing, ghosting | `knowledge/techniques/injection-hooking.md` |
| Volatility 3, memory forensics, rootkit detection | `knowledge/techniques/memory-forensics.md` |
| Kernel drivers, rootkits, DKOM techniques | `knowledge/techniques/kernel-driver-rootkit.md` |

### tooling/ (15 files) — Tool references
| Need | Load |
|------|------|
| radare2/rizin ecosystem, command cheat-sheet | `knowledge/tooling/radare2-ecosystem-commands.md` |
| r2 visual mode, r2pipe scripting, decompilers | `knowledge/tooling/radare2-visual-scripting.md` |
| r2 PE/DLL workflow, ESIL emulation, worked session | `knowledge/tooling/radare2-pe-esil-session.md` |
| Ghidra/IDA/BinaryNinja comparison and workflows | `knowledge/tooling/ghidra-ida-binja.md` |
| Go stdlib debug/pe, parsing PE in Go | `knowledge/tooling/go-stdlib-debug-pe.md` |
| Go ELF/Mach-O parsing, third-party binary libs | `knowledge/tooling/go-elf-macho-thirdparty.md` |
| Go disassembly, reversing Go binaries, pescan CLI | `knowledge/tooling/go-disasm-reversing-pescan.md` |
| PHP binary reading, PE header hand-parsing | `knowledge/tooling/php-binary-reading-pe-parse.md` |
| PHP FFI, packages, honest assessment for RE | `knowledge/tooling/php-ffi-packages-assessment.md` |
| PHP rabin2 shell-out tool sketch | `knowledge/tooling/php-rabin2-shell-tool.md` |
| Listing DLL exports, ordinals, forwarders | `knowledge/tooling/dll-listing-exports-ordinals.md` |
| Cross-language DLL calling (C/Go/PHP/Py/C#) | `knowledge/tooling/dll-calling-cross-language.md` |
| COM DLLs, DLL identification, header recovery | `knowledge/tooling/dll-com-identification-header.md` |
| AI/ML-assisted reverse engineering | `knowledge/tooling/ai-assisted-re.md` |
| Books, courses, tools catalog | `knowledge/tooling/resource-catalog.md` |

### languages/ (3 files) — Language-specific compiled RE
| Need | Load |
|------|------|
| Rust mangling, memory layouts; Python PyInstaller/Nuitka | `knowledge/languages/rust-python-compiled-re.md` |
| Delphi/C++Builder VMT, DFM, RTTI, BPL | `knowledge/languages/delphi-cppbuilder.md` |
| VBA macros, PowerShell obfuscation/deobfuscation | `knowledge/languages/vba-powershell-scripts.md` |

### hardware/ (5 files) — Firmware and embedded
| Need | Load |
|------|------|
| UEFI/BIOS boot phases, FFS, SPI flash, rootkits | `knowledge/hardware/uefi-bios-firmware.md` |
| Microcontroller firmware (ESP32, STM32), flash dump | `knowledge/hardware/microcontroller-firmware.md` |
| JTAG/SWD, side-channel attacks, fault injection | `knowledge/hardware/jtag-sidechannel.md` |
| MIPS/PowerPC/RISC-V architecture comparison | `knowledge/hardware/mips-ppc-riscv-architectures.md` |
| Smart contract/EVM bytecode, function dispatch | `knowledge/hardware/smart-contract-evm.md` |

## Self-improvement loop

- **Before**: `reflect_suggest` + `memory_recall` for prior RE episodes (don't re-solve).
- **After**: `memory_episode` (what worked, pitfalls, tool quirks) + `reflect` with outcome.
- Repeated 3+ sequence → `memory_procedure` (e.g. "DLL triage path", "managed-DLL decompile path").

## Related skills
| When | Load |
|------|------|
| Rebuild in Go | `golang-expert` |
| Rebuild in PHP | `php-expert` |
| Stuck on a bug while analyzing | `systematic-debugging` |
| MetaTrader 5 specifics | `metatrader5-sdk` |
