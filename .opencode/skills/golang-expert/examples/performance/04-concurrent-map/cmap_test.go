package cmap

import (
	"fmt"
	"strconv"
	"testing"
)

const numKeys = 1000

func prepareKeys(n int) []string {
	keys := make([]string, n)
	for i := range keys {
		keys[i] = "key-" + strconv.Itoa(i)
	}
	return keys
}

// --- Read-heavy benchmarks (95% read, 5% write) ---

func BenchmarkMutexMap_ReadHeavy(b *testing.B) {
	m := NewMutexMap()
	keys := prepareKeys(numKeys)
	for i, k := range keys {
		m.Set(k, i)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			if i%20 == 0 { // 5% writes
				m.Set(keys[i%numKeys], i)
			} else {
				m.Get(keys[i%numKeys])
			}
			i++
		}
	})
}

func BenchmarkSyncMap_ReadHeavy(b *testing.B) {
	m := NewSyncMap()
	keys := prepareKeys(numKeys)
	for i, k := range keys {
		m.Set(k, i)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			if i%20 == 0 {
				m.Set(keys[i%numKeys], i)
			} else {
				m.Get(keys[i%numKeys])
			}
			i++
		}
	})
}

func BenchmarkShardedMap_ReadHeavy(b *testing.B) {
	m := NewShardedMap()
	keys := prepareKeys(numKeys)
	for i, k := range keys {
		m.Set(k, i)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			if i%20 == 0 {
				m.Set(keys[i%numKeys], i)
			} else {
				m.Get(keys[i%numKeys])
			}
			i++
		}
	})
}

// --- Write-heavy benchmarks (50% read, 50% write) ---

func BenchmarkMutexMap_WriteHeavy(b *testing.B) {
	m := NewMutexMap()
	keys := prepareKeys(numKeys)

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			key := keys[i%numKeys]
			if i%2 == 0 {
				m.Set(key, i)
			} else {
				m.Get(key)
			}
			i++
		}
	})
}

func BenchmarkSyncMap_WriteHeavy(b *testing.B) {
	m := NewSyncMap()
	keys := prepareKeys(numKeys)

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			key := keys[i%numKeys]
			if i%2 == 0 {
				m.Set(key, i)
			} else {
				m.Get(key)
			}
			i++
		}
	})
}

func BenchmarkShardedMap_WriteHeavy(b *testing.B) {
	m := NewShardedMap()
	keys := prepareKeys(numKeys)

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			key := keys[i%numKeys]
			if i%2 == 0 {
				m.Set(key, i)
			} else {
				m.Get(key)
			}
			i++
		}
	})
}

func Example() {
	m := NewShardedMap()
	m.Set("hello", 42)
	v, ok := m.Get("hello")
	fmt.Printf("value=%d, ok=%t\n", v, ok)
	// Output: value=42, ok=true
}
