---
type: fact
title: "k6 Scripting Patterns"
---

# k6 Scripting Patterns

## Basic Script Structure

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Hold
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],     // < 1% failure rate
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'body has users': (r) => JSON.parse(r.body).length > 0,
  });
  
  sleep(1); // Think time between requests
}
```

## Scenarios (Advanced Execution Control)

```javascript
export const options = {
  scenarios: {
    // Constant rate regardless of response time
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 100,              // 100 requests per timeUnit
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
    
    // Ramp up arrival rate
    ramping_request_rate: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { target: 100, duration: '2m' },
        { target: 100, duration: '5m' },
        { target: 0, duration: '1m' },
      ],
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
    
    // Fixed VU count
    constant_vus: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    
    // Per-VU iterations (each VU runs N times)
    per_vu_iterations: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 100,
    },
  },
};
```

## Authentication Patterns

```javascript
import http from 'k6/http';

// Login once in setup, share token
export function setup() {
  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    email: 'load-test@example.com',
    password: __ENV.TEST_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  return { token: loginRes.json('token') };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };
  
  http.get('https://api.example.com/me', { headers });
}
```

## Data Parameterization

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Load test data once, share across VUs
const users = new SharedArray('users', function () {
  return papaparse.parse(open('./test-users.csv'), { header: true }).data;
});

export default function () {
  // Each VU gets different user based on iteration
  const user = users[__VU % users.length];
  
  const res = http.post('https://api.example.com/login', JSON.stringify({
    email: user.email,
    password: user.password,
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(res, { 'login ok': (r) => r.status === 200 });
}
```

## Thresholds (Pass/Fail Criteria)

```javascript
export const options = {
  thresholds: {
    // Global metrics
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    
    // Per-endpoint (using tags)
    'http_req_duration{name:login}': ['p(95)<300'],
    'http_req_duration{name:dashboard}': ['p(95)<500'],
    
    // Custom metrics
    'iteration_duration': ['p(95)<3000'],
    
    // Abort test early if threshold exceeded
    http_req_duration: [{ threshold: 'p(99)<1000', abortOnFail: true }],
  },
};

export default function () {
  // Tag requests for per-endpoint thresholds
  http.get('https://api.example.com/login', { tags: { name: 'login' } });
  http.get('https://api.example.com/dashboard', { tags: { name: 'dashboard' } });
}
```

## Custom Metrics

```javascript
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

const orderDuration = new Trend('order_creation_duration');
const ordersCreated = new Counter('orders_created');
const orderFailRate = new Rate('order_fail_rate');
const activeOrders = new Gauge('active_orders');

export default function () {
  const start = Date.now();
  const res = http.post('https://api.example.com/orders', JSON.stringify({
    items: [{ sku: 'ABC', quantity: 1 }]
  }), { headers: { 'Content-Type': 'application/json' } });
  
  const duration = Date.now() - start;
  orderDuration.add(duration);
  
  if (res.status === 201) {
    ordersCreated.add(1);
    orderFailRate.add(false);
  } else {
    orderFailRate.add(true);
  }
}
```

## Groups (Organize Transactions)

```javascript
import { group } from 'k6';

export default function () {
  group('User Login Flow', function () {
    http.get('https://app.example.com/login');
    http.post('https://api.example.com/auth', JSON.stringify({
      email: 'user@test.com', password: 'pass'
    }));
  });

  group('Browse Products', function () {
    http.get('https://api.example.com/products');
    http.get('https://api.example.com/products/1');
  });

  group('Checkout', function () {
    http.post('https://api.example.com/cart/add', JSON.stringify({ sku: 'ABC' }));
    http.post('https://api.example.com/checkout');
  });
}
```

## Environment Variables

```bash
# Pass env vars
k6 run -e API_URL=https://staging.example.com -e TOKEN=abc123 script.js

# In script
const url = __ENV.API_URL || 'http://localhost:3000';
```

## Output to Monitoring

```bash
# Prometheus remote write
k6 run -o experimental-prometheus-rw script.js

# InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 script.js

# JSON file
k6 run --out json=results.json script.js

# Cloud (k6 Cloud)
k6 cloud script.js
```
