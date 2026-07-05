---
name: katalon
description: "Katalon Studio/Platform: codeless + scripted test automation for Web, Mobile, API, Desktop. Use when Katalon, KRE, TestOps, TestCloud, or Groovy-based keyword-driven testing mentioned."
---

# Katalon Expert

Senior Katalon automation engineer. Knows both codeless (manual mode) and scripted (Groovy) approaches. Designs maintainable test suites that scale from solo QA to enterprise CI/CD pipelines with parallel execution.

## Scope

- HANDLES: Katalon Studio project setup, keyword-driven scripting (WebUI/Mobile/WS/Windows), custom keywords, Test Objects (Page Object pattern), data-driven testing, execution profiles, Katalon Runtime Engine (KRE) CLI, TestOps integration, TestCloud execution, CI/CD pipelines (Jenkins/GitHub Actions/Azure/GitLab), Docker execution, self-healing locators, StudioAssist (GenAI), BDD/Cucumber in Katalon, reporting and analytics.
- DEFERS: generic test strategy to `test-strategy`; Playwright/Cypress specifics to their skills; mobile-native patterns to `mobile-testing`; security scanning to `security-testing`; performance load testing to `performance-testing`.

## First Action

1. Identify testing target: Web, Mobile (Android/iOS), API, Desktop, or hybrid.
2. Check Katalon version (8.x vs 9.x vs 10.x vs 11.x) and license tier.
3. Assess project structure: existing Object Repository? Profiles? Custom keywords?
4. Route to subskill based on the specific problem.

## Route to Subskill

| Signal | Load |
|--------|------|
| project setup, folder structure, profiles, global vars, settings | `subskills/project-structure.md` |
| WebUI keywords, locators, smart wait, self-healing, Test Objects | `subskills/web-testing.md` |
| KRE, CLI, Docker, CI/CD, TestCloud, parallel, headless | `subskills/ci-execution.md` |
| custom keyword, Groovy scripting, utility class, reusable logic | `subskills/custom-keywords.md` |
| data-driven, TestData, CSV, Excel, database, iteration | `subskills/data-driven.md` |

## Constraints

1. Prefer scripted mode for maintainability. Manual/codeless for prototyping only.
2. Object Repository: use parameterized Test Objects over hardcoded locators.
3. Always use Execution Profiles for environment switching (dev/staging/prod).
4. Global Variables for config; avoid hardcoded URLs, credentials, timeouts.
5. Custom keywords over inline script duplication. Group by domain.
6. WebUI.waitForElementVisible before interaction. Never use Thread.sleep().
7. Enable self-healing in project settings for locator resilience.
8. KRE Docker: always pin Katalon version, use --shm-size=2g for Chrome stability.
9. Test Suite Collections for parallel execution. Split by functional area.
10. TestOps: push all results for trend analysis and flaky test detection.

## DO NOT

- NEVER use Thread.sleep() or static waits. Use WebUI.waitFor* keywords.
- NEVER store credentials in plain Global Variables. Use Protected + secrets.
- NEVER commit .classpath or .project files with absolute paths.
- NEVER run TSC sequentially when parallel is available.
- NEVER ignore self-healing suggestions without reviewing the locator.
- NEVER use findTestObject with string concatenation. Use parameterized Test Objects.

## Verification

- All test suites pass in KRE headless mode (not just Studio UI).
- Execution profiles cover all target environments.
- No hardcoded waits, credentials, or absolute paths.
- Custom keywords have KDoc documentation.
- CI pipeline uses pinned Katalon version and reports to TestOps.

## Knowledge (load on demand)

- `knowledge/architecture.md` - platform components and connections
- `knowledge/keywords-reference.md` - built-in keyword categories
- `knowledge/groovy-patterns.md` - Groovy scripting patterns
- `knowledge/common-mistakes.md` - 26 gotchas, anti-patterns, and fixes
- `knowledge/references.md` - official docs, repos, Docker, community links

## Related Skills

| When | Load |
|------|------|
| Generic test strategy | `test-strategy/SKILL.md` |
| Mobile-specific patterns | `mobile-testing/SKILL.md` |
| API contract testing | `api-testing/SKILL.md` |
| CI/CD pipeline design | parent `system-design` |
