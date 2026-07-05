---
type: fact
title: "Chaos Engineering - Principles, Tools, Gamedays"
---

# Chaos Engineering

> Chaos engineering is the discipline of experimenting on a system to build confidence in its ability to withstand turbulent conditions in production. It's not breaking things -- it's proving resilience through controlled experiments.

## Principles of Chaos Engineering

From Netflix and the Principles of Chaos manifesto:

1. **Start with a steady-state hypothesis**: define what "working" looks like in measurable terms (latency p99, error rate, throughput)
2. **Vary real-world events**: inject failures that actually happen (network partitions, disk full, clock skew, dependency outage)
3. **Run experiments in production**: staging doesn't reproduce production behavior -- run against real traffic with blast radius controls
4. **Automate experiments to run continuously**: one-off tests prove nothing about ongoing resilience
5. **Minimize blast radius**: start small, expand gradually, have kill switches

## Steady-State Hypothesis

Before any experiment, define:

```yaml
hypothesis:
  title: "Service maintains <500ms p99 when cache fails"
  steady_state:
    - metric: http_request_duration_seconds_p99
      threshold: "< 0.5"
    - metric: http_error_rate_5xx
      threshold: "< 0.01"
  abort_conditions:
    - metric: http_error_rate_5xx
      threshold: "> 0.05"  # kill switch
    - metric: revenue_per_minute
      threshold: "< $threshold * 0.9"
```

If abort conditions trigger, the experiment stops automatically and the failure is rolled back.

## Chaos Monkey / Simian Army (Netflix)

The original chaos tools:

- **Chaos Monkey**: randomly terminates production instances during business hours
- **Latency Monkey**: injects artificial delays into RESTful calls
- **Conformity Monkey**: finds instances not adhering to best practices
- **Chaos Kong**: simulates entire region failures

Modern equivalent: Netflix moved to **ChAP** (Chaos Automation Platform) -- experiments defined as code, integrated with deployment pipeline, automatic rollback.

Key insight from Netflix: chaos experiments should run continuously in production, not as one-off events. Resilience is a property that degrades without constant verification.

## LitmusChaos (Kubernetes-Native)

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-kill-experiment
spec:
  appinfo:
    appns: production
    applabel: "app=payment-service"
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"  # graceful termination first
        probe:
          - name: "check-payment-health"
            type: httpProbe
            httpProbe/inputs:
              url: "http://payment-service:8080/health"
              method:
                get:
                  criteria: "=="
                  responseCode: "200"
            mode: Continuous
            runProperties:
              probeTimeout: 5
              interval: 2
