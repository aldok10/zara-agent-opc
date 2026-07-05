---
type: subskill
title: "Load Modeling"
---

# Load Modeling

## Open vs Closed Model

| Model | Behavior | Use When |
|-------|----------|----------|
| **Closed** | New iteration starts only after previous completes | Simulating real users with session affinity |
| **Open** | Requests arrive at fixed rate regardless of response | Validating SLOs under constant pressure |

Closed model underestimates load when the system slows down (coordinated omission). Open model reveals true breaking points because request rate stays constant even as latency increases.

**Rule of thumb**: Use open model (`constant-arrival-rate`, `ramping-arrival-rate`) for SLO validation and capacity testing. Use closed model (`constant-vus`, `ramping-vus`) for user journey simulation where think time matters.

## Think Time Modeling

```javascript
import { sleep } from 'k6';

// Constant think time
sleep(3);

// Uniform random (between 1-5s)
sleep(Math.random() * 4 + 1);

// Gaussian approximation (mean 3s, stddev 1s)
sleep(Math.max(0.5, 3 + (Math.random() + Math.random() - 1) * 1));

// Pacing: ensure iteration takes at least N seconds total
const iterStart = Date.now();
// ... do work ...
const elapsed = (Date.now() - iterStart) / 1000;
const pacing = 10; // target 10s per iteration
if (elapsed < pacing) sleep(pacing - elapsed);
```

Pacing is preferred over think time for predictable throughput. It guarantees a fixed iteration rate per VU regardless of response time variability.

## User Journey Modeling

Distribute VUs across scenarios based on production traffic patterns:

```javascript
export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: 70,  // 70% of traffic
      duration: '10m',
    },
    search: {
      executor: 'constant-vus',
      vus: 20,  // 20% of traffic
      duration: '10m',
    },
    checkout: {
      executor: 'constant-vus',
      vus: 10,  // 10% of traffic
      duration: '10m',
    },
  },
};
```

Derive weights from production analytics: page views, API call distribution, funnel conversion rates.

## Ramp Patterns

| Pattern | Shape | Purpose |
|---------|-------|---------|
| **Gradual** | Linear ramp 0 to target over minutes | Find capacity ceiling smoothly |
| **Step-up** | Plateau at each step for 2-5min | Identify exact breaking point |
| **Spike** | Sudden jump to 5-10x normal | Test autoscaling, circuit breakers |
| **Soak** | Constant load for 2-8 hours | Detect memory leaks, connection exhaustion |

Step-up pattern is best for capacity planning: hold each level long enough for metrics to stabilize (minimum 2 minutes per step).

## Production Traffic Replay

**HAR-based replay**:
1. Export HAR from browser DevTools or proxy (mitmproxy)
2. Convert with `har-to-k6` (`npx har-to-k6 recording.har -o test.js`)
3. Parameterize dynamic values (session tokens, IDs)
4. Add correlation for CSRF tokens and dynamic responses

**Log-based replay**:
1. Extract request patterns from access logs (nginx, ALB)
2. Build time-weighted distribution of endpoints
3. Model inter-arrival times from timestamp deltas
4. Replay at 1x, 2x, 5x production rate

## Workload Characterization from APM

Extract from production APM (Datadog, New Relic, Grafana):

1. **Endpoint distribution**: top 20 endpoints by call volume (covers 80%+ traffic)
2. **Temporal patterns**: peak hour multiplier vs daily average (typically 2-4x)
3. **Payload sizes**: p50/p95/p99 request/response body sizes
4. **Dependency fan-out**: downstream calls per request (DB queries, cache hits, API calls)
5. **Session behavior**: avg requests per session, session duration, bounce rate

Target load test at: `peak_rps * growth_factor * safety_margin`
- growth_factor: expected growth in next planning period (e.g., 1.5x)
- safety_margin: typically 1.2-1.5x above expected peak
