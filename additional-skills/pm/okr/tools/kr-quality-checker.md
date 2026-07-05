# KR Quality Checker

## Prompt Template

Evaluate this Key Result against quality criteria:

**KR:** [paste KR here]

## Checklist

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Measurable? (has a number/metric) | |
| 2 | Outcome, not output/task? | |
| 3 | Has baseline (current state)? | |
| 4 | Has specific target? | |
| 5 | Stretch but achievable? (60-70% confidence) | |
| 6 | One clear owner? | |
| 7 | Measurement source defined? | |
| 8 | Externally verifiable without interpretation? | |
| 9 | Time-bound (implicit via quarter or explicit)? | |
| 10 | Not a vanity metric? (drives real outcome) | |

## Scoring

- 10/10: Ship it
- 8-9/10: Minor fix needed (usually missing baseline or source)
- 6-7/10: Rewrite needed (likely task-as-KR or unmeasurable)
- <6/10: Start over. Ask "what outcome do we actually want?"

## Quick Fix Patterns

- Missing baseline -> "From X" (measure current state first)
- Binary -> add spectrum ("Increase... from... to...")
- Task -> ask "so what?" until you find the outcome
- No source -> define where/how you'll measure before committing
