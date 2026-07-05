---
type: fact
title: "Risk-Based Testing"
---

# Risk-Based Testing

## Core Concept

Risk-based testing prioritizes test effort where failures would cause the most damage. Instead of testing everything equally, focus resources on high-risk areas.

**Risk = Probability of Failure × Impact of Failure**

## Risk Assessment Matrix

```
           Impact
         Low  Med  High
High   | Med | High | Critical |
Prob.  | Low | Med  | High     |
Low    | Low | Low  | Med      |
```

## Identifying Risk Factors

### Probability Factors (Likelihood of Bugs)
| Factor | Higher Risk | Lower Risk |
|--------|------------|------------|
| Code change frequency | Changed often | Stable, rarely modified |
| Code complexity | High cyclomatic complexity | Simple, linear |
| Developer experience | New team, unfamiliar domain | Experienced, domain experts |
| Technology maturity | New framework, beta features | Proven, well-understood |
| Integration points | Many external dependencies | Self-contained |
| Historical bugs | Previous defects in area | Clean history |

### Impact Factors (Consequence of Failure)
| Factor | Higher Risk | Lower Risk |
|--------|------------|------------|
| User-facing | Critical user flow | Admin-only, internal |
| Revenue | Payment, ordering | Settings page |
| Data | Financial, PII, health | Preferences, UI state |
| Blast radius | Affects all users | Affects small subset |
| Recovery | Hard to roll back | Easy to fix/revert |
| Compliance | Regulated (HIPAA, PCI) | No regulatory concern |
| Reputation | Public-facing, viral potential | Internal tooling |

## Risk-Based Test Prioritization

### Step 1: Map Features to Risk Level
```markdown
| Feature | Probability | Impact | Risk Score | Test Priority |
|---------|-------------|--------|------------|---------------|
| Payment processing | Medium | Critical | Critical | P0 - Full coverage |
| User registration | Low | High | High | P1 - Happy + error paths |
| Search | Medium | Medium | Medium | P2 - Core scenarios |
| Dark mode toggle | Low | Low | Low | P3 - Minimal/no testing |
```

### Step 2: Allocate Test Effort
| Risk Level | Test Coverage | Test Types |
|-----------|--------------|------------|
| Critical | Full (90%+) | Unit + Integration + E2E + Performance + Security |
| High | Strong (70-90%) | Unit + Integration + E2E for happy path |
| Medium | Moderate (50-70%) | Unit + Key integration paths |
| Low | Minimal (20-50%) | Unit for core logic only |

### Step 3: Define Coverage Rules
```markdown
## Testing Requirements by Risk

### P0 (Critical)
- All edge cases unit tested
- Integration tests with real dependencies
- E2E for complete user flows
- Load testing at expected peak
- Security testing (penetration)
- Failure mode testing (what if X is down?)

### P1 (High)
- Happy path + top 3 error paths unit tested
- Integration with key dependencies
- E2E for primary flow
- Basic load test

### P2 (Medium)
- Happy path unit tested
- Key integration points tested
- Smoke test in E2E suite

### P3 (Low)
- Unit test if logic is non-trivial
- No dedicated integration or E2E
- Covered by broader smoke tests
```

## When to Re-Assess Risk

- After production incidents (affected area risk increases)
- After architecture changes (new integration = new risk)
- When compliance requirements change
- Before major releases (full risk review)
- Quarterly (scheduled re-evaluation)

## Risk-Based Regression Testing

### Test Selection for Time-Constrained Runs
When you can't run all tests (hotfix, time pressure):

```markdown
## Regression Priority

### Must Run (always, even for hotfix)
- [Critical path tests: login, payment, core action]
- [Tests related to changed code]
- [Tests that failed recently]

### Should Run (normal PR)
- [Full suite minus slow E2E]
- [Integration tests for affected services]

### Full Run (pre-release)
- [Everything including slow tests]
- [Performance regression suite]
- [Cross-browser/device matrix]
```

### Smart Test Selection
Techniques for choosing which tests to run:
1. **Changed-file mapping**: map source files to test files, run only related
2. **Dependency graph**: if module A changed, run tests for A and its dependents
3. **Historical failure correlation**: tests that commonly fail together
4. **Time-based**: recently added tests are more likely to catch regressions

## Risk-Based Bug Triage

When bugs are found, severity + priority based on risk:

| Severity | Criteria | Response |
|----------|----------|----------|
| Critical | P0 feature broken, data loss, security breach | Fix immediately, hotfix |
| High | P0/P1 feature degraded, workaround exists | Fix this sprint |
| Medium | P2 feature broken, minor UX issue | Fix next sprint |
| Low | P3 feature, cosmetic, rare edge case | Backlog |

## Communicating Risk Decisions

### To Stakeholders
"We are testing payment flows extensively (30% of test effort) because a failure there directly impacts revenue and user trust. We are testing the settings page minimally (5% of effort) because failures there are low-impact and easily reversible."

### In Documentation
```markdown
## Test Strategy Risk Decisions

### Accepted Risks
| Area | Risk | Why Accepted | Mitigation |
|------|------|-------------|------------|
| Dark mode | Visual bugs | Low impact, easy hotfix | Manual spot check |
| Legacy export | Edge cases | <1% users, alternative path exists | Error monitoring |
```
