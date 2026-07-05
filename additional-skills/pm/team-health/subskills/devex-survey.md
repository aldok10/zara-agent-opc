# DevEx Survey

## Scope

Design, run, and act on developer experience surveys. Measure flow state, cognitive load, feedback loops.

## Survey Design

Run quarterly. 5-7 questions. Anonymous. Results shared transparently. Commit to action before sending.

Response scale: 1-5 (Strongly Disagree → Strongly Agree). Include one open-text field.

## Template Questions

### Flow State (uninterrupted productive time)
1. "I regularly get 2+ hour uninterrupted blocks for deep work."
2. "I can complete most tasks without waiting on others."

### Cognitive Load (mental effort to do the job)
3. "I understand the systems I work on well enough to change them confidently."
4. "Our tooling and processes make my work easier, not harder."

### Feedback Loops (speed of learning from actions)
5. "I get CI/test results in under 15 minutes."
6. "I know within hours if my change works in production."

### Open
7. "What one thing would most improve your daily work?"

## Analysis Framework

1. Score each dimension (flow/load/feedback) by averaging relevant questions.
2. Flag any dimension <3.5 average as action-required.
3. Compare to previous quarter. Trend matters more than absolute.
4. Cluster open-text responses into themes (max 3 actionable).

## Action Prioritization

| Score | Priority | Response |
|-------|----------|----------|
| <2.5 | Critical | Address this sprint. Likely blocking delivery. |
| 2.5-3.5 | High | Plan action within 2 weeks. |
| 3.5-4.0 | Monitor | Track trend. Act if declining. |
| >4.0 | Healthy | Maintain. Share what's working. |

## Key Targets

Note: The DevEx paper (ACM 2023) proposes NO specific targets or benchmarks. It is a conceptual measurement framework only. Any numeric targets below come from practitioner wisdom, not this paper.

- Flow: 2+ hr uninterrupted blocks daily for 80% of team (deep-work research).
- Feedback: CI <15 min (practitioner target). Deploy feedback <1 hour (practitioner target).
- Load: minimize involuntary context switches (deep-work research suggests 90-120min uninterrupted for flow state). Owned services <5 per person (practitioner heuristic).

## Anti-patterns

- Surveying without acting (destroys trust, stops responses).
- Too many questions (>10 = low completion).
- Non-anonymous in <20 person org (people won't be honest).
- Quarterly only with no interim check-ins on actions taken.
