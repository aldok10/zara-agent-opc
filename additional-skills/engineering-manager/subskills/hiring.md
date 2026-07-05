---
type: subskill
title: "Hiring"
---

# Hiring

Pipeline management, scorecards, structured interviews, and calibration for engineering hiring.

## When to Load

- Designing or improving a hiring process
- Writing job descriptions and scorecards
- Training interviewers on structured techniques
- Calibrating hiring decisions across a panel

## Key Concepts

**Scorecard** -- Define success criteria before interviewing. Attributes (technical skill, collaboration, ownership), levels (1-4 scale with behavioral anchors), and a clear hire/no-hire bar.

**Structured Interviews** -- Same questions for all candidates in a given role. Reduces bias. Types: behavioral (past behavior predicts future), technical (skills demonstration), system design (problem-solving approach).

**Pipeline Metrics** -- Track: time-to-fill, pass-through rates per stage, offer acceptance rate, source effectiveness, interviewer calibration scores. Identify bottlenecks.

**Calibration** -- Interviewers discuss independently-formed assessments together. Prevents anchoring (don't share scores before discussion). Resolve disagreements with evidence, not seniority.

**Candidate Experience** -- Response time <48h, clear timeline communicated, feedback after rejection (even brief), respectful of their time. Bad candidate experience damages employer brand.

## Patterns

```markdown
# Interview Scorecard: Senior Backend Engineer

## Attributes (each rated 1-4)

### Technical Depth (system design round)
4: Drives architecture decisions with clear tradeoffs, considers scale/failure modes
3: Designs reasonable systems, identifies key tradeoffs when prompted
2: Produces a working design but misses important considerations
1: Cannot structure a system design independently

### Code Quality (coding round)
4: Clean, tested, handles edge cases, explains reasoning clearly
3: Working solution, reasonable structure, addresses most cases
2: Solution works but has significant gaps or poor structure
1: Cannot produce a working solution in the time given

### Collaboration (behavioral round)
4: Proactively seeks feedback, resolves conflicts constructively, mentors others
3: Works well with others, communicates clearly, accepts feedback
2: Functional collaboration but avoids conflict or feedback
1: Difficulty working with others, dismissive of input

### Ownership (behavioral round)
4: Identifies problems proactively, drives solutions end-to-end, learns from failures
3: Takes responsibility for assigned work, follows through reliably
2: Completes tasks but does not extend beyond explicit assignments
1: Requires constant direction, avoids accountability

## Hire Bar: Average >= 3.0, no individual score below 2
```

```markdown
# Behavioral Interview Questions (STAR format)

1. "Tell me about a time you disagreed with a technical decision on your team."
   - Looking for: constructive conflict, data-driven arguments, respect for final decision

2. "Describe a production incident you were responsible for resolving."
   - Looking for: ownership, systematic debugging, communication, post-mortem learning

3. "Tell me about a project where requirements changed significantly mid-way."
   - Looking for: adaptability, stakeholder communication, technical pragmatism
```

## Gotchas

- Hiring for "culture fit" often means "similar to us" -- hire for culture ADD
- Unstructured interviews have near-zero predictive validity for job performance
- Take-home assignments without time limits disadvantage candidates with responsibilities outside work
- Interviewers anchoring on one impressive (or poor) answer for the entire evaluation
- Not closing the feedback loop: rejected candidates who had good experiences refer others

## Verification

- Every role has a scorecard defined BEFORE interviews begin
- All candidates for the same role answer the same core questions
- Interviewers submit scores independently before calibration discussion
- Pipeline metrics are reviewed monthly (identify where good candidates drop out)
- Offer acceptance rate is above 80% (below signals compensation or experience issues)
