import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics to track drift over time
const responseDrift = new Trend('response_time_drift', true);
const memoryErrors = new Counter('memory_related_errors');

// 4-hour soak test at constant load
// Purpose: detect memory leaks, connection exhaustion, and latency degradation
export const options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: 50,            // 50 RPS constant
      timeUnit: '1s',
      duration: '4h',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
  },
  thresholds: {
    // Baseline latency thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Drift detection: if response times grow over time, something is leaking
    response_time_drift: ['p(95)<600'],
    // Error budget: less than 0.5% errors over full soak
    http_req_failed: ['rate<0.005'],
    // No memory-related errors should occur
    memory_related_errors: ['count<5'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Primary endpoint under soak test
  const res = http.get(`${BASE_URL}/api/users?page=1&limit=20`, {
    tags: { name: 'list_users' },
  });

  // Track response time for drift analysis
  responseDrift.add(res.timings.duration);

  // Check for memory-related error signals
  if (res.status === 503 || res.status === 502) {
    memoryErrors.add(1);
  }

  // Data consistency check: response structure should remain stable
  // If the system degrades, it may return partial or malformed responses
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has valid JSON': (r) => {
      try { JSON.parse(r.body); return true; } catch (e) { return false; }
    },
    'response has users array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.users || body.data);
    },
    'response time under 1s': (r) => r.timings.duration < 1000,
  });

  // Minimal think time to maintain constant pressure
  sleep(0.5);
}
