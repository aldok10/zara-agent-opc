# Linux eBPF

bpftrace, bcc-tools, Cilium, XDP, and production tracing with eBPF.

## When to Load
- Writing or using eBPF-based tracing tools
- Debugging production performance with bpftrace
- Understanding Cilium's eBPF networking
- Implementing XDP for high-performance packet processing

## Key Concepts

**eBPF:** in-kernel virtual machine for safe, sandboxed programs. Attach to tracepoints, kprobes, uprobes, XDP hooks, cgroup hooks, and more. Verified by kernel before loading.

**Tooling layers:**
- bcc-tools: pre-built Python+C tools (tcplife, biolatency, execsnoop)
- bpftrace: awk-like scripting for quick one-liners and scripts
- libbpf + CO-RE: compiled C programs, portable across kernel versions
- Cilium: eBPF-based networking, security, and observability for Kubernetes

**XDP (eXpress Data Path):** process packets at driver level before kernel networking stack. Line-rate packet filtering. Actions: XDP_DROP, XDP_PASS, XDP_TX, XDP_REDIRECT.

**Program types:** kprobe/kretprobe (kernel functions), uprobe/uretprobe (userspace), tracepoint (stable kernel events), perf_event, XDP, TC, socket filter.

## Patterns

**bpftrace one-liners:**
```bash
# Trace process exec with args
bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s %s\n", comm, str(args->filename)); }'

# Latency histogram for block I/O
bpftrace -e 'tracepoint:block:block_rq_issue { @start[args->dev, args->sector] = nsecs; }
  tracepoint:block:block_rq_complete /@start[args->dev, args->sector]/ {
    @usecs = hist((nsecs - @start[args->dev, args->sector]) / 1000);
    delete(@start[args->dev, args->sector]);
  }'

# TCP retransmit tracing
bpftrace -e 'kprobe:tcp_retransmit_skb { @[kstack] = count(); }'
```

**bcc-tools usage:**
```bash
# Slow filesystem operations (>10ms)
biolatency -m            # Block I/O latency histogram
tcplife                  # TCP session lifetimes
execsnoop                # New process execution
opensnoop -p <pid>       # Files opened by process
funclatency <function>   # Kernel function latency
```

**XDP program (drop specific IPs):**
```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <bpf/bpf_helpers.h>

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, __u32);
    __type(value, __u32);
} blocked_ips SEC(".maps");

SEC("xdp")
int xdp_drop(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) return XDP_PASS;
    if (eth->h_proto != __constant_htons(ETH_P_IP)) return XDP_PASS;
    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end) return XDP_PASS;
    if (bpf_map_lookup_elem(&blocked_ips, &ip->saddr))
        return XDP_DROP;
    return XDP_PASS;
}
```

## Gotchas
- eBPF verifier rejects unbounded loops -- use bounded loops (kernel 5.3+)
- bpftrace overhead is low but not zero -- avoid tight-loop kprobes in production
- XDP requires driver support for native mode; generic mode is slower
- CO-RE (Compile Once Run Everywhere) needs BTF-enabled kernel (5.2+)
- Map memory is pinned -- large maps consume locked memory (check `ulimit -l`)
- Cilium replaces kube-proxy -- ensure compatibility with existing NetworkPolicies

## Verification
- `bpftool prog list` for loaded eBPF programs
- `bpftool map dump` for map contents
- `cat /sys/kernel/debug/tracing/trace_pipe` for BPF trace output
- `xdp-loader status` for attached XDP programs
- `cilium status` and `cilium monitor` for Cilium health
- Kernel version check: `uname -r` (5.8+ recommended for full features)
