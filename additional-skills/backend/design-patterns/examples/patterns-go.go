package patterns

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

// --- Strategy Pattern ---

type Compressor interface {
	Compress(data []byte) ([]byte, error)
}

type GzipCompressor struct{}

func (g GzipCompressor) Compress(data []byte) ([]byte, error) {
	// gzip implementation
	return data, nil
}

type ZstdCompressor struct{ level int }

func (z ZstdCompressor) Compress(data []byte) ([]byte, error) {
	// zstd implementation
	return data, nil
}

type FileProcessor struct {
	compressor Compressor
}

func NewFileProcessor(c Compressor) *FileProcessor {
	return &FileProcessor{compressor: c}
}

func (p *FileProcessor) Process(data []byte) ([]byte, error) {
	return p.compressor.Compress(data)
}

// --- Options Pattern (Functional Options) ---

type Server struct {
	port         int
	readTimeout  time.Duration
	writeTimeout time.Duration
	maxConns     int
}

type ServerOption func(*Server)

func WithPort(port int) ServerOption {
	return func(s *Server) { s.port = port }
}

func WithReadTimeout(d time.Duration) ServerOption {
	return func(s *Server) { s.readTimeout = d }
}

func WithMaxConns(n int) ServerOption {
	return func(s *Server) { s.maxConns = n }
}

func NewServer(opts ...ServerOption) *Server {
	s := &Server{
		port:         8080,
		readTimeout:  30 * time.Second,
		writeTimeout: 30 * time.Second,
		maxConns:     1000,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// --- Result Type (Error Handling Pattern) ---

type Result[T any] struct {
	value T
	err   error
}

func Ok[T any](v T) Result[T]    { return Result[T]{value: v} }
func Err[T any](e error) Result[T] { return Result[T]{err: e} }

func (r Result[T]) Unwrap() (T, error) { return r.value, r.err }
func (r Result[T]) IsOk() bool         { return r.err == nil }

// --- Circuit Breaker ---

type CircuitState int

const (
	CircuitClosed CircuitState = iota
	CircuitOpen
	CircuitHalfOpen
)

type CircuitBreaker struct {
	mu          sync.Mutex
	state       CircuitState
	failures    int
	threshold   int
	timeout     time.Duration
	lastFailure time.Time
}

func NewCircuitBreaker(threshold int, timeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:     CircuitClosed,
		threshold: threshold,
		timeout:   timeout,
	}
}

func (cb *CircuitBreaker) Execute(ctx context.Context, fn func(context.Context) error) error {
	cb.mu.Lock()
	switch cb.state {
	case CircuitOpen:
		if time.Since(cb.lastFailure) > cb.timeout {
			cb.state = CircuitHalfOpen
		} else {
			cb.mu.Unlock()
			return errors.New("circuit open")
		}
	}
	cb.mu.Unlock()

	err := fn(ctx)

	cb.mu.Lock()
	defer cb.mu.Unlock()
	if err != nil {
		cb.failures++
		cb.lastFailure = time.Now()
		if cb.failures >= cb.threshold {
			cb.state = CircuitOpen
		}
		return err
	}
	cb.failures = 0
	cb.state = CircuitClosed
	return nil
}

// --- Iterator (Go-style with channels or callbacks) ---

type Iterator[T any] struct {
	items []T
	index int
}

func NewIterator[T any](items []T) *Iterator[T] {
	return &Iterator[T]{items: items}
}

func (it *Iterator[T]) Next() (T, bool) {
	if it.index >= len(it.items) {
		var zero T
		return zero, false
	}
	item := it.items[it.index]
	it.index++
	return item, true
}

// --- Decorator (Middleware pattern in Go) ---

type Handler func(ctx context.Context, req []byte) ([]byte, error)

func WithLogging(next Handler) Handler {
	return func(ctx context.Context, req []byte) ([]byte, error) {
		start := time.Now()
		resp, err := next(ctx, req)
		fmt.Printf("duration=%s err=%v\n", time.Since(start), err)
		return resp, err
	}
}

func WithRetry(attempts int, next Handler) Handler {
	return func(ctx context.Context, req []byte) ([]byte, error) {
		var lastErr error
		for i := range attempts {
			resp, err := next(ctx, req)
			if err == nil {
				return resp, nil
			}
			lastErr = err
			time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
		}
		return nil, fmt.Errorf("failed after %d attempts: %w", attempts, lastErr)
	}
}
