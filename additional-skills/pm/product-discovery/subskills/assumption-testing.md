# Assumption Testing

## Assumption Categories (Teresa Torres)

| Category | Question | Example |
|----------|----------|---------|
| Desirability | Do users want this? | "Users will pay for faster search" |
| Viability | Can the business sustain this? | "CAC stays below $50" |
| Feasibility | Can we build this? | "API latency < 200ms at scale" |
| Usability | Can users figure it out? | "Users complete onboarding without help" |
| Ethical | Is there potential harm? | "Recommendations don't create addictive loops" |

## Assumption Map (David Bland, Testing Business Ideas)

```
         MORE IMPORTANT
              │
   RISKIEST   │   IMPORTANT BUT
   (test now) │   EVIDENCED
──────────────┼──────────────
   WATCH &    │   SKIP
   MONITOR    │   (safe)
              │
         LESS IMPORTANT
   WEAK EVIDENCE ←──→ STRONG EVIDENCE
```

Riskiest assumptions = upper-right quadrant (high importance + weak evidence). Prioritize these for testing.

## Process

1. List all assumptions for solution (aim 8-12)
2. Plot on importance x evidence grid
3. Rank top-left quadrant (high importance, low evidence) by risk
4. Design smallest test for #1 riskiest assumption
5. Define success criteria and kill criteria BEFORE running
6. Run experiment, collect data
7. Update map—move assumption based on result
8. Repeat for next riskiest

## Experiment Template

```
ASSUMPTION: [We believe that...]
CATEGORY: [desirability | viability | feasibility | usability | ethical]
IMPORTANCE: [H/M/L] — Why: [impact if wrong]
CURRENT EVIDENCE: [none | anecdotal | survey | behavioral]

HYPOTHESIS: If [action], then [measurable outcome], because [reasoning]
METHOD: [experiment type]
SAMPLE: [who, how many, how recruited]
DURATION: [timeframe]
SUCCESS CRITERIA: [specific threshold — defined BEFORE running]
KILL CRITERIA: [what result kills the solution]
DECISION: [ ] Persevere [ ] Pivot [ ] Kill
```

## Evidence Levels (ascending strength)

1. Team opinion / gut feel
2. Stakeholder input
3. Survey / stated preference
4. Behavioral proxy (analytics, search logs)
5. Controlled experiment (A/B, fake door)
6. Replicated results across segments

## Rules

- Never test more than 2 assumptions simultaneously per solution
- Success criteria must be numeric and pre-registered
- "Interesting but inconclusive" = redesign experiment, not proceed
- Kill threshold must be defined—experiments that can't fail aren't experiments
- Time-box every experiment (max 2 weeks for lightweight tests)

## Anti-patterns

- Testing easy assumptions instead of risky ones
- Moving goalposts after seeing results
- No kill criteria defined upfront
- Testing solutions instead of assumptions
- Conflating correlation with validation

## Assumption Test Types (Teresa Torres)

| Type | When to Use | Example |
|------|-------------|---------|
| Prototype tests | Test usability/desirability with an artifact | Figma prototype with 5 users |
| One-question surveys | Quick signal on a single assumption | "How disappointed would you be if X went away?" |
| Data mining | Leverage existing data for evidence | Support ticket analysis, funnel drop-off |
| Research spikes | Engineering prototype to test feasibility | "Can we hit <200ms with this architecture?" |

## Assumption Tests vs Experiments (Critical Distinction)

- **Assumption tests** are used in DISCOVERY when trying to decide between ideas
- **Experiments** are used to MEASURE THE IMPACT of what we built (post-delivery)
- Don't conflate the two—different purpose, different rigor, different stage
