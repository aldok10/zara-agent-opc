---
type: subskill
title: "Writing Key Results"
---

# Writing Key Results

## KR Formula

> **Increase/Decrease [METRIC] from [BASELINE] to [TARGET] by [DATE]**

Variants:
- "Achieve [X] measured by [metric source]" (for new capabilities)
- "Maintain [X] while [constraint]" (for guardrail KRs)

## Outcome vs Output

| Output (BAD) | Outcome (GOOD) |
|--------------|----------------|
| Launch onboarding flow | Increase Day-7 retention from 34% to 45% |
| Ship 3 integrations | 40% of new users connect at least 1 integration |
| Hire 5 engineers | Reduce avg time-to-first-commit from 14d to 5d |
| Write docs | Reduce support tickets on setup from 120/mo to 40/mo |

## Leading vs Lagging Indicators

- **Leading** (input): weekly active experiments, PRs merged, outreach calls made
- **Lagging** (output): revenue, retention, NPS

Best practice: pair 1 leading + 1 lagging per objective. Leading gives early signal.

## Quality Checklist

- [ ] Measurable with a number? (not binary yes/no)
- [ ] Has defined baseline (current state)?
- [ ] Has specific target?
- [ ] Outcome, not activity?
- [ ] One owner assigned?
- [ ] Measurement source identified?
- [ ] Achievable but stretchy (60-70% confidence at start)?
- [ ] External person can verify without interpretation?

## Common Bad KRs + Fixes

| Bad KR | Problem | Fixed KR |
|--------|---------|----------|
| "Launch new pricing page" | Task, binary | "Increase plan upgrade rate from 2.1% to 3.5%" |
| "Improve customer satisfaction" | No metric/target | "Increase NPS from 32 to 45" |
| "Make onboarding faster" | No baseline/target | "Reduce median onboarding time from 12min to 4min" |
| "Reduce bugs" | Vague | "Reduce P1 incidents from 8/mo to 2/mo" |
| "100% test coverage" | Vanity, not outcome | "Reduce regression rate from 15% to 5% of releases" |

## Anti-Patterns

1. **Binary KR**: "Ship X" - no spectrum of achievement. Rewrite with measurable impact.
2. **Task-as-KR**: Activity disguised as result. Ask "so what?" to find the outcome.
3. **Unmeasurable KR**: If you can't define measurement source today, it's not ready.
4. **Sandbagging**: KRs you know you'll hit at 1.0. Should feel uncomfortable at draft time.
5. **Laundry list**: >5 KRs = priority diffusion. Force-rank and cut.

## Verification Test

Ask: "Can someone outside my team look at data and confirm this KR's score without asking me?"
If no: rewrite until verifiable.
