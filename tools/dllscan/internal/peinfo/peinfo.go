// Package peinfo extracts reverse-engineering triage data from a PE/DLL file
// using only the Go standard library (debug/pe). It covers the pieces debug/pe
// does not surface directly: a manual walk of the Export Directory (data
// directory index 0) and detection of a managed (.NET) image via the CLR
// runtime header (data directory index 14).
package peinfo

import (
	"crypto/md5"
	"crypto/sha256"
	"debug/pe"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"sort"

	"dllscan/internal/capabilities"
	"dllscan/internal/entropy"
)

// Data-directory indices we care about (IMAGE_DIRECTORY_ENTRY_*).
const (
	dirExport = 0  // export table
	dirCLR    = 14 // CLR runtime header (.NET)
)

const fileDLL = 0x2000 // IMAGE_FILE_DLL characteristic

// Section is one PE section plus its computed entropy.
type Section struct {
	Name       string  `json:"name"`
	VirtualSize uint32 `json:"virtual_size"`
	VirtualAddr uint32 `json:"virtual_address"`
	RawSize    uint32  `json:"raw_size"`
	Entropy    float64 `json:"entropy"`
	Packed     bool    `json:"likely_packed"`
}

// Export is one entry from the Export Address Table.
type Export struct {
	Name      string `json:"name"`      // empty for ordinal-only exports
	Ordinal   uint32 `json:"ordinal"`   // biased by the export directory base
	RVA       uint32 `json:"rva"`       // function RVA (0 for forwarders)
	Forwarder string `json:"forwarder,omitempty"` // "DLL.Func" when forwarded
}

// Info is the full triage result for one binary.
type Info struct {
	Path          string                 `json:"path"`
	Size          int64                  `json:"size"`
	MD5           string                 `json:"md5"`
	SHA256        string                 `json:"sha256"`
	Machine       string                 `json:"machine"`
	Bitness       string                 `json:"bitness"` // PE32 or PE32+
	IsDLL         bool                   `json:"is_dll"`
	Subsystem     string                 `json:"subsystem"`
	TimeStamp     uint32                 `json:"timestamp"`
	EntryPoint    uint32                 `json:"entry_point_rva"`
	ImageBase     uint64                 `json:"image_base"`
	IsManaged     bool                   `json:"is_dotnet"`
	OverallEntropy float64               `json:"overall_entropy"`
	LikelyPacked  bool                   `json:"likely_packed"`
	Sections      []Section              `json:"sections"`
	Imports       map[string][]string    `json:"imports"` // dll -> symbols
	ImportCount   int                    `json:"import_count"`
	Exports       []Export               `json:"exports"`
	ExportCount   int                    `json:"export_count"`
	Capabilities  []capabilities.Result  `json:"capabilities"`
}

// Analyze opens the file at path and extracts triage information.
func Analyze(path string) (*Info, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}

	f, err := pe.Open(path)
	if err != nil {
		return nil, fmt.Errorf("parse PE: %w", err)
	}
	defer f.Close()

	info := &Info{
		Path:           path,
		Size:           int64(len(raw)),
		MD5:            fmt.Sprintf("%x", md5.Sum(raw)),
		SHA256:         fmt.Sprintf("%x", sha256.Sum256(raw)),
		Machine:        machineString(f.Machine),
		IsDLL:          f.Characteristics&fileDLL != 0,
		TimeStamp:      f.FileHeader.TimeDateStamp,
		OverallEntropy: entropy.Shannon(raw),
		Imports:        map[string][]string{},
	}
	info.LikelyPacked = entropy.Packed(info.OverallEntropy)

	dirs, err := info.readOptionalHeader(f)
	if err != nil {
		return nil, err
	}

	info.fillSections(f)
	info.fillImports(f)

	if d := dataDir(dirs, dirExport); d != nil && d.VirtualAddress != 0 {
		exports, err := parseExports(f, d.VirtualAddress, d.Size)
		if err == nil {
			info.Exports = exports
			info.ExportCount = len(exports)
		}
	}

	if d := dataDir(dirs, dirCLR); d != nil && d.VirtualAddress != 0 {
		info.IsManaged = true
	}

	// capability profile from all imported symbols
	var allSyms []string
	for _, syms := range info.Imports {
		allSyms = append(allSyms, syms...)
	}
	info.Capabilities = capabilities.Classify(allSyms)

	return info, nil
}

