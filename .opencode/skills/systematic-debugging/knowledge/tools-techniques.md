---
type: fact
title: "Debugging Tools & Techniques - strace, Valgrind, Time-Travel, Snapshot"
---

# Debugging Tools & Techniques

## System-Level Tracing

### strace (Linux) / dtruss (macOS)

```bash
# Trace syscalls
strace -p 12345                    # attach to running process
strace -f ./program                # follow forks
strace -e trace=network ./server   # filter by category
strace -T ./program                # time per syscall
strace -c ./program                # summary statistics

# macOS (requires SIP disabled or entitlements)
sudo dtruss -p 12345
sudo dtruss ./program
# Better: dtrace directly
sudo dtrace -n 'syscall:::entry /pid == 12345/ { printf("%s", probefunc); }'
```

### ltrace & /proc

```bash
# Library call tracing (Linux)
ltrace -e malloc+free ./program

# /proc filesystem -- inspect without stopping
cat /proc/12345/status     # memory, threads, state
cat /proc/12345/maps       # memory mappings
ls /proc/12345/fd/         # open file descriptors
cat /proc/12345/environ    # environment variables
```

## Memory Debugging

### Valgrind

```bash
valgrind --tool=memcheck --leak-check=full ./program
valgrind --track-origins=yes ./program  # trace uninitialized values
# Finds: use-after-free, buffer overflow, leaks, double free, uninit reads
# ~20x slowdown
```

### Sanitizers (compile-time, ~2x slowdown)

```bash
# AddressSanitizer -- heap/stack overflow, use-after-free, leaks
gcc -fsanitize=address -fno-omit-frame-pointer -g prog.c -o prog
ASAN_OPTIONS=detect_leaks=1:halt_on_error=0 ./prog

# LeakSanitizer (standalone)
gcc -fsanitize=leak -g prog.c -o prog

# MemorySanitizer -- reads of uninitialized memory (Clang only)
clang -fsanitize=memory -fno-omit-frame-pointer -g prog.c -o prog

# ThreadSanitizer -- data races
gcc -fsanitize=thread -g prog.c -o prog -lpthread
```

## Time-Travel Debugging

### rr (Linux -- record and replay)

```bash
rr record ./program        # ~1.2x overhead
rr replay                  # deterministic replay with gdb interface

# Inside replay:
(rr) reverse-continue      # run backward to previous breakpoint
(rr) reverse-step          # step one instruction backward
(rr) watch -l some_var
(rr) reverse-continue      # find who LAST wrote this value
(rr) when                  # current event number
(rr) run 500               # jump to event 500
```

Key: deterministic replay, multi-threaded → single-threaded (deterministic scheduling), cheap recording.

### UDB (commercial)

Multi-threaded reverse debugging. Supports remote/cloud. Full thread-aware replay.

### WinDbg Time Travel (Windows)

Records execution trace. Navigate timeline, query state at any point. `dx @$cursession.TTD.Calls("kernel32!CreateFileW")`.

## Snapshot Debugging

- **IntelliTrace** (Visual Studio): records events/snapshots, step backward through history
- **Lightrun**: add logs/snapshots to production without redeployment. Condition-based capture.
- **Rookout**: non-breaking breakpoints on production, collect state without restart

```
# Lightrun example: capture state at line 42 when condition met
lightrun snapshot -f "handler.py" -l 87 --condition "user.role == 'admin'"
```

## Core Dump Analysis

```bash
# Enable core dumps
ulimit -c unlimited
echo '/tmp/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern  # Linux

# gdb (Linux)
gdb ./program /tmp/core.12345
(gdb) bt full          # backtrace with locals
(gdb) info threads     # all threads
(gdb) thread 3         # switch thread
(gdb) frame 5          # jump to frame
(gdb) print var        # inspect variable

# lldb (macOS)
lldb ./program -c /cores/core.12345
(lldb) bt all          # all threads backtrace
(lldb) frame variable  # local variables
(lldb) image lookup --address 0x...  # symbol for address
```

## Heisenbugs

Bugs that disappear under observation. Causes: timing changes from debugger, memory layout shifts from instrumentation, optimization differences debug/release, compiler reordering.

**Strategies:**
- Non-intrusive observation (eBPF, hardware watchpoints)
- Record-and-replay (rr) -- observation doesn't change execution
- Statistical debugging -- many runs, correlate failures with conditions
- Compile-time instrumentation (sanitizers) over runtime (debuggers)
- Add delays to widen race windows, not narrow them

## Feature Flag Debugging

Checklist when behavior differs between flag states:
1. Is the flag evaluating as expected? (log flag state)
2. Is the user/context in the expected segment?
3. Flag caching causing stale values?
4. Flag dependencies (A requires B)?
5. What's the default/fallback value?

## git bisect

```bash
git bisect start
git bisect bad                    # current = broken
git bisect good v1.2.0            # known good

# Automated with test script (exit 0=good, 1=bad, 125=skip)
git bisect run ./test_script.sh
git bisect reset                  # return to HEAD
```

## Printf Debugging Done Right

```python
import sys, json

def _dbg(label: str, **data):
    """Temp debug -- grep 'DBG::' to find and remove."""
    print(f"DBG::{label} {json.dumps(data, default=str)}", file=sys.stderr)

_dbg("request", method=req.method, path=req.path, user=req.user_id)
```

Rules: always stderr, unique prefix (easy grep removal), structured data, timestamps for timing, pre-commit hook to block (`grep -r "DBG::" && exit 1`).

## Production Debugging (eBPF & perf)

### bpftrace

```bash
# Trace function calls without modifying code
bpftrace -e 'uprobe:/path/to/bin:function_name { printf("called\n"); }'

# Syscall count by process
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Latency histogram
bpftrace -e 'kprobe:vfs_read { @start[tid] = nsecs; }
  kretprobe:vfs_read /@start[tid]/ { @ns = hist(nsecs - @start[tid]); delete(@start[tid]); }'
```

### perf

```bash
perf record -g ./program    # CPU profile with call graphs
perf report                 # interactive analysis
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
perf stat -e cache-misses,cache-references ./program
```

### Production principles

- Never >5% overhead in hot path
- Sampling profilers (py-spy, async-profiler) over tracing
- eBPF over strace (kernel-side filtering, minimal overhead)
- Conditional capture (on error) over always-on logging
