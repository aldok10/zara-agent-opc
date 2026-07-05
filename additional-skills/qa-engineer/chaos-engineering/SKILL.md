# Subskill: Chaos Engineering

> Activate when: chaos, resilience, fault injection, game day, blast radius, steady state, circuit breaker, Gremlin, Litmus
>
> Hypothesis before experiment. Smallest blast radius. Auto-rollback tested before run. Never experiment without monitors.

## Golden Rules

1. Hypothesis before experiment: predict steady state behavior first
2. Define steady state metrics (SLIs) before breaking anything
3. Start with smallest blast radius (single instance, non-critical)
4. Auto-rollback defined AND tested before experiment runs
5. Monitor continuously during experiment (dashboards open)
6. Progressive: single fault > cascading > multi-fault
7. Document findings as runbooks for incident response
8. Only production with explicit team agreement
9. Experiments version-controlled and peer-reviewed
10. Never during peak traffic or active incidents

## Experiment Design Template

```yaml
experiment:
  name: "Service X timeout tolerance"
  hypothesis: "System maintains <500ms p95 latency when Service X responds in >2s"
  steady_state:
    metrics:
      - http_request_duration_p95 < 500ms
      - error_rate < 0.1%
      - throughput > 1000 rps
    source: prometheus
  injection:
    type: network_latency
    target: service-x
    parameters:
      latency: 2000ms
      jitter: 500ms
    blast_radius: 1 instance (of 3)
  abort_conditions:
    - error_rate > 5%
    - p99_latency > 5000ms
    - manual halt signal
  duration: 5 minutes
  rollback: automatic (remove network rule)
  observers: [oncall-engineer, experiment-owner]
```

## Fault Types

| Category | Fault | Validates |
|----------|-------|-----------|
| Network | Latency injection (50-5000ms) | Timeout/retry logic |
| Network | Packet loss (1-100%) | Retry with backoff |
| Network | DNS failure | Fallback/cache behavior |
| Compute | CPU pressure (80-100%) | Auto-scaling, degradation |
| Compute | Memory pressure | OOM handling, GC behavior |
| State | Kill process/pod | Restart recovery, data loss |
| State | Corrupt cache | Cache miss handling |
| Dependencies | Kill downstream service | Circuit breaker activation |
| Dependencies | Slow responses | Timeout configuration |

## Tools

| Tool | Platform | Best For |
|------|----------|----------|
| Gremlin | Any (SaaS) | Managed, safety controls, teams |
| LitmusChaos | Kubernetes | GitOps, K8s-native CRDs |
| Chaos Mesh | Kubernetes | Time skew, JVM, IO faults |
| Toxiproxy | Any (proxy) | Network simulation in dev/test |
| tc (Linux) | Linux | Low-level network control |
| AWS FIS | AWS | Cloud-native fault injection |

## Game Day Facilitation

1. **Planning (1 week before)**: Define experiments, roles, communication plan
2. **Pre-game**: Verify rollback works, confirm monitoring, brief observers
3. **Execution**: Run experiments sequentially, observe, record findings
4. **Debrief (same day)**: What broke? What held? What surprised us?
5. **Action items**: Runbook updates, architecture fixes, follow-up experiments

**Roles:**
- Experiment lead: executes, decides abort
- Observer: monitors dashboards, records timeline
- Communicator: notifies stakeholders, manages escalation

## Kubernetes-Specific Chaos (CRDs)

```yaml
# Chaos Mesh PodChaos
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-payment
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [production]
    labelSelectors:
      app: payment-service
  duration: "30s"

# NetworkChaos - partition between services
kind: NetworkChaos
spec:
  action: partition
  direction: both
  selector:
    labelSelectors: { app: order-service }
  target:
    selector:
      labelSelectors: { app: payment-service }
```

**CRD types:** PodChaos (kill/failure), NetworkChaos (partition/delay/loss/bandwidth), StressChaos (CPU/memory), IOChaos (latency/fault), DNSChaos, HTTPChaos

## SLO-Based Abort Conditions

```yaml
abort_conditions:
  # Error budget burn rate (14.4x = fast burn, halt immediately)
  - error_budget_burn_rate > 14.4
  # Direct metric thresholds
  - error_rate > 5%
  - p99_latency > 5000ms
  # Business metric
  - orders_per_minute < 50% of baseline
```

Integration: Nobl9, Sloth, or custom Prometheus recording rules for SLO tracking during experiments.

## Automated Remediation Verification

Validate self-healing activates correctly during chaos:
- HPA scale-up triggered within expected time
- Circuit breaker trips at configured threshold
- Retry with backoff activates (not retry storm)
- Fallback/cache serves stale data gracefully
- MTTR measured programmatically (time from fault to recovery)

## Steady State Verification

```bash
# Prometheus query for steady state
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) < 0.001
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) < 0.5
```

## Progressive Maturity

1. **Level 1**: Kill single pod, verify restart (local/staging)
2. **Level 2**: Network latency between services (staging)
3. **Level 3**: Kill entire service, verify degradation (staging)
4. **Level 4**: Zone/region failure simulation (staging + prod)
5. **Level 5**: Multi-fault cascading failure (prod with controls)

## Observability During Chaos

- Correlate experiment window with trace/metric anomalies
- Detect cascading failures via trace dependency analysis
- Record experiment timeline alongside APM dashboards
- Post-experiment: compare trace error rates before/during/after

## Anti-Patterns

- Breaking things without hypothesis ("chaos monkey on random")
- Starting in production before staging validation
- No rollback mechanism tested
- Running during incidents or peak traffic
- Skipping communication to on-call teams
- No observers/monitors during experiment
- Ignoring error budget impact (chaos shouldn't exhaust error budget)

## AI-Era Context (2026)

AI suggests chaos experiments by analyzing architecture diagrams, dependency graphs, and historical incident data -- identifying single points of failure and untested failure modes. Game day automation is emerging: AI generates experiment plans, predicts blast radius, and recommends abort conditions from SLO data. However, experiment hypothesis design still requires domain knowledge about system behavior under failure. AI cannot judge organizational readiness or team confidence for production experiments.

## Knowledge

- `subskills/hypothesis-design.md` -- experiment hypothesis formulation
- `subskills/fault-injection.md` -- injection techniques by platform
- `subskills/game-day-facilitation.md` -- game day planning and execution
- `subskills/steady-state.md` -- steady state definition and verification

## Delegates To

- **system-design** for architecture fixes from findings
- **performance-testing** for load-based resilience validation
- **security-testing** for security chaos (credential rotation, cert expiry)
