# Go Tooling for Reverse Engineering

A reference for building RE helpers in Go: parsing PE/ELF/Mach-O, walking imports/exports,
detecting .NET/packing, disassembling code, and recovering symbols from stripped Go malware.

Go is a strong fit for RE tooling. The stdlib ships native parsers for every major executable
format, builds static single-binary tools that run anywhere, and the same `debug/*` packages
the Go runtime uses are exposed for your own analysis. Where the stdlib stops (no export
directory parser, no disassembler core), mature third-party libs fill the gap.

---

## 1. Standard library: the `debug/*` family

| Package | Purpose |
|---------|---------|
| `debug/pe` | Windows PE/PE32+ (EXE, DLL, SYS, .obj). Headers, sections, imports, COFF symbols. |
| `debug/elf` | Linux/BSD ELF. Sections, dynamic symbols, relocations. |
| `debug/macho` | macOS Mach-O (incl. fat/universal binaries). |
| `debug/dwarf` | DWARF debug info (line tables, types) from any of the above via `.DWARF()`. |
| `debug/gosym` | Go symbol table + line table (`pclntab`) — recover Go function names. |
| `debug/buildinfo` | Read embedded Go build metadata (module path, version, settings) from a binary. |
| `encoding/binary` | Fixed-endian struct (un)marshalling — the workhorse for parsing raw headers. |

The PE package documents a hard caveat worth repeating in any malware tool: *"This package is
not designed to be hardened against adversarial inputs."* Malformed PEs can panic or burn CPU,
so wrap parsing in `recover()` and resource limits, or reach for `saferwall/pe` (section 4),
which was purpose-built to survive PE malformations.[1][7]

---

## 2. `debug/pe` in practice

### 2.1 Open a DLL and read headers

```go
package main

import (
	"debug/pe"
	"fmt"
	"log"
)

func main() {
	f, err := pe.Open("kernel32.dll")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	// FileHeader is embedded directly in *pe.File.
	fmt.Printf("Machine:          0x%x\n", f.Machine)
	fmt.Printf("NumberOfSections: %d\n", f.NumberOfSections)
	fmt.Printf("Characteristics:  0x%x\n", f.Characteristics)

	isDLL := f.Characteristics&pe.IMAGE_FILE_DLL != 0
	fmt.Printf("Is DLL:           %v\n", isDLL)

	// OptionalHeader is `any`: *OptionalHeader32 (PE32) or *OptionalHeader64 (PE32+).
	switch oh := f.OptionalHeader.(type) {
	case *pe.OptionalHeader64:
		fmt.Printf("PE32+ entrypoint: 0x%x\n", oh.AddressOfEntryPoint)
		fmt.Printf("ImageBase:        0x%x\n", oh.ImageBase)
	case *pe.OptionalHeader32:
		fmt.Printf("PE32 entrypoint:  0x%x\n", oh.AddressOfEntryPoint)
		fmt.Printf("ImageBase:        0x%x\n", oh.ImageBase)
	}
}
```

`f.Machine` maps to constants like `IMAGE_FILE_MACHINE_AMD64` (0x8664), `_I386` (0x14c),
`_ARM64` (0xaa64).[1]

### 2.2 List imported libraries and symbols

The stdlib gives you ready helpers; no manual IAT walking needed.

```go
libs, err := f.ImportedLibraries() // ["KERNEL32.dll", "msvcrt.dll", ...]
if err != nil {
	log.Fatal(err)
}
for _, lib := range libs {
	fmt.Println("DLL:", lib)
}

syms, err := f.ImportedSymbols() // ["KERNEL32.dll:CreateFileW", ...]
if err != nil {
	log.Fatal(err)
}
for _, s := range syms {
	fmt.Println("import:", s)
}
```

`ImportedSymbols` returns `Library.dll:Symbol` strings and skips weak symbols.[1]

### 2.3 Read sections

```go
for _, s := range f.Sections {
	fmt.Printf("%-8s VA=0x%-8x VSize=0x%-6x RawSize=0x%-6x flags=0x%x\n",
		s.Name, s.VirtualAddress, s.VirtualSize, s.Size, s.Characteristics)

	exec := s.Characteristics&pe.IMAGE_SCN_MEM_EXECUTE != 0
	if exec {
		data, err := s.Data() // raw bytes of the section
		if err != nil {
			log.Printf("read %s: %v", s.Name, err)
			continue
		}
		_ = data // feed to entropy calc or disassembler
	}
}
```

