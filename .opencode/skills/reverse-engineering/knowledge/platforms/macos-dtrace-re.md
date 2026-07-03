# DTrace for macOS/iOS Reverse Engineering

TL;DR: DTrace dynamic tracing for RE — pid/objc/fbt/syscall providers, function
and ObjC method tracing, one-liners, aggregations, profiling, iOS limitations,
and DTrace vs Frida comparison.

See also: macos-kernel-antire.md, macos-fairplay-app-analysis.md, macos-lldb-re-workflow.md, macos-objc-runtime.md

---

## 13. DTrace for Reverse Engineering

DTrace is a dynamic tracing framework built into macOS (kernel + user space).
It allows instrumenting arbitrary kernel and user functions without modifying
code. On RE, it's invaluable for tracing function calls, ObjC message sends,
and system call patterns [50][51].

### 13.1 DTrace Providers for RE

| Provider | Probes | Use case |
|----------|--------|----------|
| `pid$target` | Function entry/return | Trace specific user-function calls |
| `objc$target` | ObjC method entry/return | Trace Objective-C message sends |
| `fbt` | Kernel function boundary | Trace XNU kernel functions |
| `syscall` | System call entry/return | Trace system call usage |
| `proc` | Process events (fork, exec, exit) | Monitor process lifecycle |
| `io` | Disk I/O events | Trace file access patterns |

### 13.2 pid Provider — User Function Tracing

Trace all function entries and returns in a process [51][52]:

```dtrace
# Trace entry and return of all functions in process
pid$target:::entry
{
    printf("-> %s\n", probefunc);
}

pid$target:::return
{
    printf("<- %s\n", probefunc);
}
```

```bash
# Attach to a running process
sudo dtrace -s trace_all.d -p 1234

# Or launch a new process
sudo dtrace -s trace_all.d -c /path/to/binary
```

Trace a specific function:

```dtrace
pid$target:libSystem:strlen:entry
{
    printf("strlen(%s) called\n", copyinstr(arg0));
}
```

```bash
sudo dtrace -n 'pid$target:libSystem:strlen:entry { printf("%s\n", copyinstr(arg0)); }' -p 1234
```

### 13.3 objc Provider — Objective-C Method Tracing

The `objc$target` provider probes all ObjC method sends, showing class name,
selector, and timing data [50][53]:

```dtrace
# Trace all ObjC method calls
objc$target:::entry
{
    printf("[%s %s]\n", probemod, probefunc);
}
```

```bash
sudo dtrace -n 'objc$target:::entry { printf("[%s %s]\n", probemod, probefunc); }' -p 1234
```

Trace only a specific class:

```bash
# Log all calls to NSView methods
sudo dtrace -n 'objc$target:NSView::entry { printf("[%s %s]\n", probemod, probefunc); }' -p 1234
```

Aggregate call counts:

```bash
# Count ObjC method calls per class+method
sudo dtrace -n 'objc$target:::entry { @[probemod, probefunc] = count(); }' -p 1234
# Ctrl+C to see report
```

Time method execution:

```bash
# Measure total time spent per method
sudo dtrace -n 'objc$target:::entry { self->ts = timestamp; }' \
            -n 'objc$target:::return { @[probemod, probefunc] = sum(timestamp - self->ts); }' \
            -p 1234
```

### 13.4 DTrace One-Liners for RE

```bash
# All system calls by a process
sudo dtrace -n 'syscall:::entry /pid == $target/ { printf("%s\n", probefunc); }' -p 1234

# File open calls with path
sudo dtrace -n 'syscall::open*:entry { printf("%s\n", copyinstr(arg0)); }' -p 1234

# Trace all mach traps
sudo dtrace -n 'mach_trap:::entry { printf("%s\n", probefunc); }' -p 1234

# Trace memory allocations
sudo dtrace -n 'pid$target:libSystem:malloc:entry { printf("malloc(%d)\n", arg0); }' -p 1234

# Trace free calls
sudo dtrace -n 'pid$target:libSystem:free:entry { printf("free(%p)\n", arg0); }' -p 1234

# Trace munmap (memory unmapping)
sudo dtrace -n 'pid$target:libSystem:munmap:entry { printf("munmap(%p, %d)\n", arg0, arg1); }' -p 1234

# Count ObjC selector usage
sudo dtrace -n 'objc$target:::entry { @[probefunc] = count(); }' -p 1234

# Trace kernel function calls (careful — very noisy)
sudo dtrace -n 'fbt:::entry { printf("%s\n", probefunc); }'

# IOKit trace
sudo dtrace -n 'fbt:IOKit::entry { printf("[%s %s]\n", probemod, probefunc); }'

# Network syscalls
sudo dtrace -n 'syscall::connect:entry { printf("connect to %s:%d\n", copyinstr(arg1), ?); }' -p 1234
```

### 13.5 Aggregations and Profiling

```dtrace
# Stack trace on malloc call
pid$target:libSystem:malloc:entry
{
    @[stack()] = count();
}
```

```bash
sudo dtrace -n 'pid$target:libSystem:malloc:entry { @[stack()] = count(); }' -p 1234
```

### 13.6 iOS DTrace Limitations

DTrace on iOS is restricted by two mechanisms [50]:

**1. SIP (System Integrity Protection)** — on macOS, SIP restricts DTrace to
permitted processes only (`csrutil enable --without dtrace` needed for full
access). SIP also restricts FBT (kernel function boundary tracing).

**2. AMFI (Apple Mobile File Integrity)** — on iOS, DTrace is completely
disabled in user land. The `dtrace` command exists but most providers
(including `pid$target` and `objc$target`) are not available without a
jailbreak. Even on jailbroken devices, the kernel must be patched to
re-enable DTrace.

On a jailbroken iOS device:
```bash
# Patch AMFI to enable DTrace (via jailbreak hook)
# Then use DTrace as on macOS
```

Alternative on non-jailbroken devices: use **Frida** for runtime tracing,
which achieves similar results without requiring kernel-level tracing
support.

### 13.7 DTrace vs Frida for RE

| Capability | DTrace | Frida |
|------------|--------|-------|
| Kernel tracing | Yes (fbt) | No (kernel module needed) |
| ObjC method tracing | Native (objc provider) | Via `ObjC` JS API |
| Function hooking | Entry/return only | Full hook + argument modification |
| iOS support | No (jailbreak req.) | Yes (non-jailbreak via debugserver) |
| macOS SIP | Limited without csrutil | Full (user mode) |
| Script language | D language | JavaScript, Python, Swift |
| Performance | Very low overhead | Higher overhead |
| Stack traces | Native | Via `Thread.backtrace()` |

---

## Sources

50. Kodeco, "Advanced Apple Debugging & Reverse Engineering, Ch. 30: Intermediate DTrace" — https://www.kodeco.com/books/advanced-apple-debugging-reverse-engineering/v3.0/chapters/30-intermediate-dtrace
51. Oracle, "DTrace User Guide (pid provider)" — https://docs.oracle.com/cd/E53394_01/html/E53395/gkyem.html
52. 0xm0, "The Reverse Engineer's Unexpected Swiss Army Knife (DTrace)" — https://gist.github.com/0xm0/566e461c299cb48055be2ccdeaa5654a
53. Stack Overflow, "How to find Objective-C methods at runtime for any Application on Mac?" — https://stackoverflow.com/questions/40738770/how-to-find-objective-c-methods-at-runtime-for-any-application-on-mac
