# Outcome Mapping

## Purpose

Connect every roadmap item to measurable business results. Features are bets — make the hypothesis explicit.

## Outcome Hypothesis Format

```
If we build [initiative],
we expect [metric] to move from [current] to [target]
because [mechanism/evidence].
Leading indicator: [early signal within 2 weeks of launch].
Kill criteria: [what makes us stop/pivot].
```

## Hierarchy

```
Strategic Theme → OKR → Outcome Hypothesis → Initiative → Features
```

Every feature traces UP to an outcome. No orphan work.

## Success Metrics

| Level | Metric Type | Example |
|-------|-------------|---------|
| Outcome | Business result | Revenue, retention, NPS |
| Output | Delivery measure | Features shipped, velocity |
| Activity | Leading indicator | Adoption rate, feature usage |

Focus on outcome metrics. Use activity metrics as early signals only.

## Evidence of Impact

Before committing (Now column):
- Problem validated (user research, data, support tickets)
- Solution hypothesis tested (prototype, A/B, fake door)
- Baseline metric measured
- Target grounded in comparable data

## Kill Criteria

Every medium/low confidence item needs explicit exit conditions:
- Time-bound: "If no signal in 4 weeks, kill"
- Metric-bound: "If adoption < 5% after launch, pivot"
- Cost-bound: "If estimate exceeds 3 sprints, descope"

## Linking to OKRs

```
OKR: Increase activation rate from 40% to 60%
├── Initiative A: Onboarding redesign (Now, High)
│   └── Hypothesis: Guided flow → 15% activation lift
├── Initiative B: Email nurture sequence (Next, Medium)
│   └── Hypothesis: Re-engagement → 5% activation lift
└── Initiative C: In-app tutorials (Later, Low)
    └── Hypothesis: Self-serve learning → retention lift
```

## Anti-patterns

- Feature list without "so what" → ask: what metric moves?
- No success metrics → cannot evaluate, cannot kill
- No kill criteria → zombie projects persist
- Vanity metrics (pageviews, signups without activation)
- Output masquerading as outcome ("ship feature X" is not an outcome)

## Verification

- [ ] Every initiative has outcome hypothesis
- [ ] Baseline and target metrics defined
- [ ] Leading indicator identified
- [ ] Kill criteria explicit
- [ ] Traces to OKR or strategic theme
