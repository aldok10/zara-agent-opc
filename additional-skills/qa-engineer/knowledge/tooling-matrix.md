---
type: fact
title: "QA Tooling Matrix - Tool Selection by Context"
---

# QA Tooling Matrix

## E2E / Browser Testing

| Tool | Best For | Language | Speed |
|------|----------|----------|-------|
| Playwright | Modern web, cross-browser, API | TypeScript/JS | Fast |
| Cypress | SPA, component testing, DX | TypeScript/JS | Medium |
| Selenium | Legacy, multi-language | Any | Slow |
| TestCafe | Simple setup, no WebDriver | TypeScript/JS | Medium |

**Decision:** Playwright for new projects. Cypress if team invested. Selenium only for existing suites.

## API Testing

| Tool | Best For | Integration |
|------|----------|-------------|
| Pact | Consumer-driven contracts | CI broker |
| Supertest | Node.js HTTP assertions | Jest/Vitest |
| REST Assured | Java API testing | JUnit/TestNG |
| Postman/Newman | Collaboration, manual+auto | CI runner |
| Dredd | OpenAPI compliance | API Blueprint/OAS |
| Spectral | OpenAPI linting | CI/pre-commit |

## Performance Testing

| Tool | Best For | Protocol |
|------|----------|----------|
| k6 | Developer-friendly, CI, scriptable | HTTP/WS/gRPC |
| Gatling | Java/Scala teams, complex scenarios | HTTP |
| Locust | Python teams, distributed | HTTP |
| Artillery | Quick setup, YAML config | HTTP/WS |
| JMeter | GUI-based, legacy | Any |

**Decision:** k6 for new projects (scriptable, CI-friendly, Grafana ecosystem).

## Security Testing

| Category | Tool | Speed | Depth |
|----------|------|-------|-------|
| SAST | Semgrep | Fast | Pattern-based |
| SAST | CodeQL | Slow | Deep dataflow |
| DAST | ZAP | Medium | Comprehensive |
| DAST | Nuclei | Fast | Template-based |
| SCA | Snyk | Fast | Vuln DB |
| SCA | Trivy | Fast | Multi-target |
| Secrets | gitleaks | Fast | Regex + entropy |
| Secrets | truffleHog | Medium | Verified secrets |

## Mutation Testing

| Language | Tool | CI Support |
|----------|------|------------|
| JS/TS | Stryker | Excellent |
| Java | PIT (pitest) | Excellent |
| Python | mutmut | Good |
| C# | Stryker.NET | Good |
| Rust | cargo-mutants | Emerging |
| PHP | Infection | Good |

## Accessibility

| Tool | Type | Coverage |
|------|------|----------|
| axe-core | Automated | ~40% of WCAG |
| pa11y | Automated (CI) | ~40% of WCAG |
| Lighthouse | Audit (score) | Subset |
| WAVE | Browser extension | Visual |
| ANDI | Bookmarklet | Focus/structure |

## Mobile

| Tool | Platform | Type |
|------|----------|------|
| Appium 2 | iOS + Android | Black-box |
| Detox | React Native | Gray-box |
| Espresso | Android native | White-box |
| XCTest | iOS native | White-box |
| Maestro | iOS + Android | Declarative |

## Visual Regression

| Tool | Type | Storage |
|------|------|---------|
| Playwright screenshots | Free, built-in | Git |
| Chromatic | Storybook-native | Cloud |
| Percy | Cross-browser | Cloud |
| BackstopJS | Open-source | Git |
| reg-suit | GitHub PR integration | S3/GCS |
