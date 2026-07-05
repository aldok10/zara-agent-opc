---
type: fact
title: "Technical Debt Quantification"
---

# Technical Debt Quantification

## Why Quantify

"We have tech debt" doesn't get budget. Quantification answers:
- How much does this debt cost us per week/month?
- What's the ROI of paying it down?
- Which debt items should we address first?
- Are we accumulating faster than we're paying down?

## DORA Metrics Impact

Technical debt directly affects DORA metrics:

| DORA Metric | How Debt Affects It |
|---|---|
| Deployment Frequency | Complex codebase = slower to ship safely |
| Lead Time for Changes | Tangled dependencies = longer to implement |
| Change Failure Rate | Brittle code = more production incidents |
| Mean Time to Recovery | Hard-to-understand systems = slower debugging |

### Tracking Correlation
```
Plot monthly:
- Deployment frequency vs tech debt tickets created
- Change failure rate vs code health score
- Lead time vs codebase complexity metrics
```

If DORA metrics are declining while feature velocity stays constant, debt is likely accumulating.

## Code Health Metrics

### Automated Indicators

| Metric | Tool | Threshold |
|---|---|---|
| Cyclomatic complexity | SonarQube, CodeClimate | >10 per function = concern |
| Dependency freshness | Renovate, Dependabot | >6 months behind = risk |
| Test coverage trend | CI coverage reports | Declining = debt signal |
| Code duplication | SonarQube | >5% = refactoring needed |
| File coupling | CodeScene | High coupling = change risk |
| Hotspot frequency | CodeScene, git log | Frequently changed + complex = priority |

### CodeScene-Style Analysis
Identify "hotspots": files that are both:
1. Changed frequently (high churn)
2. Complex (high cyclomatic complexity or file size)

These are your highest-ROI refactoring targets.

```
Priority Score = Change Frequency × Complexity Score
```

## Refactoring ROI

### Cost-of-Delay Model
```
Current state: Feature X takes 3 weeks to implement
After refactoring: Feature X takes 1 week
Refactoring cost: 2 weeks

ROI: breaks even after first feature (2 weeks saved - 2 weeks invested)
     Net positive from second feature onward
```

### Calculation Template
```
Annual cost of debt item:
  - Extra dev time per feature: X hours × Y features/year
  - Incident cost: Z incidents × W hours × hourly rate
  - Onboarding cost: N new hires × extra ramp-up days
  = Total annual cost

Remediation cost:
  - Estimated effort × (1 + risk buffer 20%)
  
Payback period = Remediation cost / (Annual cost savings / 12 months)
```

### Presenting to Leadership
```
"This API layer costs us 2 extra engineer-weeks per quarter in
workarounds. Refactoring takes 3 weeks. We break even in 6 weeks
and save ~6 engineer-weeks per year going forward."
```

Frame debt in terms leadership understands:
- Dollars (not complexity scores)
- Opportunity cost (features we CAN'T build)
- Risk (probability and cost of incidents)

## Debt Registers

### What to Track

| Field | Description |
|---|---|
| ID | Unique identifier (DEBT-001) |
| Title | Short description |
| Category | Code, architecture, test, infrastructure, dependency |
| Impact | Quantified cost (hours/month, incidents/quarter) |
| Remediation effort | Estimated investment to fix |
| Priority | Based on impact/effort ratio |
| Owner | Team or person responsible |
| Created | When identified |
| Status | Identified, planned, in-progress, resolved |

### Categories

**Code debt**: complex functions, duplication, unclear naming
**Architecture debt**: wrong patterns, scaling limitations, tight coupling
**Test debt**: missing coverage, flaky tests, slow suites
**Infrastructure debt**: outdated tooling, manual processes, legacy systems
**Dependency debt**: outdated libraries, security vulnerabilities, unsupported versions

### Example Register Entry
```
ID: DEBT-042
Title: Payment service monolithic transaction handler
Category: Architecture
Impact: 4h/week extra debugging, 2 incidents/month from coupling
Remediation: 3 weeks to extract into separate services
Priority: HIGH (ROI = positive within 2 months)
Owner: Payments team
Status: Planned for Q2
```

## Measurement Framework

### Debt Ratio
```
Debt Ratio = Time spent on debt-related work / Total engineering time
```

Track via:
- Labels on tickets (debt, refactoring, maintenance)
- Time tracking categories
- Sprint retrospective estimates

Healthy: 10-20% of time on debt maintenance
Concerning: >30% means debt is dominating
Critical: >50% means new feature development stalled

### Debt Velocity
```
Accumulation rate: new debt tickets created per sprint
Payment rate: debt tickets resolved per sprint
Net change: accumulation - payment
```

If net change is consistently positive, debt is growing. Allocate more capacity.

### Budget Allocation Models

**Fixed allocation**: 20% of every sprint dedicated to debt
- Pro: consistent, predictable
- Con: may not match actual need

**Debt sprints**: one full sprint per quarter focused on debt
- Pro: deep focus, big items get done
- Con: debt accumulates between sprints

**Tax model**: every feature PR must include one debt-related improvement
- Pro: continuous improvement
- Con: may result in superficial changes

**Impact-driven**: prioritize debt items that affect current quarter OKRs
- Pro: highest business alignment
- Con: some debt never gets addressed

## Anti-Patterns

- Tracking debt without measuring cost (it's just a list)
- Measuring only code metrics (architecture debt often more expensive)
- Paying down low-impact debt because it's easy (feels productive, low value)
- Never allocating time for debt (accumulates until crisis)
- Treating all debt as equal priority (some debt is acceptable to carry)
- Rewriting instead of refactoring (higher risk, often unnecessary)
- Not connecting debt to business outcomes (no executive buy-in)
- Perfectionism: zero debt is not the goal (some debt is strategic)
