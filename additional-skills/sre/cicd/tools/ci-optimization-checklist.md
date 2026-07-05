# CI Optimization Checklist

Systematic checklist for reducing CI execution time and cost. Apply top-down -- each item has diminishing returns below it.

## 1. Caching

### Dependency Caches

| Runtime | Cache Path | Key Strategy |
|---------|-----------|--------------|
| Go | `/go/pkg/mod`, `~/.cache/go-build` | `hashFiles('go.sum')` |
| Node | `~/.npm` or `node_modules` | `hashFiles('package-lock.json')` |
| Python | `~/.cache/pip` | `hashFiles('requirements*.txt')` |
| Rust | `~/.cargo/registry`, `target/` | `hashFiles('Cargo.lock')` |
| Java | `~/.gradle/caches` | `hashFiles('**/*.gradle*', 'gradle-wrapper.properties')` |

### Docker Layer Caching

```yaml
# GitHub Actions -- GHA cache backend
cache-from: type=gha
cache-to: type=gha,mode=max

# Registry-based (cross-runner persistence)
cache-from: type=registry,ref=registry.io/app:buildcache
cache-to: type=registry,ref=registry.io/app:buildcache,mode=max
```

### Cache Hit Rate Monitoring

Target: >80% hit rate on repeated runs. Check:
- `actions/cache` step logs show "Cache hit" vs "Cache miss"
- GHA cache size (10GB per repo limit, LRU eviction)
- Cache key specificity -- too specific = low hits, too broad = stale data

## 2. Parallelism

### Job Matrix

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: go test ./... -count=1 -run "TestShard${{ matrix.shard }}"
```

### Test Splitting

Split by timing data for even distribution:

```bash
# Go
gotestsum --junitfile=timing.xml -- ./...
# Use timing.xml to split future runs

# Jest
jest --shard=${{ matrix.shard }}/${{ strategy.job-total }}

# pytest
pytest --splits=4 --group=${{ matrix.shard }} --splitting-algorithm=least_duration
```

### Independent Job DAG

```yaml
jobs:
  lint:     # no deps -- starts immediately
  test:     # no deps -- parallel with lint
  build:
    needs: [lint, test]  # only after both pass
  deploy:
    needs: [build]
```

## 3. Affected Filtering

Only run tests/builds for changed code:

### Turborepo (monorepo)

```bash
turbo run test --filter='...[origin/main]'
```

### nx (monorepo)

```bash
nx affected -t test --base=origin/main
```

### Path Filtering in Actions

```yaml
on:
  pull_request:
    paths:
      - 'services/api/**'
      - 'libs/shared/**'
```

### Go-specific

```bash
# Find packages affected by changes
CHANGED=$(git diff --name-only origin/main | grep '\.go$' | xargs -I{} dirname {} | sort -u)
go test ${CHANGED}
```

## 4. Fail Fast Ordering

Order jobs cheapest-to-most-expensive:

1. **Lint** (seconds) -- catches formatting/style issues
2. **Type check** (seconds-minutes) -- catches compilation errors
3. **Unit tests** (minutes) -- fast, isolated
4. **Integration tests** (minutes) -- requires services
5. **E2e tests** (minutes-tens of minutes) -- slowest, most expensive

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
  typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 5
  unit:
    needs: [lint, typecheck]
    timeout-minutes: 10
  integration:
    needs: [unit]
    timeout-minutes: 15
  e2e:
    needs: [unit]
    timeout-minutes: 20
```

## 5. Runner Selection

| Workload | Runner | Why |
|----------|--------|-----|
| Lint, type check | ubuntu-latest (2-core) | Fast, cheap |
| Compilation (Go, Rust) | ubuntu-latest-4-core | CPU-bound |
| Docker builds | ubuntu-latest-4-core | I/O + CPU |
| ARM builds | ubuntu-latest-arm64 | Native vs QEMU emulation |
| E2E tests | ubuntu-latest-8-core | Parallelism |

### ARM64 Runners (40% cheaper)

```yaml
runs-on: ubuntu-latest-arm64  # GitHub-hosted Graviton
```

Use for workloads without x86-specific dependencies.

## 6. Build Optimization

### Go

```bash
# Parallel compilation (default GOMAXPROCS)
go build -p $(nproc) ./...

# Skip tests for build verification
go build ./... && go vet ./...
```

### Docker

```dockerfile
# Separate dependency install from source copy
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build ...
```

### TypeScript

```bash
# tsc incremental mode
tsc --incremental --tsBuildInfoFile .tsbuildinfo

# esbuild for production bundles (100x faster than tsc emit)
esbuild src/index.ts --bundle --platform=node --outdir=dist
```

## 7. Measurement

Track these metrics per workflow:

| Metric | Target | Tool |
|--------|--------|------|
| P50 CI time | <5min (PR), <10min (main) | GitHub workflow timing |
| Cache hit rate | >80% | actions/cache logs |
| Flaky test rate | <1% | Test analytics (Datadog, BuildPulse) |
| Cost per PR | Track trend | GitHub billing API |
| Queue time | <30s | Runner autoscaling metrics |

```bash
# Query workflow run times
gh run list --workflow=ci.yml --json conclusion,updatedAt,createdAt \
  --jq '.[] | {duration: ((.updatedAt | fromdate) - (.createdAt | fromdate)), conclusion}'
```

## Quick Wins (30 minutes or less)

1. Add `concurrency` to cancel superseded runs
2. Set `timeout-minutes` on all jobs
3. Enable dependency caching (`actions/cache` or setup-* built-in cache)
4. Add `persist-credentials: false` to checkout (tiny speedup, big security win)
5. Use `--filter` or path triggers to skip irrelevant jobs
6. Switch heavy builds to 4-core runners
7. Move lint/typecheck before test jobs (fail fast)
