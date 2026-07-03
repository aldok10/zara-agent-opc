// escape-analysis — demonstrates stack vs heap allocation decisions.
//
// Run: go build -gcflags='-m' .  (see escape decisions)
// Run: go test -bench=. -benchmem (measure allocation difference)

package main

import "fmt"

// --- Stack allocation: return by value ---

type Point struct {
	X, Y float64
}

// NewPointValue returns by value — stays on caller's stack.
// go build -gcflags='-m' shows: "does not escape"
func NewPointValue() Point {
	return Point{X: 1.0, Y: 2.0}
}

// NewPointPointer returns pointer — escapes to heap.
// go build -gcflags='-m' shows: "escapes to heap"
func NewPointPointer() *Point {
	return &Point{X: 1.0, Y: 2.0}
}

// --- Fixed-size array stays on stack ---

func hashLocal(data []byte) [32]byte {
	var buf [64]byte // stack-allocated — known size at compile time
	copy(buf[:], data)
	// In real code: return sha256.Sum256(buf[:])
	var result [32]byte
	copy(result[:], buf[:32])
	return result
}

// --- Accept buffer from caller (zero-alloc pattern) ---

// EncodeTo writes into caller-provided buffer.
// No allocation inside this function.
func EncodeTo(dst []byte, id int, name string) []byte {
	dst = append(dst, "id="...)
	dst = fmt.Appendf(dst, "%d", id)
	dst = append(dst, ",name="...)
	dst = append(dst, name...)
	return dst
}

// EncodeAlloc allocates internally — escapes.
func EncodeAlloc(id int, name string) string {
	return fmt.Sprintf("id=%d,name=%s", id, name)
}

func main() {
	// Value — no heap allocation
	p1 := NewPointValue()
	fmt.Printf("Value: %+v\n", p1)

	// Pointer — heap allocation
	p2 := NewPointPointer()
	fmt.Printf("Pointer: %+v\n", p2)

	// Buffer reuse pattern
	buf := make([]byte, 0, 256)
	buf = EncodeTo(buf[:0], 42, "alice")
	fmt.Printf("Buffer reuse: %s\n", buf)

	// Internal allocation
	s := EncodeAlloc(42, "alice")
	fmt.Printf("Alloc: %s\n", s)

	// Fixed-size array on stack
	h := hashLocal([]byte("hello"))
	fmt.Printf("Hash: %x\n", h[:8])
}
