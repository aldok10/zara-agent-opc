// fuzzing — demonstrates Go's built-in fuzzing (Go 1.18+).
//
// Run: go test -fuzz=FuzzParse -fuzztime=15s -v
// Run: go test -fuzz=FuzzReverse -fuzztime=15s

package fuzz

import (
	"errors"
	"unicode/utf8"
)

// ParseEmail is a simple email parser (for demonstration).
// A real parser would be more complex, but this shows how fuzzing
// finds edge cases automatically.
func ParseEmail(input string) (local, domain string, err error) {
	if len(input) == 0 {
		return "", "", errors.New("empty input")
	}

	for i, r := range input {
		if r == '@' {
			local = input[:i]
			domain = input[i+1:]
			if local == "" || domain == "" {
				return "", "", errors.New("empty local or domain")
			}
			return local, domain, nil
		}
	}
	return "", "", errors.New("no @ found")
}

// Reverse reverses a string, handling UTF-8 properly.
// This is a deliberately buggy implementation to demonstrate fuzzing.
func Reverse(s string) (string, error) {
	if !utf8.ValidString(s) {
		return s, errors.New("input is not valid UTF-8")
	}
	r := []rune(s)
	for i, j := 0, len(r)-1; i < len(r)/2; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r), nil
}
