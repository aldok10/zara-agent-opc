---
type: fact
title: "Go Expert References"
---
# Go Expert References

## Official & Core

1. The Go Programming Language Specification -- https://go.dev/ref/spec
2. Effective Go -- https://go.dev/doc/effective_go
3. The Go Blog (official) -- https://go.dev/blog/
4. Go Standard Library Documentation -- https://pkg.go.dev/std
5. Go Proposals (accepted/active) -- https://github.com/golang/go/issues?q=label%3AProposal
6. Go 1.23 Release Notes -- https://go.dev/doc/go1.23
7. Go 1.24 Release Notes -- https://go.dev/doc/go1.24
8. Go 1.25 Release Notes -- https://go.dev/doc/go1.25
9. Go Wiki -- https://go.dev/wiki/
10. Go Code Review Comments -- https://go.dev/wiki/CodeReviewComments
11. Go FAQ -- https://go.dev/doc/faq
12. Go Modules Reference -- https://go.dev/ref/mod
13. Go Memory Model -- https://go.dev/ref/mem
14. Go Command Documentation -- https://pkg.go.dev/cmd/go
15. Go Playground -- https://go.dev/play/

## Concurrency

16. Go Concurrency Patterns (Rob Pike, 2012) -- https://go.dev/talks/2012/concurrency.slide
17. Advanced Go Concurrency Patterns (Rob Pike, 2013) -- https://go.dev/talks/2013/advconc.slide
18. Go Blog: Pipelines and Cancellation -- https://go.dev/blog/pipelines
19. Context Package Documentation -- https://pkg.go.dev/context
20. Go Blog: Context and Structs -- https://go.dev/blog/context-and-structs
21. sync Package Documentation -- https://pkg.go.dev/sync
22. sync/atomic Package -- https://pkg.go.dev/sync/atomic
23. errgroup Package -- https://pkg.go.dev/golang.org/x/sync/errgroup
24. singleflight Package -- https://pkg.go.dev/golang.org/x/sync/singleflight
25. semaphore Package -- https://pkg.go.dev/golang.org/x/sync/semaphore
26. Go Blog: Share Memory By Communicating -- https://go.dev/blog/codelab-share
27. Go Blog: Go Concurrency Patterns: Timing out, moving on -- https://go.dev/blog/concurrency-timeouts
28. Bryan Mills: Rethinking Classical Concurrency Patterns (GopherCon 2018) -- https://www.youtube.com/watch?v=5zXAHh5tJqQ
29. Data Race Detector -- https://go.dev/doc/articles/race_detector
30. Channel Axioms (Dave Cheney) -- https://dave.cheney.net/2014/03/19/channel-axioms

## Web & APIs

31. net/http Package Documentation -- https://pkg.go.dev/net/http
32. Go Blog: Routing Enhancements in Go 1.22 -- https://go.dev/blog/routing-enhancements
33. Go Blog: HTTP Server Graceful Shutdown -- https://pkg.go.dev/net/http#Server.Shutdown
34. Chi Router -- https://github.com/go-chi/chi
35. Fiber Framework -- https://docs.gofiber.io/
36. Echo Framework -- https://echo.labstack.com/
37. Gin Framework -- https://gin-gonic.com/docs/
38. gRPC-Go Documentation -- https://grpc.io/docs/languages/go/
39. gRPC-Go Package -- https://pkg.go.dev/google.golang.org/grpc
40. Protocol Buffers Go Tutorial -- https://protobuf.dev/getting-started/gotutorial/
41. Connect-Go (connect-rpc) -- https://connectrpc.com/docs/go/getting-started
42. oapi-codegen (OpenAPI for Go) -- https://github.com/oapi-codegen/oapi-codegen
43. Go-swagger -- https://goswagger.io/
44. net/http/httptest Package -- https://pkg.go.dev/net/http/httptest
45. Go Blog: HTTP/2 Server Push -- https://go.dev/blog/h2push

## Database & Storage

46. database/sql Package Documentation -- https://pkg.go.dev/database/sql
47. Go Wiki: SQL Database Drivers -- https://go.dev/wiki/SQLDrivers
48. sqlc Documentation -- https://docs.sqlc.dev/
49. sqlx Package -- https://github.com/jmoiron/sqlx
50. pgx (PostgreSQL driver) -- https://github.com/jackc/pgx
51. GORM Documentation -- https://gorm.io/docs/
52. ent ORM -- https://entgo.io/docs/getting-started/
53. golang-migrate -- https://github.com/golang-migrate/migrate
54. Atlas Schema Management -- https://atlasgo.io/
55. Go Blog: Accessing Databases -- https://go.dev/doc/database/

## Testing

