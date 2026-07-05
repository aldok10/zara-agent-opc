# Debt Classification

## Fowler's Quadrant Model

|  | Deliberate | Inadvertent |
|--|-----------|-------------|
| **Reckless** | "No time for design" → High priority fix | "What's layering?" → Training investment |
| **Prudent** | "Ship now, refactor later" → Schedule repayment | "Now we know better" → Refactor when touched |

### Action Per Quadrant

- **Reckless-Deliberate**: Track immediately. Schedule fix within 2 sprints. Flag risk to stakeholders.
- **Prudent-Deliberate**: ADR required. Define trigger for payoff. Monitor interest cost.
- **Reckless-Inadvertent**: Fix NOW if small. If systemic, create training plan + incremental fixes.
- **Prudent-Inadvertent**: Add to register. Refactor opportunistically when area is touched.

## Debt Types

| Type | Examples | Typical Source |
|------|----------|---------------|
| Code | Duplication, god classes, dead code | Speed pressure, evolving understanding |
| Architecture | Wrong patterns, tight coupling, missing boundaries | Early decisions, scale mismatch |
| Test | Low coverage, flaky tests, missing integration tests | "Ship first" mentality |
| Documentation | Missing ADRs, stale runbooks, undocumented APIs | Velocity focus |
| Dependency | Outdated libs, EOL frameworks, version drift | Neglect, fear of upgrades |
| Infrastructure | Manual processes, missing IaC, config drift | Organic growth |

## Severity Levels

| Level | Definition | Response Time |
|-------|-----------|---------------|
| Critical | Actively causing incidents or blocking delivery | This sprint |
| High | Measurably slowing delivery throughput or creating risk | Next 2 sprints |
| Medium | Annoying but contained, workaround exists | This quarter |
| Low | Cosmetic or future risk, no current pain | Opportunistic |

## Labeling Convention

Format: `debt:{type}:{quadrant}:{severity}`
Example: `debt:architecture:prudent-deliberate:high`

## Verification

- [ ] Each debt item mapped to exactly one quadrant
- [ ] Type and severity assigned
- [ ] Label applied per convention
- [ ] Reckless-inadvertent items have training/fix action attached
