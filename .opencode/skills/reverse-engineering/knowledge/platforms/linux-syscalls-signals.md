# Linux Syscall Interface & Signal Handling

> **TL;DR:** x86-64 syscall instruction mechanics, key syscall numbers, recognizing syscalls
> in disassembly, vDSO/vsyscall, strace workflows, signal trampolines, `__restore_rt`,
> SA_RESTART internals, GCC exception handling tables (.eh_frame), and personality routines.

> **Cross-reference:** Siblings: `linux-dynamic-linker-init.md`, `linux-anti-debug-rdebug.md`,
> `linux-packing-instrumentation-tools.md`. Static ELF format in `../formats/elf-format-and-linking.md`.

---

## 15. Linux Syscall Interface [4][31][32]

### 15.1 The `syscall` instruction

On x86-64, user-space makes system calls via the `syscall` instruction:

```
Syscall number:  RAX
Arguments:       RDI, RSI, RDX, R10, R8, R9  (note: R10 instead of RCX)
Return value:    RAX  (negative = error, -errno)
Clobbered:       RCX (saves RIP), R11 (saves RFLAGS)
```

Breakdown of the `syscall` instruction:
- RCX = RIP (return address is saved in RCX)
- R11 = RFLAGS (original flags saved in R11)
- GDT selector switches to kernel CS/SS
- RIP jumps to the kernel entry point (set up via MSR_LSTAR)

### 15.2 Key syscall numbers (x86-64)

| Nr | Name | RDI | RSI | RDX | R10 | Return |
|----|------|-----|-----|-----|-----|--------|
| 0 | `read` | fd | buf | count | - | bytes read |
| 1 | `write` | fd | buf | count | - | bytes written |
| 2 | `open` | pathname | flags | mode | - | fd |
| 9 | `mmap` | addr | length | prot | flags | addr |
| 10 | `mprotect` | addr | len | prot | - | 0/-1 |
| 32 | `dup` | oldfd | - | - | - | newfd |
| 39 | `getpid` | - | - | - | - | pid |
| 56 | `clone` | flags | stack | parent_tid | child_tid | tid |
| 59 | `execve` | filename | argv | envp | - | - |
| 60 | `exit` | status | - | - | - | noreturn |
| 62 | `kill` | pid | sig | - | - | 0/-1 |
| 63 | `uname` | buf | - | - | - | 0 |
| 101 | `ptrace` | request | pid | addr | data | varies |
| 157 | `prctl` | option | arg2 | arg3 | arg4 | 0/-1 |
| 186 | `gettid` | - | - | - | - | tid |
| 217 | `getdents64` | fd | buf | count | - | bytes |
| 231 | `exit_group` | status | - | - | - | noreturn |
| 257 | `openat` | dirfd | pathname | flags | mode | fd |
| 318 | `getrandom` | buf | count | flags | - | bytes |

Full list in `/usr/include/asm/unistd_64.h` or `x86-64/syscallent.h` in strace source [4].

### 15.3 Recognizing syscalls in disassembly

A direct syscall (without libc wrapper) looks like:

```asm
mov    eax, 60              ; __NR_exit
xor    edi, edi             ; status = 0
syscall                     ; exit(0)
```

Libc wrappers like `exit()` or `write()` eventually call the syscall instruction
but go through libc first:

```asm
; Libc write wrapper (glibc)
write:
    mov    eax, 1            ; __NR_write
    syscall
    cmp    rax, -0x1000      ; check error range
    ja     __syscall_error   ; handle negative errno
    ret
```

### 15.4 vDSO (Virtual Dynamic Shared Object) [31]

The kernel maps a small shared library called `linux-vdso.so.1` into every process.
It provides fast implementations of certain syscalls that don't need a context switch:

```bash
# Find the vDSO mapping
cat /proc/self/maps | grep vdso
7ffd5f7fd000-7ffd5f7ff000 r-xp 00000000 00:00 0   [vdso]
```

```bash
# Dump vDSO contents
gdb -batch -ex "info sharedlibrary" -ex "quit" /bin/ls
```

vDSO provides:
- `clock_gettime` (kernel uses rdtsc + calibration to avoid syscall)
- `gettimeofday` (same mechanism)
- `time` (trivial if from vDSO)
- `__kernel_vsyscall` (32-bit legacy; int80 on older kernels)
- `__vdso_getcpu` (get CPU number via segment register)

The vDSO is an ELF image — you can parse it with `readelf`:

```bash
# Extract and analyze vDSO
cat /proc/self/maps | grep vdso | cut -d- -f1 | xargs -I{} sudo gdb -batch \
  -ex "dump memory /tmp/vdso.so {} + 0x2000" -ex "quit" /bin/ls

readelf -h /tmp/vdso.so
```

vDSO is also how the kernel communicates the hardware capabilities and TSC frequency
to user-space without a syscall [31].

### 15.5 vsyscall page (legacy)

On older kernels (`vsyscall=native` or default on pre-5.4), a fixed page at
`0xffffffffff600000` contains three syscalls: `gettimeofday`, `time`, `getcpu`.
On modern kernels with `vsyscall=emulate`, the page has fixed instructions and the
kernel emulates (treats as a trap) any call to it.

### 15.6 Eliminating libc — direct syscall observation

Statically linked or "raw" syscall binaries (like Go binaries, or hand-written
shellcode) call the kernel directly:

