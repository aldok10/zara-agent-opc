// slices-maps-iterators — demonstrates generic slices, maps packages (Go 1.21+)
// and iterators (Go 1.23+).
//
// These packages eliminate the need for most custom slice/map manipulation code.
//
// Key types: slices.*, maps.*, iter.Seq, iter.Seq2 (Go 1.23+)

package main

import (
	"fmt"
	"maps"
	"slices"
)

func main() {
	// --- slices package (Go 1.21+) ---

	// slices.BinarySearch
	nums := []int{1, 3, 5, 7, 9, 11}
	idx, found := slices.BinarySearch(nums, 7)
	fmt.Printf("1. BinarySearch for 7: idx=%d, found=%t\n", idx, found)

	// slices.Compact — remove adjacent duplicates
	data := []int{1, 1, 2, 2, 2, 3, 3, 4}
	data = slices.Compact(data)
	fmt.Printf("2. Compact: %v\n", data)

	// slices.Clone — deep copy (shallow for reference elements)
	original := []string{"a", "b", "c"}
	clone := slices.Clone(original)
	clone[0] = "x"
	fmt.Printf("3. Clone: original=%v, clone=%v (independent)\n", original, clone)

	// slices.Contains
	fmt.Printf("4. Contains 'b': %t\n", slices.Contains(original, "b"))

	// slices.Delete — remove elements by range
	items := []int{0, 1, 2, 3, 4, 5}
	items = slices.Delete(items, 2, 4) // delete indices [2,4)
	fmt.Printf("5. Delete [2,4): %v\n", items)

	// slices.Equal
	fmt.Printf("6. Equal [1,2] == [1,2]: %t\n",
		slices.Equal([]int{1, 2}, []int{1, 2}))

	// slices.Index / slices.IndexFunc
	fmt.Printf("7. Index of 3: %d\n", slices.Index([]int{10, 20, 30, 40}, 30))
	idx = slices.IndexFunc([]string{"go", "rust", "zig"}, func(s string) bool {
		return len(s) == 3
	})
	fmt.Printf("8. IndexFunc (len=3): %d\n", idx)

	// slices.Insert
	items2 := []int{1, 2, 3}
	items2 = slices.Insert(items2, 1, 10, 20)
	fmt.Printf("9. Insert: %v\n", items2)

	// slices.Max / slices.Min
	fmt.Printf("10. Max: %d, Min: %d\n",
		slices.Max([]int{3, 7, 1, 9, 4}),
		slices.Min([]int{3, 7, 1, 9, 4}))

	// slices.Replace
	items3 := []int{1, 2, 3, 4, 5}
	slices.Replace(items3, 1, 3, 99, 100) // replace [1,3) with 99,100
	fmt.Printf("11. Replace: %v\n", items3)

	// slices.Sort / slices.SortFunc / slices.SortStableFunc
	unsorted := []int{4, 2, 7, 1, 9}
	slices.Sort(unsorted)
	fmt.Printf("12. Sort: %v\n", unsorted)

	// Sort by custom function
	words := []string{"banana", "apple", "cherry", "date"}
	slices.SortFunc(words, func(a, b string) int {
		if len(a) < len(b) {
			return -1
		}
		if len(a) > len(b) {
			return 1
		}
		return 0
	})
	fmt.Printf("13. SortFunc (by length): %v\n", words)

	// --- maps package (Go 1.21+) ---

	// maps.Clone
	m := map[string]int{"a": 1, "b": 2}
	m2 := maps.Clone(m)
	m2["c"] = 3
	fmt.Printf("14. maps.Clone: original=%v, clone=%v\n", m, m2)

	// maps.Copy — copy all keys from src to dst
	dst := map[string]int{"x": 10}
	maps.Copy(dst, map[string]int{"y": 20, "z": 30})
	fmt.Printf("15. maps.Copy: %v\n", dst)

	// maps.DeleteFunc — delete entries matching predicate
	m3 := map[string]int{"a": 1, "b": 2, "c": 3, "d": 4}
	maps.DeleteFunc(m3, func(k string, v int) bool { return v%2 == 0 })
	fmt.Printf("16. maps.DeleteFunc (odd only): %v\n", m3)

	// maps.Keys / maps.Values (returns slices, order is non-deterministic)
	m4 := map[string]int{"go": 1, "rust": 2, "zig": 3}
	keys := slices.Sorted(maps.Keys(m4)) // sort for deterministic output
	vals := maps.Values(m4)
	fmt.Printf("17. maps.Keys (sorted): %v\n", keys)
	_ = vals

	// maps.Equal
	fmt.Printf("18. maps.Equal: %t\n",
		maps.Equal(map[string]int{"a": 1}, map[string]int{"a": 1}))

	// --- iterators (Go 1.23+) ---

	// slices.All — iterate with index
	fmt.Println("\n19. slices.All:")
	for i, v := range slices.All([]string{"a", "b", "c"}) {
		fmt.Printf("   [%d] = %s\n", i, v)
	}

	// Manual reverse iteration (slices.Reverse + slices.All)
	// Note: slices.Backwards() is available in golang.org/x/exp/slices
	fmt.Println("20. Reverse iteration (manual):")
	rev := slices.Clone([]string{"a", "b", "c"})
	slices.Reverse(rev)
	for i, v := range slices.All(rev) {
		fmt.Printf("   [%d] = %s\n", i, v)
	}

	// slices.Collect — collect iterator into slice
	even := slices.Collect(func(yield func(int) bool) {
		for i := 0; i < 10; i++ {
			if i%2 == 0 && !yield(i) {
				return
			}
		}
	})
	fmt.Printf("21. slices.Collect (evens): %v\n", even)

	// slices.Sorted — sort values from an iterator
	unsortedIter := slices.Values([]int{3, 1, 4, 1, 5, 9})
	sorted := slices.Sorted(unsortedIter)
	fmt.Printf("22. slices.Sorted: %v\n", sorted)

	// maps.All — iterate over map
	fmt.Println("23. maps.All:")
	for k, v := range maps.All(map[string]int{"x": 1, "y": 2, "z": 3}) {
		fmt.Printf("   %s = %d\n", k, v)
	}

	// maps.Keys as iterator + collect
	keys2 := slices.Collect(maps.Keys(map[string]int{"a": 1, "b": 2}))
	fmt.Printf("24. maps.Keys collected: %v\n", keys2)

	// Chunk — split into groups (Go 1.23+)
	fmt.Println("25. slices.Chunk (groups of 3):")
	for chunk := range slices.Chunk([]int{1, 2, 3, 4, 5, 6, 7}, 3) {
		fmt.Printf("   %v\n", chunk)
	}
}
