---
type: subskill
title: "Trace Viewer"
---

# Trace Viewer

## Trace Configuration

```ts
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // recommended for CI
  },
});
```

Options:
- `'off'` - no traces (fastest)
- `'on'` - always record (large artifacts, good for debugging new tests)
- `'on-first-retry'` - record only when test is retried (best CI default)
- `'retain-on-failure'` - record always but only keep on failure
- `'on-all-retries'` - record on every retry attempt

Per-test override:

```ts
test.use({ trace: 'on' });

test('flaky flow', async ({ page }) => {
  // this test always gets a trace
});
```

## Trace Viewer Features

- **Timeline**: visual bar showing test duration with action markers
- **Actions**: step-by-step list of every Playwright action (click, fill, navigate)
- **DOM Snapshots**: full DOM state before and after each action (inspectable)
- **Network**: all requests/responses with timing, headers, and bodies
- **Console**: browser console.log/warn/error messages
- **Source**: test source code with current line highlighted
- **Call metadata**: exact locator used, timeout, strict mode info

## Opening Traces

```bash
# Local file
npx playwright show-trace test-results/test-name/trace.zip

# Multiple traces (compare)
npx playwright show-trace trace1.zip trace2.zip
```

## Remote Trace Viewing

Upload trace ZIP to [trace.playwright.dev](https://trace.playwright.dev):
- Drag-and-drop the `.zip` file
- Processed entirely client-side (no data sent to servers)
- Share URL with team for collaborative debugging
- Works without local Playwright installation

## Debugging Flaky Tests

1. Set `trace: 'on-all-retries'` for the suspect test
2. Run in CI; collect traces from passing AND failing attempts
3. Open both traces side-by-side in trace viewer
4. Compare: look for timing differences, missing network responses, DOM state divergence
5. Common flaky causes visible in traces:
   - Network response arriving after assertion (add `waitForResponse`)
   - Animation not complete (DOM snapshot shows intermediate state)
   - Race between navigation and action (check timeline gaps)

## CI Integration

```yaml
# GitHub Actions - upload traces on failure
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: traces-${{ github.run_id }}
    path: test-results/**/trace.zip
    retention-days: 7
```

Configure trace output directory in `playwright.config.ts`:

```ts
export default defineConfig({
  outputDir: 'test-results', // traces, screenshots, videos go here
});
```

Keep `playwright-report/` for HTML report and `test-results/` for raw artifacts. The HTML report embeds trace links when traces are available.
