---
type: fact
title: "BEAM VM Internals"
---

# BEAM VM Internals

## Schedulers

- One scheduler per CPU core by default (`+S` flag to override)
- Each scheduler has its own run queue of processes
- Schedulers steal work from each other when idle (work stealing)
- Dirty schedulers for NIFs/BIFs that can't yield (dirty CPU + dirty I/O schedulers)

## Reductions

- Unit of work measurement (approximately one function call = 1 reduction)
- Each process gets ~4000 reductions before being preempted
- Guarantees fair scheduling  -  no process can monopolize a scheduler
- Long-running NIFs must yield via `enif_schedule_nif` or use dirty schedulers

## Preemptive Multitasking

- BEAM preempts at reduction boundaries (not time-based)
- Any process can be paused at any function call boundary
- No cooperative yielding needed (unlike Go goroutines at function calls)
- Result: consistent latency even under heavy load

## Memory Model

### Per-Process Heap
- Each process has its own heap (default: 233 words initial)
- Messages are COPIED into recipient's heap (no shared memory)
- GC is per-process  -  collecting one process doesn't stop others
- GC pause: proportional to live data in THAT process only (microseconds typical)

### Shared Data
- Large binaries (>64 bytes) stored in shared binary heap, reference-counted
- `:persistent_term`  -  global read-optimized storage, expensive writes (full GC triggers on update)
- ETS tables  -  shared memory accessible by any process (concurrent reads, serialized writes per table)
- Atoms stored in global atom table  -  never garbage collected (2^20 limit by default)

## Garbage Collection

- Generational: young heap + old heap per process
- Minor GC: collect young heap (frequent, fast)
- Major GC: collect both heaps (rare, proportional to process heap size)
- Fullsweep after N generations (configurable via `fullsweep_after`)
- Key insight: small processes with short-lived data = tiny GC pauses

## Process Isolation

- Crash in one process cannot corrupt another's memory
- No shared mutable state (message passing copies data)
- Process death is local  -  supervisor restarts only the failed process
- This enables "let it crash"  -  crashes are safe and contained

## I/O and Ports

- I/O is non-blocking at the VM level (uses kernel poll: epoll/kqueue)
- File I/O uses dirty I/O schedulers to avoid blocking normal schedulers
- Ports: interface to external programs via stdin/stdout byte streams
- NIFs: native C functions callable from Erlang (risky  -  crash NIF = crash VM)

## Distribution

- Nodes connect via TCP (Erlang distribution protocol)
- Fully connected mesh by default (every node connects to every other)
- Messages between nodes are serialized via External Term Format
- Node connections authenticated via shared cookie
- Net splits: monitor with `:net_kernel.monitor_nodes/1`

## Performance Characteristics

| Operation | Typical Cost |
|-----------|-------------|
| Process spawn | ~3μs |
| Message send (local) | ~0.5μs + copy time |
| Context switch | ~0.1μs |
| ETS lookup | ~0.5μs |
| Process GC | 1-100μs (proportional to heap) |
| Spawn limit | millions per node |

## Tuning Flags

```
+P 1000000          # max processes (default 262144)
+S 8:8              # schedulers:dirty_schedulers
+sbwt very_long     # scheduler busy wait threshold (latency vs CPU)
+MBas aobf          # allocator strategy
+hms 233            # initial heap size (words)
```
