---
type: fact
title: "Exploratory Testing - Session-Based Management and Techniques"
---

# Exploratory Testing

## When to Use

- New features before scripted tests exist
- High-uncertainty areas (complex integrations, edge cases)
- Post-incident investigation (how did this break?)
- Areas where scripted tests have blind spots
- Before release (risk-focused exploration)
- Finds 30-60% more defects than scripted tests alone

## Session-Based Test Management (SBTM)

### Charter Format
```
Explore [target area]
With [resources/tools/data]
To discover [what information you seek]
```

**Examples:**
- "Explore checkout flow with expired credit cards to discover error handling gaps"
- "Explore search with unicode/emoji input to discover encoding issues"
- "Explore concurrent user sessions to discover state management bugs"

### Session Structure
1. **Setup** (5 min): Read charter, prepare tools/data
2. **Exploration** (60-90 min): Execute charter, take notes
3. **Debrief** (15 min): Document findings, identify follow-ups

### Session Report
```markdown
# Session: [Charter]
Date: [date]  Duration: [time]  Tester: [name]

## Coverage Areas
- [What was explored]

## Observations (timestamped)
- 10:05 - [observation]
- 10:12 - [bug found, severity, repro steps]
- 10:30 - [interesting behavior, needs investigation]

## Bugs Found
- BUG-001: [title] (severity: high/medium/low)

## Follow-up Actions
- [ ] Script regression test for BUG-001
- [ ] New charter: explore [related area]
- [ ] Discuss with dev: [unclear behavior]
```

## Tour-Based Heuristics

| Tour | Focus | Good For |
|------|-------|----------|
| Money Tour | Critical revenue paths | Payment, subscription, upgrade |
| Saboteur Tour | Break things intentionally | Error handling, resilience |
| Landmark Tour | Navigate by key features | New feature exploration |
| Garbage Collector Tour | Invalid/unexpected input | Validation, sanitization |
| Antisocial Tour | Misuse, abuse patterns | Security, edge cases |
| FedEx Tour | Follow data through system | Integration, data flow |

## Risk-Based Prioritization

```
Priority = (Change Frequency x Impact) + Uncertainty

High priority sessions:
- New code + high business impact + no existing tests
- Recently refactored + customer-facing
- Integration points between teams/services
```

## Combining with Automation

- Exploratory finds bugs, automation prevents regression
- Every bug found in exploration gets a scripted regression test
- Exploration maps the territory, automation holds it
- Time split: 20% exploratory, 80% automated (mature product)
- Time split: 50% exploratory, 50% automated (new product)

## Anti-Patterns

- Unstructured "playing around" without charter (not exploratory testing)
- No documentation of findings (insights lost)
- Only exploring happy paths (the bugs are in the edges)
- Skipping debrief (learning not captured)
- Replacing all manual testing with automation (miss creative scenarios)