```

LitmusChaos experiments:
- pod-delete, pod-network-loss, pod-cpu-hog, pod-memory-hog
- node-drain, node-taint, disk-fill
- DNS chaos, HTTP chaos (status code injection, latency)

## Chaos Toolkit (Declarative)

Platform-agnostic, experiment-as-JSON/YAML:

```json
{
  "title": "Database failover resilience",
  "description": "Verify app handles primary DB failover gracefully",
  "steady-state-hypothesis": {
    "title": "App responds normally",
    "probes": [
      {
        "type": "probe",
        "name": "app-responds-200",
        "tolerance": 200,
        "provider": {
          "type": "http",
          "url": "http://app:8080/health"
        }
      }
    ]
  },
  "method": [
    {
      "type": "action",
      "name": "trigger-db-failover",
      "provider": {
        "type": "python",
        "module": "chaosaws.rds.actions",
        "func": "failover_db_instance",
        "arguments": {
          "db_instance_identifier": "prod-primary"
        }
      },
      "pauses": { "after": 30 }
    }
  ],
  "rollbacks": [
    {
      "type": "action",
      "name": "verify-db-recovered",
      "provider": {
        "type": "python",
        "module": "chaosaws.rds.probes",
        "func": "instance_status",
        "arguments": {
          "db_instance_identifier": "prod-primary"
        }
      }
    }
  ]
}
```

Run: `chaos run experiment.json --journal-path results.json`

## Gremlin (SaaS)

Commercial platform with guardrails:

- Pre-built attacks: CPU, memory, disk, network (latency/loss/DNS), process kill, time travel
- Team-based access control (who can run what, against which targets)
- Automatic halt on SLO breach
- Status checks integration (PagerDuty, Datadog)
- Scenario library: "Black Friday readiness", "Region failover"

Best for: teams that want chaos engineering without building infrastructure.

## AWS Fault Injection Service (FIS)

```json
{
  "description": "AZ failure simulation",
  "targets": {
    "ec2-instances": {
      "resourceType": "aws:ec2:instance",
      "selectionMode": "COUNT(3)",
      "resourceTags": { "Environment": "production" },
      "filters": [{ "path": "Placement.AvailabilityZone", "values": ["us-east-1a"] }]
    }
  },
  "actions": {
    "stop-instances": {
      "actionId": "aws:ec2:stop-instances",
      "parameters": { "startInstancesAfterDuration": "PT5M" },
      "targets": { "Instances": "ec2-instances" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:...:alarm:HighErrorRate" }
  ]
}
```

FIS supports: EC2, ECS, EKS, RDS, network (route disruption, DNS), SSM actions, and IAM policy injection.

## Toxiproxy (Network Fault Injection)

For local/integration testing -- simulates network conditions between services:

```go
// Go client
proxy, _ := toxiClient.CreateProxy("redis", "localhost:26379", "redis:6379")

// Add 100ms latency
proxy.AddToxic("latency", "latency", "downstream", 1.0, toxiproxy.Attributes{
    "latency": 100,
    "jitter":  20,
})

// Simulate connection timeout
proxy.AddToxic("timeout", "timeout", "downstream", 1.0, toxiproxy.Attributes{
    "timeout": 5000,
})

// Simulate bandwidth limitation
proxy.AddToxic("bandwidth", "bandwidth", "downstream", 1.0, toxiproxy.Attributes{
    "rate": 1024, // 1KB/s
})

// Clean up
proxy.RemoveToxic("latency")
```

Toxics available: latency, bandwidth, slow_close, timeout, slicer (slice data into small bits), limit_data, reset_peer.

Use in integration tests to verify timeout handling, retry logic, and circuit breaker behavior.

## Gameday Planning

### Pre-Gameday (1-2 weeks before)

1. **Select hypothesis**: what do we believe is true about our system's resilience?
2. **Define scope**: which services, which failure modes, which environment
3. **Identify participants**: engineers on-call, observers, facilitator
4. **Prepare rollback**: how do we stop the experiment instantly?
5. **Notify stakeholders**: support team, on-call, management
6. **Set monitoring dashboards**: have observability ready BEFORE the experiment

### During Gameday

```
Timeline:
0:00 - Confirm steady state, all dashboards green
0:05 - Inject first failure (smallest blast radius)
0:10 - Observe: does alerting fire? Do dashboards show degradation?
0:15 - Escalate if needed OR expand blast radius
0:30 - End experiment, verify recovery
0:45 - Debrief while memory is fresh
```

### Post-Gameday

- Document findings: what broke, what held, what surprised you
- Create action items with owners and deadlines
- Update runbooks based on what was learned
- Schedule follow-up to verify fixes
- Plan next experiment based on new hypotheses

## Blast Radius Control

Progressive expansion pattern:

1. **Canary**: 1% of traffic, single instance, non-critical path
2. **Limited**: single AZ, one service, during low-traffic hours
3. **Expanded**: multiple services, business hours, larger traffic %
4. **Full**: production, peak traffic, cross-region

Never jump to step 4. Each level must pass before expanding.

Controls:
- **Kill switch**: one-click abort (Slack button, API call, CloudWatch alarm action)
- **Time bounds**: experiments auto-terminate after duration
- **Traffic percentage**: only affect N% of requests (feature flag integration)
- **Scope limitation**: only target services with known redundancy

## Observability During Chaos

What to watch during experiments:

- **Error rates**: 4xx/5xx by service, by endpoint
- **Latency**: p50, p95, p99 -- look for distribution shifts, not just averages
- **Saturation**: CPU, memory, connection pools, queue depth
- **Downstream impact**: are failures cascading? Check dependency graph
- **Business metrics**: revenue/min, conversion rate, checkout completions
- **Alert quality**: did alerts fire? Were they actionable? False positives?

If you can't observe the impact of your experiment, you can't learn from it. Invest in observability before investing in chaos.

## Progressive Rollout of Experiments

```
Month 1: Non-production only
  - Kill pods in staging
  - Network delays in integration tests
  - Toxiproxy in CI pipelines

Month 2: Production canary
  - Single instance termination (Chaos Monkey style)
  - DNS failover validation
  - Cache invalidation under load

Month 3: Production expanded
  - AZ evacuation drills
  - Database failover
  - Third-party dependency outage simulation

Month 4+: Continuous chaos
  - Automated experiments in deployment pipeline
  - Random failure injection during business hours
  - Cross-region failover exercises quarterly
```

## Anti-Patterns

- Running chaos without monitoring ("let's see what happens" isn't engineering)
- No rollback plan (chaos without control is just breaking things)
- Testing only in staging (production has different traffic, data, and configuration)
- One-and-done experiments (resilience degrades -- verify continuously)
- Blaming teams for failures found (chaos is blameless -- findings are gifts)
- Starting too big (kill an entire region on day one = career risk)
