// functional-options — demonstrates the Functional Options pattern.
//
// Functional Options is the idiomatic Go way to provide flexible,
// backwards-compatible configuration for constructors.
//
// Run: go run .

package main

import (
	"fmt"
	"time"
)

// --- Server type with configuration ---

type Server struct {
	host      string
	port      int
	timeout   time.Duration
	maxConns  int
	tls       bool
	redisAddr string
}

// Option is a functional option for configuring Server.
type Option func(*Server)

// WithTimeout sets the server connection timeout.
// This is a clean, self-documenting option.
func WithTimeout(d time.Duration) Option {
	return func(s *Server) { s.timeout = d }
}

// WithMaxConns sets the maximum number of concurrent connections.
func WithMaxConns(n int) Option {
	return func(s *Server) { s.maxConns = n }
}

// WithTLS enables TLS for the server.
func WithTLS() Option {
	return func(s *Server) { s.tls = true }
}

// WithRedis sets the Redis address for caching.
func WithRedis(addr string) Option {
	return func(s *Server) { s.redisAddr = addr }
}

// --- Key stdlib types used: time.Duration ---

// NewServer creates a Server with sensible defaults.
// Options can override specific fields.
func NewServer(host string, port int, opts ...Option) *Server {
	s := &Server{
		host:     host,
		port:     port,
		timeout:  30 * time.Second,  // default
		maxConns: 100,               // default
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// --- Why this pattern? ---
//
// Without functional options, you'd need either:
//  1. Many constructors (NewServer, NewServerWithTimeout, etc.)
//  2. A single constructor with tons of parameters
//  3. A config struct that breaks API compatibility when changed
//
// Functional options solve all three: zero allocation, compile-time safe,
// backwards-compatible, and self-documenting.

func main() {
	// Default server — just host and port
	s1 := NewServer("0.0.0.0", 8080)

	// Server with custom timeout
	s2 := NewServer("0.0.0.0", 8081, WithTimeout(5*time.Second))

	// Server with TLS + Redis
	s3 := NewServer("0.0.0.0", 8443, WithTLS(), WithRedis("localhost:6379"), WithTimeout(10*time.Second))

	fmt.Printf("s1 (default):        %s:%d  timeout=%v  tls=%v  redis=%q\n", s1.host, s1.port, s1.timeout, s1.tls, s1.redisAddr)
	fmt.Printf("s2 (custom timeout): %s:%d  timeout=%v  tls=%v  redis=%q\n", s2.host, s2.port, s2.timeout, s2.tls, s2.redisAddr)
	fmt.Printf("s3 (full config):    %s:%d  timeout=%v  tls=%v  redis=%q\n", s3.host, s3.port, s3.timeout, s3.tls, s3.redisAddr)
}
