// Command dllscan performs fast reverse-engineering triage of a PE/DLL file:
// headers, sections with per-section entropy, imports, exports (manually parsed
// from the export directory), .NET detection, and a capability heuristic.
//
// Usage:
//
//	dllscan [-json] [-max-exports N] <file>
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"text/tabwriter"

	"dllscan/internal/peinfo"
)

func main() {
	jsonOut := flag.Bool("json", false, "emit JSON instead of a human-readable report")
	maxExports := flag.Int("max-exports", 40, "max exports to print in human mode (0 = all)")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "usage: dllscan [-json] [-max-exports N] <file>\n")
		flag.PrintDefaults()
	}
	flag.Parse()

	if flag.NArg() != 1 {
		flag.Usage()
		os.Exit(2)
	}

	info, err := peinfo.Analyze(flag.Arg(0))
	if err != nil {
		fmt.Fprintf(os.Stderr, "dllscan: %v\n", err)
		os.Exit(1)
	}

	if *jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if err := enc.Encode(info); err != nil {
			fmt.Fprintf(os.Stderr, "dllscan: encode: %v\n", err)
			os.Exit(1)
		}
		return
	}

	printReport(info, *maxExports)
}

func printReport(info *peinfo.Info, maxExports int) {
	fmt.Printf("== dllscan: %s ==\n\n", info.Path)

	kind := "native"
	if info.IsManaged {
		kind = ".NET (managed)"
	}
	dll := "no"
	if info.IsDLL {
		dll = "yes"
	}
	packed := "no"
	if info.LikelyPacked {
		packed = "YES — high overall entropy"
	}

	fmt.Printf("size            %d bytes\n", info.Size)
	fmt.Printf("md5             %s\n", info.MD5)
	fmt.Printf("sha256          %s\n", info.SHA256)
	fmt.Printf("machine         %s\n", info.Machine)
	fmt.Printf("bitness         %s\n", info.Bitness)
	fmt.Printf("is DLL          %s\n", dll)
	fmt.Printf("type            %s\n", kind)
	fmt.Printf("subsystem       %s\n", info.Subsystem)
	fmt.Printf("timestamp       0x%08x\n", info.TimeStamp)
	fmt.Printf("image base      0x%x\n", info.ImageBase)
	fmt.Printf("entry point     0x%x (RVA)\n", info.EntryPoint)
	fmt.Printf("overall entropy %.3f bits/byte\n", info.OverallEntropy)
	fmt.Printf("likely packed   %s\n", packed)
	fmt.Printf("exports         %d\n", info.ExportCount)
	fmt.Printf("imports         %d symbols across %d libraries\n\n", info.ImportCount, len(info.Imports))

	// Sections
	fmt.Println("-- sections --")
	tw := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(tw, "NAME\tVSIZE\tVADDR\tRAWSIZE\tENTROPY\tFLAG")
	for _, s := range info.Sections {
		flag := ""
		if s.Packed {
			flag = "packed?"
		}
		fmt.Fprintf(tw, "%s\t0x%x\t0x%x\t0x%x\t%.3f\t%s\n",
			s.Name, s.VirtualSize, s.VirtualAddr, s.RawSize, s.Entropy, flag)
	}
	tw.Flush()

	// Imports
	fmt.Println("\n-- imported libraries --")
	libs := make([]string, 0, len(info.Imports))
	for l := range info.Imports {
		libs = append(libs, l)
	}
	sort.Strings(libs)
	for _, l := range libs {
		fmt.Printf("  %s (%d symbols)\n", l, len(info.Imports[l]))
	}

	// Capabilities
	if len(info.Capabilities) > 0 {
		fmt.Println("\n-- capability profile --")
		for _, c := range info.Capabilities {
			fmt.Printf("  [%s] %s (%d)\n", c.Category, c.Desc, len(c.Hits))
		}
	}

	// Exports
	if info.ExportCount > 0 {
		limit := info.ExportCount
		if maxExports > 0 && maxExports < limit {
			limit = maxExports
		}
		fmt.Printf("\n-- exports (showing %d of %d) --\n", limit, info.ExportCount)
		for i, e := range info.Exports {
			if i >= limit {
				fmt.Printf("  ... (%d more)\n", info.ExportCount-limit)
				break
			}
			name := e.Name
			if name == "" {
				name = fmt.Sprintf("(ordinal-only #%d)", e.Ordinal)
			}
			switch {
			case e.Forwarder != "":
				fmt.Printf("  #%-5d %s -> %s (forwarded)\n", e.Ordinal, name, e.Forwarder)
			default:
				fmt.Printf("  #%-5d %s @ RVA 0x%x\n", e.Ordinal, name, e.RVA)
			}
		}
	}
}
