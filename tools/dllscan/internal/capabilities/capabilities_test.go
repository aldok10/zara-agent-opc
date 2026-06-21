package capabilities

import "testing"

func TestClassify(t *testing.T) {
	syms := []string{
		"WSAStartup", "connect", "recv", // networking
		"CryptEncrypt", "CryptDecrypt", // crypto
		"VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread", // injection
		"IsDebuggerPresent",          // anti-debug
		"CreateFileW", "ReadFile",     // filesystem
		"RegOpenKeyExW",               // registry
		"SomeUnrelatedExport",         // nothing
	}

	res := Classify(syms)
	byName := map[string][]string{}
	for _, r := range res {
		byName[r.Category] = r.Hits
	}

	cases := map[string]int{
		"networking":        3,
		"crypto":            2,
		"process-injection": 3,
		"anti-debug":        1,
		"filesystem":        2,
		"registry":          1,
	}
	for cat, want := range cases {
		got, ok := byName[cat]
		if !ok {
			t.Errorf("expected category %q to be present", cat)
			continue
		}
		if len(got) != want {
			t.Errorf("category %q: got %d hits %v, want %d", cat, len(got), got, want)
		}
	}

	if _, ok := byName["service-persistence"]; ok {
		// RegOpenKeyExW shouldn't trigger persistence (only RegSetValueEx does)
		t.Error("did not expect service-persistence from this input")
	}
}

func TestClassifyEmpty(t *testing.T) {
	if got := Classify(nil); len(got) != 0 {
		t.Errorf("Classify(nil) = %v, want empty", got)
	}
}

func TestClassifyCaseInsensitive(t *testing.T) {
	res := Classify([]string{"isdebuggerpresent"})
	if len(res) != 1 || res[0].Category != "anti-debug" {
		t.Errorf("lowercase match failed: %v", res)
	}
}
