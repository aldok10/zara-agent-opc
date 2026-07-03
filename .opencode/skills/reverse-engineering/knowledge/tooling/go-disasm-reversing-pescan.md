# Go Disassembly, Reversing Go Binaries & pescan CLI Sketch

TL;DR: Pure-Go and CGo disassembly engines, Go malware symbol recovery tools, and a complete pescan triage CLI implementation.
See also: `go-stdlib-debug-pe.md`, `go-elf-macho-thirdparty.md`

---

## 5. Disassembly in Go

### 5.1 Pure-Go: `golang.org/x/arch`

No CGo, no native libs. `x86asm` (16/32/64-bit x86) and `arm64asm` decode one instruction at a
time. Ideal for static tools you want to `go build` and ship as a single binary.[11]

```go
import "golang.org/x/arch/x86/x86asm"

func disasmX64(code []byte, vaddr uint64) {
	pc := vaddr
	for len(code) > 0 {
		inst, err := x86asm.Decode(code, 64) // 64-bit mode
		if err != nil {
			fmt.Printf("0x%x  (bad) %02x\n", pc, code[0])
			code, pc = code[1:], pc+1
			continue
		}
		// Intel syntax; GNUSyntax/GoSyntax also available.
		fmt.Printf("0x%x  %s\n", pc, x86asm.IntelSyntax(inst, pc, nil))
		code = code[inst.Len:]
		pc += uint64(inst.Len)
	}
}
```

This is the same engine `go tool objdump` builds on.[11] Tradeoff: no full disassembler
features (no CFG, no AT&T-quality detail for every ISA), and ARM/MIPS coverage is narrower than
Capstone.

### 5.2 Capstone via `github.com/bnagy/gapstone`

CGo bindings to the Capstone engine (x86, ARM, AArch64, MIPS, PPC, SPARC, SystemZ).[2-Capstone]
Richer instruction detail (groups, registers read/written, operands) than `x/arch`, at the cost
of a native Capstone install and CGo.

```go
import "github.com/bnagy/gapstone"

engine, err := gapstone.New(gapstone.CS_ARCH_X86, gapstone.CS_MODE_64)
if err != nil { log.Fatal(err) }
defer engine.Close()
engine.SetOption(gapstone.CS_OPT_DETAIL, gapstone.CS_OPT_ON)

insns, _ := engine.Disasm(code, vaddr, 0) // 0 = decode all
for _, in := range insns {
	fmt.Printf("0x%x:\t%s\t\t%s\n", in.Address, in.Mnemonic, in.OpStr)
}
```

### 5.3 Zydis

Zydis is a fast, dependency-free x86/x86-64 decoder (C). Go usage is through CGo bindings
(community wrappers exist; coverage is x86-only but very complete on that ISA). Pick Zydis when
you need maximum x86 decode fidelity/speed and are already comfortable with CGo.

**Rule of thumb:** pure-Go portability -> `x/arch`; multi-arch + rich detail -> `gapstone`;
x86-only max fidelity -> Zydis.

### 5.4 Disassembling a specific function

Resolve the function's start RVA (export table, `gosym.Func.Entry`, or a symbol), map RVA->file
offset (section 2.4), slice that region out of the executable section's bytes, and feed it to
your decoder. Stop at the next function entry or at a terminating `ret`/`int3` run.

---

## 6. Reversing Go binaries themselves

Go malware is common because static linking makes one portable, dependency-free dropper. The
flip side: the runtime leaves recoverable metadata. Tools in this space:

- **GoReSym** (`github.com/mandiant/GoReSym`) -- Mandiant's standalone symbol recovery tool. Built
  on the Go runtime's own parsers so it tracks runtime-struct changes across versions
  automatically. Extracts arch/OS/endianness/compiler version, function start/end addresses and
  names, file+line metadata, and embedded type structures. Outputs JSON you can pipe into IDA,
  Ghidra, or Binary Ninja scripts.[2][4-GoReSym][10]
- **redress** (`github.com/goretk/redress`) and its library **gore** -- "re-dress" a stripped Go
  binary: reconstruct package/function names, types, and build info from `pclntab` and moduledata.
  Pure Go, scriptable, good for CLI triage.[1-redress][5][8-redress]
- **IDAGolangHelper** (`github.com/sibears/IDAGolangHelper`) -- IDA Pro Python scripts that parse
  Go type info embedded in the binary and rename functions inside IDA.[3]

Typical Go-malware triage flow: `debug/buildinfo` to confirm it's Go and grab the version ->
GoReSym/redress to recover function names -> load the renamed symbols into your disassembler ->
`x/arch` or Capstone for instruction-level work on the interesting functions.[2][9]

Background reading: Mandiant's "Golang Internals and Symbol Recovery"[2], Anvil Security's "Digging
Into Go Internals"[10], and the CUJO/Ghidra walkthrough[7-cujo].

---

## 7. Sketch: a `pescan` triage CLI

A single-binary tool that parses a PE, prints headers/imports/exports, flags high-entropy
(packed) sections, and reports native vs managed.