// readOptionalHeader reads bitness, subsystem, entry point, image base, and the
// data directory slice, handling both PE32 and PE32+ optional headers.
func (info *Info) readOptionalHeader(f *pe.File) ([]pe.DataDirectory, error) {
	switch oh := f.OptionalHeader.(type) {
	case *pe.OptionalHeader32:
		info.Bitness = "PE32"
		info.Subsystem = subsystemString(oh.Subsystem)
		info.EntryPoint = oh.AddressOfEntryPoint
		info.ImageBase = uint64(oh.ImageBase)
		return oh.DataDirectory[:], nil
	case *pe.OptionalHeader64:
		info.Bitness = "PE32+"
		info.Subsystem = subsystemString(oh.Subsystem)
		info.EntryPoint = oh.AddressOfEntryPoint
		info.ImageBase = oh.ImageBase
		return oh.DataDirectory[:], nil
	default:
		return nil, fmt.Errorf("unsupported or missing optional header")
	}
}

func (info *Info) fillSections(f *pe.File) {
	for _, s := range f.Sections {
		sec := Section{
			Name:        s.Name,
			VirtualSize: s.VirtualSize,
			VirtualAddr: s.VirtualAddress,
			RawSize:     s.Size,
		}
		if data, err := s.Data(); err == nil && len(data) > 0 {
			sec.Entropy = entropy.Shannon(data)
			sec.Packed = entropy.Packed(sec.Entropy)
		}
		info.Sections = append(info.Sections, sec)
	}
}

func (info *Info) fillImports(f *pe.File) {
	libs, err := f.ImportedLibraries()
	if err == nil {
		for _, l := range libs {
			info.Imports[l] = nil
		}
	}
	// ImportedSymbols returns "Symbol:DLL" strings; group them by DLL.
	syms, err := f.ImportedSymbols()
	if err != nil {
		return
	}
	for _, s := range syms {
		name, dll := splitSymbol(s)
		info.Imports[dll] = append(info.Imports[dll], name)
		info.ImportCount++
	}
	for dll := range info.Imports {
		sort.Strings(info.Imports[dll])
	}
}

// parseExports manually walks the Export Directory at the given RVA. debug/pe
// resolves the section containing the RVA, then reads the directory structure:
//
//	+0x0c  Name RVA
//	+0x10  OrdinalBase
//	+0x14  NumberOfFunctions  (EAT size)
//	+0x18  NumberOfNames       (ENT size)
//	+0x1c  AddressOfFunctions  (EAT RVA)
//	+0x20  AddressOfNames      (ENT RVA)
//	+0x24  AddressOfNameOrdinals (ordinal table RVA)
//
// Forwarded exports point inside the export directory range and are read as a
// "DLL.Function" string instead of code.
func parseExports(f *pe.File, dirRVA, dirSize uint32) ([]Export, error) {
	hdr, err := readAtRVA(f, dirRVA, 0x28)
	if err != nil {
		return nil, err
	}
	ordinalBase := binary.LittleEndian.Uint32(hdr[0x10:])
	numFuncs := binary.LittleEndian.Uint32(hdr[0x14:])
	numNames := binary.LittleEndian.Uint32(hdr[0x18:])
	eatRVA := binary.LittleEndian.Uint32(hdr[0x1c:])
	entRVA := binary.LittleEndian.Uint32(hdr[0x20:])
	ordRVA := binary.LittleEndian.Uint32(hdr[0x24:])

	if numFuncs == 0 || numFuncs > 1_000_000 {
		return nil, fmt.Errorf("implausible export count %d", numFuncs)
	}

	eat, err := readAtRVA(f, eatRVA, numFuncs*4)
	if err != nil {
		return nil, fmt.Errorf("read EAT: %w", err)
	}

	// Map function index -> name (for the subset that is named).
	names := make(map[uint32]string, numNames)
	if numNames > 0 && numNames < 1_000_000 {
		ent, err1 := readAtRVA(f, entRVA, numNames*4)
		ord, err2 := readAtRVA(f, ordRVA, numNames*2)
		if err1 == nil && err2 == nil {
			for i := uint32(0); i < numNames; i++ {
				nameRVA := binary.LittleEndian.Uint32(ent[i*4:])
				idx := uint32(binary.LittleEndian.Uint16(ord[i*2:]))
				if s, err := readStringAtRVA(f, nameRVA); err == nil {
					names[idx] = s
				}
			}
		}
	}

	dirStart, dirEnd := dirRVA, dirRVA+dirSize
	exports := make([]Export, 0, numFuncs)
	for i := uint32(0); i < numFuncs; i++ {
		fnRVA := binary.LittleEndian.Uint32(eat[i*4:])
		if fnRVA == 0 {
			continue // unused ordinal slot
		}
		e := Export{
			Name:    names[i],
			Ordinal: ordinalBase + i,
			RVA:     fnRVA,
		}
		// Forwarder: RVA falls within the export directory itself.
		if fnRVA >= dirStart && fnRVA < dirEnd {
			if s, err := readStringAtRVA(f, fnRVA); err == nil {
				e.Forwarder = s
				e.RVA = 0
			}
		}
		exports = append(exports, e)
	}

	sort.Slice(exports, func(a, b int) bool { return exports[a].Ordinal < exports[b].Ordinal })
	return exports, nil
}

