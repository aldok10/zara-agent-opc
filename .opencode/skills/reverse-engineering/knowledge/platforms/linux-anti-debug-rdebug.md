# Linux Anti-Debug/Anti-Reverse Techniques & r_debug Interface

> **TL;DR:** ptrace-based detection, /proc/self/status TracerPid, /proc/self/maps parsing,
> seccomp filtering, prctl PR_SET_PTRACER, SIGTRAP timing attacks, strace detection,
> bypass workflows, DT_DEBUG, r_debug structure, link_map traversal, and anti-DT_DEBUG tricks.

> **Cross-reference:** Siblings: `linux-dynamic-linker-init.md`, `linux-syscalls-signals.md`,
> `linux-packing-instrumentation-tools.md`. Static ELF format in `../formats/elf-format-and-linking.md`.

---

## 17. Linux Anti-Debug & Anti-Reverse Techniques [35][36]

### 17.1 ptrace-based detection

**PTRACE_TRACEME check**: a process can only be ptraced by one tracer. If the
process calls `ptrace(PTRACE_TRACEME, ...)` and it returns -1, there's already a
tracer (debugger) attached.

```c
int anti_ptrace() {
    if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) == -1) {
        // Debugger detected!
        _exit(-1);
    }
    return 0;
}
```

RE bypass: hook `ptrace` via LD_PRELOAD, patch out the check, or NOP the conditional jump.

### 17.2 /proc/self/status TracerPid

Every process has `/proc/self/status`. Field `TracerPid` is 0 when not debugged
and the pid of the tracer when it is.

```c
int check_tracerpid() {
    char buf[256];
    int fd = open("/proc/self/status", O_RDONLY);
    read(fd, buf, sizeof(buf) - 1);
    close(fd);
    if (strstr(buf, "TracerPid:\t0") == NULL) {
        // Debugger detected!
        return 1;
    }
    return 0;
}
```

RE bypass: `strace -e trace=openat` to find the check, then patch. Or use
`LD_PRELOAD` to override `open` to return a sanitized status. Or hook via
`ptrace(PTRACE_TRACEME)` before the check.

### 17.3 /proc/self/maps parsing

Binaries check for unexpected memory mappings (debugger's vdso, or gdb's memory
ranges):

```c
// Look for unusual file-backed mappings
char line[256];
FILE *f = fopen("/proc/self/maps", "r");
while (fgets(line, sizeof(line), f)) {
    if (strstr(line, "gdb") || strstr(line, "pwndbg")) {
        // Debugger detected!
    }
}
// Also check for:
// - Executable stack (PT_GNU_STACK with X)
// - Writable + executable segments
```

### 17.4 seccomp [37]

Seccomp (Secure Computing mode) allows a process to install a BPF filter that
limits what syscalls it can make. For anti-debug:

- Block `ptrace` syscall
- Block `process_vm_readv` / `process_vm_writev`
- Block `perf_event_open`
- Only allow `write`, `exit_group`, etc.

```c
#include <seccomp.h>

scmp_filter_ctx ctx = seccomp_init(SCMP_ACT_KILL);
seccomp_allow(ctx, SCMP_SYS(write));
seccomp_allow(ctx, SCMP_SYS(exit_group));
seccomp_load(ctx);
```

RE bypass: `strace -e trace=prctl` to spot seccomp setup, then modify the filter
or dump the process memory before the filter is loaded.

### 17.5 prctl PR_SET_PTRACER

```c
// Allow only a specific tracer
prctl(PR_SET_PTRACER, getppid());
// Or disallow all future tracing:
prctl(PR_SET_PTRACER, 0);
```

### 17.6 SIGTRAP-based timing attacks

```c
#include <signal.h>
#include <sys/time.h>

volatile int sig_count = 0;
void handler(int sig) { sig_count++; }

int timing_anti_debug() {
    struct sigaction sa;
    sa.sa_handler = handler;
    sigaction(SIGTRAP, &sa, NULL);

    struct timeval start, end;
    gettimeofday(&start, NULL);
    for (int i = 0; i < 10000; i++) {
        kill(getpid(), SIGTRAP);  // Each trap delivers signal or stops in debugger
    }
    gettimeofday(&end, NULL);
    double elapsed = (end.tv_sec - start.tv_sec) + (end.tv_usec - start.tv_usec) / 1e6;
    // With a debugger, SIGTRAP stops each time — much slower
    if (elapsed > expected_time) {
        // Debugger detected!
    }
    return 0;
}
```

### 17.7 Detecting strace

