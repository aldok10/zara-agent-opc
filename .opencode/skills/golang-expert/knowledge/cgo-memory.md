---
type: fact
title: "CGO Memory Interaction - Go Heap vs C Heap"
---

# CGO Memory Interaction

Deep reference for memory management across Go/C boundary. Load when dealing with CGO memory pinning, finalizers, or C heap management.

## CGO Memory Interaction (Go Heap vs C Heap)

### Memory Domains

```
Go Heap:                          C Heap:
┌─────────────────────┐          ┌─────────────────────┐
│ Managed by Go GC    │          │ Managed by malloc/free│
│ Objects can move     │          │ Objects never move   │
│ Automatic collection │          │ Manual free required │
│ Pointer-tracked     │          │ Invisible to Go GC   │
└─────────────────────┘          └─────────────────────┘

Go GC CANNOT see C heap. C code CANNOT rely on Go heap stability.
This is the fundamental tension of cgo memory management.
```

### Pointer Passing Rules (runtime enforced since Go 1.6)

```
Rule 1: Go code may pass Go pointer to C, provided the Go memory
         does NOT contain any Go pointers itself.
Rule 2: C code must NOT store Go pointers in C-allocated memory
         (beyond the duration of the C call).
Rule 3: Go code must NOT store Go pointers in C memory.

Violations detected at runtime with GOEXPERIMENT=cgocheck2 (strict)
or default cgocheck=1 (sampling).
```

```bash
# Enable strict pointer checking (testing/CI)
GOEXPERIMENT=cgocheck2 go test ./...

# Disable checks (production, measured performance need)
GODEBUG=cgocheck=0 ./myapp
```

### Memory Pinning (runtime.Pinner, Go 1.21+)

Before Go 1.21: passing Go pointers to C for async/callback use was unsafe (GC could move them).

```go
import "runtime"

func asyncCCallback(data []byte) {
    // Pin Go memory so GC won't move it during async C operation
    var pinner runtime.Pinner
    pinner.Pin(&data[0])
    defer pinner.Unpin()

    // Now safe to pass to C for async use (within pin lifetime)
    C.async_operation((*C.char)(unsafe.Pointer(&data[0])), C.int(len(data)))

    // Wait for C to finish before Unpin
    C.wait_for_completion()
}
```

### When to Pin

| Scenario | Pin Needed? |
|----------|-------------|
| Synchronous C call with Go pointer | No (pointer valid for call duration) |
| C stores pointer for callback later | YES |
| C writes to Go buffer asynchronously | YES |
| Passing Go slice to C for immediate read | No |
| Go pointer in C-allocated struct | FORBIDDEN (use C.malloc + copy) |

### Correct Memory Patterns

```go
// Pattern 1: Copy to C heap (safest, works always)
func safePassString(s string) {
    cs := C.CString(s)         // malloc + copy to C heap
    defer C.free(unsafe.Pointer(cs))
    C.use_string(cs)
}

// Pattern 2: Temporary direct pass (sync call only)
func directPass(data []byte) {
    if len(data) == 0 { return }
    // Safe: Go pointer passed for duration of call only
    C.process(unsafe.Pointer(&data[0]), C.int(len(data)))
}

// Pattern 3: C allocates, Go reads (zero-copy read)
func readFromC() []byte {
    var size C.int
    ptr := C.get_data(&size)  // C allocates
    defer C.free(unsafe.Pointer(ptr))

    // Copy to Go heap (C memory freed after)
    return C.GoBytes(unsafe.Pointer(ptr), size)
}

// Pattern 4: Shared buffer (C owns, Go reads via unsafe slice)
func sharedBuffer() {
    buf := C.create_shared_buffer(1024)
    defer C.destroy_shared_buffer(buf)

    // Create Go slice backed by C memory (CAREFUL: lifetime!)
    goSlice := unsafe.Slice((*byte)(unsafe.Pointer(buf.data)), int(buf.len))
    // goSlice valid ONLY while buf alive
    process(goSlice)
}
```

### Preventing Memory Leaks in CGO

```go
// Pattern: Opaque handle with explicit Close (preferred for libraries)
type CResource struct {
    ptr *C.resource_t
}

func NewCResource() *CResource {
    r := &CResource{ptr: C.resource_create()}
    // Safety net (but prefer explicit Close)
    runtime.SetFinalizer(r, func(r *CResource) {
        if r.ptr != nil {
            C.resource_destroy(r.ptr)
            r.ptr = nil
        }
    })
    return r
}

func (r *CResource) Close() {
    if r.ptr != nil {
        C.resource_destroy(r.ptr)
        r.ptr = nil
        runtime.SetFinalizer(r, nil) // unset finalizer
    }
}
```

### Finalizer Caveats with CGO

```
1. Finalizers run in arbitrary goroutine, at arbitrary time.
2. No guaranteed order between finalizers.
3. If program exits, pending finalizers may NOT run.
4. Finalizer delays GC: object survives at least 1 extra cycle.
5. Cycles prevent finalization (if A and B reference each other).

Best practice:
- Use finalizer as SAFETY NET, not primary cleanup
- Always provide explicit Close()/Destroy() method
- Document that caller MUST call Close()
- Use static analysis (go vet, custom linter) to detect unclosed resources
```

### CGO Memory Profiling

```bash
# Go heap only (won't show C allocations)
go tool pprof http://localhost:6060/debug/pprof/heap

# C heap: use Valgrind (Linux) or Instruments (macOS)
valgrind --tool=massif ./myapp
# or
leaks --atExit -- ./myapp   # macOS

# Combined: use ASAN (Address Sanitizer)
CGO_CFLAGS="-fsanitize=address" CGO_LDFLAGS="-fsanitize=address" go test ./...
```

### Key Insight: Why CGO Memory Is Hard

```
Go's GC provides automatic memory safety for Go objects.
The moment you cross to C, you lose:
1. Automatic collection (must free manually)
2. Move safety (C pointers are raw addresses)
3. Race detection (Go race detector can't see C code)
4. Stack scanning (C frames invisible to GC)
5. Memory safety (buffer overflow, use-after-free possible)

Each cgo boundary is a trust boundary.
Treat it like calling an external service: validate inputs,
bound resources, handle failures, clean up explicitly.
```