56. testing Package Documentation -- https://pkg.go.dev/testing
57. Go Blog: Table-Driven Tests -- https://go.dev/wiki/TableDrivenTests
58. testify Package -- https://github.com/stretchr/testify
59. gomock Package -- https://github.com/uber-go/mock
60. testcontainers-go -- https://golang.testcontainers.org/
61. Go Fuzzing Documentation -- https://go.dev/doc/security/fuzz/
62. Go Blog: Fuzzing is Beta Ready -- https://go.dev/blog/fuzz-beta
63. go-cmp Package (Google) -- https://github.com/google/go-cmp
64. httptest Package -- https://pkg.go.dev/net/http/httptest
65. Go Test Coverage (Go 1.20+) -- https://go.dev/blog/integration-test-coverage

## Error Handling & Observability

66. errors Package Documentation -- https://pkg.go.dev/errors
67. Go Blog: Working with Errors in Go 1.13 -- https://go.dev/blog/go1.13-errors
68. Go Blog: Error Handling and Go -- https://go.dev/blog/error-handling-and-go
69. log/slog Package (Go 1.21+) -- https://pkg.go.dev/log/slog
70. Go Blog: Structured Logging with slog -- https://go.dev/blog/slog
71. zerolog Package -- https://github.com/rs/zerolog
72. zap Package (Uber) -- https://github.com/uber-go/zap
73. OpenTelemetry Go SDK -- https://opentelemetry.io/docs/languages/go/
74. OpenTelemetry Go Instrumentation -- https://pkg.go.dev/go.opentelemetry.io/otel
75. Prometheus client_golang -- https://github.com/prometheus/client_golang

## Architecture & Patterns

76. Uber Go Style Guide -- https://github.com/uber-go/guide/blob/master/style.md
77. Standard Go Project Layout -- https://github.com/golang-standards/project-layout
78. Ben Johnson: Standard Package Layout -- https://www.gobeyond.dev/standard-package-layout/
79. Mat Ryer: How I Write HTTP Services in Go (2024) -- https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/
80. Go Blog: Organizing Go Modules -- https://go.dev/blog/organizing-go-modules
81. DDD in Go (Three Dots Labs) -- https://threedots.tech/post/ddd-lite-in-go-introduction/
82. Clean Architecture in Go (Three Dots Labs) -- https://threedots.tech/post/introducing-clean-architecture/
83. Go with the Domain (Three Dots Labs book) -- https://threedots.tech/go-with-the-domain/
84. Wire (Google DI) -- https://github.com/google/wire
85. fx (Uber DI) -- https://uber-go.github.io/fx/
86. dig (Uber DI container) -- https://github.com/uber-go/dig
87. Go Blog: Interface Design -- https://go.dev/wiki/CodeReviewComments#interfaces
88. Dave Cheney: SOLID Go Design -- https://dave.cheney.net/2016/08/20/solid-go-design
89. Go Proverbs (Rob Pike) -- https://go-proverbs.github.io/
90. Accept Interfaces, Return Structs -- https://bryanftan.medium.com/accept-interfaces-return-structs-in-go-d4cab29a301b

## Performance & Deployment

91. pprof Package Documentation -- https://pkg.go.dev/net/http/pprof
92. Go Blog: Profiling Go Programs -- https://go.dev/blog/pprof
93. Go Blog: Profile-Guided Optimization (Go 1.21+) -- https://go.dev/doc/pgo
94. Go Blog: Memory Optimization and Garbage Collection -- https://go.dev/doc/gc-guide
95. runtime Package (GOMAXPROCS, etc.) -- https://pkg.go.dev/runtime
96. Docker Multi-Stage Builds for Go -- https://docs.docker.com/language/golang/build-images/
97. ko (Container images for Go) -- https://ko.build/
98. GoReleaser -- https://goreleaser.com/
99. CGO Documentation -- https://pkg.go.dev/cmd/cgo
100. Go Blog: CGO is not Go (Dave Cheney) -- https://dave.cheney.net/2016/01/18/cgo-is-not-go
101. Go Build Constraints -- https://pkg.go.dev/go/build#hdr-Build_Constraints
102. Go Binary Size Optimization -- https://go.dev/wiki/CompilerOptimizations
103. sync.Pool Patterns -- https://pkg.go.dev/sync#Pool
104. Go Escape Analysis -- https://go.dev/wiki/CompilerOptimizations
105. Benchmarking in Go -- https://pkg.go.dev/testing#hdr-Benchmarks
106. golangci-lint -- https://golangci-lint.run/
107. govulncheck -- https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck
108. Go Blog: Vulnerability Management for Go -- https://go.dev/blog/vuln
109. Air (live reload) -- https://github.com/air-verse/air
110. Go Workspace Mode (Go 1.18+) -- https://go.dev/doc/tutorial/workspaces