`Section.Data()` returns the raw on-disk bytes; `Section.Open()` gives an `io.ReadSeeker` if you
prefer streaming. A zero `Offset` means the section has no file backing (e.g. `.bss`).[1]

### 2.4 Walk the Export Directory (manual — stdlib has no helper)

`debug/pe` exposes imports but **not** exports. You parse the export directory yourself from
`DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT]` (index 0).[1][7][10]

```go
import "encoding/binary"

type imageExportDirectory struct {
	Characteristics       uint32
	TimeDateStamp         uint32
	MajorVersion          uint16
	MinorVersion          uint16
	Name                  uint32
	Base                  uint32
	NumberOfFunctions     uint32
	NumberOfNames         uint32
	AddressOfFunctions    uint32 // RVA -> []uint32 EAT
	AddressOfNames        uint32 // RVA -> []uint32 name RVAs
	AddressOfNameOrdinals uint32 // RVA -> []uint16
}

// rvaToOffset converts a virtual address to a file offset using section maps.
func rvaToOffset(f *pe.File, rva uint32) (uint32, bool) {
	for _, s := range f.Sections {
		if rva >= s.VirtualAddress && rva < s.VirtualAddress+s.VirtualSize {
			return rva - s.VirtualAddress + s.Offset, true
		}
	}
	return 0, false
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

func listExports(f *pe.File, raw []byte) ([]string, error) {
	dd, ok := dataDir(f, pe.IMAGE_DIRECTORY_ENTRY_EXPORT)
	if !ok || dd.VirtualAddress == 0 {
		return nil, nil // no exports (typical for an EXE)
	}
	off, ok := rvaToOffset(f, dd.VirtualAddress)
	if !ok {
		return nil, fmt.Errorf("export RVA 0x%x not mapped", dd.VirtualAddress)
	}

	var ed imageExportDirectory
	if err := binary.Read(bytesReaderAt(raw, off), binary.LittleEndian, &ed); err != nil {
		return nil, err
	}

	namesOff, _ := rvaToOffset(f, ed.AddressOfNames)
	out := make([]string, 0, ed.NumberOfNames)
	for i := uint32(0); i < ed.NumberOfNames; i++ {
		nameRVA := binary.LittleEndian.Uint32(raw[namesOff+i*4:])
		nameOff, _ := rvaToOffset(f, nameRVA)
		out = append(out, readCString(raw, nameOff))
	}
	return out, nil
}
```

Helpers `bytesReaderAt` (a `bytes.NewReader` over `raw[off:]`) and `readCString`
(scan to NUL) are trivial. Read the whole file into `raw` once with `os.ReadFile` so RVA→offset
math has a flat buffer to index.

### 2.5 Detect .NET / managed assemblies

The COM descriptor lives in `DataDirectory[14]` (`IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR`). A
non-zero entry means the binary carries a CLR header and is a managed (.NET) image.[1][4][6]

```go
func isDotNet(f *pe.File) bool {
	dd, ok := dataDir(f, pe.IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR) // index 14
	return ok && dd.VirtualAddress != 0 && dd.Size != 0
}
```

For deeper classification (ILONLY, 32BITREQUIRED, 32BITPREFERRED) parse the `IMAGE_COR20_HEADER`
the directory points at and read its `Flags` (CorFlags) field — same approach the .NET CorFlags
tool uses.[4] `saferwall/pe` exposes all of this as `pe.CLR` without hand-rolling it.[7]

---

## 3. ELF, Mach-O, build info, and Go symbols

### 3.1 ELF imports/exports

```go
import "debug/elf"

f, _ := elf.Open("/bin/ls")
defer f.Close()

libs, _ := f.ImportedLibraries()       // DT_NEEDED shared objects
syms, _ := f.ImportedSymbols()          // undefined dynamic symbols
dyn, _ := f.DynamicSymbols()            // exported + imported dynsyms
for _, s := range dyn {
	fmt.Printf("%s bind=%v type=%v\n", s.Name, elf.ST_BIND(s.Info), elf.ST_TYPE(s.Info))
}
```

### 3.2 Mach-O (handle fat binaries)

