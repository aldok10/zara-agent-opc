# Go Standard Library: debug/* Family & debug/pe in Practice

TL;DR: Go's stdlib PE/ELF/Mach-O parsers, import/export listing, section reading, .NET detection, and manual export directory walking.
See also: `go-elf-macho-thirdparty.md`, `go-disasm-reversing-pescan.md`

---

## 1. Standard library: the `debug/*` family

| Package | Purpose |
|---------|---------|
| `debug/pe` | Windows PE/PE32+ (EXE, DLL, SYS, .obj). Headers, sections, imports, COFF symbols. |
| `debug/elf` | Linux/BSD ELF. Sections, dynamic symbols, relocations. |
| `debug/macho` | macOS Mach-O (incl. fat/universal binaries). |
| `debug/dwarf` | DWARF debug info (line tables, types) from any of the above via `.DWARF()`. |
| `debug/gosym` | Go symbol table + line table (`pclntab`) -- recover Go function names. |
| `debug/buildinfo` | Read embedded Go build metadata (module path, version, settings) from a binary. |
| `encoding/binary` | Fixed-endian struct (un)marshalling -- the workhorse for parsing raw headers. |

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

### 2.4 Walk the Export Directory (manual -- stdlib has no helper)

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
(scan to NUL) are trivial. Read the whole file into `raw` once with `os.ReadFile` so RVA->offset
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
the directory points at and read its `Flags` (CorFlags) field -- same approach the .NET CorFlags
tool uses.[4] `saferwall/pe` exposes all of this as `pe.CLR` without hand-rolling it.[7]
