/**
 * Example: k6 load test with stages, thresholds, and custom metrics
 * Demonstrates: ramp-up, SLO thresholds, checks, groups
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // ramp up
    { duration: '3m', target: 20 },   // sustained load
    { duration: '1m', target: 50 },   // peak
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    login_duration: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('Login Flow', () => {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: 'loadtest@example.com',
      password: 'test-password',
    }), { headers: { 'Content-Type': 'application/json' } });

    loginDuration.add(loginRes.timings.duration);

    const loginOk = check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'login has token': (r) => JSON.parse(r.body).token !== undefined,
    });

    errorRate.add(!loginOk);

    if (loginOk) {
      const token = JSON.parse(loginRes.body).token;
      const headers = { Authorization: `Bearer ${token}` };

      group('Browse Products', () => {
        const productsRes = http.get(`${BASE_URL}/api/products`, { headers });
        check(productsRes, {
          'products status 200': (r) => r.status === 200,
          'products has items': (r) => JSON.parse(r.body).length > 0,
        });
      });
    }
  });

  sleep(1); // think time between iterations
}
