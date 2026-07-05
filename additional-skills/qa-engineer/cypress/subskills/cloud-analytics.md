# Cloud & Analytics

## Cypress Cloud

Connect project to Cypress Cloud for test insights:
```ts
// cypress.config.ts
export default defineConfig({
  projectId: 'abc123', // from Cypress Cloud dashboard
})
```

Record runs:
```bash
cypress run --record --key $CYPRESS_RECORD_KEY
```

## Parallel Execution

Split specs across multiple CI machines:
```bash
cypress run --record --parallel --group "e2e" --ci-build-id $BUILD_ID
```

- Cloud auto-balances specs based on historical timing
- Each machine pulls next spec from queue (no manual splitting)
- `--ci-build-id` groups machines into one logical run

## Spec Balancing

Cloud tracks spec duration history and distributes for fastest CI:
- Longest specs run first to avoid tail-latency
- New specs get estimated duration until history builds
- Rebalances automatically as test times change

## Test Replay

Captures DOM snapshots, network logs, and console output per test:
- View exact DOM state at each command (no video scrubbing)
- Inspect network requests/responses with timing
- Console errors and warnings preserved
- Available for failed AND passed tests

## Flake Detection

Cloud identifies flaky tests automatically:
- Test passes on retry but failed initially = flake
- Flake rate tracked per spec and per test
- Alert on new flakes, suppress known-flaky failures from blocking

## Analytics

Dashboard metrics:
- **Longest running tests**: identify optimization targets
- **Failure patterns**: most-failing specs, time-of-day correlation
- **Flake rate**: percentage of runs with flaky results
- **Spec duration trends**: detect performance regression

## CI Status Checks

Integrates with GitHub/GitLab as commit status:
```yaml
# GitHub Actions
- run: cypress run --record --parallel
  env:
    CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

- Status check reports pass/fail with link to Cloud run
- Flaky tests can be configured to not block merge
- Per-group status checks (e2e, component, visual)

## Cost & Alternatives

- Cypress Cloud pricing: per test result recorded (free tier: 500/month)
- Alternative: Sorry Cypress (self-hosted, open-source director)
- Alternative: Currents.dev (drop-in replacement, lower cost)
- For parallelism without Cloud: manual spec splitting via `cypress-split`
