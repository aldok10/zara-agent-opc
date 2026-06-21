package sum

// Sum returns the sum of two integers.
func Sum(a, b int) int {
	return a + b
}

// SumSlice returns the sum of all elements in a slice.
func SumSlice(nums []int) int {
	total := 0
	for _, n := range nums {
		total += n
	}
	return total
}

// Divide performs integer division.
func Divide(a, b int) (int, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}
