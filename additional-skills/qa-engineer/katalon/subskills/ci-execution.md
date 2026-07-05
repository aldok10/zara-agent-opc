# Katalon CI/CD Execution

Run tests headless in pipelines with Katalon Runtime Engine (KRE).

## KRE CLI Essential Flags

```bash
katalonc -projectPath="/repo/project.prj" \
  -testSuitePath="Test Suites/Regression" \
  -browserType="Chrome (headless)" \
  -executionProfile="staging" \
  -apiKey="$KATALON_API_KEY" \
  -retry=2 \
  -retryStrategy="FAILED_TEST_CASES" \
  -maxFailedTests=5 \
  -report.folderPath="/repo/reports"
```

- `-retryStrategy`: `FAILED_TEST_CASES` or `ALL_TEST_CASES`
- `-maxFailedTests`: abort suite after N failures
- Exit code `0` = pass, non-zero = failure

## Docker Execution

```bash
docker run --rm --shm-size=2g \
  -v "$PWD:/katalon/katalon/source" \
  katalonstudio/katalon:9.0.0 \
  katalonc -projectPath="/katalon/katalon/source/project.prj" \
  -testSuitePath="Test Suites/Smoke" \
  -browserType="Chrome (headless)" \
  -apiKey="$KATALON_API_KEY"
```

Pin the image version. `--shm-size=2g` prevents Chrome crashes from small `/dev/shm`.

## GitHub Actions

```yaml
- uses: katalon-studio/katalon-studio-github-action@v2.1
  with:
    version: '9.0.0'
    projectPath: '${{ github.workspace }}/project.prj'
    args: >-
      -testSuitePath="Test Suites/Regression"
      -browserType="Chrome (headless)"
      -apiKey=${{ secrets.KATALON_API_KEY }}
```

## Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Test') {
      steps {
        sh '''katalonc -projectPath="$WORKSPACE/project.prj" \
          -testSuitePath="Test Suites/Regression" \
          -browserType="Chrome (headless)" \
          -apiKey=$KATALON_API_KEY'''
      }
    }
  }
  post { always { junit 'reports/**/JUnit_Report.xml' } }
}
```

## GitLab CI

```yaml
test:
  image: katalonstudio/katalon:9.0.0
  script:
    - katalonc -projectPath="$CI_PROJECT_DIR/project.prj"
      -testSuitePath="Test Suites/Regression"
      -browserType="Chrome (headless)" -apiKey="$KATALON_API_KEY"
  artifacts:
    reports:
      junit: reports/**/JUnit_Report.xml
```

## Azure DevOps

```yaml
- script: |
    katalonc -projectPath="$(Build.SourcesDirectory)/project.prj" \
      -testSuitePath="Test Suites/Regression" \
      -browserType="Chrome (headless)" -apiKey="$(KATALON_API_KEY)"
- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'reports/**/JUnit_Report.xml'
```

## Parallel Execution

Use Test Suite Collections:

```bash
katalonc -testSuiteCollectionPath="Test Suites/Nightly Collection" \
  -delayBetweenInstances=45
```

`-delayBetweenInstances=45` staggers browser startup to reduce resource spikes.

## TestCloud

Run across 3000+ browser/device combos:

```bash
katalonc -testcloudEnvironmentId=12345 -apiKey="$KATALON_API_KEY"
```

## License Management

- Pass `-apiKey` as a CI secret, never hardcode.
- Add `-enableLicenseRetry` so transient license-server errors retry instead of failing the build.

## Best Practices

- Keep ~20 test cases per suite max for balanced parallelism.
- Scale with ~10 containers x 4 threads.
- Headless mode saves ~30% resources.
- Always publish JUnit XML for pipeline reporting.
