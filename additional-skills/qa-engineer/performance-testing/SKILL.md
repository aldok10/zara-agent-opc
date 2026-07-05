# Subskill: Performance Testing

> Activate when: load test, stress, soak, k6, latency, throughput, p95, p99, performance budget, ramp, spike, CWV, LCP, INP, cache hit ratio, capacity planning
>
> Baseline first. Percentiles over averages. Production-like environment. Multiple runs for significance.

## Golden Rules

1. Baseline first: establish normal before testing changes
2. p95/p99 latency, not averages (averages hide tail latency)
3. Production-like environment (same topology, similar data volume)
4. Min 3 runs for statistical significance
5. Open model (arrival-rate) for APIs; closed model (VU-based) for browser/session flows
6. Monitor resources during test (CPU, memory, connections, disk I/O)
7. Soak tests: 4-8h minimum for memory leak detection
8. Correlate: latency + throughput + error rate together
9. Warm-up period excluded from measurements
10. Thresholds define pass/fail in CI (not human judgment)

## k6 Scenarios & Executors

| Executor | Model | Use Case |
|----------|-------|----------|
| `shared-iterations` | Closed | Fixed total iterations split across VUs (smoke) |
| `per-vu-iterations` | Closed | Each VU runs N iterations (data-driven) |
| `constant-vus` | Closed | Fixed VUs for duration (soak) |
| `ramping-vus` | Closed | Ramp VUs up/down (stress, breakpoint) |
| `constant-arrival-rate` | Open | Fixed RPS regardless of response time (API SLO) |
| `ramping-arrival-rate` | Open | Ramp RPS up/down (capacity finding) |

**Open vs Closed model**: arrival-rate executors decouple request rate from response time - if the system slows, more VUs spawn to maintain rate. Use for API targets with RPS SLOs. VU-based executors model real users with think time - use for browser/session flows.

```javascript
export const options = {
  scenarios: {
    api_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
    browser_flow: {
      executor: 'constant-vus',
      vus: 5,
      duration: '5m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    browser_web_vital_lcp: ['p(95)<2500'],
    browser_web_vital_inp: ['p(95)<200'],
    browser_web_vital_cls: ['p(95)<0.1'],
  },
};
```

## k6 Browser Module (Hybrid Testing)

Run protocol + browser scenarios in one script. Protocol tests hammer APIs while browser scenarios measure real CWV:

```javascript
import { browser } from 'k6/browser';
import http from 'k6/http';

export default async function () {
  const page = await browser.newPage();
  await page.goto(`${__ENV.BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  page.close();
}
```

## Core Web Vitals & Frontend Budgets

**CWV targets**: LCP < 2.5s (good), INP < 200ms (good), CLS < 0.1 (good).

**Lighthouse CI budget** (`budget.json`):
```json
[{
  "path": "/*",
  "timings": [{ "metric": "largest-contentful-paint", "budget": 2500 }],
  "resourceSizes": [{ "resourceType": "script", "budget": 200 }],
  "resourceCounts": [{ "resourceType": "third-party", "budget": 5 }]
}]
```

**Bundle size gates in CI**: track `dist/` size per PR. Fail if delta > threshold (e.g., +10KB uncompressed JS). Tools: `bundlewatch`, `size-limit`, or custom `stat -f%z`.

## Distributed Tracing Correlation

Inject `traceparent` in k6 to correlate load test requests with backend traces:

```javascript
import http from 'k6/http';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const traceId = uuidv4().replace(/-/g, '');
const params = {
  headers: { traceparent: `00-${traceId}-${uuidv4().slice(0,16)}-01` },
};
http.get(`${__ENV.BASE_URL}/api/items`, params);
```

Filter backend traces by k6-generated trace IDs to pinpoint slow spans under load.

## Database Performance Testing

- **Connection pool saturation**: ramp until pool exhaustion → measure queue time vs active connections
- **Query plan regression**: capture `EXPLAIN ANALYZE` before/after schema or data changes
- **Patterns**: test with production-scale data (row count, index cardinality); use `pg_stat_statements` / slow query log to find regressions
- **Metrics**: query p95, connection wait time, lock contention, deadlock rate

## Cache Performance

- **Hit ratio**: measure `hits / (hits + misses)` under load; target > 90% for hot paths
- **Cold cache**: first run after flush = worst case latency (size your infra for this)
- **Warm cache**: steady-state after TTL stabilizes
- **Test pattern**: run cold → warm → invalidation burst → recovery; measure latency delta

## Capacity Planning from Results

1. Find saturation point: throughput where p99 exceeds SLO
2. **Scaling factor** = `target_RPS / single_instance_max_RPS` (add 30% headroom)
3. Validate linear scaling: 2x instances should yield ~2x throughput (if not, shared bottleneck)
4. Cost model: `instances * cost_per_instance * hours` at each load tier

## Synthetic Monitoring Reuse

Reuse k6 scripts as Grafana Cloud Synthetic checks:
- Extract critical-path scenarios into standalone scripts (< 5s execution)
- Deploy via `k6 cloud` or Grafana Synthetic Monitoring API
- Alert on threshold breach (same thresholds as CI)
- Covers: availability, latency baseline, SSL expiry, DNS resolution

## Bottleneck Analysis

1. **CPU saturation**: high CPU + flat throughput = compute-bound
2. **Memory pressure**: growing RSS + GC pauses = memory-bound
3. **Connection exhaustion**: errors spike + latency spike = pool exhaustion
4. **Disk I/O**: high await time + low throughput = I/O-bound
5. **Network**: packet loss + retransmits = bandwidth/MTU issues

## Anti-Patterns

- Reporting averages without percentiles
- Single run declared as "results"
- Testing on undersized environments
- Ignoring warm-up period / cold cache
- Using production user data (synthetic only)
- No baseline comparison ("it feels fast")
- Open model on browser flows (spawns infinite VUs)
- Ignoring connection pool metrics during DB load tests

## AI-Era Context (2026)

AI generates realistic load profiles from production traffic patterns -- replay actual request distributions, user journeys, and time-based peaks. k6 scenarios are auto-tuned based on SLO targets and historical baselines. AI identifies performance regressions from trace data before users notice. However, AI-generated load tests often miss correlation between VUs (shared session state, unique data per VU) and produce unrealistic uniform distributions instead of bursty traffic patterns. Human review ensures load models match real-world access patterns.

## Knowledge

- `subskills/k6-patterns.md` -- k6 scripting patterns and best practices
- `subskills/load-modeling.md` -- traffic modeling and scenario design
- `subskills/bottleneck-analysis.md` -- performance diagnosis workflow
- `subskills/reporting.md` -- results interpretation and stakeholder reporting

## Delegates To

- **system-design** for capacity planning beyond single-service scope
- **api-testing** for functional correctness of endpoints under load
