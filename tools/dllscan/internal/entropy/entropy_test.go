package entropy

import "testing"

func TestShannon(t *testing.T) {
	tests := []struct {
		name string
		in   []byte
		want float64 // exact where deterministic
	}{
		{"empty", nil, 0},
		{"single byte repeated", []byte{0x41, 0x41, 0x41, 0x41}, 0},
		{"two symbols equal", []byte{0, 1}, 1.0},
		{"four symbols uniform", []byte{0, 1, 2, 3}, 2.0},
		{"all 256 uniform", allBytes(), 8.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Shannon(tt.in)
			if diff := got - tt.want; diff > 1e-9 || diff < -1e-9 {
				t.Fatalf("Shannon() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPacked(t *testing.T) {
	if Packed(6.5) {
		t.Error("6.5 should not be flagged packed")
	}
	if !Packed(7.5) {
		t.Error("7.5 should be flagged packed")
	}
	// boundary: 7.0 is not > 7.0
	if Packed(7.0) {
		t.Error("7.0 should not be flagged packed (strict >)")
	}
}

func allBytes() []byte {
	b := make([]byte, 256)
	for i := range b {
		b[i] = byte(i)
	}
	return b
}
