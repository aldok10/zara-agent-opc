// zero-alloc — demonstrates zero-allocation patterns for hot paths.
//
// Run: go test -bench=. -benchmem
//
// These patterns eliminate heap allocations in performance-critical code.
// Use ONLY on measured hot paths — don't apply everywhere (YAGNI).

package zeroalloc

import (
	"strconv"
	"strings"
)

// --- Pattern 1: Append-style API (like strconv.AppendInt) ---

// FormatRecord builds a record string with zero allocations
// by appending to a caller-provided buffer.
func FormatRecord(dst []byte, id int64, name, status string) []byte {
	dst = append(dst, `{"id":`...)
	dst = strconv.AppendInt(dst, id, 10)
	dst = append(dst, `,"name":"`...)
	dst = append(dst, name...)
	dst = append(dst, `","status":"`...)
	dst = append(dst, status...)
	dst = append(dst, `"}`...)
	return dst
}

// FormatRecordSprintf uses fmt.Sprintf — allocates.
func FormatRecordSprintf(id int64, name, status string) string {
	return `{"id":` + strconv.FormatInt(id, 10) + `,"name":"` + name + `","status":"` + status + `"}`
}

// --- Pattern 2: strings.Builder with Grow ---

// JoinWithBuilder pre-allocates exact size — single allocation.
func JoinWithBuilder(parts []string, sep string) string {
	if len(parts) == 0 {
		return ""
	}
	// Calculate total size
	n := len(sep) * (len(parts) - 1)
	for _, s := range parts {
		n += len(s)
	}
	var b strings.Builder
	b.Grow(n) // ONE allocation
	b.WriteString(parts[0])
	for _, s := range parts[1:] {
		b.WriteString(sep)
		b.WriteString(s)
	}
	return b.String()
}

// JoinNaive concatenates with + operator — O(n) allocations.
func JoinNaive(parts []string, sep string) string {
	result := ""
	for i, s := range parts {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}

// --- Pattern 3: Slice reuse ---

// FilterInPlace reuses the input slice's backing array — zero allocation.
func FilterInPlace(items []int, keep func(int) bool) []int {
	result := items[:0] // reuse backing array
	for _, item := range items {
		if keep(item) {
			result = append(result, item)
		}
	}
	return result
}

// FilterAlloc always creates a new slice — allocates.
func FilterAlloc(items []int, keep func(int) bool) []int {
	var result []int
	for _, item := range items {
		if keep(item) {
			result = append(result, item)
		}
	}
	return result
}
