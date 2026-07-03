package main

import "testing"

// BenchmarkNewPointValue — 0 allocs/op (stack)
func BenchmarkNewPointValue(b *testing.B) {
	for b.Loop() {
		p := NewPointValue()
		_ = p
	}
}

// BenchmarkNewPointPointer — 1 allocs/op (heap)
func BenchmarkNewPointPointer(b *testing.B) {
	for b.Loop() {
		p := NewPointPointer()
		_ = p
	}
}

// BenchmarkEncodeTo — 0 allocs/op (buffer reuse)
func BenchmarkEncodeTo(b *testing.B) {
	buf := make([]byte, 0, 256)
	for b.Loop() {
		buf = EncodeTo(buf[:0], 42, "alice")
	}
}

// BenchmarkEncodeAlloc — 1+ allocs/op (fmt.Sprintf)
func BenchmarkEncodeAlloc(b *testing.B) {
	for b.Loop() {
		_ = EncodeAlloc(42, "alice")
	}
}
