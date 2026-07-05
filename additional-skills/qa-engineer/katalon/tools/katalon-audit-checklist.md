# Katalon Project Audit Checklist

## Structure
- [ ] Object Repository follows Page Object Model (folders mirror pages/components)
- [ ] Test Cases mirrored to Object Repository structure
- [ ] Custom Keywords organized by domain package (com.project.web, com.project.api)
- [ ] Test Suites grouped by purpose (Smoke, Regression, DataDriven)
- [ ] Test Suite Collections configured for parallel execution

## Reliability
- [ ] Zero usage of Thread.sleep() -- only WebUI.waitFor* keywords
- [ ] Self-healing enabled in Project Settings
- [ ] No absolute XPath locators (use relative, CSS, or Smart Locator)
- [ ] Parameterized Test Objects for dynamic elements (${variable} syntax)
- [ ] No string concatenation in findTestObject calls
- [ ] Test Listeners handle setup/teardown (not duplicated per test case)

## Security
- [ ] No hardcoded credentials in scripts or Global Variables
- [ ] Sensitive values marked as Protected in Execution Profiles
- [ ] API keys passed via CI secrets, not committed to repo
- [ ] .gitignore excludes Reports/, bin/, .settings/, .project, .classpath

## Configuration
- [ ] Execution Profiles exist for all target environments (dev, staging, prod)
- [ ] Default wait timeout configured appropriately (not too high)
- [ ] Global Variables use UPPERCASE naming convention

## Documentation
- [ ] Custom keywords have KDoc comments (description, params, return)
- [ ] README explains project structure and how to run locally
- [ ] Naming follows convention: TC_Feature_Scenario, PageName/elementType

## CI/CD
- [ ] Pipeline uses headless browser mode
- [ ] Katalon Docker image version is pinned (not :latest)
- [ ] --shm-size=2g set for Docker Chrome execution
- [ ] JUnit XML reports published (always, even on failure)
- [ ] Retry configured for flaky recovery (-retry=2 -retryStrategy=failedExecutions)

## Observability
- [ ] TestOps integration active (results uploaded after each run)
- [ ] No flaky tests in CI (quarantined within 24h, fixed within 48h)
- [ ] Self-healing reports reviewed weekly
- [ ] Test execution trends monitored for regression
