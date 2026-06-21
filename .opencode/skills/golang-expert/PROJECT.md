# Go Expert — Zara Privacy MCP Project Context

This file extends the golang-expert skill with project-specific rules for `zara-privacy-mcp`.

## Project Patterns (Follow These)

### Table-Driven Tests (from `examples/testing/01-table-driven/`)
```go
func TestX(t *testing.T) {
    tests := []struct {
        name string
        // inputs...
        // want...
    }{
        {name: "case 1", ...},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // act + assert
        })
    }
}
```
Every test in this project MUST use this pattern. No standalone `TestFoo_Bar` without subtests.

### Benchmarks (from `examples/performance/`)
```go
func BenchmarkX(b *testing.B) {
    b.ReportAllocs()
    for b.Loop() { ... }
}
```

### Error Handling (from `knowledge/100-mistakes.md`)
- Wrap with context: `fmt.Errorf("query %s: %w", name, err)`
- Handle ONCE: either log OR return, never both
- Use `mcp.NewToolResultError(msg)` for tool errors (not protocol errors)

### Dependencies (from `knowledge/uber-style.md`)
- Accept interfaces, return concrete types
- Constructor injection via struct fields (fx.Provide)
- No global mutable state

### Security (from `knowledge/stdlib.md` + `subskills/security.md`)
- All user input validated before use (size limits, blocklists)
- Timeouts on all I/O: `context.WithTimeout(ctx, 30*time.Second)`
- Secrets from env only, never in code or tool output

### Performance (from `subskills/performance.md`)
- Pre-allocate: `make([]T, 0, n)`
- Use `strings.Builder` with `Grow()`
- Mutex released before I/O (see `internal/store/mapping.go`)

## Project-Specific Rules

1. **Tool handlers** (`application/tools/`) return `(*mcp.CallToolResult, error)` — use `jsonResult()` for success, `mcp.NewToolResultError()` for user errors
2. **Security validators** (`application/tools/security.go`) use package-level `var` for blocklists (allocated once)
3. **Masking** — always use `internal/masking.Masker`, never duplicate scan+replace
4. **Config** — all from env vars via `config.Load()`, validated on startup
5. **Lifecycle** — runfx/fx manages startup/shutdown; cleanup in `fx.Hook{OnStop}`
6. **Transport** — mcp-go handles protocol; we only write tool handlers + middleware
