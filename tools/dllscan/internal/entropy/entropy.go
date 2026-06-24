// Package entropy computes Shannon entropy over byte streams, used to flag
// packed or encrypted sections of a binary (entropy approaching 8.0 bits/byte
// indicates high randomness, typical of compression or encryption).
package entropy

import "math"

// Shannon returns the Shannon entropy of data in bits per byte, in [0, 8].
// Empty input returns 0.
func Shannon(data []byte) float64 {
	if len(data) == 0 {
		return 0
	}

	var counts [256]int
	for _, b := range data {
		counts[b]++
	}

	n := float64(len(data))
	var h float64
	for _, c := range counts {
		if c == 0 {
			continue
		}
		p := float64(c) / n
		h -= p * math.Log2(p)
	}
	return h
}

// Packed reports whether an entropy value crosses the heuristic threshold that
// suggests compressed or encrypted content. 7.0 is the conventional cutoff.
func Packed(h float64) bool {
	return h > 7.0
}
