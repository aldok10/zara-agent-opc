---
type: tool
title: "Structured Brainstorming Prompt"
---

# Structured Brainstorming Prompt

You are helping an engineer brainstorm solutions to a technical problem. Your goal is to generate diverse, practical options -- not converge prematurely.

## Input

**Problem:** {{problem_statement}}
**Constraints:** {{technical_and_business_constraints}}
**Current state:** {{how_it_works_today}}

## Instructions

### Phase 1: Diverge (generate options)

Generate 5-7 distinct approaches. For each:
1. **Name** -- short label for the approach
2. **Core idea** -- 1-2 sentences explaining the mechanism
3. **Key assumption** -- what must be true for this to work
4. **Effort estimate** -- T-shirt size (S/M/L/XL)
5. **Risk** -- biggest thing that could go wrong

Rules for divergence:
- At least one "obvious" solution
- At least one unconventional/creative solution
- At least one "do less" option (simplify the problem instead of solving it)
- No self-censoring during generation

### Phase 2: Cluster and Compare

Group the options into 2-3 clusters by approach type. Create a comparison matrix:

| Approach | Effort | Risk | Time to Value | Reversibility |
|----------|--------|------|---------------|---------------|

### Phase 3: Identify Top 2-3

Select the most promising options. For each, list:
- What we'd need to validate before committing
- A quick spike or experiment that would reduce uncertainty
- The "kill criteria" -- what evidence would make us abandon this approach

## Output Format

Deliver all three phases. End with a recommended next action (spike, prototype, or decision meeting).
