# Reverse Engineering Resource Catalog

A curated, categorized index of the best reverse-engineering resources on GitHub
and the web. Compiled from the major "awesome" lists, classic books, free courses,
hands-on practice platforms, and active communities. Star counts are approximate
and reflect figures captured at compile time (June 2026); treat them as
order-of-magnitude signals, not exact values.

Sources surveyed:
- tylerha97/awesome-reversing [1](https://github.com/tylerha97/awesome-reversing) (~4.5k stars)
- wtsxDev/reverse-engineering [2](https://github.com/wtsxDev/reverse-engineering)
- ReversingID/Awesome-Reversing [3](https://github.com/ReversingID/Awesome-Reversing)
- alphaSeclab/awesome-reverse-engineering [4](https://github.com/alphaSeclab/awesome-reverse-engineering)
- rshipp/awesome-malware-analysis [5](https://github.com/rshipp/awesome-malware-analysis)
- hacker-steroids/Awesome-Android-Reverse-Engineering [6](https://github.com/hacker-steroids/Awesome-Android-Reverse-Engineering)

---

## 1. Meta: The "Awesome" Lists

Start here. These aggregate everything below and stay reasonably current.

- [tylerha97/awesome-reversing](https://github.com/tylerha97/awesome-reversing) — The original curated RE list: books, courses, tools, practice. ~4.5k stars. [1](https://github.com/tylerha97/awesome-reversing)
- [wtsxDev/reverse-engineering](https://github.com/wtsxDev/reverse-engineering) — Broad fork-and-extend list of RE resources and tooling. [2](https://github.com/wtsxDev/reverse-engineering)
- [ReversingID/Awesome-Reversing](https://github.com/ReversingID/Awesome-Reversing) — Topic-organized list (file formats, architectures, anti-analysis) from the ReversingID community. [3](https://github.com/ReversingID/Awesome-Reversing)
- [alphaSeclab/awesome-reverse-engineering](https://github.com/alphaSeclab/awesome-reverse-engineering) — Massive machine-assembled catalog with English/Chinese editions and thousands of tool entries. [4](https://github.com/alphaSeclab/awesome-reverse-engineering)
- [rshipp/awesome-malware-analysis](https://github.com/rshipp/awesome-malware-analysis) — The definitive malware-analysis list: sandboxes, feeds, tooling, datasets. [5](https://github.com/rshipp/awesome-malware-analysis)
- [hacker-steroids/Awesome-Android-Reverse-Engineering](https://github.com/hacker-steroids/Awesome-Android-Reverse-Engineering) — Android-specific RE training, tools, and labs. [6](https://github.com/hacker-steroids/Awesome-Android-Reverse-Engineering)
- [CyberSecurityUP/Awesome-Malware-and-Reverse-Engineering](https://github.com/CyberSecurityUP/Awesome-Malware-Analysis-Reverse-Engineering) — Combined malware + RE study path. [7](https://github.com/CyberSecurityUP/Awesome-Malware-Analysis-Reverse-Engineering)
- [mobsecteam/android-security-awesome](https://github.com/mobsecteam/android-security-awesome) — Android security: static, dynamic, and RE tooling. [8](https://github.com/mobsecteam/android-security-awesome)

---

## 2. Tools

### 2.1 Disassemblers / Decompilers (the core platforms)

- [Ghidra](https://github.com/NationalSecurityAgency/ghidra) — NSA's open-source SRE suite with a strong decompiler; the de-facto free standard. ~48k stars. [9](https://github.com/nationalsecurityagency/ghidra)
- [radare2](https://github.com/radareorg/radare2) — Veteran CLI-first RE framework: disassembly, debugging, patching, scripting. [10](https://github.com/radareorg/radare2)
- [rizin](https://github.com/rizinorg/rizin) — Community fork of radare2 focused on usability, stability, and a clean API. [11](https://github.com/rizinorg/rizin)
- [Cutter](https://github.com/rizinorg/cutter) — Qt GUI on top of rizin, with optional Ghidra-decompiler integration. [11](https://github.com/rizinorg/rizin)
- [rz-ghidra](https://github.com/rizinorg/rz-ghidra) — Deep Ghidra decompiler + Sleigh disassembler integration for rizin/Cutter. [12](https://github.com/rizinorg/rz-ghidra)
- [IDA Pro / IDA Free](https://hex-rays.com/ida-pro/) — Commercial industry standard for x86/x64 disassembly and decompilation; free tier available. [13](https://hex-rays.com/ida-free/)
- [Binary Ninja](https://binary.ninja/) — Modern commercial platform with a strong API and BNIL intermediate language. [1](https://github.com/tylerha97/awesome-reversing)
- [Capstone](https://github.com/capstone-engine/capstone) — Lightweight multi-arch disassembly framework; the engine behind countless tools. [1](https://github.com/tylerha97/awesome-reversing)
- [RetDec](https://github.com/avast/retdec) — Avast's open-source machine-code decompiler. [1](https://github.com/tylerha97/awesome-reversing)
- [objdump](https://linux.die.net/man/1/objdump) — GNU binutils disassembler; always-available baseline. [1](https://github.com/tylerha97/awesome-reversing)

### 2.2 Debuggers

- [x64dbg](https://github.com/x64dbg/x64dbg) — Open-source Windows x64/x32 debugger; the modern OllyDbg successor. [14](https://github.com/x64dbg/x64dbg)
- [WinDbg](https://learn.microsoft.com/windows-hardware/drivers/debugger/) — Microsoft's kernel/user debugger; essential for Windows internals and crash dumps. [1](https://github.com/tylerha97/awesome-reversing)
- [GDB](https://www.gnu.org/software/gdb/) — The GNU debugger; pair with [GEF](https://github.com/hugsy/gef) or [pwndbg](https://github.com/pwndbg/pwndbg) for RE/exploitation. [1](https://github.com/tylerha97/awesome-reversing)
- [LLDB](https://lldb.llvm.org/) — LLVM debugger; default on macOS. [1](https://github.com/tylerha97/awesome-reversing)
- [OllyDbg](http://www.ollydbg.de/) — Classic 32-bit Windows ring-3 debugger; historically central to crackme culture. [1](https://github.com/tylerha97/awesome-reversing)

### 2.3 Dynamic Instrumentation / Emulation

- [Frida](https://github.com/frida/frida) — Dynamic instrumentation toolkit; hook and modify running native apps on all major platforms. The standard for mobile RE. [15](https://github.com/frida/frida)
- [Unicorn](https://github.com/unicorn-engine/unicorn) — Lightweight multi-arch CPU emulator framework (built on QEMU). [1](https://github.com/tylerha97/awesome-reversing)
- [Qiling](https://github.com/qilingframework/qiling) — Advanced binary emulation framework on Unicorn; cross-platform, OS-aware, scriptable. [16](https://github.com/qilingframework/qiling)
- [Triton](https://github.com/JonathanSalwan/Triton) — Dynamic binary analysis: symbolic execution, taint tracking, AST representation of x86/ARM. [17](https://github.com/JonathanSalwan/Triton)
- [angr](https://github.com/angr/angr) — Python platform for binary analysis: symbolic execution, CFG recovery, automated exploitation. [18](https://github.com/angr/angr)
- [BAP](https://github.com/BinaryAnalysisPlatform/bap) — CMU's Binary Analysis Platform for program analysis and verification. [1](https://github.com/tylerha97/awesome-reversing)
- [miasm](https://github.com/cea-sec/miasm) — Reverse-engineering framework with its own IR, emulation, and symbolic execution. [4](https://github.com/alphaSeclab/awesome-reverse-engineering)

### 2.4 Capability / String / Triage Analysis

- [capa](https://github.com/mandiant/capa) — FLARE team tool that identifies program capabilities (e.g. "encrypt data", "create service") from rules. ~3.2k+ stars. [19](https://github.com/mandiant/capa)
- [FLOSS](https://github.com/mandiant/flare-floss) — FLARE Obfuscated String Solver; automatically deobfuscates and extracts hidden strings from malware. [20](https://github.com/mandiant/flare-floss)
- [Detect It Easy (DIE)](https://github.com/horsicq/Detect-It-Easy) — Packer/compiler/protector identifier with a scriptable signature engine. [21](https://github.com/horsicq/Detect-It-Easy)
- [PeStudio](https://www.winitor.com/) — Static PE triage: indicators, imports, entropy, VirusTotal lookups. [1](https://github.com/tylerha97/awesome-reversing)
- [YARA](https://github.com/VirusTotal/yara) — Pattern-matching engine to classify and identify malware families by rules. [5](https://github.com/rshipp/awesome-malware-analysis)
- [yarGen](https://github.com/Neo23x0/yarGen) — Auto-generates YARA rules from malware samples. [1](https://github.com/tylerha97/awesome-reversing)

### 2.5 Binary Format / Parsing Libraries

- [LIEF](https://github.com/lief-project/LIEF) — Library to parse, modify, and abstract ELF, PE, Mach-O, and more. [22](https://github.com/lief-project/LIEF)
- [pefile](https://github.com/erocarrera/pefile) — Python library to read and work with Portable Executable (PE) files. [23](https://github.com/erocarrera/pefile)
- [CFF Explorer](https://ntcore.com/?page_id=388) — Classic PE editor and inspector. [1](https://github.com/tylerha97/awesome-reversing)
- [HxD](https://mh-nexus.de/en/hxd/) — Fast free Windows hex editor. [1](https://github.com/tylerha97/awesome-reversing)
- [010 Editor](https://www.sweetscape.com/010editor/) — Hex editor with binary templates for structured file parsing. [1](https://github.com/tylerha97/awesome-reversing)
- [Kaitai Struct](https://kaitai.io/) — Declarative language to describe binary formats and generate parsers. [3](https://github.com/ReversingID/Awesome-Reversing)

### 2.6 .NET / Managed Code

- [dnSpyEx](https://github.com/dnSpyEx/dnSpy) — Maintained fork of dnSpy: .NET debugger and assembly editor/decompiler. [24](https://github.com/dnSpyEx/dnSpy)
- [ILSpy](https://github.com/icsharpcode/ILSpy) — Open-source .NET decompiler (also maintained under the dnSpyEx org's fork). [25](https://github.com/dnSpyEx/ILSpy)
- [de4dot](https://github.com/de4dot/de4dot) — .NET deobfuscator and unpacker. [4](https://github.com/alphaSeclab/awesome-reverse-engineering)

### 2.7 Android / Mobile

- [Apktool](https://github.com/iBotPeaches/Apktool) — Decode and rebuild Android APK resources and smali. [1](https://github.com/tylerha97/awesome-reversing)
- [jadx](https://github.com/skylot/jadx) — Dex-to-Java decompiler with a usable GUI; the go-to for APK source recovery. [6](https://github.com/hacker-steroids/Awesome-Android-Reverse-Engineering)
- [dex2jar](https://github.com/pxb1988/dex2jar) — Convert Android .dex to .jar for analysis in JVM tools. [1](https://github.com/tylerha97/awesome-reversing)
- [Frida](https://github.com/frida/frida) — Runtime hooking for Android/iOS RASP bypass and behavior tracing. [15](https://github.com/frida/frida)
- [objection](https://github.com/sensepost/objection) — Frida-powered runtime mobile exploration toolkit. [6](https://github.com/hacker-steroids/Awesome-Android-Reverse-Engineering)
- [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) — Automated static + dynamic mobile app security analysis. [8](https://github.com/mobsecteam/android-security-awesome)
- [Androl4b](https://github.com/sh4hin/Androl4b) — Ubuntu-MATE VM bundling Android RE and malware-analysis tooling. [8](https://github.com/sh4hin/Androl4b)

### 2.8 Dynamic / Behavioral & Sandbox (Malware)

- [CAPE Sandbox](https://github.com/kevoreilly/CAPEv2) — Malware sandbox derived from Cuckoo, focused on config/payload extraction. [5](https://github.com/rshipp/awesome-malware-analysis)
- [Cuckoo Sandbox](https://github.com/cuckoosandbox/cuckoo) — Classic automated malware-analysis sandbox. [1](https://github.com/tylerha97/awesome-reversing)
- [Volatility 3](https://github.com/volatilityfoundation/volatility3) — Memory-forensics framework for RAM analysis. [1](https://github.com/tylerha97/awesome-reversing)
- [Process Hacker / System Informer](https://github.com/winsiderss/systeminformer) — Deep live process and system inspection on Windows. [1](https://github.com/tylerha97/awesome-reversing)
- [Sysinternals (Process Monitor / Explorer, Autoruns)](https://learn.microsoft.com/sysinternals/) — Essential Windows behavioral-monitoring suite. [1](https://github.com/tylerha97/awesome-reversing)
- [INetSim](https://www.inetsim.org/) — Fake internet services for safe malware detonation. [1](https://github.com/tylerha97/awesome-reversing)
- [FakeNet-NG](https://github.com/mandiant/flare-fakenet-ng) — Dynamic network simulation for malware analysis. [5](https://github.com/rshipp/awesome-malware-analysis)

### 2.9 Document / Script Analysis

- [oletools](https://github.com/decalage2/oletools) — Analyze OLE/Office files and extract VBA macros. [1](https://github.com/tylerha97/awesome-reversing)
- [Didier Stevens' PDF Tools](https://blog.didierstevens.com/programs/pdf-tools/) — pdfid/pdf-parser for malicious-PDF triage. [1](https://github.com/tylerha97/awesome-reversing)

---

## 3. Books

### Foundational / General RE

- [Reverse Engineering for Beginners (RE4B)](https://beginners.re/) — Dennis Yurichev's free, comprehensive intro to assembly and RE; endorsed by RMS and security veterans. [26](https://go.yurichev.com/)
- [The Ghidra Book (2nd Ed.)](https://nostarch.com/the-ghidra-book-2nd-edition) — Definitive practical guide to Ghidra by Chris Eagle and Kara Nance, updated for the modern platform. [27](https://nostarch.com/node/831)
- [Practical Binary Analysis](https://nostarch.com/binaryanalysis) — Dennis Andriesse on Linux/ELF binary analysis, instrumentation, and building your own tools. [1](https://github.com/tylerha97/awesome-reversing)
- [The IDA Pro Book (2nd Ed.)](https://nostarch.com/idapro2.htm) — Chris Eagle's canonical reference for IDA Pro. [1](https://github.com/tylerha97/awesome-reversing)
- [Reversing: Secrets of Reverse Engineering](https://www.wiley.com/en-us/Reversing%3A+Secrets+of+Reverse+Engineering-p-9780764574818) — Eldad Eilam's foundational text on RE techniques. [1](https://github.com/tylerha97/awesome-reversing)
- [Practical Reverse Engineering](https://www.wiley.com/Practical+Reverse+Engineering-p-9781118787311) — Dang, Gazet, Bachaalany on x86/x64, ARM, Windows kernel, and obfuscation. [1](https://github.com/tylerha97/awesome-reversing)

### Malware Analysis

- [Practical Malware Analysis](https://nostarch.com/malware) — Sikorski & Honig; the standard hands-on malware-analysis textbook with labs. [1](https://github.com/tylerha97/awesome-reversing)
- [Learning Malware Analysis](https://www.packtpub.com/product/learning-malware-analysis/9781788392501) — Monnappa K A; modern techniques with memory forensics. [1](https://github.com/tylerha97/awesome-reversing)
- [Malware Analyst's Cookbook](https://www.wiley.com/Malware+Analysts+Cookbook+and+DVD-p-9780470613030) — Recipes and tools for triage and analysis. [1](https://github.com/tylerha97/awesome-reversing)
- [Rootkits and Bootkits](https://nostarch.com/rootkits) — Matrosov, Rodionov, Bratus on advanced persistent threats and firmware. [1](https://github.com/tylerha97/awesome-reversing)
- [The Art of Memory Forensics](https://www.wiley.com/The+Art+of+Memory+Forensics-p-9781118825099) — The Volatility team's definitive memory-forensics reference. [1](https://github.com/tylerha97/awesome-reversing)

### Exploitation / Internals (adjacent)

- [Hacking: The Art of Exploitation](https://nostarch.com/hacking2.htm) — Erickson; classic exploitation fundamentals. [1](https://github.com/tylerha97/awesome-reversing)
- [The Shellcoder's Handbook](https://www.wiley.com/The+Shellcoders+Handbook-p-9780470080238) — Discovering and exploiting security holes. [1](https://github.com/tylerha97/awesome-reversing)
- [Windows Internals (Part 1 & 2)](https://learn.microsoft.com/sysinternals/resources/windows-internals) — Russinovich et al.; essential OS-level context. [1](https://github.com/tylerha97/awesome-reversing)
- [iOS App Reverse Engineering](https://github.com/iosre/iOSAppReverseEngineering) — Free book on iOS RE workflows and tooling. [1](https://github.com/tylerha97/awesome-reversing)

---

## 4. Courses & Training (mostly free)

- [OpenSecurityTraining2 (OST2)](https://ost2.fyi/) — Free, in-depth courses on architecture, RE, exploitation, and trusted computing; successor to OpenSecurityTraining. [28](https://p.ost2.fyi/)
- [begin.re](https://www.begin.re/) — Ophir Harpaz's free, hands-on "Reverse Engineering for Beginners" web course. [29](https://begin.re)
- [Malware Unicorn RE101](https://malwareunicorn.org/workshops/re101) — Amanda Rousseau's hands-on intro to reversing Windows malware (x86 asm, tools, techniques). [30](https://malwareunicorn.org/workshops/re101)
- [Malware Unicorn RE102](https://malwareunicorn.org/workshops/re102) — Follow-on: anti-RE, encryption, VM evasion, and packing. [31](https://malwareunicorn.org/workshops/re102)
- [RPISEC Malware Analysis](https://github.com/RPISEC/Malware) — Full university malware-analysis course (slides + labs) on GitHub. [1](https://github.com/tylerha97/awesome-reversing)
- [RPISEC Modern Binary Exploitation](http://security.cs.rpi.edu/courses/binexp-spring2015/) — Companion exploitation course materials. [1](https://github.com/tylerha97/awesome-reversing)
- [Azeria Labs ARM Assembly](https://azeria-labs.com/writing-arm-assembly-part-1/) — Free ARM assembly and exploitation tutorials. [1](https://github.com/tylerha97/awesome-reversing)
- [Binary Auditing Course](http://www.binary-auditing.com/) — Free university-level binary-auditing training set. [1](https://github.com/tylerha97/awesome-reversing)
- [Lena's Reversing for Newbies](https://tuts4you.com/) — Classic tutorial series hosted by Tuts4You. [1](https://github.com/tylerha97/awesome-reversing)
- [Quarkslab RE Introduction](https://www.quarkslab.com/training-reverse-engineering-introduction/) — Methodology-focused commercial training (static + dynamic). [32](https://www.quarkslab.com/training-reverse-engineering-introduction/)

---

## 5. Practice / CTF / Crackmes

- [crackmes.one](https://crackmes.one/) — Large searchable repository of crackmes by difficulty/architecture; the community standard for practice. [33](https://crackmes.one/)
- [Flare-On Challenges](https://flare-on.com/) — Mandiant/FLARE's annual RE CTF; past years' challenges and solutions are archived. [1](https://github.com/tylerha97/awesome-reversing)
- [Challenges.re](https://challenges.re/) — Dennis Yurichev's graded RE exercise set. [1](https://github.com/tylerha97/awesome-reversing)
- [pwn.college](https://pwn.college/) — Free structured curriculum (RE, exploitation, more) from ASU, with auto-graded labs. [18](https://github.com/angr/angr)
- [picoCTF](https://picoctf.org/) — Beginner-friendly CTF with a solid RE category and persistent practice gym. [1](https://github.com/tylerha97/awesome-reversing)
- [Root-Me](https://www.root-me.org/) — Hundreds of challenges including cracking and RE tracks. [3](https://github.com/ReversingID/Awesome-Reversing)
- [xorpd Advanced Assembly Exercises](https://www.xorpd.net/pages/xchg_rax/snip_00.html) — Hard x86 assembly puzzles ("xchg rax,rax"). [1](https://github.com/tylerha97/awesome-reversing)
- [OSX Crackmes](https://reverse.put.as/crackmes/) — macOS-focused crackmes. [1](https://github.com/tylerha97/awesome-reversing)
- [MalwareBazaar (abuse.ch)](https://bazaar.abuse.ch/) — Live malware sample feed for analysis practice (handle with care). [5](https://github.com/rshipp/awesome-malware-analysis)
- [Malware-Traffic-Analysis.net](https://malware-traffic-analysis.com/) — PCAP + sample exercises for behavioral/network analysis. [1](https://github.com/tylerha97/awesome-reversing)
- [VirusShare](https://virusshare.com/) — Large malware corpus for research (access-controlled). [1](https://github.com/tylerha97/awesome-reversing)

> Safety: live malware samples (MalwareBazaar, VirusShare, Contagio) must only be
> detonated in isolated VMs with no host network bridge. Treat every sample as live.

---

## 6. Communities & Channels

### Forums / Chats

- [r/ReverseEngineering](https://www.reddit.com/r/ReverseEngineering/) — Active subreddit for tooling, writeups, and questions.
- [Reverse Engineering Stack Exchange](https://reverseengineering.stackexchange.com/) — Q&A site; the best place for specific technical answers. [34](https://reverseengineering.stackexchange.com/questions/265/where-to-find-free-training-in-reverse-engineering)
- [Tuts4You](https://tuts4you.com/) — Long-running RE/cracking tutorial and community forum. [1](https://github.com/tylerha97/awesome-reversing)
- Ghidra, rizin/Cutter, and Frida each run active Discord/Matrix/Telegram channels linked from their repos. [11](https://github.com/rizinorg/rizin)

### YouTube Channels (from awesome-reversing)

- [OALabs](https://www.youtube.com/c/OALabs) — Practical malware RE walkthroughs. [1](https://github.com/tylerha97/awesome-reversing)
- [stacksmashing](https://www.youtube.com/c/stacksmashing) — Hardware + software RE deep dives. (community-recommended)
- [LiveOverflow](https://www.youtube.com/c/LiveOverflow) — RE/exploitation/CTF education. (community-recommended)
- [GynvaelEN](https://www.youtube.com/user/GynvaelEN) — Security and RE streams. [1](https://github.com/tylerha97/awesome-reversing)
- [hasherezade](https://www.youtube.com/c/hasherezade) — Malware unpacking and PE internals. [1](https://github.com/tylerha97/awesome-reversing)
- [Colin Hardy](https://www.youtube.com/c/ColinHardy) — Malware analysis tutorials. [1](https://github.com/tylerha97/awesome-reversing)

---

## 7. Suggested Learning Path

1. Read RE4B [26](https://go.yurichev.com/) and work begin.re [29](https://begin.re) to build assembly fluency.
2. Take OST2 [28](https://p.ost2.fyi/) architecture + RE modules for structured depth.
3. Pick a platform: Ghidra [9](https://github.com/nationalsecurityagency/ghidra) (free) or IDA Free; learn one well before collecting more.
4. Grind crackmes.one [33](https://crackmes.one/) and Flare-On archives to convert theory into reps.
5. For malware: Practical Malware Analysis + Malware Unicorn RE101/102 [30](https://malwareunicorn.org/workshops/re101), then triage real samples in an isolated VM with capa [19](https://github.com/mandiant/capa) and FLOSS [20](https://github.com/mandiant/flare-floss).
6. Go advanced: angr [18](https://github.com/angr/angr), Triton [17](https://github.com/JonathanSalwan/Triton), and Qiling [16](https://github.com/qilingframework/qiling) for symbolic/emulated analysis.

---

## References

1. tylerha97/awesome-reversing — https://github.com/tylerha97/awesome-reversing
2. wtsxDev/reverse-engineering — https://github.com/wtsxDev/reverse-engineering
3. ReversingID/Awesome-Reversing — https://github.com/ReversingID/Awesome-Reversing
4. alphaSeclab/awesome-reverse-engineering — https://github.com/alphaSeclab/awesome-reverse-engineering
5. rshipp/awesome-malware-analysis — https://github.com/rshipp/awesome-malware-analysis
6. hacker-steroids/Awesome-Android-Reverse-Engineering — https://github.com/hacker-steroids/Awesome-Android-Reverse-Engineering
7. CyberSecurityUP/Awesome-Malware-Analysis-Reverse-Engineering — https://github.com/CyberSecurityUP/Awesome-Malware-Analysis-Reverse-Engineering
8. mobsecteam/android-security-awesome — https://github.com/mobsecteam/android-security-awesome
9. NationalSecurityAgency/ghidra (~48k stars) — https://github.com/nationalsecurityagency/ghidra
10. radareorg/radare2 — https://github.com/radareorg/radare2
11. rizinorg/rizin — https://github.com/rizinorg/rizin
12. rizinorg/rz-ghidra — https://github.com/rizinorg/rz-ghidra
13. Hex-Rays IDA Free — https://hex-rays.com/ida-free/
14. x64dbg/x64dbg — https://github.com/x64dbg/x64dbg
15. frida/frida — https://github.com/frida/frida
16. qilingframework/qiling — https://github.com/qilingframework/qiling
17. JonathanSalwan/Triton — https://github.com/JonathanSalwan/Triton
18. angr/angr — https://github.com/angr/angr
19. mandiant/capa (~3.2k+ stars) — https://github.com/mandiant/capa
20. mandiant/flare-floss — https://github.com/mandiant/flare-floss
21. horsicq/Detect-It-Easy — https://github.com/horsicq/Detect-It-Easy
22. lief-project/LIEF — https://github.com/lief-project/LIEF
23. erocarrera/pefile — https://github.com/erocarrera/pefile
24. dnSpyEx/dnSpy — https://github.com/dnSpyEx/dnSpy
25. dnSpyEx/ILSpy — https://github.com/dnSpyEx/ILSpy
26. Reverse Engineering for Beginners (Yurichev) — https://beginners.re/ ( https://go.yurichev.com/ )
27. The Ghidra Book, 2nd Ed. (No Starch) — https://nostarch.com/the-ghidra-book-2nd-edition
28. OpenSecurityTraining2 — https://p.ost2.fyi/
29. begin.re — https://begin.re
30. Malware Unicorn RE101 — https://malwareunicorn.org/workshops/re101
31. Malware Unicorn RE102 — https://malwareunicorn.org/workshops/re102
32. Quarkslab RE Introduction — https://www.quarkslab.com/training-reverse-engineering-introduction/
33. crackmes.one — https://crackmes.one/
34. Reverse Engineering Stack Exchange — https://reverseengineering.stackexchange.com/
