// fan-in-fan-out — demonstrates the Fan-Out / Fan-In pattern.
//
// Fan-Out: distribute work across multiple goroutines.
// Fan-In: merge multiple result channels into one.
//
// Key stdlib types: sync.WaitGroup, chan (directional)

package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// --- Fan-Out: split input into N streams ---

func fanOut[T any](ctx context.Context, input <-chan T, n int) []<-chan T {
	outputs := make([]<-chan T, n)
	for i := range n {
		ch := make(chan T)
		outputs[i] = ch
		go func(out chan<- T) {
			defer close(out)
			for v := range input {
				select {
				case out <- v:
				case <-ctx.Done():
					return
				}
			}
		}(ch)
	}
	return outputs
}

// --- Fan-In: merge multiple channels into one ---

func fanIn[T any](ctx context.Context, channels ...<-chan T) <-chan T {
	out := make(chan T)
	var wg sync.WaitGroup

	// Start a goroutine for each input channel
	for _, ch := range channels {
		wg.Add(1)
		go func(c <-chan T) {
			defer wg.Done()
			for v := range c {
				select {
				case out <- v:
				case <-ctx.Done():
					return
				}
			}
		}(ch)
	}

	// Close output when all inputs are exhausted
	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

func main() {
	ctx := context.Background()

	// Source channel
	input := make(chan int)
	go func() {
		defer close(input)
		for i := range 10 {
			input <- i
		}
	}()

	// Fan-Out: 3 workers
	outputs := fanOut(ctx, input, 3)

	// Fan-In: merge them back
	results := fanIn(ctx, outputs...)

	// Collect
	seen := 0
	for v := range results {
		fmt.Printf("Got: %d\n", v)
		seen++
	}
	fmt.Printf("Total: %d (expected 10)\n", seen)

	// --- Real-world examples of this pattern ---
	fmt.Println("\n📌 When to use Fan-Out / Fan-In:")
	fmt.Println("  - Fan-Out: parallel HTTP fetches, parallel DB queries, parallel file processing")
	fmt.Println("  - Fan-In:  collecting results from multiple sensors, merging log streams, aggregating search results")
	fmt.Println("\n⏰ Execution time: ~0s (all processing simulated, but done concurrently)")
	_ = time.Second // prevent unused import
}
