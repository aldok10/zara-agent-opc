# Test Planning

## Test Plan Template

Structure every test plan around these sections:

### Scope
- Features/modules under test
- Explicitly out of scope items
- Dependencies and assumptions

### Approach
- Test types: unit, integration, e2e, performance, accessibility
- Automation vs manual ratio (target: >80% automated)
- Risk-based priority: critical paths first

### Resources
- Team members and roles (who writes, who reviews)
- Environments needed (count, specs)
- Tools and licenses required
- Test data requirements

### Schedule
- Phase alignment with development sprints
- Milestones: test design complete, automation ready, regression pass
- Buffer for flake investigation and infrastructure issues

### Risks
- Known risks and mitigation strategies
- Contingency for environment unavailability
- Dependencies on external systems/teams

## Environment Strategy

| Environment | Purpose | Data | Deploy |
|-------------|---------|------|--------|
| Local/Dev | Unit + component tests | Mocks/fixtures | On commit |
| Integration | Service interaction tests | Seeded DB | On merge |
| Staging | Full e2e, performance | Production-like | On release candidate |
| Production | Smoke, synthetic monitoring | Real (read-only) | Post-deploy |

Key decisions:
- Staging must mirror production topology (same services, same infra)
- Ephemeral environments for PR-level e2e (cost vs confidence tradeoff)
- Data isolation: each environment has independent state

## Data Strategy

**Factories** (preferred for unit/integration):
```ts
const user = UserFactory.build({ role: 'admin', verified: true })
```

**Synthetic data** (for load/performance):
- Generate realistic volumes matching production patterns
- Anonymized production snapshots for edge cases
- Refresh cadence: weekly or per-release

**Seeded databases**:
- Version-controlled seed scripts
- Idempotent: can re-run without side effects
- Minimal: only data needed for test scenarios

## Timeline

| Phase | Test Activity |
|-------|--------------|
| Design | Write acceptance criteria, identify test scenarios |
| Sprint start | Design test cases, set up fixtures |
| During dev | Unit tests (TDD), component tests |
| Feature complete | Integration tests, API contract tests |
| Pre-release | Full regression, performance, accessibility |
| Post-release | Smoke tests, synthetic monitoring |

## Tool Selection Criteria

Choose tools based on project needs:
- **Language/framework fit**: native tools reduce friction
- **CI integration**: first-class support in your pipeline
- **Team familiarity**: learning curve vs capability tradeoff
- **Maintenance cost**: community activity, breaking changes frequency
- **Reporting**: actionable output, trend tracking
- **Scalability**: parallel execution, large suite performance

## CI Pipeline Design

```yaml
stages:
  - lint        # Fast feedback: <1min
  - unit        # Parallel by module: <3min
  - build       # Compile/bundle: <2min
  - integration # Service tests: <5min
  - e2e         # Critical paths: <10min
  - performance # Nightly only
  - deploy      # Gated on all above
```

Principles:
- Fastest tests first (fail fast)
- Parallel where possible (split by module/spec)
- Gate deployments on test pass (no manual override without approval)
- Nightly: run expensive suites (mutation, full performance, full a11y)

## Communication

Report test results to stakeholders:
- **Developers**: detailed failure output, stack traces, reproduction steps
- **Team leads**: pass rate, coverage delta, risk areas
- **Product/management**: release readiness (go/no-go), open defects by severity
- **Format**: automated Slack/email for CI results, dashboard for trends
- **Cadence**: per-PR for devs, weekly summary for leads, per-release for product
