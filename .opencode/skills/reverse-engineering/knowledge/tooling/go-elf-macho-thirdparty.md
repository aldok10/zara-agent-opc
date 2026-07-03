# Go ELF/Mach-O/Build Info, Go Symbols & Third-Party PE Libraries

TL;DR: ELF/Mach-O parsing, Go binary fingerprinting via buildinfo/gosym, and third-party libraries (saferwall/pe, Binject/debug, LIEF).
See also: `go-stdlib-debug-pe.md`, `go-disasm-reversing-pescan.md`

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

### 3.3 `debug/buildinfo` -- fingerprint Go binaries instantly

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

### 3.4 `debug/gosym` -- recover Go function names

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
Mach-O), which is exactly why `GoReSym` (section 5) exists -- it reimplements this robustly.[2]

---

## 4. Third-party PE/binary libraries

### 4.1 `github.com/saferwall/pe` -- the malware-grade PE parser

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
for _, exp := range p.Export.Functions {         // export table -- built in
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
