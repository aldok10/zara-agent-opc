// Table-driven tests — the idiomatic Go testing pattern.
//
// Run: go test -v -race -count=1 .
// Run benchmarks: go test -bench=. -benchmem .

package sum

import (
	"errors"
	"fmt"
	"testing"
)

// --- Table-Driven Unit Test ---

func TestSum(t *testing.T) {
	tests := []struct {
		name string
		a, b int
		want int
	}{
		{name: "positive numbers", a: 2, b: 3, want: 5},
		{name: "negative numbers", a: -2, b: -3, want: -5},
		{name: "zero values", a: 0, b: 0, want: 0},
		{name: "mixed signs", a: -2, b: 3, want: 1},
		{name: "large numbers", a: 1_000_000, b: 2_000_000, want: 3_000_000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Sum(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("Sum(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

// --- With error cases ---

func TestDivide(t *testing.T) {
	tests := []struct {
		name    string
		a, b    int
		want    int
		wantErr error
	}{
		{name: "simple division", a: 10, b: 2, want: 5},
		{name: "division by zero", a: 10, b: 0, wantErr: ErrDivisionByZero},
		{name: "negative division", a: -6, b: 3, want: -2},
		{name: "divide one", a: 7, b: 1, want: 7},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Divide(tt.a, tt.b)

			// Check error first
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Divide(%d, %d) error = %v; wantErr %v", tt.a, tt.b, err, tt.wantErr)
				return
			}

			// If we expected no error, check the value
			if tt.wantErr == nil && got != tt.want {
				t.Errorf("Divide(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

// --- Parallel Table-Driven Test ---
// Note the `tt := tt` capture — important for Go < 1.22, optional in 1.22+

func TestSumSlice(t *testing.T) {
	tests := []struct {
		name string
		nums []int
		want int
	}{
		{name: "empty slice", nums: []int{}, want: 0},
		{name: "single element", nums: []int{42}, want: 42},
		{name: "multiple elements", nums: []int{1, 2, 3, 4, 5}, want: 15},
		{name: "with negatives", nums: []int{-1, 0, 1}, want: 0},
	}

	for _, tt := range tests {
		tt := tt // capture for parallel subtests (still good practice even in Go 1.22+)
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := SumSlice(tt.nums)
			if got != tt.want {
				t.Errorf("SumSlice(%v) = %d; want %d", tt.nums, got, tt.want)
			}
		})
	}
}

// --- Benchmark with B.Loop (Go 1.24+) ---

func BenchmarkSum(b *testing.B) {
	for b.Loop() {
		Sum(100, 200)
	}
}

// --- Benchmark with B.N (pre-Go 1.24 style) ---

func BenchmarkSumSlice(b *testing.B) {
	nums := make([]int, 1000)
	for i := range nums {
		nums[i] = i
	}
	b.ResetTimer()

	for b.Loop() {
		SumSlice(nums)
	}
}

// --- Example test (also generates documentation!) ---

func ExampleSum() {
	fmt.Println(Sum(2, 3))
	// Output: 5
}
