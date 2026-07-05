---
type: subskill
title: "k6 Script Patterns"
---

# k6 Script Patterns

## Executors

k6 provides 6 executors for different load profiles:

| Executor | Model | Use Case |
|----------|-------|----------|
| `shared-iterations` | Closed | Quick smoke test, fixed total requests |
| `per-vu-iterations` | Closed | Each VU runs N iterations exactly |
| `constant-vus` | Closed | Steady state with fixed concurrency |
| `ramping-vus` | Closed | Gradual ramp-up/down, classic load test |
| `constant-arrival-rate` | Open | Fixed RPS regardless of response time |
| `ramping-arrival-rate` | Open | Variable RPS over time, stress testing |

Open model executors (`*-arrival-rate`) are preferred for SLO validation because they maintain constant load pressure independent of system response time.

## Multi-Scenario Configuration

```javascript
export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1, iterations: 10,
      tags: { test_type: 'smoke' },
    },
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 10, timeUnit: '1s',
      preAllocatedVUs: 50, maxVUs: 200,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 50, timeUnit: '1s',
      preAllocatedVUs: 200, maxVUs: 500,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 50 },
      ],
      startTime: '10m',
      tags: { test_type: 'spike' },
    },
  },
};
```

## Custom Metrics

```javascript
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

const loginDuration = new Trend('login_duration', true);
const failedLogins = new Counter('failed_logins');
const successRate = new Rate('success_rate');
const activeUsers = new Gauge('active_users');
```

## Threshold Patterns

```javascript
export const options = {
  thresholds: {
    // SLO-based: p99 < 500ms, p95 < 200ms
    http_req_duration: ['p(99)<500', 'p(95)<200'],
    // Per-endpoint using tags
    'http_req_duration{name:login}': ['p(95)<300'],
    'http_req_duration{name:search}': ['p(95)<1000'],
    // Error rate < 1%
    http_req_failed: ['rate<0.01'],
    // Custom metric thresholds
    login_duration: ['avg<400', 'max<2000'],
    success_rate: ['rate>0.95'],
    // Composite: abort test if threshold breached
    'http_req_duration{test_type:load}': [
      { threshold: 'p(99)<1000', abortOnFail: true, delayAbortEval: '30s' },
    ],
  },
};
```

## Data Parameterization

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// SharedArray: loaded once, shared across VUs (memory-efficient)
const users = new SharedArray('users', function () {
  return papaparse.parse(open('./data/users.csv'), { header: true }).data;
});

// JSON import
const configs = new SharedArray('configs', function () {
  return JSON.parse(open('./data/test-config.json'));
});

// Environment variables for secrets/endpoints
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY;
```

## HTTP Patterns

```javascript
import http from 'k6/http';

// Batch requests (parallel)
const responses = http.batch([
  ['GET', `${BASE_URL}/api/users`],
  ['GET', `${BASE_URL}/api/products`],
  ['GET', `${BASE_URL}/api/config`],
]);

// Multipart upload
const file = open('./data/upload.bin', 'b');
http.post(`${BASE_URL}/upload`, { file: http.file(file, 'test.bin') });

// Cookie jar (automatic per VU)
const jar = http.cookieJar();
jar.set(BASE_URL, 'session', 'abc123');
```

## Groups and Tags

```javascript
import { group, check } from 'k6';

export default function () {
  group('user_flow', function () {
    group('login', function () {
      const res = http.post(`${BASE_URL}/login`, payload, {
        tags: { name: 'login' },
      });
      check(res, { 'login 200': (r) => r.status === 200 });
    });
    group('browse', function () {
      const res = http.get(`${BASE_URL}/products`, {
        tags: { name: 'browse' },
      });
      check(res, { 'browse 200': (r) => r.status === 200 });
    });
  });
}
```

## Extensions

- **xk6-browser**: real browser automation alongside protocol tests (hybrid testing)
- **xk6-output-prometheus**: stream metrics to Prometheus remote-write endpoint
- **xk6-dashboard**: real-time HTML dashboard during test execution
- **xk6-disruptor**: inject faults (pod termination, network delays) during load

## WebSocket Pattern

```javascript
import ws from 'k6/ws';

export default function () {
  const res = ws.connect(`ws://${BASE_URL}/ws`, {}, function (socket) {
    socket.on('open', () => socket.send(JSON.stringify({ type: 'subscribe' })));
    socket.on('message', (msg) => {
      check(JSON.parse(msg), { 'valid event': (m) => m.type !== undefined });
    });
    socket.setTimeout(() => socket.close(), 30000);
  });
  check(res, { 'ws status 101': (r) => r && r.status === 101 });
}
```