```c
// Tracee sees the strace tracer process via /proc/self/status
// Or use a timing check:
unsigned long long rdtsc() {
    unsigned int lo, hi;
    asm volatile("rdtsc" : "=a"(lo), "=d"(hi));
    return (unsigned long long)hi << 32 | lo;
}

// Single-stepping in a debugger dramatically increases cycle counts
```

### Workflow: common anti-re bypass

```bash
# LD_PRELOAD to hook ptrace, open, fopen
echo 'int ptrace(int r, int pid, void *a, void *d) { return 0; }' > hook.c
gcc -shared -fPIC -o hook.so hook.c
LD_PRELOAD=./hook.so ./target_binary

# Or use strace to find the detection call
strace -e trace=ptrace,open,openat ./target_binary 2>&1 | grep -E "(ptrace|TracerPid)"
```

---

## 18. The `r_debug` Interface & DT_DEBUG [3][38]

### 18.1 Purpose

The `DT_DEBUG` dynamic tag and the `_r_debug` structure provide a communication
channel between the dynamic linker and a debugger. The debugger uses this to:
- Enumerate loaded shared libraries
- Set breakpoints before library initialization
- Track library loading/unloading events at runtime (dlopen/dlclose)

### 18.2 The `r_debug` structure

```c
// From glibc: elf/link.h
struct r_debug {
    int     r_version;   // Protocol version (1 for current)
    struct  link_map *r_map;  // Head of linked list of loaded objects
    void    (*r_brk)(void);   // Pointer to breakpoint function
    enum {
        RT_CONSISTENT,      // State consistent
        RT_ADD,             // Adding a new object
        RT_DELETE           // Removing an object
    } r_state;
    void    *r_ldbase;       // Base address of ld.so
};
```

### 18.3 The `link_map` structure

```c
// From glibc: include/link.h
struct link_map {
    ElfW(Addr) l_addr;          // Base address of the loaded object
    char      *l_name;          // Absolute path of the loaded file
    ElfW(Dyn) *l_ld;            // Pointer to .dynamic section
    struct link_map *l_next;    // Next loaded object
    struct link_map *l_prev;    // Previous loaded object
    // ... (more fields in glibc internal struct, but these are the
    //      official ones from the ELF spec)
};
```

### 18.4 DT_DEBUG

`DT_DEBUG` is a platform-specific tag (21 on x86-64). At program startup, the
dynamic linker fills `d_ptr` with the address of the global `_r_debug` variable:

```bash
readelf -d /bin/ls | grep DEBUG
 0x00000015 (DEBUG)                      0x0
```

The value is `0x0` in the file — it's filled by ld.so at runtime.

### 18.5 How a debugger uses it [38]

GDB and other debuggers:
1. Locate `DT_DEBUG` in the executable's `.dynamic`
2. Read the `r_debug` structure from the filled-in address
3. Walk `r_map` (linked list of `link_map`) to enumerate all loaded libraries
4. Set `r_brk` (the breakpoint function) to get notified of `dlopen`/`dlclose`
5. GDB's `info sharedlibrary` reads this chain

### Workflow: walk link_map at runtime

```gdb
gdb /bin/ls
(gdb) start
(gdb) info sharedlibrary
From                To                  Syms Read   Shared Object Library
0x00007ffff7f6d000  0x00007ffff7fd2cce  Yes (*)     /lib64/ld-linux-x86-64.so.2
0x00007ffff7dc9000  0x00007ffff7f4a2e8  Yes (*)     /lib64/libc.so.6

# Manual walk
(gdb) p _r_debug
$1 = {r_version = 1, r_map = 0x7ffff7fd2c90, r_brk = 0x7ffff7f6e1c0,
       r_state = RT_CONSISTENT, r_ldbase = 0x7ffff7f6d000}

(gdb) p *_r_debug.r_map
$2 = {l_addr = 0, l_name = 0x7ffff7fd2c98 "/bin/ls",
       l_ld = 0x555555560d60, l_next = 0x7ffff7fd2cb0, l_prev = 0x0}

(gdb) p *_r_debug.r_map.l_next
$3 = {l_addr = 0x7ffff7dc9000, l_name = 0x7ffff7fd2cf8 "/lib64/libc.so.6",
       l_ld = 0x7ffff7fb58e0, l_next = 0x7ffff7fd2cc0, l_prev = 0x7ffff7fd2c90}
```

### 18.6 Anti-DT_DEBUG tricks

Some malware zeros out `DT_DEBUG` in their own `.dynamic` to confuse debuggers,
or removes `_r_debug` symbol visibility. However, the debugger can still find
the `r_debug` structure by searching for the `link_map` — typically looking for
the binary's known load address or following known patterns from ld.so [38].
