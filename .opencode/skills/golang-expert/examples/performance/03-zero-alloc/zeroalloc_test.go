package zeroalloc

import "testing"

func BenchmarkFormatRecord(b *testing.B) {
	buf := make([]byte, 0, 256)
	for b.Loop() {
		buf = FormatRecord(buf[:0], 12345, "alice", "active")
	}
}

func BenchmarkFormatRecordSprintf(b *testing.B) {
	for b.Loop() {
		_ = FormatRecordSprintf(12345, "alice", "active")
	}
}

func BenchmarkJoinWithBuilder(b *testing.B) {
	parts := []string{"one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"}
	for b.Loop() {
		_ = JoinWithBuilder(parts, ", ")
	}
}

func BenchmarkJoinNaive(b *testing.B) {
	parts := []string{"one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"}
	for b.Loop() {
		_ = JoinNaive(parts, ", ")
	}
}

func BenchmarkFilterInPlace(b *testing.B) {
	src := make([]int, 1000)
	for i := range src {
		src[i] = i
	}
	keep := func(n int) bool { return n%2 == 0 }

	for b.Loop() {
		items := make([]int, len(src))
		copy(items, src)
		_ = FilterInPlace(items, keep)
	}
}

func BenchmarkFilterAlloc(b *testing.B) {
	src := make([]int, 1000)
	for i := range src {
		src[i] = i
	}
	keep := func(n int) bool { return n%2 == 0 }

	for b.Loop() {
		items := make([]int, len(src))
		copy(items, src)
		_ = FilterAlloc(items, keep)
	}
}
