import http from 'k6/http';
import { check, sleep } from 'k6';
import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';

// Web Vitals custom metrics
const lcpMetric = new Trend('web_vitals_lcp', true);
const clsMetric = new Trend('web_vitals_cls', true);
const inpMetric = new Trend('web_vitals_inp', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Hybrid test: protocol-level API load + real browser experience monitoring
export const options = {
  scenarios: {
    // High-volume protocol scenario: simulates backend API pressure
    api_load: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 150,
      maxVUs: 300,
      exec: 'apiScenario',
    },
    // Low-volume browser scenario: measures real user experience under load
    browser_experience: {
      executor: 'per-vu-iterations',
      vus: 3,
      iterations: 5,
      options: { browser: { type: 'chromium' } },
      exec: 'browserScenario',
    },
  },
  thresholds: {
    // API protocol thresholds
    'http_req_duration{scenario:api_load}': ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    // Web Vitals thresholds (Core Web Vitals "good" targets)
    web_vitals_lcp: ['p(75)<2500'],   // LCP: < 2.5s
    web_vitals_cls: ['p(75)<0.1'],    // CLS: < 0.1
    web_vitals_inp: ['p(75)<200'],    // INP: < 200ms
  },
};

// Protocol scenario: high-throughput API calls
export function apiScenario() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/products`, null, { tags: { name: 'list_products' } }],
    ['GET', `${BASE_URL}/api/categories`, null, { tags: { name: 'list_categories' } }],
  ]);

  check(responses[0], { 'products 200': (r) => r.status === 200 });
  check(responses[1], { 'categories 200': (r) => r.status === 200 });
}

// Browser scenario: real user navigation with Web Vitals collection
export async function browserScenario() {
  const page = await browser.newPage();

  try {
    // Navigate to homepage and wait for full load
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Collect Web Vitals via PerformanceObserver
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results = { lcp: 0, cls: 0, inp: 0 };

        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          results.lcp = entries[entries.length - 1].startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) results.cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });

        // Resolve after collecting buffered entries
        setTimeout(() => resolve(results), 3000);
      });
    });

    lcpMetric.add(vitals.lcp);
    clsMetric.add(vitals.cls);

    // Simulate user interaction for INP measurement
    const searchInput = await page.locator('input[type="search"], input[name="q"]');
    if (searchInput) {
      const start = Date.now();
      await searchInput.click();
      await searchInput.fill('test product');
      const inp = Date.now() - start;
      inpMetric.add(inp);
    }

    // Verify page rendered correctly under load
    check(page, {
      'page title present': (p) => p.title() !== '',
    });
  } finally {
    await page.close();
  }

  sleep(2);
}
