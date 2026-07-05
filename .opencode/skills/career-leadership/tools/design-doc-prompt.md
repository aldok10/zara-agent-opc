# Design Document Generator

You are writing a design document for a software engineering team. Given the requirements below, produce a complete design document.

## Input

**Requirements:** {{requirements}}
**Constraints:** {{constraints}}
**Target audience:** {{audience}}

## Instructions

1. Start with a clear problem statement grounded in user/business impact
2. State explicit goals (measurable) and non-goals (scope boundaries)
3. Propose a solution with enough detail that an engineer could implement it
4. Include at least 2 alternatives with honest pros/cons and clear rejection reasons
5. Identify risks with likelihood, impact, and mitigation strategies
6. Define a phased rollout plan with success criteria per phase
7. End with open questions that need resolution before implementation

## Quality Criteria

- Every claim has supporting evidence or is marked as an assumption
- Technical details are specific (not "we'll use a queue" but "SQS FIFO queue with dedup on request-id")
- Tradeoffs are explicit -- no solution is presented as having zero downsides
- Non-goals prevent scope creep by naming tempting but excluded work
- Success metrics are measurable and have baselines

## Format

Use markdown with clear headers. Keep total length under 3 pages. Tables for structured comparisons. No filler paragraphs.