// readAtRVA reads n bytes starting at the given RVA by locating the containing
// section and translating to a file offset.
func readAtRVA(f *pe.File, rva, n uint32) ([]byte, error) {
	for _, s := range f.Sections {
		if rva >= s.VirtualAddress && rva < s.VirtualAddress+max32(s.VirtualSize, s.Size) {
			off := rva - s.VirtualAddress
			data, err := s.Data()
			if err != nil {
				return nil, err
			}
			if off+n > uint32(len(data)) {
				return nil, fmt.Errorf("rva 0x%x len %d out of section %q", rva, n, s.Name)
			}
			return data[off : off+n], nil
		}
	}
	return nil, fmt.Errorf("rva 0x%x not in any section", rva)
}

// readStringAtRVA reads a NUL-terminated ASCII string at the given RVA.
func readStringAtRVA(f *pe.File, rva uint32) (string, error) {
	for _, s := range f.Sections {
		if rva >= s.VirtualAddress && rva < s.VirtualAddress+max32(s.VirtualSize, s.Size) {
			data, err := s.Data()
			if err != nil {
				return "", err
			}
			off := rva - s.VirtualAddress
			if off >= uint32(len(data)) {
				return "", io.ErrUnexpectedEOF
			}
			buf := data[off:]
			for i := 0; i < len(buf); i++ {
				if buf[i] == 0 {
					return string(buf[:i]), nil
				}
			}
			return string(buf), nil
		}
	}
	return "", fmt.Errorf("string rva 0x%x not in any section", rva)
}

func dataDir(dirs []pe.DataDirectory, idx int) *pe.DataDirectory {
	if idx < 0 || idx >= len(dirs) {
		return nil
	}
	return &dirs[idx]
}

func splitSymbol(s string) (name, dll string) {
	// format is "Symbol:DLL"
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] == ':' {
			return s[:i], s[i+1:]
		}
	}
	return s, "?"
}

func max32(a, b uint32) uint32 {
	if a > b {
		return a
	}
	return b
}

func machineString(m uint16) string {
	switch m {
	case pe.IMAGE_FILE_MACHINE_I386:
		return "x86 (i386)"
	case pe.IMAGE_FILE_MACHINE_AMD64:
		return "x64 (amd64)"
	case pe.IMAGE_FILE_MACHINE_ARM64:
		return "arm64"
	case pe.IMAGE_FILE_MACHINE_ARMNT:
		return "arm (thumb-2)"
	default:
		return fmt.Sprintf("unknown (0x%04x)", m)
	}
}

func subsystemString(s uint16) string {
	switch s {
	case 1:
		return "native"
	case 2:
		return "Windows GUI"
	case 3:
		return "Windows CUI (console)"
	case 9:
		return "Windows CE GUI"
	default:
		return fmt.Sprintf("subsystem %d", s)
	}
}
