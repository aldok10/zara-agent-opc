# References

## Official Documentation (8 refs)

- **Go Language Specification** -- https://go.dev/ref/spec -- The authoritative definition of Go syntax and semantics
- **Effective Go** -- https://go.dev/doc/effective_go -- Official guide to writing idiomatic Go code
- **Go Standard Library** -- https://pkg.go.dev/std -- Complete reference for all stdlib packages
- **Go Blog** -- https://go.dev/blog -- Official announcements, deep dives, and design decisions
- **Go Wiki** -- https://go.dev/wiki -- Community-maintained knowledge base with best practices
- **Go Modules Reference** -- https://go.dev/ref/mod -- Complete module system documentation
- **Go Memory Model** -- https://go.dev/ref/mem -- Defines happens-before guarantees for concurrent code
- **Go Release Notes** -- https://go.dev/doc/devel/release -- Version-by-version feature and change log

## Style & Best Practices (7 refs)

- **Uber Go Style Guide** -- https://github.com/uber-go/guide/blob/master/style.md -- Industry-standard style guide for production Go
- **Google Go Style Guide** -- https://google.github.io/styleguide/go/ -- Google's internal Go conventions made public
- **Go Code Review Comments** -- https://go.dev/wiki/CodeReviewComments -- Common review feedback patterns
- **Go Proverbs** -- https://go-proverbs.github.io/ -- Rob Pike's design philosophy distilled
- **What's in a name?** -- https://go.dev/talks/2014/names.slide -- Naming conventions explained by Andrew Gerrand
- **Practical Go** -- https://dave.cheney.net/practical-go/presentations/qcon-china.html -- Dave Cheney's real-world advice
- **Go Best Practices (Peter Bourgon)** -- https://peter.bourgon.org/go-best-practices-2016/ -- Production patterns from industry experience

## Concurrency (8 refs)

- **Go Concurrency Patterns** -- https://go.dev/blog/pipelines -- Official blog on pipeline and cancellation patterns
- **Advanced Concurrency Patterns** -- https://go.dev/blog/io2013-talk-concurrency -- Sameer Ajmani's talk on real-world patterns
- **Context Package** -- https://pkg.go.dev/context -- Cancellation, deadlines, and request-scoped values
- **sync Package** -- https://pkg.go.dev/sync -- Mutexes, WaitGroups, Once, Pool, and Map
- **errgroup** -- https://pkg.go.dev/golang.org/x/sync/errgroup -- Structured concurrency for goroutine groups
- **Data Race Detector** -- https://go.dev/doc/articles/race_detector -- How to find and fix data races
- **Concurrency is not Parallelism** -- https://go.dev/blog/waza-talk -- Rob Pike's foundational talk on Go's model
- **Share Memory by Communicating** -- https://go.dev/blog/codelab-share -- Channel-first design philosophy

## Testing (7 refs)

- **testing Package** -- https://pkg.go.dev/testing -- Standard testing, benchmarking, and fuzzing
- **testify** -- https://github.com/stretchr/testify -- Assertions and mocks for Go tests
- **Go Fuzzing** -- https://go.dev/doc/security/fuzz/ -- Built-in fuzz testing since Go 1.18
- **httptest Package** -- https://pkg.go.dev/net/http/httptest -- Testing HTTP handlers without a server
- **Table-Driven Tests** -- https://go.dev/wiki/TableDrivenTests -- Idiomatic test structure pattern
- **gomock** -- https://github.com/uber-go/mock -- Interface mocking for unit tests
- **go-cmp** -- https://github.com/google/go-cmp -- Deep equality comparisons for tests

## Error Handling (5 refs)

- **errors Package** -- https://pkg.go.dev/errors -- Wrapping, unwrapping, Is, and As
- **Working with Errors in Go 1.13** -- https://go.dev/blog/go1.13-errors -- Error wrapping design and usage
- **Don't Just Check Errors, Handle Them Gracefully** -- https://dave.cheney.net/2016/04/27/dont-just-check-errors-handle-them-gracefully -- Error strategy patterns
- **Sentinel Errors** -- https://dave.cheney.net/2016/04/07/constant-errors -- When and how to use sentinel errors
- **cockroachdb/errors** -- https://github.com/cockroachdb/errors -- Production-grade error library with stack traces

## Performance & Profiling (5 refs)

- **pprof** -- https://pkg.go.dev/net/http/pprof -- Built-in CPU and memory profiling
- **Profiling Go Programs** -- https://go.dev/blog/pprof -- Official profiling tutorial
- **Compiler Optimizations** -- https://go.dev/doc/asm -- Understanding escape analysis and inlining
- **sync.Pool** -- https://pkg.go.dev/sync#Pool -- Object reuse to reduce GC pressure
- **Go Performance Book** -- https://github.com/dgryski/go-perfbook -- Comprehensive performance guide

## Web & Networking (5 refs)

- **net/http Package** -- https://pkg.go.dev/net/http -- Standard HTTP client and server
- **Go 1.22 Enhanced Routing** -- https://go.dev/blog/routing-enhancements -- Method-based routing in stdlib
- **gRPC-Go** -- https://github.com/grpc/grpc-go -- Official gRPC implementation for Go
- **gorilla/websocket** -- https://github.com/gorilla/websocket -- Production WebSocket implementation
- **connectrpc** -- https://connectrpc.com/docs/go/getting-started -- Modern RPC framework compatible with gRPC

## Tools & Ecosystem (5 refs)

- **golangci-lint** -- https://golangci-lint.run/ -- Meta-linter aggregating 100+ linters
- **go vet** -- https://pkg.go.dev/cmd/vet -- Official static analysis tool
- **delve** -- https://github.com/go-delve/delve -- Go debugger built for the language
- **ko** -- https://ko.build/ -- Build and deploy Go containers without Dockerfiles
- **sqlc** -- https://sqlc.dev/ -- Type-safe SQL code generation for Go
