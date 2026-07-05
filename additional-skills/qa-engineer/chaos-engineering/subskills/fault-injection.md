---
type: subskill
title: "Fault Injection"
---

# Fault Injection

## Network Faults

**Latency injection**:
```bash
# tc (Linux traffic control) - add 200ms delay
tc qdisc add dev eth0 root netem delay 200ms 50ms

# Toxiproxy - add latency to upstream
toxiproxy-cli toxic add -t latency -a latency=500 -a jitter=100 my_upstream
```

**Packet loss**:
```bash
tc qdisc add dev eth0 root netem loss 10%
```

**Network partition**: Block traffic between specific services:
```bash
iptables -A INPUT -s 10.0.1.0/24 -j DROP
# Chaos Mesh: partition pods by label selector
```

**DNS failure**: Return NXDOMAIN or timeout for specific domains:
```yaml
# Chaos Mesh DNSChaos
action: error
patterns: ["payment-service.internal"]
```

## Process Faults

**Graceful kill** (SIGTERM - allows cleanup):
```bash
kill -SIGTERM <pid>
```

**Hard kill** (SIGKILL - no cleanup, simulates crash):
```bash
kill -9 <pid>
```

**OOM simulation**:
```bash
# cgroup memory limit
echo 50M > /sys/fs/cgroup/memory/test/memory.limit_in_bytes
# Or stress-ng
stress-ng --vm 1 --vm-bytes 90% --timeout 30s
```

## Resource Pressure

**CPU saturation**:
```bash
stress-ng --cpu $(nproc) --timeout 60s
# Chaos Mesh: StressChaos with CPU workers
```

**Memory pressure**:
```bash
stress-ng --vm 2 --vm-bytes 80% --timeout 60s
```

**Disk I/O**:
```bash
# Slow disk reads
tc qdisc add dev sda root netem delay 100ms  # (block device level)
# Or fio for I/O pressure
fio --name=stress --rw=randwrite --bs=4k --size=1G --numjobs=4
```

## Application Faults

**Exception injection** (via feature flag or middleware):
```ts
if (chaosConfig.injectError && Math.random() < chaosConfig.errorRate) {
  throw new Error('Injected chaos fault')
}
```

**Slow responses** (middleware-based):
```ts
app.use((req, res, next) => {
  if (chaosConfig.slowdown) {
    setTimeout(next, chaosConfig.delayMs)
  } else { next() }
})
```

## Tools by Fault Type

| Fault | Tools |
|---|---|
| Network latency/loss | tc, Toxiproxy, Chaos Mesh, Istio fault injection |
| Service kill | Chaos Mesh (PodChaos), Gremlin, Litmus |
| Resource pressure | stress-ng, Chaos Mesh (StressChaos) |
| DNS | Chaos Mesh (DNSChaos), CoreDNS manipulation |
| Application | Feature flags, custom middleware |
| Cloud infra | AWS FIS, Azure Chaos Studio, Gremlin |

## Safety Mechanisms

- **Automatic rollback**: Time-boxed experiments with auto-revert
- **Circuit breakers**: Halt injection when error budget consumed
- **Scope limiters**: Target specific pods/instances, never entire fleet
- **Kill switch**: One command to stop all active experiments
- **Gradual ramp**: Start at 1% blast radius, increase only with evidence

## Progressive Injection

1. **Shadow/dark traffic** - Inject faults on mirrored traffic only
2. **Single instance** - One pod/container in non-critical AZ
3. **Canary scope** - 1-5% of real traffic
4. **Broader scope** - 10-25% after canary validates hypothesis
5. **Full scope** - Only for well-understood, previously validated experiments

## Rules

- Never inject faults without abort conditions defined
- Always have rollback mechanism tested before starting
- Start with smallest blast radius possible
- Log all injections with timestamps for correlation
- Production experiments require explicit approval chain
- Validate monitoring detects the fault before expanding scope
