# Go Code Review Prompt

Use this prompt when reviewing Go code for quality and correctness.

## Review Checklist

### Error Handling
- Every error is checked immediately after the call
- Errors are wrapped with context (`fmt.Errorf("doing X: %w", err)`)
- No swallowed errors (blank identifier `_` for error return)
- Sentinel errors used for expected conditions, wrapped errors for unexpected
- `errors.Is` / `errors.As` used for comparison, never string matching

### Context Propagation
- `context.Context` is the first parameter in functions that do I/O or may block
- Context is passed through the entire call chain, never stored in structs
- Cancellation is respected (select on `ctx.Done()` in loops and goroutines)
- No `context.Background()` in request handlers (use the request context)
- Timeouts set at the caller level, not deep in the stack

### Concurrency Safety
- Shared state protected by mutex OR communicated via channels, never both
- No goroutine leaks: every goroutine has a clear exit path
- `sync.WaitGroup` or `errgroup.Group` used to coordinate goroutine lifecycle
- No race conditions: run `go test -race` on all packages
- Channel direction specified in function signatures (`<-chan`, `chan<-`)

### Stdlib Preference
- Standard library used unless a third-party package provides clear, measured benefit
- `net/http` over frameworks unless routing complexity justifies it
- `encoding/json` or `encoding/gob` over external serializers unless perf-critical
- `log/slog` for structured logging (Go 1.21+)
- `testing` package with table-driven tests, no test framework dependencies

### Naming Conventions
- Short, descriptive names: `r` for reader, `ctx` for context, `err` for error
- Exported names are noun phrases (`UserStore`), methods are verb phrases (`Get`, `ListByOrg`)
- Interfaces are small (1-3 methods), named by behavior (`Reader`, `Closer`)
- Package names are short, lowercase, no underscores, no plurals
- Acronyms are consistently cased (`ID`, `HTTP`, `URL` -- not `Id`, `Http`)

## Prompt Template

```
Review this Go code for:
1. Error handling: unchecked errors, missing context wrapping, swallowed errors
2. Context propagation: missing ctx param, stored contexts, ignored cancellation
3. Concurrency: goroutine leaks, data races, missing synchronization
4. Stdlib preference: unnecessary dependencies, reimplemented stdlib functionality
5. Naming: exported names clarity, interface size, package naming

For each finding: state the line, the issue, and the fix. Severity: critical / warning / suggestion.
```