```go
import "debug/macho"

// Single-arch:
m, _ := macho.Open("/bin/ls")
// Universal/fat:
fat, err := macho.OpenFat("/bin/ls")
if err == nil {
	for _, arch := range fat.Arches {
		fmt.Println(arch.Cpu, arch.ImportedLibraries())
	}
}
_ = m
```

### 3.3 `debug/buildinfo` — fingerprint Go binaries instantly

```go
import "debug/buildinfo"

bi, err := buildinfo.ReadFile("suspicious.exe")
if err == nil {
	fmt.Println("Go version:", bi.GoVersion) // e.g. go1.22.3
	fmt.Println("Module:     ", bi.Path)
	for _, s := range bi.Settings {           // -ldflags, vcs.revision, GOOS, etc.
		fmt.Printf("  %s = %s\n", s.Key, s.Value)
	}
}
```

A successful read is itself a strong signal: *the sample is a Go binary*. Malware authors strip
symbols but rarely strip the build info blob, so this is your first triage step for suspected Go
malware.[9]

### 3.4 `debug/gosym` — recover Go function names

`pclntab` (the Go program counter/line table) survives `-ldflags="-s -w"` stripping because the
runtime needs it for stack traces. That makes it the backbone of Go symbol recovery.[2][9]

```go
import (
	"debug/elf"
	"debug/gosym"
)

f, _ := elf.Open("gobin")
text := f.Section(".text")
pclntab := f.Section(".gopclntab")          // or located via runtime.pclntab symbol

pcln, _ := pclntab.Data()
lt := gosym.NewLineTable(pcln, text.Addr)
tab, _ := gosym.NewTable(nil, lt)

for _, fn := range tab.Funcs {
	fmt.Printf("0x%x  %s\n", fn.Entry, fn.Name) // main.main, etc.
}
```

In practice the locations of `.gopclntab` vary across Go versions and platforms (PE vs ELF vs
Mach-O), which is exactly why `GoReSym` (section 5) exists — it reimplements this robustly.[2]

---

## 4. Third-party PE/binary libraries

### 4.1 `github.com/saferwall/pe` — the malware-grade PE parser

The most complete Go PE parser, hardened against malformations and used by the Fibratus kernel
tracer.[7] It covers everything `debug/pe` omits: export table, rich header, resources, TLS,
load config, delay imports, CLR/.NET metadata tables, Authentihash, ImpHash, and per-section
entropy.

```go
import peparser "github.com/saferwall/pe"

p, err := peparser.New("notepad.exe", &peparser.Options{})
if err != nil { log.Fatal(err) }
if err := p.Parse(); err != nil { log.Fatal(err) }

fmt.Printf("Machine: %s\n", p.NtHeader.FileHeader.Machine.String())

for _, imp := range p.Imports {                 // full import table
	for _, fn := range imp.Functions {
		fmt.Printf("%s!%s\n", imp.Name, fn.Name)
	}
}
for _, exp := range p.Export.Functions {         // export table — built in
	fmt.Printf("export %s @ 0x%x\n", exp.Name, exp.FunctionRVA)
}

imphash, _ := p.ImpHash()                         // classic malware clustering hash
fmt.Println("ImpHash:", imphash)

if p.FileInfo.IsDotNet {                           // managed detection done for you
	fmt.Println(".NET assembly, CLR runtime ver:", p.CLR.MetadataHeader.Version)
}
```

The `RichHeader` field exposes the XOR key, decoded `CompIDs`, and a raw blob you can hash for
toolchain fingerprinting and sample clustering.[7][8] Each `Section` offers entropy via the
package's helpers, so you do not have to compute Shannon entropy yourself for packing checks.

### 4.2 `github.com/Binject/debug`

A drop-in fork of the stdlib `debug/pe`, `debug/elf`, `debug/macho` with **write** support and
an actual export-directory parser. Useful when you need to add/modify imports, rebuild a binary,
or list exports without the manual RVA dance from section 2.4. API mirrors the stdlib so porting
is mostly changing the import path.[6]

### 4.3 LIEF Go bindings

