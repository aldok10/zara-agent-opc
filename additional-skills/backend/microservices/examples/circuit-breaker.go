package circuitbreaker

import (
	"errors"
	"sync"
	"time"
)

// State represents the circuit breaker state.
type State int

const (
	StateClosed   State = iota // Normal operation, requests flow through
	StateOpen                  // Failing fast, no requests to downstream
	StateHalfOpen              // Testing recovery with limited requests
)

var (
	ErrCircuitOpen = errors.New("circuit breaker is open")
	ErrTooManyReqs = errors.New("too many requests in half-open state")
)

// Config holds circuit breaker configuration.
type Config struct {
	FailureThreshold int           // Failures before opening (default: 5)
	SuccessThreshold int           // Successes in half-open to close (default: 2)
	OpenDuration     time.Duration // How long to stay open (default: 30s)
}

// CircuitBreaker implements the circuit breaker pattern.
type CircuitBreaker struct {
	mu           sync.Mutex
	state        State
	failureCount int
	successCount int
	lastFailure  time.Time
	config       Config
}

// New creates a circuit breaker with the given configuration.
func New(cfg Config) *CircuitBreaker {
	if cfg.FailureThreshold <= 0 {
		cfg.FailureThreshold = 5
	}
	if cfg.SuccessThreshold <= 0 {
		cfg.SuccessThreshold = 2
	}
	if cfg.OpenDuration <= 0 {
		cfg.OpenDuration = 30 * time.Second
	}
	return &CircuitBreaker{
		state:  StateClosed,
		config: cfg,
	}
}

// Execute runs the given function through the circuit breaker.
// Returns ErrCircuitOpen if the circuit is open.
func (cb *CircuitBreaker) Execute(fn func() error) error {
	if err := cb.beforeRequest(); err != nil {
		return err
	}

	err := fn()
	cb.afterRequest(err)
	return err
}

// State returns the current circuit breaker state.
func (cb *CircuitBreaker) State() State {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	// Check if open circuit should transition to half-open
	if cb.state == StateOpen && time.Since(cb.lastFailure) > cb.config.OpenDuration {
		cb.state = StateHalfOpen
		cb.successCount = 0
	}
	return cb.state
}

func (cb *CircuitBreaker) beforeRequest() error {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case StateClosed:
		return nil
	case StateOpen:
		// Check if timeout has elapsed
		if time.Since(cb.lastFailure) > cb.config.OpenDuration {
			cb.state = StateHalfOpen
			cb.successCount = 0
			return nil
		}
		return ErrCircuitOpen
	case StateHalfOpen:
		// Allow limited requests to probe recovery
		return nil
	default:
		return ErrCircuitOpen
	}
}

func (cb *CircuitBreaker) afterRequest(err error) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.onFailure()
		return
	}
	cb.onSuccess()
}

func (cb *CircuitBreaker) onSuccess() {
	switch cb.state {
	case StateClosed:
		cb.failureCount = 0
	case StateHalfOpen:
		cb.successCount++
		if cb.successCount >= cb.config.SuccessThreshold {
			cb.state = StateClosed
			cb.failureCount = 0
			cb.successCount = 0
		}
	}
}

func (cb *CircuitBreaker) onFailure() {
	switch cb.state {
	case StateClosed:
		cb.failureCount++
		cb.lastFailure = time.Now()
		if cb.failureCount >= cb.config.FailureThreshold {
			cb.state = StateOpen
		}
	case StateHalfOpen:
		// Single failure in half-open returns to open
		cb.state = StateOpen
		cb.lastFailure = time.Now()
		cb.failureCount = 0
		cb.successCount = 0
	}
}
