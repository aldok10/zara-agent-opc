# Opportunity Solution Tree

## Structure

```
Desired Outcome (measurable)
├── Opportunity A (user need/pain)
│   ├── Solution A1
│   │   ├── Assumption Test A1a
│   │   └── Assumption Test A1b
│   └── Solution A2
│       └── Assumption Test A2a
├── Opportunity B
│   ├── Solution B1
│   └── Solution B2
└── Opportunity C
    └── Solution C1
```

## Build Steps

1. Define desired outcome: single metric, measurable, time-bound
2. Identify opportunities via interviews/data—user needs, pains, desires
3. Frame as opportunity statements: "Users need a way to [verb] so that [outcome]"
4. Prioritize opportunities: frequency x intensity x breadth
5. Brainstorm multiple solutions per top opportunity (min 3)
6. Identify riskiest assumption per solution
7. Design smallest experiment per assumption
8. Run, learn, update tree

## Prioritization Criteria

| Factor | Weight | Measure |
|--------|--------|---------|
| Frequency | High | How often users encounter this |
| Intensity | High | Pain/gain magnitude |
| Breadth | Medium | % of users affected |
| Alignment | Medium | Proximity to desired outcome |

## Rules

- Multiple opportunities per outcome (min 3, ideally 5+)
- Multiple solutions per opportunity (min 2)
- Multiple experiments per solution (validate different assumptions)
- Tree is living artifact—update weekly during discovery
- Prune dead branches: failed experiments kill solutions, not opportunities

## Anti-patterns

- **Solution-first**: starting with "build X" then retrofitting an opportunity
- **Single-opportunity**: only one path from outcome to solution
- **No kill criteria**: experiments that can't fail aren't experiments
- **Static tree**: built once, never updated with learnings
- **Opinion-driven pruning**: removing opportunities without evidence

## Output Format

```
## OST: [Outcome]
Target: [metric] from [current] to [target] by [date]

### Opportunity 1: [statement]
Evidence: [source, strength]
Priority: [H/M/L] — Freq:[H/M/L] Int:[H/M/L] Breadth:[H/M/L]

#### Solution 1a: [description]
Riskiest assumption: [statement]
Assumption test: [method] — Success: [criteria] — Kill: [criteria]
```
