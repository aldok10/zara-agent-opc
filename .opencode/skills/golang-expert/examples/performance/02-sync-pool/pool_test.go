package pool

import "testing"

var testData = []byte("hello world this is test data for benchmarking pool performance")

func BenchmarkProcessWithPool(b *testing.B) {
	for b.Loop() {
		_ = ProcessWithPool(testData)
	}
}

func BenchmarkProcessWithoutPool(b *testing.B) {
	for b.Loop() {
		_ = ProcessWithoutPool(testData)
	}
}

func BenchmarkGetPutSmallBuffer(b *testing.B) {
	for b.Loop() {
		bp := GetBuffer(512)
		*bp = append(*bp, testData...)
		PutBuffer(bp)
	}
}

func BenchmarkAllocSmallBuffer(b *testing.B) {
	for b.Loop() {
		buf := make([]byte, 0, 1024)
		buf = append(buf, testData...)
		_ = buf
	}
}
