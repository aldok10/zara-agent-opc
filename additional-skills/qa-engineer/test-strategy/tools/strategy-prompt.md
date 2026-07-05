---
type: tool
title: "Test Strategy Design Prompt"
---

# Test Strategy Design Prompt

## Purpose
Design a complete test strategy for a project, including test architecture, tooling, coverage goals, and CI integration.

## Inputs Required
- Project type (web app, API, mobile, microservices, library)
- Tech stack (language, framework, database, infra)
- Team size and testing experience
- Release cadence
- Existing tests (if any)
- Quality goals (what "done" means for testing)
- Time/budget constraints

## Strategy Design Steps

### 1. Define Quality Goals

```markdown
## Quality Objectives
- [ ] Deploy with confidence (no fear of breaking production)
- [ ] Fast feedback (<10 min for PR checks)
- [ ] Regression prevention (bugs don't recur)
- [ ] Performance stability (no degradation over time)
- [ ] Security assurance (OWASP Top 10 covered)

## Key Metrics
- Test pass rate: > 99% (flaky tests eliminated)
- PR feedback time: < [X] minutes
- Production defect escape rate: < [X] per sprint
- Test maintenance burden: < [X] hours/sprint
```

### 2. Choose Test Shape

Based on project type:
- Library → Pyramid (heavy unit)
- Web app → Trophy (heavy integration)
- Microservices → Diamond (heavy integration + contracts)
- Mobile → Device-stratified (unit + integration + device E2E)

### 3. Define Test Layers

```markdown
## Test Architecture

### Layer 1: Static Analysis
- Type checking: [tool]
- Linting: [tool]
- Security scanning: [tool]
- Run: every file save + CI

### Layer 2: Unit Tests
- Framework: [tool]
- Coverage target: [X]% for business logic
- What to test: pure functions, validation, transformations
- What NOT to test: framework code, trivial getters, generated code

### Layer 3: Integration Tests
- Framework: [tool]
- Scope: [what counts as integration]
- Dependencies: real DB, mocked external APIs
- Coverage target: critical paths + error handling

### Layer 4: E2E Tests
- Framework: [Playwright / Cypress / etc.]
- Scope: top [N] user flows only
- Environment: [staging / dedicated E2E env]
- Run: pre-merge or nightly

### Layer 5: Non-Functional
- Performance: [k6 / artillery]  -  [when to run]
- Security: [SAST + DAST]  -  [when to run]
- Accessibility: [axe-core]  -  [when to run]
```

### 4. Test Data Strategy

```markdown
## Data Approach
- Unit tests: inline test data, factories, builders
- Integration tests: [seed DB / fixtures / testcontainers]
- E2E tests: [dedicated test accounts / API-seeded data]
- Isolation: [how tests don't interfere with each other]
- Cleanup: [automatic / after-each / shared DB reset]
```

### 5. CI/CD Integration

```markdown
## Pipeline Design

### PR Checks (must pass to merge)
- [ ] Lint + type check (~30s)
- [ ] Unit tests (~2 min)
- [ ] Integration tests (~5 min)
- [ ] Security scan (~1 min)
- Total: < [X] min

### Post-Merge (main branch)
- [ ] Full E2E suite
- [ ] Performance baseline
- [ ] Deploy to staging

### Pre-Release
- [ ] Smoke test on staging
- [ ] Manual exploratory testing for [areas]
- [ ] Sign-off from [who]
```

### 6. Maintenance Plan

```markdown
## Keeping Tests Healthy
- Flaky test budget: [0 / max 3 quarantined]
- Test review: included in code review
- Coverage trending: checked [weekly/monthly]
- Test cleanup: remove tests for deleted features
- Ownership: [who owns test infrastructure]
```

## Output Format

```markdown
## Test Strategy: [Project Name]

### Summary
| Aspect | Decision |
|--------|----------|
| Shape | [Pyramid/Trophy/Diamond] |
| Primary framework | [name] |
| E2E framework | [name] |
| Coverage target | [X]% |
| PR feedback goal | < [X] min |

### Architecture
[Layer diagram with tools and targets]

### Risk-Based Coverage
| Area | Risk | Coverage Level |
|------|------|---------------|

### CI Pipeline
[Stage diagram]

### Team Responsibilities
| Role | Testing Responsibility |
|------|----------------------|

### Investment
- Setup time: [X days]
- Ongoing maintenance: [X hours/sprint]
- Tool costs: [$X/month]

### Success Metrics (measure in 3 months)
- [ ] Production defects reduced by [X]%
- [ ] PR feedback time < [X] min
- [ ] Zero flaky tests in CI
- [ ] Team confidence: "I trust the tests"
```
