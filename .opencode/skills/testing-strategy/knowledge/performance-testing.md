---
type: fact
title: "Performance Testing"
---
# Performance Testing

## Load Modeling

### Open vs Closed Workload

**Open workload**: new users arrive independently of system state (real-world web traffic).
- Arrival rate is fixed regardless of response time
- If system slows down, requests queue up
- More realistic for public-facing services

**Closed workload**: fixed number of concurrent users, each waits for response before sending next request.
- Throughput depends on response time
- System can never be overwhelmed beyond N concurrent
- Use for internal tools with known user count

```javascript
// k6: Open workload (constant arrival rate)
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 100,           // 100 requests per timeUnit
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
};

// k6: Closed workload (constant VUs)
export const options = {
  scenarios: {
    constant_vus: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
};
```

## k6 Patterns

### Staged Load Test (Ramp Up/Down)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp up
    { duration: '5m', target: 50 },   // steady state
    { duration: '2m', target: 100 },  // peak
    { duration: '5m', target: 100 },  // sustained peak
    { duration: '2m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get('http://api.example.com/orders');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'body has orders': (r) => JSON.parse(r.body).orders.length > 0,
  });
  sleep(1);
}
```

### Realistic Scenario Mix

```javascript
export const options = {
  scenarios: {
    browse: {
      executor: 'constant-arrival-rate',
      exec: 'browseProducts',
      rate: 200,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 100,
    },
    purchase: {
      executor: 'constant-arrival-rate',
      exec: 'purchaseFlow',
      rate: 20,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 30,
    },
    search: {
      executor: 'constant-arrival-rate',
      exec: 'searchProducts',
      rate: 50,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 40,
    },
  },
};

export function browseProducts() {
  http.get('http://api.example.com/products');
  sleep(Math.random() * 3);
}

export function purchaseFlow() {
  const cart = http.post('http://api.example.com/cart', JSON.stringify({
    productId: 'prod-1',
    qty: 1,
  }), { headers: { 'Content-Type': 'application/json' } });

  sleep(2);

  http.post('http://api.example.com/orders', JSON.stringify({
    cartId: JSON.parse(cart.body).cartId,
  }), { headers: { 'Content-Type': 'application/json' } });
}

export function searchProducts() {
  http.get('http://api.example.com/search?q=shoes');
  sleep(1);
}
```

## Soak Testing for Memory Leaks

Run at moderate load for extended duration. Watch for:
- Memory growth over time (linear = leak)
- Response time degradation
- Error rate increase after hours

```javascript
export const options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '4h',     // Long duration
      preAllocatedVUs: 30,
      maxVUs: 60,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.005'],
  },
};
```

### What to Monitor During Soak

```bash
# Memory growth
watch -n 30 "kubectl top pod -l app=myservice"

# Goroutine/thread count
curl http://localhost:6060/debug/pprof/goroutine?debug=1 | head -1

# Connection count
ss -s | grep estab
```

Leak indicators:
- RSS grows linearly without plateau
- Goroutine/thread count increases monotonically
- File descriptor count grows
- Connection pool never returns to baseline

## Stress Testing to Find Breaking Points

Increase load until the system fails. Identify:
- At what load does latency degrade?
- At what load do errors start?
- How does the system recover after overload?

```javascript
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 400 },  // Expected breaking point
        { duration: '2m', target: 600 },  // Beyond capacity
        { duration: '5m', target: 0 },    // Recovery period
      ],
      preAllocatedVUs: 200,
      maxVUs: 800,
    },
  },
};
```

### Recovery Behavior Checklist

- [ ] System recovers without manual intervention
- [ ] Error rate returns to baseline after load drops
- [ ] No data corruption during overload
- [ ] Circuit breakers trip and recover appropriately
- [ ] Graceful degradation (serve partial results, not 500s)

## SLO-Based Pass/Fail Criteria

Define thresholds from your Service Level Objectives:

```javascript
export const options = {
  thresholds: {
    // Availability: 99.9% success rate
    http_req_failed: ['rate<0.001'],

    // Latency: p50 < 200ms, p95 < 500ms, p99 < 1000ms
    http_req_duration: ['p(50)<200', 'p(95)<500', 'p(99)<1000'],

    // Throughput: sustain at least 100 rps
    http_reqs: ['rate>100'],

    // Custom: order creation < 2s at p99
    'http_req_duration{name:create_order}': ['p(99)<2000'],

    // Error budget: max 0.1% errors over test duration
    checks: ['rate>0.999'],
  },
};
```

### CI Integration

```yaml
# GitHub Actions
- name: Run performance tests
  run: |
    k6 run --out json=results.json load-test.js
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
      echo "Performance test FAILED -- thresholds breached"
      exit 1
    fi

- name: Compare against baseline
  run: |
    python scripts/compare-perf.py \
      --baseline=perf-baseline.json \
      --current=results.json \
      --max-regression=10  # Fail if >10% slower
```

### Performance Budget

```markdown
| Endpoint | p50 Budget | p95 Budget | p99 Budget | Error Budget |
|----------|-----------|-----------|-----------|--------------|
| GET /products | 50ms | 200ms | 500ms | 0.1% |
| POST /orders | 200ms | 800ms | 2000ms | 0.05% |
| GET /search | 100ms | 400ms | 1000ms | 0.1% |
```

Gate deployments on these budgets. Any regression beyond budget = blocked deploy until fixed or budget renegotiated with stakeholders.
