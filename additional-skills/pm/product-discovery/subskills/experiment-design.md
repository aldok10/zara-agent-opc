---
type: subskill
title: "Experiment Design"
---

# Experiment Design

## Method Selection Matrix

| Method | Time | Cost | Learning | Best For |
|--------|------|------|----------|----------|
| Fake door | 1-3 days | Low | Demand signal | Desirability validation |
| Landing page | 3-5 days | Low | Demand + messaging | Value prop testing |
| Concierge | 1-2 weeks | Med | Feasibility + value | Manual delivery of solution |
| Wizard of Oz | 1-2 weeks | Med | UX + desirability | Simulated automation |
| Prototype test | 3-5 days | Low | Usability | Interaction design |
| A/B test | 2-4 weeks | Med | Optimization | Existing feature variants |
| Painted door | 1 day | Low | Interest signal | Feature demand |
| Survey | 2-3 days | Low | Stated preference | Broad signal (weak evidence) |

## When to Use Each

**Fake door**: Add button/link to measure clicks. Validates demand before building.
Requires: existing traffic. Yields: conversion rate. Strength: behavioral, not stated.

**Concierge**: Deliver solution manually to small group. Validates value + feasibility.
Requires: direct user access. Yields: retention, willingness to pay. Strength: real usage data.

**Wizard of Oz**: User thinks it's automated, human behind curtain. Validates UX.
Requires: ops capacity. Yields: completion rates, satisfaction. Strength: real interaction.

**A/B test**: Split traffic between variants. Validates optimization.
Requires: statistical traffic volume. Yields: causal impact. Strength: controlled experiment.

**Prototype test**: Clickable mockup, 5 users attempt tasks. Validates usability.
Requires: design prototype. Yields: task success rate. Strength: fast, cheap usability signal.

## Sample Size Guidelines

| Method | Minimum | Ideal | Note |
|--------|---------|-------|------|
| Usability test | 5 | 8 | Diminishing returns after 5 |
| Interviews | 5 | 12 | Per segment |
| Fake door | 100 clicks | 500+ | For meaningful conversion rate |
| A/B test | Calculate per MDE |  -  | Use power calculator |
| Survey | 30 | 100+ | Per segment |

## Minimum Detectable Effect (A/B)

- Decide smallest meaningful difference BEFORE running
- Use power calculator: baseline rate, MDE, significance (0.05), power (0.8)
- If required sample > available traffic: use qualitative method instead
- Don't peek at results early - commit to duration

## Experiment Brief Template

```
EXPERIMENT: [name]
METHOD: [from matrix above]
VALIDATES: [assumption statement]
DURATION: [start - end]
SAMPLE: [who, size, recruitment]
SUCCESS: [metric >= threshold]
KILL: [metric < threshold OR duration exceeded]
DECISION RULES:
  - Success → [next action]
  - Inconclusive → [next action]
  - Failure → [next action: pivot/kill]
```

## Rules

- Define success/kill criteria BEFORE launch (pre-registration)
- One hypothesis per experiment - isolate variables
- Time-box: no open-ended experiments
- Inconclusive != success - redesign or pick stronger method
- Document learnings regardless of outcome
- Share results within 48h of completion
