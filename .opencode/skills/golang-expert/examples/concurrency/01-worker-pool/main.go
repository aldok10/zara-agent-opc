// worker-pool — demonstrates the Worker Pool concurrency pattern.
//
// This is the most common production concurrency pattern: limit concurrent
// work to N goroutines to control resource usage.
//
// Key stdlib types: sync.WaitGroup, context.Context, chan

package main

import (
	"context"
	"fmt"
	"log"
	"math/rand/v2"
	"runtime"
	"sync"
	"time"
)

// Job represents a unit of work.
type Job struct {
	ID    int
	Delay time.Duration // simulate processing time
}

// Result represents the output of processing a job.
type Result struct {
	JobID int
	Info  string
}

// worker is a single goroutine that processes jobs from the input channel.
// It uses context cancellation for graceful shutdown.
func worker(ctx context.Context, id int, jobs <-chan Job, results chan<- Result) {
	for j := range jobs {
		// Check for cancellation before starting work
		select {
		case <-ctx.Done():
			log.Printf("Worker %d: shutting down (cancelled)", id)
			return
		default:
		}

		log.Printf("Worker %d: processing job #%d (takes %v)", id, j.ID, j.Delay)
		time.Sleep(j.Delay) // simulate work

		// Try to send result, but respect cancellation
		select {
		case results <- Result{JobID: j.ID, Info: fmt.Sprintf("processed by worker %d", id)}:
		case <-ctx.Done():
			return
		}
	}
	log.Printf("Worker %d: all jobs done, exiting", id)
}

func main() {
	// Number of workers = number of CPUs (good default)
	numWorkers := runtime.NumCPU()
	log.Printf("Starting worker pool with %d workers", numWorkers)

	// Context for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Channels
	jobs := make(chan Job, 100)
	results := make(chan Result, 100)

	// Start workers
	var wg sync.WaitGroup
	for range numWorkers {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			worker(ctx, workerID, jobs, results)
		}(wg_val()) // Go 1.22+ — loop var is per-iteration, but this shows the pattern
	}

	// Send jobs (from a separate goroutine so workers can start immediately)
	go func() {
		defer close(jobs)
		for i := range 20 {
			job := Job{
				ID:    i,
				Delay: time.Duration(rand.IntN(500)) * time.Millisecond,
			}
			select {
			case jobs <- job:
			case <-ctx.Done():
				return
			}
		}
	}()

	// Close results when all workers are done
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	for r := range results {
		fmt.Printf("  ✓ Job #%d -> %s\n", r.JobID, r.Info)
	}

	log.Println("All jobs completed!")
}

func wg_val() int {
	_ = sync.WaitGroup{} // import used
	return 0
}
