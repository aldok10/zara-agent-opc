---
type: fact
title: "Chaos Experiment Design"
---

# Chaos Experiment Design

## Experiment Structure

Every chaos experiment follows the scientific method:

### 1. Steady State Hypothesis
Define what "normal" looks like with measurable metrics:
- Response time p95 < 200ms
- Error rate < 0.1%
- Throughput > 1000 req/s
- Order completion rate > 99.5%

### 2. Hypothesis Statement
"When [fault is injected], the system will [expected behavior] within [time bound]."

Example: "When the payment service becomes unavailable for 30 seconds, the order service will queue payments and return 202 Accepted, with no orders lost."

### 3. Variables
- **Independent**: The fault you inject (what you control)
- **Dependent**: The metrics you observe (what you measure)
- **Controlled**: Everything else (held constant)

## Fault Categories

### Infrastructure Faults
| Fault | Tool | Blast Radius |
|-------|------|--------------|
| Instance termination | AWS FIS, Chaos Monkey | Single instance |
| AZ failure | AWS FIS | Availability zone |
| CPU exhaustion | stress-ng, tc | Single host |
| Memory pressure | stress-ng | Single host |
| Disk full | fallocate, dd | Single host |
| Clock skew | tc, chrony manipulation | Single host |

### Network Faults
| Fault | Tool | Blast Radius |
|-------|------|--------------|
| Latency injection | tc netem, Toxiproxy | Connection |
| Packet loss | tc netem | Connection |
| DNS failure | iptables, CoreDNS override | Service |
| Network partition | iptables, AWS FIS | Subnet/VPC |
| Bandwidth throttle | tc tbf | Connection |

### Application Faults
| Fault | Tool | Blast Radius |
|-------|------|--------------|
| Exception injection | Chaos SDK, feature flags | Request path |
| Slow response | Toxiproxy, middleware | Service pair |
| Connection pool exhaustion | Config change | Service |
| Thread starvation | Custom fault | Service |
| Cache invalidation | Direct cache clear | Service cluster |

### Dependency Faults
| Fault | Tool | Blast Radius |
|-------|------|--------------|
| Database failover | RDS reboot, pg_ctl | Database layer |
| Queue backup | Consumer pause | Message queue |
| External API timeout | Toxiproxy | Integration point |
| Certificate expiry | Cert swap | TLS connections |

## Blast Radius Control

### Progressive Widening
```
1. Development → canary → single instance → single AZ → multi-AZ → region
2. Start with lowest blast radius that validates the hypothesis
3. Have a kill switch (abort mechanism) at every level
```

### Safety Mechanisms
- **Abort conditions**: Auto-stop if error rate > X% or latency > Y ms
- **Time bounds**: Experiments have maximum duration
- **Scope limits**: Only target tagged resources
- **Traffic control**: Run during low-traffic windows initially
- **Rollback plan**: Document how to restore steady state

## Experiment Template

```yaml
experiment:
  name: "Payment service unavailability"
  owner: "platform-team"
  date: "2024-01-15"
  
  steady_state:
    metrics:
      - name: order_success_rate
        query: "rate(orders_completed[5m]) / rate(orders_attempted[5m])"
        threshold: "> 0.995"
      - name: p95_latency
        query: "histogram_quantile(0.95, http_duration_seconds)"
        threshold: "< 0.2"

  hypothesis: >
    When payment-service is unreachable for 60s, 
    orders are queued and processed after recovery.
    No orders are lost. Customer sees "processing" status.

  method:
    type: network_partition
    target: payment-service
    duration: 60s
    blast_radius: single_instance

  abort_conditions:
    - metric: error_rate
      threshold: "> 5%"
      action: stop_experiment
    - metric: data_loss_indicator
      threshold: "> 0"
      action: stop_and_alert

  verification:
    during:
      - orders_queued_count increases
      - no 500 errors to end users
    after:
      - queued orders processed within 5 minutes
      - no duplicate charges
      - all order states consistent

  rollback:
    - Remove network partition
    - Verify payment-service healthy
    - Trigger queue drain if needed
```

## Maturity Levels

| Level | Practice |
|-------|----------|
| 1 | Manual experiments in staging |
| 2 | Automated experiments in staging |
| 3 | Automated experiments in production (off-peak) |
| 4 | Continuous chaos in production |
| 5 | Chaos as part of CI/CD (gamedays automated) |

## Common First Experiments

1. Kill a single instance of a stateless service → verify auto-recovery
2. Add 200ms latency to a dependency → verify timeout handling
3. Fill a disk to 95% → verify alerts fire and cleanup works
4. Block DNS resolution for an external API → verify graceful degradation
5. Exhaust database connection pool → verify queuing and backpressure