```bash
# Check if binary uses libc at all
strace -e trace=all /bin/my_static_binary 2>&1 | head -10
# All syscalls visible directly — no write(), just write(2)
```

For analysis: `strace -f` traces all child threads, `-e trace=file` filters to
file operations, `-e read=all` shows buffer contents for read syscalls.

### Workflow: strace for behavioral analysis

```bash
# Trace all syscalls with timestamps
strace -f -tt -T -o /tmp/trace.log /bin/ls

# Trace only specific classes
strace -e trace=network,process /bin/myapp

# Trace and filter by syscall count
strace -c /bin/ls
% time     seconds  usecs/call     calls    errors  syscall
------ ----------- ----------- --------- --------- ----------------
  0.00    0.000000           0         5           read
  0.00    0.000000           0         7           write
  0.00    0.000000           0         8           close
  0.00    0.000000           0        14           mmap
  0.00    0.000000           0        11           mprotect
  0.00    0.000000           0         4           openat
  0.00    0.000000           0         4           newfstatat
  0.00    0.000000           0         3           ioctl
  0.00    0.000000           0        10         5  newfstatat
```

---

## 16. Signal Handling & libgcc Internals [33][34]

### 16.1 Signal trampolines

When a signal handler returns, the kernel must restore the interrupted context.
On x86-64, the kernel places a **signal trampoline** on the user stack (or uses
the vDSO's `__kernel_rt_sigreturn`):

```asm
; The rt_sigreturn trampoline (vDSO version)
__kernel_rt_sigreturn:
    mov    eax, 15            ; __NR_rt_sigreturn
    syscall
```

The trampoline is called after the signal handler's `ret` instruction. The
handler's frame contains a `ucontext_t` that `sigreturn` restores.

### 16.2 __restore_rt and __restore

In glibc, signal handlers are set up with a `sa_restorer` field:

```c
// The kernel provides or the vDSO provides:
// - __restore_rt (for SA_SIGINFO handlers, calls rt_sigreturn)
// - __restore (for non-SA_SIGINFO handlers, calls sigreturn)

// These are short functions in the vDSO that just do:
// mov $15, %eax; syscall   (for rt_sigreturn)
// mov $119, %eax; syscall  (for sigreturn on old kernels)
```

A debugger seeing these in a backtrace (labeled `__restore_rt` or
`__kernel_rt_sigreturn`) means the frame above is a signal handler.

### 16.3 SA_RESTART internals

When `SA_RESTART` is set in `sigaction.sa_flags`, the kernel automatically restarts
interrupted syscalls. The kernel checks `SA_RESTART` before delivering the signal
and, if set and the syscall was interrupted, restores the registers and re-executes
the call. This is transparent to user-space — the syscall appears to return normally.

### 16.4 GCC exception handling tables [34]

For C++ exceptions and C `_Unwind_*`, the compiler emits:

- `.eh_frame` — DWARF-based Frame Description Entries (FDEs) describing how to
  unwind each function
- `.eh_frame_hdr` — sorted binary search table mapping addresses to FDEs (for
  `PT_GNU_EH_FRAME`)
- `.gcc_except_table` — Language-Specific Data Area (LSDA) for each function that
  has try/catch blocks

The `.eh_frame` uses the DWARF Call Frame Information format:

```c
// Common Information Entry (CIE)
typedef struct {
    uint8_t  version;         // 1 for DWARF, 3 for .eh_frame
    char     augmentation[];  // "zR" or "zPLR" etc.
    uint8_t  code_align;      // code alignment factor
    int8_t   data_align;      // data alignment factor
    uint8_t  ret_addr_reg;    // return address register (16 for x64)
    // ... CIE initial instructions ...
} Dwarf_CIE;

// Frame Description Entry (FDE)
// References a CIE and covers a function's address range
// Contains Call Frame Instructions for each range
```

For the reverse engineer: `.eh_frame` is how a debugger unwinds the stack for
backtraces. It's also how exception handling works under the hood. The personality
routine (referenced in the CIE augmentation) is called when an exception is thrown
to decide whether to catch or continue unwinding [34].

```bash
# Dump exception handling frames
readelf -wF /bin/ls | head -30
Contents of the .eh_frame section:

00000000 0000000000000014 00000000 CIE
  Version:               1
  Augmentation:          "zR"
  Code alignment factor: 1
  Data alignment factor: -8
  Return address column: 16
  Augmentation data:     1b
  DW_CFA_def_cfa: r7 (rsp) ofs 8
  DW_CFA_offset: r16 (rip) at cfa-8
  DW_CFA_nop

00000018 000000000000001c 0000001c FDE cie=00000000 pc=00006b20..00006b33
  DW_CFA_advance_loc: 1 to 00006b21
  DW_CFA_def_cfa_offset: 16
  DW_CFA_offset: r6 (rbp) at cfa-16
  DW_CFA_advance_loc: 3 to 00006b24
  DW_CFA_def_cfa_register: r6 (rbp)
  ...
```

### 16.5 Personality routines

Each CIE has an augmentation string like `"zPLR"`. The `P` indicates a personality
routine pointer — the function called during stack unwinding to handle cleanup
(destructors) and catch matching. On x86-64 Linux, the personality routine is
typically `__gxx_personality_v0` from libgcc [34].
