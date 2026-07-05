---
type: fact
title: "Fowler's Technical Debt Quadrant"
---

# Fowler's Technical Debt Quadrant

```
                    DELIBERATE                    INADVERTENT
           ┌──────────────────────────┬──────────────────────────┐
           │ "We don't have time      │ "What's layering?"       │
 RECKLESS  │  for design"             │                          │
           │                          │                          │
           │ → High priority fix      │ → Training + fix now     │
           │ → Track, fix in 2 sprints│ → Systemic root cause    │
           ├──────────────────────────┼──────────────────────────┤
           │ "We must ship now and    │ "Now we know how we      │
 PRUDENT   │  deal with consequences" │  should have done it"    │
           │                          │                          │
           │ → ADR + repayment plan   │ → Refactor when touched  │
           │ → Define payoff trigger  │ → Add to register        │
           └──────────────────────────┴──────────────────────────┘
```

## Examples Per Cell

| Quadrant | Example |
|----------|---------|
| Reckless-Deliberate | Skipping auth validation to hit deadline |
| Reckless-Inadvertent | Junior dev creates circular dependencies unknowingly |
| Prudent-Deliberate | Monolith deployment knowing microservice needed later |
| Prudent-Inadvertent | Discovering ORM doesn't scale after load test reveals limits |

## Decision Tree

1. Was the debt taken on knowingly? → Yes=Deliberate, No=Inadvertent
2. Was the trade-off considered carefully? → Yes=Prudent, No=Reckless
3. Apply action from quadrant above
4. If Reckless-Inadvertent: investigate team capability gap before fixing code

## Response Priority

1. Reckless-Inadvertent (capability gap - most dangerous)
2. Reckless-Deliberate (conscious negligence - high risk)
3. Prudent-Deliberate (managed risk - track and plan)
4. Prudent-Inadvertent (learning debt - lowest urgency)

## AI-Generated Debt (2024-2025 Crisis)

### Scale

- ~41% of code in production now AI-generated (GitHub CEO statement, 2024; figure continues to rise)
- AI-generated code shows significantly higher churn rates (GitClear 2024: 2x code churn, reduced refactoring and code reuse)
- PR review burden increases substantially in AI-heavy teams (some samples show 4x+ increase, limited studies)
- Code churn (write-then-rewrite within 2 weeks) doubled in AI-assisted repos

### New Quadrant Consideration

AI debt is primarily **Reckless-Inadvertent**: developers accept suggestions without understanding implications. Treat as capability gap + process gap.

### Three-Layer Approach

1. **Detection**: identify AI-generated code (Exceeds AI, git-blame patterns, commit velocity spikes)
2. **Remediation**: auto-generate PRs to fix known AI debt patterns (Codegen, SweepAI)
3. **Tracking**: separate AI-debt backlog, measure AI debt ratio over time

### Tooling

| Tool | Function |
|------|----------|
| Codegen | Auto-creates PRs to fix detected debt patterns |
| Exceeds AI | Detects AI-generated code in repos |
| GitClear | Measures code churn, identifies AI-pattern waste |
| SonarQube AI Rules | Flags common AI-generated anti-patterns |
