---
type: tool
title: "Test Coverage Model Prompt"
---

# Test Coverage Model Prompt

## Purpose
Design a test coverage model that maps risk levels to test types, creating a balanced strategy based on probability and impact rather than raw line coverage.

## When to Use
- Defining test strategy for a new project or service
- Rebalancing test effort after finding gaps in production
- Justifying test investment to stakeholders
- Mapping which test types cover which risks

## Prompt Template

```
You are a QA strategist designing a risk-based test coverage model.

CONTEXT:
- System: {system_name}
- Architecture: {monolith|microservices|serverless|hybrid}
- Team size: {count}
- Release cadence: {daily|weekly|biweekly}
- Production incidents (last quarter): {count_and_categories}
- Current test types: {unit|integration|e2e|manual|none}
- Compliance requirements: {SOC2|HIPAA|PCI|none}

SYSTEM COMPONENTS:
{list_major_modules_with_brief_description}

BUILD THE MODEL:

1. RISK MATRIX
   - For each component: probability of defect × impact if defect occurs
   - Probability: based on change frequency, complexity, team familiarity
   - Impact: user-facing severity, data loss risk, revenue impact
   - Score: Critical / High / Medium / Low

2. TEST TYPE MAPPING
   For each risk level, assign test types:
   - Critical: unit + integration + e2e + contract + security + chaos
   - High: unit + integration + e2e + contract
   - Medium: unit + integration + selective e2e
   - Low: unit + smoke

3. COVERAGE TARGETS (per component, not global)
   - Unit: code paths that encode business rules
   - Integration: boundaries between components
   - E2E: user journeys (not all permutations)
   - Contract: all inter-service APIs
   - Performance: SLA-bound endpoints

4. INVESTMENT ALLOCATION
   - Time split recommendation across test types
   - Where to add coverage vs where to reduce
   - Automation vs manual decision matrix
   - Maintenance cost per test type

5. MEASUREMENT
   - Leading indicators: coverage delta, test creation rate
   - Lagging indicators: defect escape rate, MTTR
   - Not just "coverage %" — meaningful coverage metrics

RULES:
- 100% line coverage is not the goal — risk-proportional coverage is
- More tests where failures are expensive, fewer where they're cheap
- Account for test maintenance cost in the model
- Flag areas with "coverage theater" (tests that pass but verify nothing)
```

## Output Format

```markdown
## Test Coverage Model

### Risk Matrix
| Component | Change Freq | Complexity | Impact | Risk Level |
|-----------|-------------|-----------|--------|------------|

### Test Strategy Map
| Component | Unit | Integration | E2E | Contract | Perf | Security |
|-----------|------|-------------|-----|----------|------|----------|

### Investment Allocation
- Unit tests: X% of effort
- Integration: X%
- E2E: X%
- Other: X%

### Key Metrics
| Metric | Current | Target | Measurement |

### Gaps to Address (Priority Order)
1. [Highest risk gap]
2. [Next priority]
```
