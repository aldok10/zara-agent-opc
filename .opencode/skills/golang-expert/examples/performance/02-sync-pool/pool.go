// sync-pool — demonstrates correct sync.Pool usage with benchmarks.
//
// Run: go test -bench=. -benchmem -count=5
//
// sync.Pool reduces allocation pressure by reusing temporary objects.
// Key rules:
//   - Always Reset before Put
//   - Pool is drained every GC — not a cache
//   - Don't pool objects < 256 bytes unless proven beneficial
//   - Don't store objects with external references (file handles, connections)

package pool

import (
	"bytes"
	"sync"
)

// --- Correct: pool bytes.Buffer ---

var bufPool = sync.Pool{
	New: func() any {
		return &bytes.Buffer{}
	},
}

// ProcessWithPool reuses buffers from pool — 0 allocs on hot path.
func ProcessWithPool(data []byte) []byte {
	buf := bufPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset() // CRITICAL: reset before returning
		bufPool.Put(buf)
	}()

	buf.Write(data)
	buf.WriteString("-processed")
	// Copy out because buffer will be reused
	result := make([]byte, buf.Len())
	copy(result, buf.Bytes())
	return result
}

// ProcessWithoutPool allocates a new buffer every call.
func ProcessWithoutPool(data []byte) []byte {
	buf := &bytes.Buffer{}
	buf.Write(data)
	buf.WriteString("-processed")
	result := make([]byte, buf.Len())
	copy(result, buf.Bytes())
	return result
}

// --- Tiered pool pattern (fasthttp-style) ---

var (
	smallPool = sync.Pool{New: func() any { b := make([]byte, 0, 1024); return &b }}
	largePool = sync.Pool{New: func() any { b := make([]byte, 0, 65536); return &b }}
)

// GetBuffer returns a pooled buffer of appropriate size.
func GetBuffer(size int) *[]byte {
	if size <= 1024 {
		return smallPool.Get().(*[]byte)
	}
	if size <= 65536 {
		return largePool.Get().(*[]byte)
	}
	// Don't pool very large buffers — they waste memory
	b := make([]byte, 0, size)
	return &b
}

// PutBuffer returns buffer to appropriate pool.
func PutBuffer(bp *[]byte) {
	cap := cap(*bp)
	*bp = (*bp)[:0]
	switch {
	case cap <= 1024:
		smallPool.Put(bp)
	case cap <= 65536:
		largePool.Put(bp)
	// > 65536: don't pool, let GC collect
	}
}
