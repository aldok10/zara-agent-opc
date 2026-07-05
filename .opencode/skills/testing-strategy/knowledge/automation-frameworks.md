---
type: fact
title: "Test Automation Frameworks"
---
# Test Automation Frameworks

## Playwright

Architecture:
- Browser contexts for test isolation (no shared state between tests)
- Auto-wait: actions wait for elements to be actionable before interacting
- Locator-based API: `page.getByRole()`, `page.getByLabel()`, `page.getByTestId()`
- Multi-browser: Chromium, Firefox, WebKit in parallel

Key features:
- Trace viewer: timeline of actions, DOM snapshots, network, console logs
- Code generation: `npx playwright codegen` records interactions
- Network interception: mock APIs, block resources, modify responses
- Visual regression: `expect(page).toHaveScreenshot()` with pixel comparison
- Component testing: mount React/Vue/Svelte components directly

Configuration:
```typescript
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: { trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
});
```

## Vitest

Modern test runner for Vite-based and general TypeScript/JavaScript projects:
- Workspace mode for monorepos
- Benchmarking: `bench("sort", () => ...)` with statistical analysis
- Browser mode: run tests in real browser (WebDriverIO or Playwright)
- In-source testing: test alongside implementation
- Watch mode with smart re-runs (only affected tests)

Configuration:
```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    coverage: { provider: "v8", thresholds: { lines: 80, branches: 75 } },
    pool: "threads",
    reporters: ["verbose", "junit"],
  },
});
```

## k6

Load testing with JavaScript/TypeScript:
```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    ramp: { executor: "ramping-vus", startVUs: 0, stages: [{ duration: "30s", target: 50 }] },
    constant: { executor: "constant-arrival-rate", rate: 100, duration: "1m" },
  },
  thresholds: {
    http_req_duration: ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = http.get("http://localhost:3000/api/users");
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
```

- Extensions for gRPC, WebSocket, browser testing, Redis, Kafka
- Cloud execution for distributed load generation
- Outputs to Prometheus, Grafana, Datadog, InfluxDB

## When to Use Which

| Tool       | Best For                          | Not For                    |
|------------|-----------------------------------|----------------------------|
| Playwright | E2E flows, visual testing, a11y   | Unit tests, load testing   |
| Vitest     | Unit, integration, component      | E2E browser flows          |
| k6         | Load, stress, soak testing        | Functional correctness     |

## CI Integration Patterns

Playwright:
- Use `--shard` for parallel CI (split across multiple runners)
- Upload traces/screenshots as artifacts on failure
- `npx playwright install --with-deps` in CI setup

Vitest:
- `--reporter=junit` for CI result parsing
- Coverage thresholds as CI gates
- `--changed` flag to test only affected files

k6:
- Thresholds as pass/fail gates in pipeline
- Run against staging after deploy, before promotion
- Baseline runs for regression detection
