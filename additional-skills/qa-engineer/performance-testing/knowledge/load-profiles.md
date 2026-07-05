---
type: fact
title: "Load Test Profiles"
---

# Load Test Profiles

## Profile Types

### 1. Smoke Test
Verify the system works under minimal load. Catches basic errors before heavier tests.

```javascript
export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<500'],
  },
};
```

**Purpose**: Validate test script works, system is up, basic sanity check.

### 2. Average Load Test
Simulate typical production traffic to verify normal behavior.

```javascript
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to average
    { duration: '30m', target: 100 },   // Stay at average
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};
```

**Purpose**: Confirm SLOs are met under normal conditions. Run daily/weekly.

### 3. Stress Test (Ramp-Up)
Find the breaking point by gradually increasing load beyond normal.

```javascript
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Normal load
    { duration: '5m', target: 200 },   // Above normal
    { duration: '5m', target: 300 },   // High load
    { duration: '5m', target: 400 },   // Near breaking
    { duration: '5m', target: 500 },   // Beyond capacity
    { duration: '5m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // Relaxed thresholds
  },
};
```

**Purpose**: Discover at what load the system degrades. Find bottlenecks.

### 4. Spike Test
Sudden surge of traffic (flash sale, viral event, breaking news).

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Normal
    { duration: '10s', target: 500 },   // Instant spike
    { duration: '3m', target: 500 },   // Hold spike
    { duration: '10s', target: 50 },    // Drop back
    { duration: '3m', target: 50 },    // Recovery period
    { duration: '10s', target: 500 },   // Second spike
    { duration: '3m', target: 500 },
    { duration: '2m', target: 0 },
  ],
};
```

**Purpose**: Test auto-scaling, queue handling, circuit breakers, graceful degradation.

### 5. Soak Test (Endurance)
Sustained load over extended period to find memory leaks, resource exhaustion.

```javascript
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up
    { duration: '4h', target: 100 },   // Sustained (4-8 hours typical)
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};
```

**Purpose**: Find memory leaks, connection pool exhaustion, log rotation issues, database connection leaks. Run weekly off-peak.

### 6. Breakpoint Test
Binary search for exact capacity limit.

```javascript
export const options = {
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      stages: [
        { target: 500, duration: '30m' }, // Linear ramp to find breaking point
      ],
      preAllocatedVUs: 500,
      maxVUs: 1000,
    },
  },
};
```

**Purpose**: Determine exact requests/second capacity for capacity planning.

## Profile Selection Guide

| Situation | Profile | Frequency |
|-----------|---------|-----------|
| After deploy | Smoke | Every deploy |
| Verify SLOs | Average Load | Daily/weekly |
| Before major release | Stress | Pre-release |
| Black Friday prep | Spike | Before events |
| Memory leak suspicion | Soak | Weekly/on-demand |
| Capacity planning | Breakpoint | Quarterly |

## Metrics to Watch Per Profile

### During Any Test
- Response time (p50, p95, p99)
- Error rate
- Throughput (requests/second)
- Active VUs vs target

### Infrastructure Metrics (Monitor Externally)
- CPU utilization per service
- Memory usage (watch for linear growth in soak)
- Network I/O
- Disk I/O
- Connection counts (DB, HTTP, WebSocket)
- Queue depth
- GC pauses (JVM, .NET)

## Calculating Target Load

```
Daily active users: 100,000
Peak hour: 20% of daily traffic in 1 hour
Peak minute: 3x average minute in peak hour

Average RPS = (100,000 × 5 actions) / 86,400 = 5.8 RPS
Peak hour RPS = 5.8 × (0.20 × 24) = 27.8 RPS
Peak minute RPS = 27.8 × 3 = 83.4 RPS

Test targets:
- Average load: 30 RPS
- Stress test: up to 150 RPS (2x peak)
- Spike test: 400 RPS burst (5x peak)
```

## Think Time

Users don't fire requests continuously. Add realistic pauses:

```javascript
import { sleep } from 'k6';

export default function () {
  http.get('/page-1');
  sleep(Math.random() * 3 + 2); // 2-5 seconds think time
  
  http.get('/page-2');
  sleep(Math.random() * 5 + 3); // 3-8 seconds think time
}
```

## Ramping Strategy

```
Ramp-up rule of thumb:
- 10% of test duration for ramp-up
- 80% for sustained load
- 10% for ramp-down

Example: 30-minute test
- 3 min ramp-up
- 24 min sustained
- 3 min ramp-down
```
