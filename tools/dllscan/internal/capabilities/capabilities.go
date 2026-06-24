// Package capabilities classifies imported symbol names into behavioral
// categories, giving a fast read on what a binary is able to do (networking,
// crypto, registry, process injection, filesystem, anti-debug) without running
// it. Matching is substring-based and case-insensitive against well-known
// Windows API name fragments.
package capabilities

import (
	"sort"
	"strings"
)

// Category names a behavioral group of APIs.
type Category struct {
	Name     string
	Desc     string
	patterns []string
}

// catalog is the ordered set of categories and the API name fragments that
// signal each. Fragments are matched case-insensitively as substrings.
var catalog = []Category{
	{"networking", "socket / HTTP / DNS activity", []string{
		"wsastartup", "socket", "connect", "send", "recv", "wsasend", "wsarecv",
		"gethostby", "getaddrinfo", "inet_", "winhttp", "internetopen", "httpopen",
		"httpsend", "urldownload", "ws2_32", "wininet",
	}},
	{"crypto", "encryption / hashing / key handling", []string{
		"crypt", "bcrypt", "ncrypt", "cryptacquire", "cryptencrypt", "cryptdecrypt",
		"crypthashdata", "cryptgenkey", "cryptderivekey", "certopen", "ssl", "schannel",
	}},
	{"registry", "Windows registry access", []string{
		"regopen", "regcreate", "regset", "regget", "regquery", "regdelete",
		"regclose", "regenum",
	}},
	{"process-injection", "process/thread manipulation (injection hallmarks)", []string{
		"virtualalloc", "virtualallocex", "writeprocessmemory", "readprocessmemory",
		"createremotethread", "ntcreatethread", "queueuserapc", "setthreadcontext",
		"openprocess", "resumethread", "createprocess", "loadlibrary", "getprocaddress",
		"ntmapviewofsection", "rtlcreateuserthread",
	}},
	{"filesystem", "file and directory I/O", []string{
		"createfile", "readfile", "writefile", "deletefile", "movefile", "copyfile",
		"findfirstfile", "findnextfile", "createdirectory", "gettemppath", "setfilepointer",
	}},
	{"anti-debug", "debugger / analysis detection", []string{
		"isdebuggerpresent", "checkremotedebugger", "ntqueryinformationprocess",
		"outputdebugstring", "ntsetinformationthread", "gettickcount", "queryperformancecounter",
		"rdtsc", "ntglobalflag",
	}},
	{"service-persistence", "services / autostart persistence", []string{
		"createservice", "openscmanager", "startservice", "changeserviceconfig",
		"regsetvalueex", "schtasks",
	}},
}

// Result is a matched category plus the import names that triggered it.
type Result struct {
	Category string   `json:"category"`
	Desc     string   `json:"description"`
	Hits     []string `json:"hits"`
}

// Classify groups the given imported symbol names into capability categories.
// Each returned Result lists the deduplicated, sorted symbol names that matched.
// Categories with no hits are omitted.
func Classify(symbols []string) []Result {
	lowered := make([]string, len(symbols))
	for i, s := range symbols {
		lowered[i] = strings.ToLower(s)
	}

	var out []Result
	for _, cat := range catalog {
		seen := map[string]struct{}{}
		for i, low := range lowered {
			for _, p := range cat.patterns {
				if strings.Contains(low, p) {
					seen[symbols[i]] = struct{}{}
					break
				}
			}
		}
		if len(seen) == 0 {
			continue
		}
		hits := make([]string, 0, len(seen))
		for h := range seen {
			hits = append(hits, h)
		}
		sort.Strings(hits)
		out = append(out, Result{Category: cat.Name, Desc: cat.Desc, Hits: hits})
	}
	return out
}
