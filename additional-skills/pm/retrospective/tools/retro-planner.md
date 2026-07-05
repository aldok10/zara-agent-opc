# Retro Planner

## Prompt Template

Given these inputs, recommend a retrospective format and produce an agenda:

### Inputs
- **Team size**: [number]
- **Sprint duration**: [1-4 weeks]
- **Recent events**: [incidents, launches, conflicts, wins — brief]
- **Previous format (last 2)**: [format names]
- **Safety concerns**: [any known issues, or "none"]
- **Remote/colocated/hybrid**: [mode]
- **Time available**: [minutes]

### Output Format

```
## Recommended Format: [name]
Rationale: [1 sentence why this fits]

## Agenda ([X]min)
| Time | Activity | Notes |
|------|----------|-------|
| ... | ... | ... |

## Facilitation Notes
- [specific tips for this session's context]
- [watch-outs given recent events]

## Materials Needed
- [tools, boards, templates to prepare]
```

### Decision Logic
1. Post-incident → Timeline
2. Same format 3x → rotate (pick from format-library)
3. Low safety signals → safety-check first, short format after
4. Remote + multi-TZ → async pre-write + short sync
5. Large group (>10) → World Cafe or breakouts
6. Low energy / end of quarter → short format + energizer
7. Default → Start/Stop/Continue or Sailboat
