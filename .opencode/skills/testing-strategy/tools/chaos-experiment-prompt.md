---
type: tool
title: "Chaos Experiment Design Prompt"
---

# Chaos Experiment Design Prompt

You are helping design chaos engineering experiments: controlled failure injection to verify system resilience.

## Input

**System:** {{service name or architecture description}}
**Hypothesis:** {{what we believe will happen under failure}}
**Blast radius:** {{single pod | single service | availability zone | region}}
**Environment:** {{staging | canary | production}}
**Observability:** {{prometheus | datadog | cloudwatch | grafana | custom}}
**Tooling:** {{litmus | gremlin | chaos_monkey | toxiproxy | manual}}

## Experiment Design Framework

### Step 1: Define Steady State

Before injecting failure, document normal behavior metrics:

```
Steady State Definition:
- Latency: p50 = [X]ms, p99 = [X]ms
- Error rate: < [X]%
- Throughput: [X] req/s
- Availability: [X]%
- Business metric: [e.g., orders/min, messages processed/s]
```

These become your comparison baseline. If steady state cannot be measured, fix observability first.

### Step 2: Form Hypothesis

Template: "When [failure condition], the system will [expected behavior] because [mechanism]."

Examples:
- "When service-B is down, service-A will return cached data within 500ms because the circuit breaker opens after 3 failures."
- "When one AZ is unreachable, requests will route to remaining AZs with < 2s increased latency because the load balancer health checks detect failure within 10s."
- "When the database primary fails over, the application will experience < 30s of errors before reconnecting to the new primary."

### Step 3: Design the Experiment

| Element | Value |
|---------|-------|
| **Failure type** | [network | process | resource | dependency | clock] |
| **Injection method** | [kill process | iptables | tc netem | CPU burn | disk fill] |
| **Target** | [specific host/pod/service] |
| **Duration** | [how long to inject] |
| **Blast radius** | [what is affected] |
| **Abort condition** | [when to stop immediately] |
| **Rollback** | [how to undo the injection] |

### Step 4: Failure Types Catalog

#### Network Failures
```bash
# Latency injection (tc netem)
tc qdisc add dev eth0 root netem delay 200ms 50ms

# Packet loss
tc qdisc add dev eth0 root netem loss 10%

# Partition (iptables)
iptables -A OUTPUT -d <target_ip> -j DROP

# DNS failure
# Block DNS or return NXDOMAIN

# Toxiproxy (application-level)
toxiproxy-cli toxic add -t latency -a latency=1000 my_proxy
```

#### Process/Service Failures
```bash
# Kill process
kill -9 <pid>

# Kill random pod (Kubernetes)
kubectl delete pod <name> --grace-period=0

# OOM simulation
stress-ng --vm 1 --vm-bytes 90% -t 60s
```

#### Resource Exhaustion
```bash
# CPU burn
stress-ng --cpu $(nproc) -t 120s

# Disk fill
fallocate -l 50G /tmp/fill_disk

# File descriptor exhaustion
ulimit -n 10  # then trigger connections

# Thread pool saturation
# Send slow requests that hold connections
```

#### Dependency Failures
```bash
# External service unavailable
# Redirect traffic to black hole or return 503

# Database failover
# Trigger manual failover in RDS/Cloud SQL

# Cache eviction
redis-cli FLUSHALL

# Message queue backup
# Stop consumers, let queue fill
```

### Step 5: Observability Requirements

Before running, verify you can observe:

- [ ] Request latency by percentile (p50, p95, p99)
- [ ] Error rates by type (5xx, timeout, connection refused)
- [ ] Circuit breaker state changes
- [ ] Retry counts and backoff behavior
- [ ] Queue depths and consumer lag
- [ ] Resource utilization (CPU, memory, connections)
- [ ] Business metrics (conversions, completions)
- [ ] Alerts firing correctly

### Step 6: Safety Controls

**Abort Conditions** (stop experiment immediately if):
- Error rate exceeds [X]% (e.g., 2x normal)
- Latency exceeds [X]ms (e.g., 5x normal p99)
- Business metric drops below [X] (e.g., zero orders)
- Any on-call page fires
- Duration exceeds planned window

**Blast Radius Containment**:
- Start with smallest possible scope
- Have kill switch ready (one command to revert)
- Run during low-traffic periods initially
- Notify on-call team before starting
- Keep experiment duration short (minutes, not hours)

## Experiment Progression

```
Level 1: Development/staging
- Kill single instance
- Inject latency to one dependency
- Verify basic failover

Level 2: Pre-production
- Kill multiple instances simultaneously
- Sustained degradation (not just momentary)
- Verify autoscaling and recovery

Level 3: Production (canary)
- Affect small percentage of traffic
- Real user impact measurement
- Verify alerting and runbooks

Level 4: Production (full)
- AZ or region failure
- Multi-service cascading failure
- Verify organizational response (not just technical)
```

## Output Format

```
## Experiment: [Name]

### Hypothesis
When [failure], the system will [behavior] because [mechanism].

### Steady State
| Metric | Normal Value | Threshold |
|--------|-------------|-----------|

### Injection Plan
- What: [failure type and method]
- Where: [target]
- Duration: [time]
- Blast radius: [scope]

### Abort Conditions
- [ ] [condition] -> [action]

### Rollback Procedure
1. [step to undo injection]
2. [verification of recovery]

### Observation Plan
- Dashboard: [link]
- Key metrics to watch: [list]
- Expected timeline: [injection -> detection -> recovery]

### Results Template
- Hypothesis confirmed: [yes/no/partial]
- Time to detect: [duration]
- Time to recover: [duration]
- Unexpected behaviors: [list]
- Action items: [fixes or follow-up experiments]
```

## Rules

- Never run chaos experiments without observability in place. You must be able to see the impact.
- Start small. A chaos experiment that causes an outage is an incident, not a learning.
- Hypothesis first. Random failure injection without a hypothesis is just breaking things.
- Document everything. The value is in the findings, not the injection.
- "The system handled it fine" is a valid and valuable result.
- If you cannot abort within 60 seconds, reduce the blast radius.
