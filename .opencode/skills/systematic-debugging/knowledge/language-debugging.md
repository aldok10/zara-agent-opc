---
type: fact
title: "Language-Specific Debugging"
---
# Language-Specific Debugging

## Go

### Delve Debugger
- `dlv debug` -- start debugging main package
- `dlv test` -- debug tests
- `dlv attach <pid>` -- attach to running process
- Breakpoints: `break main.go:42`, `break myFunc`
- Conditional: `condition 1 i > 100`
- `goroutines` -- list all goroutines with state
- `goroutine <id>` -- switch to specific goroutine

### Race Detector
- `go run -race .` or `go test -race ./...`
- Reports concurrent read/write to same memory
- Adds ~10x slowdown -- use in CI, not production
- Fix: use sync.Mutex, sync.RWMutex, or channels
- Atomic operations for simple counters: `sync/atomic`

### Profiling with pprof
- Import `net/http/pprof` for HTTP endpoint
- `go tool pprof http://localhost:6060/debug/pprof/heap`
- CPU: `go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30`
- `top`, `list funcName`, `web` (generates SVG)
- Goroutine leaks: check `/debug/pprof/goroutine?debug=2`

### Common Go Issues
- Goroutine leaks: missing context cancellation, unbuffered channel nobody reads
- Nil pointer: interface holding nil concrete value still != nil
- Closure capturing loop variable (fixed in Go 1.22+)
- defer in loop (defers don't run until function exits)

## Python

### pdb/ipdb
- `breakpoint()` -- drops into debugger (Python 3.7+)
- `import ipdb; ipdb.set_trace()` -- enhanced debugger
- Commands: `n` (next), `s` (step into), `c` (continue), `p expr`
- `l` (list source), `w` (where/stack), `u`/`d` (up/down frame)
- Post-mortem: `python -m pdb script.py` (drops in on exception)

### Memory Debugging
- `memory_profiler`: `@profile` decorator shows line-by-line memory
- `tracemalloc`: stdlib, shows allocation sources
- `objgraph`: find reference cycles, growth between snapshots
- `sys.getsizeof()` -- shallow size only (not recursive)

### Performance
- `py-spy`: sampling profiler, attach to running process without restart
- `cProfile`: `python -m cProfile -s cumulative script.py`
- `line_profiler`: `@profile` for line-by-line timing
- `snakeviz`: visualize cProfile output in browser

### Common Python Issues
- Mutable default arguments (`def f(x=[])` -- shared across calls)
- Late binding closures in loops
- GIL: threads don't parallelize CPU work (use multiprocessing)
- Import cycles: restructure or use local imports

## Node.js / TypeScript

### Inspector Protocol
- `node --inspect app.js` -- opens debugger on port 9229
- `node --inspect-brk` -- breaks on first line
- Chrome: navigate to `chrome://inspect`
- VS Code: attach configuration in launch.json

### Heap Snapshots
- `--max-old-space-size=4096` -- increase memory limit for debugging
- Chrome DevTools > Memory > Take Heap Snapshot
- Compare snapshots to find leaks (Comparison view)
- Look for: detached DOM, growing arrays, event listeners

### Async Debugging
- `--async-stack-traces` (enabled by default in modern Node)
- `async_hooks` module for tracking async resource lifecycle
- Unhandled rejections: `process.on('unhandledRejection', handler)`
- `why-is-node-running` package -- shows active handles/timers

### Common Node Issues
- Event loop blocking (CPU-heavy sync code)
- Memory leaks: closures holding references, growing caches, event listeners
- Stream backpressure not handled
- `this` context lost in callbacks (use arrow functions or bind)

## Browser Debugging

### Network Tab
- Filter by XHR/Fetch for API calls
- Check timing breakdown (DNS, connect, TTFB, content download)
- Throttle network to simulate slow connections
- Check request/response headers and payloads
- Block requests to test failure handling

### Performance Tab
- Record while reproducing the issue
- Look for: long tasks (>50ms), layout thrashing, forced reflow
- Main thread flame chart shows where time is spent
- Memory timeline shows GC pressure

### React DevTools
- Components tab: inspect props, state, hooks
- Profiler: record renders, find unnecessary re-renders
- Highlight updates: see which components re-render
- Check render reasons in Profiler recordings

## General: Print Debugging Done Right

### Structured Output
- Include timestamp, location, and context
- Use JSON for machine-parseable debug output
- Prefix with a tag you can grep for: `[DEBUG:auth]`
- Include correlation IDs for request tracing

### Making It Removable
- Use environment variable to enable: `DEBUG=true`
- Use a debug logging level that's off in production
- Prefix all debug lines with a consistent marker
- Before committing: `grep -r "DEBUG\|console.log\|print(" src/`

### Conditional Debugging
- Only log when specific conditions are met
- Log at boundaries (input received, output produced)
- Include the values that matter, not everything
- Rate-limit noisy debug output in loops