```go
package main

import (
	"debug/pe"
	"fmt"
	"math"
	"os"
)

// shannonEntropy returns bits/byte in [0,8]. ~7.9+ on a section often means packed/encrypted.
func shannonEntropy(b []byte) float64 {
	if len(b) == 0 {
		return 0
	}
	var freq [256]float64
	for _, c := range b {
		freq[c]++
	}
	n := float64(len(b))
	var h float64
	for _, f := range freq {
		if f == 0 {
			continue
		}
		p := f / n
		h -= p * math.Log2(p)
	}
	return h
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: pescan <file>")
		os.Exit(2)
	}
	path := os.Args[1]

	f, err := pe.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "parse: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	// --- Headers ---
	bits := 32
	if _, ok := f.OptionalHeader.(*pe.OptionalHeader64); ok {
		bits = 64
	}
	fmt.Printf("== %s ==\n", path)
	fmt.Printf("Machine: 0x%x  PE%d  DLL=%v\n",
		f.Machine, bits, f.Characteristics&pe.IMAGE_FILE_DLL != 0)

	// --- Managed vs native ---
	if dd, ok := dataDir(f, pe.IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR); ok && dd.VirtualAddress != 0 {
		fmt.Println("Type:    .NET / managed (CLR header present)")
	} else {
		fmt.Println("Type:    native")
	}

	// --- Imports ---
	if syms, err := f.ImportedSymbols(); err == nil {
		fmt.Printf("Imports: %d symbols\n", len(syms))
		for i, s := range syms {
			if i >= 10 {
				fmt.Printf("  ... (%d more)\n", len(syms)-10)
				break
			}
			fmt.Println("  ", s)
		}
	}

	// --- Sections + entropy / packing flag ---
	fmt.Println("Sections:")
	for _, s := range f.Sections {
		data, _ := s.Data()
		ent := shannonEntropy(data)
		flag := ""
		if ent > 7.5 {
			flag = "  <-- HIGH ENTROPY (likely packed/encrypted)"
		}
		fmt.Printf("  %-8s vsize=0x%-6x raw=0x%-6x entropy=%.2f%s\n",
			s.Name, s.VirtualSize, s.Size, ent, flag)
	}
}

func dataDir(f *pe.File, idx int) (pe.DataDirectory, bool) {
	switch oh := f.OptionalHeader.(type) {
	case *pe.OptionalHeader64:
		return oh.DataDirectory[idx], true
	case *pe.OptionalHeader32:
		return oh.DataDirectory[idx], true
	}
	return pe.DataDirectory{}, false
}
```

Design notes:

- **Entropy heuristic.** >7.5 bits/byte across a whole executable section is a classic packer
  signal (UPX, ASPack). Combine with: tiny import table (a few `LoadLibrary`/`GetProcAddress`
  only), section name mismatches (`UPX0`/`UPX1`), and `SizeOfRawData` far smaller than
  `VirtualSize`. No single signal is conclusive -- score them.[7]
- **Hardening.** For untrusted samples, `recover()` around the parse, cap file size, and prefer
  `saferwall/pe` over `debug/pe` for malformation resistance.[1][7]
- **Extending exports.** Add the section 2.4 export walker (or swap to `saferwall/pe` /
  `Binject/debug`) to print the EAT for DLLs.
- **No auth on a scanner** is fine -- it reads local files. If you wrap this in a network service,
  add auth and sandboxing before accepting uploaded binaries.

---

## Sources

- [1] Go `debug/pe` package reference -- https://pkg.go.dev/debug/pe
- [2] Mandiant -- "Ready, Set, Go: Golang Internals and Symbol Recovery" -- https://cloud.google.com/blog/topics/threat-intelligence/golang-internals-symbol-recovery
- [3] sibears/IDAGolangHelper -- https://github.com/sibears/IDAGolangHelper
- [4] Detect .NET via COR20/CorFlags header -- https://en.ittrip.xyz/c-sharp/detect-dotnet-anycpu
- [4-GoReSym] mandiant/GoReSym -- https://pkg.go.dev/github.com/mandiant/GoReSym
- [5] redress (goretk) -- https://github.com/goretk/redress
- [6] Notes/tools for reversing Go binaries (Binject/debug, LIEF) -- https://gist.github.com/0xdevalias/4e430914124c3fd2c51cb7ac2801acba
- [7] saferwall/pe -- https://github.com/saferwall/pe
- [7-cujo] Reverse Engineering Go Binaries with Ghidra -- https://cujo.com/blog/reverse-engineering-go-binaries-with-ghidra/
- [8] redress docs -- https://0x1.gitlab.io/reverse-engineering/Redress/
- [9] Reverse Engineering Go Binaries (stripped symbols) -- https://www.patreon.com/posts/reverse-go-84581629
- [10] Anvil Security -- "Digging Into Go Internals: Low-Level Insights for Reverse Engineers" -- https://www.anvilsecure.com/blog/digging-into-go-internals-low-level-insights-for-reverse-engineers.html
- [11] golang.org/x/arch/x86/x86asm -- https://pkg.go.dev/golang.org/x/arch/x86/x86asm
- [2-Capstone] bnagy/gapstone (Capstone bindings) -- https://github.com/bnagy/gapstone
- PE format spec (Microsoft) -- https://docs.microsoft.com/en-us/windows/win32/debug/pe-format
