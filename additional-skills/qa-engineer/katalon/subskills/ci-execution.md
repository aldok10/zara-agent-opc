# CI/CD Execution

## KRE Command-Line Essentials

```bash
katalonc -noSplash -runMode=console \
  -projectPath="/path/to/project.prj" \
  -testSuitePath="Test Suites/Regression" \
  -browserType="Chrome (headless)" \
  -executionProfile="staging" \
  -retry=2 \
  -retryStrategy=failedExecutions \
  -apiKey="$KATALON_API_KEY" \
  -maxFailedTests=10 \
  -report.folderPath="./Reports" \
  --config -webui.autoUpdateDrivers=true
```

| Flag | Purpose |
|------|---------|
| `-projectPath` | Absolute path to .prj file |
| `-testSuitePath` | Relative path to test suite (no .ts extension) |
| `-testSuiteCollectionPath` | For parallel execution via TSC |
| `-browserType` | Chrome, Firefox, Edge, `Chrome (headless)`, `Firefox (headless)` |
| `-executionProfile` | Profile name (default, staging, prod) |
| `-retry` | Number of retries for failed tests |
| `-retryStrategy` | `failedExecutions`, `allExecutions`, `immediately` |
| `-apiKey` | License authentication (store as CI secret) |
| `-maxFailedTests` | Circuit breaker: stop after N failures |
| `-g_VAR=value` | Override global variable (visible in logs) |
| `-p_VAR=value` | Override protected variable (hidden in logs) |
| `-testcloudEnvironmentId` | Run on TestCloud (3000+ browser/device combos) |

## Docker Execution

```bash
docker run -t --rm \
  --shm-size="2g" \
  -v "$(pwd)":/tmp/project \
  katalonstudio/katalon:11-latest-slim katalonc.sh \
  -projectPath=/tmp/project \
  -browserType="Chrome (headless)" \
  -testSuitePath="Test Suites/Regression" \
  -apiKey="$KATALON_API_KEY"
```

Critical: `--shm-size="2g"` prevents Chrome tab crashes. Always pin image version.

## GitHub Actions

```yaml
- name: Run Katalon Tests
  uses: katalon-studio/katalon-studio-github-action@v2.1
  with:
    version: '11.1.0'
    projectPath: '${{ github.workspace }}'
    args: >-
      -noSplash -retry=2 -retryStrategy=failedExecutions
      -browserType="Chrome (headless)"
      -testSuitePath="Test Suites/Regression"
      -apiKey=${{ secrets.KATALON_API_KEY }}

- name: Upload Reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: katalon-reports
    path: Reports/
```

## Jenkins (Jenkinsfile)

```groovy
stage('Test') {
    steps {
        sh 'docker run -t --rm --shm-size="2g" -v "$(pwd)":/tmp/project katalonstudio/katalon:11-latest-slim katalonc.sh -projectPath=/tmp/project -browserType="Chrome (headless)" -testSuitePath="Test Suites/Regression" -apiKey=${KATALON_API_KEY}'
    }
}
post { always { junit 'Reports/**/JUnit_Report.xml' } }
```

## GitLab CI

```yaml
test:
  image: katalonstudio/katalon:11-latest-slim
  script:
    - katalonc.sh -projectPath=$CI_PROJECT_DIR -browserType="Chrome (headless)" -testSuitePath="Test Suites/Regression" -apiKey=$KATALON_API_KEY
  artifacts:
    when: always
    reports:
      junit: Reports/**/JUnit_Report.xml
```

## Parallel Execution

Use Test Suite Collections (TSC) with Parallel mode:
- Split large suites into 20 TCs per suite max
- `-delayBetweenInstances=45` prevents resource spikes
- 10x4 rule: 10 containers with 4 threads each (not 1 with 40)

```bash
katalonc ... -testSuiteCollectionPath="Test Suites/Parallel_Collection"
```

## TestCloud

No infrastructure to manage. Use `-testcloudEnvironmentId=<ID>` (generate via Command Builder in Studio).

## Exit Codes

- `0` = all tests passed
- Non-zero = failures or execution error
- Use `-maxFailedTests=N` as a circuit breaker

## Best Practices

1. Always headless in CI (saves 30% resources)
2. Pin Katalon Docker image version (not `latest`)
3. Store API key as masked secret in CI tool
4. Publish JUnit XML reports (always, even on failure)
5. Enable `-enableLicenseRetry` for flaky network
6. Use `-retryStrategy=failedExecutions` to only re-run failures
7. Partition: max 20 test cases per suite for optimal parallelism
