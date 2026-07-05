// Generic worker pool with context cancellation and error propagation.
// Uses errgroup for lifecycle management.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

// Job represents a unit of work.
type Job[T any] struct {
	ID      string
	Payload T
}

// Result holds the output of processing a job.
type Result[T, R any] struct {
	JobID  string
	Output R
	Err    error
}

// WorkerPool processes jobs with bounded concurrency.
type WorkerPool[T, R any] struct {
	workers int
	process func(ctx context.Context, payload T) (R, error)
	logger  *slog.Logger
}

// NewWorkerPool creates a pool with the given worker count and processing function.
func NewWorkerPool[T, R any](workers int, fn func(ctx context.Context, payload T) (R, error), logger *slog.Logger) *WorkerPool[T, R] {
	if workers <= 0 {
		workers = 1
	}
	return &WorkerPool[T, R]{
		workers: workers,
		process: fn,
		logger:  logger,
	}
}

// Run processes all jobs with bounded concurrency. Returns results for all jobs.
// First error cancels remaining work if failFast is true.
func (p *WorkerPool[T, R]) Run(ctx context.Context, jobs []Job[T], failFast bool) []Result[T, R] {
	results := make([]Result[T, R], len(jobs))
	var mu sync.Mutex // protects results slice only if needed for safety

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(p.workers)

	for i, job := range jobs {
		g.Go(func() error {
			select {
			case <-ctx.Done():
				mu.Lock()
				results[i] = Result[T, R]{JobID: job.ID, Err: ctx.Err()}
				mu.Unlock()
				return ctx.Err()
			default:
			}

			output, err := p.process(ctx, job.Payload)
			mu.Lock()
			results[i] = Result[T, R]{JobID: job.ID, Output: output, Err: err}
			mu.Unlock()

			if err != nil {
				p.logger.Warn("job failed", "job_id", job.ID, "error", err)
				if failFast {
					return err // cancels context via errgroup
				}
			}
			return nil
		})
	}

	_ = g.Wait() // errors captured in results
	return results
}

// --- Example usage ---

func main() {
	logger := slog.Default()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Define processing function
	processFn := func(ctx context.Context, url string) (int, error) {
		// Simulate HTTP fetch with context respect
		select {
		case <-ctx.Done():
			return 0, ctx.Err()
		case <-time.After(100 * time.Millisecond):
			if url == "https://fail.example.com" {
				return 0, errors.New("connection refused")
			}
			return 200, nil
		}
	}

	pool := NewWorkerPool[string, int](5, processFn, logger)

	jobs := []Job[string]{
		{ID: "1", Payload: "https://example.com/api/a"},
		{ID: "2", Payload: "https://example.com/api/b"},
		{ID: "3", Payload: "https://fail.example.com"},
		{ID: "4", Payload: "https://example.com/api/d"},
	}

	results := pool.Run(ctx, jobs, false) // failFast=false: process all

	for _, r := range results {
		if r.Err != nil {
			fmt.Printf("Job %s: ERROR: %v\n", r.JobID, r.Err)
		} else {
			fmt.Printf("Job %s: OK (status=%d)\n", r.JobID, r.Output)
		}
	}
}