[LIEF](https://lief.re) is a cross-format (PE/ELF/Mach-O) parse-and-**rebuild** library. Its
primary APIs are C++/Python; Go usage is via CGo bindings over the C API. Reach for it when you
need format-agnostic modification (inject sections, rewrite imports) across all three formats
with one API, and you can accept a CGo dependency.[6]

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

**Rule of thumb:** pure-Go portability → `x/arch`; multi-arch + rich detail → `gapstone`;
x86-only max fidelity → Zydis.

### 5.4 Disassembling a specific function

Resolve the function's start RVA (export table, `gosym.Func.Entry`, or a symbol), map RVA→file
offset (section 2.4), slice that region out of the executable section's bytes, and feed it to
your decoder. Stop at the next function entry or at a terminating `ret`/`int3` run.

---

## 6. Reversing Go binaries themselves

Go malware is common because static linking makes one portable, dependency-free dropper. The
flip side: the runtime leaves recoverable metadata. Tools in this space:

- **GoReSym** (`github.com/mandiant/GoReSym`) — Mandiant's standalone symbol recovery tool. Built
  on the Go runtime's own parsers so it tracks runtime-struct changes across versions
  automatically. Extracts arch/OS/endianness/compiler version, function start/end addresses and
  names, file+line metadata, and embedded type structures. Outputs JSON you can pipe into IDA,
  Ghidra, or Binary Ninja scripts.[2][4-GoReSym][10]
- **redress** (`github.com/goretk/redress`) and its library **gore** — "re-dress" a stripped Go
  binary: reconstruct package/function names, types, and build info from `pclntab` and moduledata.
  Pure Go, scriptable, good for CLI triage.[1-redress][5][8-redress]
- **IDAGolangHelper** (`github.com/sibears/IDAGolangHelper`) — IDA Pro Python scripts that parse
  Go type info embedded in the binary and rename functions inside IDA.[3]

Typical Go-malware triage flow: `debug/buildinfo` to confirm it's Go and grab the version →
GoReSym/redress to recover function names → load the renamed symbols into your disassembler →
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
  `VirtualSize`. No single signal is conclusive — score them.[7]
- **Hardening.** For untrusted samples, `recover()` around the parse, cap file size, and prefer
  `saferwall/pe` over `debug/pe` for malformation resistance.[1][7]
- **Extending exports.** Add the section 2.4 export walker (or swap to `saferwall/pe` /
  `Binject/debug`) to print the EAT for DLLs.
- **No auth on a scanner** is fine — it reads local files. If you wrap this in a network service,
  add auth and sandboxing before accepting uploaded binaries.

---

## Sources

- [1] Go `debug/pe` package reference — https://pkg.go.dev/debug/pe
- [2] Mandiant — "Ready, Set, Go: Golang Internals and Symbol Recovery" — https://cloud.google.com/blog/topics/threat-intelligence/golang-internals-symbol-recovery
- [3] sibears/IDAGolangHelper — https://github.com/sibears/IDAGolangHelper
- [4] Detect .NET via COR20/CorFlags header — https://en.ittrip.xyz/c-sharp/detect-dotnet-anycpu
- [4-GoReSym] mandiant/GoReSym — https://pkg.go.dev/github.com/mandiant/GoReSym
- [5] redress (goretk) — https://github.com/goretk/redress
- [6] Notes/tools for reversing Go binaries (Binject/debug, LIEF) — https://gist.github.com/0xdevalias/4e430914124c3fd2c51cb7ac2801acba
- [7] saferwall/pe — https://github.com/saferwall/pe
- [7-cujo] Reverse Engineering Go Binaries with Ghidra — https://cujo.com/blog/reverse-engineering-go-binaries-with-ghidra/
- [8] redress docs — https://0x1.gitlab.io/reverse-engineering/Redress/
- [9] Reverse Engineering Go Binaries (stripped symbols) — https://www.patreon.com/posts/reverse-go-84581629
- [10] Anvil Security — "Digging Into Go Internals: Low-Level Insights for Reverse Engineers" — https://www.anvilsecure.com/blog/digging-into-go-internals-low-level-insights-for-reverse-engineers.html
- [11] golang.org/x/arch/x86/x86asm — https://pkg.go.dev/golang.org/x/arch/x86/x86asm
- [2-Capstone] bnagy/gapstone (Capstone bindings) — https://github.com/bnagy/gapstone
- PE format spec (Microsoft) — https://docs.microsoft.com/en-us/windows/win32/debug/pe-format
