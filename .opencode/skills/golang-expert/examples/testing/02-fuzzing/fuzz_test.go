package fuzz

import (
	"testing"
	"unicode/utf8"
)

// FuzzParse runs fuzzing on ParseEmail.
// The fuzzer automatically generates inputs to find crashes/panics.
//
// Run: go test -fuzz=FuzzParse -fuzztime=15s
func FuzzParse(f *testing.F) {
	// Seed corpus — known good inputs
	f.Add("user@example.com")
	f.Add("a@b")
	f.Add("test@test.co.uk")

	f.Fuzz(func(t *testing.T, input string) {
		local, domain, err := ParseEmail(input)

		if err != nil {
			// If error, ensure no partial results
			if local != "" || domain != "" {
				t.Errorf("ParseEmail(%q) err=%v but got local=%q domain=%q", input, err, local, domain)
			}
			return
		}

		// If no error, ensure results are valid
		if local == "" || domain == "" {
			t.Errorf("ParseEmail(%q) returned no error but local=%q domain=%q", input, local, domain)
		}

		// Property: local@domain should be in the input
		expected := local + "@" + domain
		if len(expected) > len(input) {
			t.Errorf("ParseEmail(%q) produced %q which is longer than input", input, expected)
		}
	})
}

// FuzzReverse runs fuzzing on Reverse.
// The invariant: reversing a string twice should give the original.
//
// Run: go test -fuzz=FuzzReverse -fuzztime=15s
func FuzzReverse(f *testing.F) {
	f.Add("hello")
	f.Add("world")
	f.Add("gopher")
	f.Add("Go 1.26")
	f.Add("你好世界") // Chinese characters

	f.Fuzz(func(t *testing.T, s string) {
		// Property: Reverse twice = original
		rev1, err1 := Reverse(s)
		if err1 != nil {
			return // skip invalid inputs
		}

		rev2, err2 := Reverse(rev1)
		if err2 != nil {
			t.Errorf("Reverse(Reverse(%q)) produced invalid result: %v", s, err2)
		}

		// Verify UTF-8 validity
		if !utf8.ValidString(rev1) {
			t.Errorf("Reverse(%q) = %q is not valid UTF-8", s, rev1)
		}

		if rev2 != s {
			t.Errorf("Reverse(Reverse(%q)) = %q, want %q", s, rev2, s)
		}
	})
}
