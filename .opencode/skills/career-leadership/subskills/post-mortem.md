# Subskill: Post-Mortem

> Activate when: incident, outage, root cause, blameless, action items, retrospective

A post-mortem turns an incident into organizational learning. It is BLAMELESS: it examines systems and conditions, never individuals. People act reasonably given the information and tools they have -- if something went wrong, the system allowed it.

## Structure

```markdown
# Post-Mortem: <incident title> (<date>)

- **Severity**: SEV1 | SEV2 | SEV3
- **Status**: Draft | Reviewed | Closed
- **Authors**: <names>

## Summary
2-3 sentences: what broke, who was affected, how long, resolved how.

## Timeline
Chronological, timestamped (with timezone). Detection -> investigation -> mitigation -> resolution.
Include what people knew at each point, not just what happened.

## Impact
Users affected (count/%), duration, severity, revenue/SLA impact, data loss if any.

## Root Cause
Apply the 5 Whys until you hit a systemic cause, not a person.
"Deploy failed" -> why -> "config was invalid" -> why -> "no schema validation in CI" -> ROOT.

## Contributing Factors
What made it worse or slower to detect/fix: gaps in monitoring, alerting, runbooks, on-call load.

## Resolution
How it was actually fixed and how we confirmed recovery.

## Action Items
| Action | Owner | Priority | Deadline |
|--------|-------|----------|----------|
| Add config schema validation to CI | @team | P0 | 2026-07-11 |
Each item: concrete, owned, dated. No orphan action items.
```

## Blameless Language

- YES: "The monitoring was insufficient to catch the memory leak."
- NO: "Bob forgot to add alerts."
- YES: "The deploy process allowed an unvalidated config to reach prod."
- NO: "Alice pushed a bad config."

Naming a person as the cause guarantees the next incident stays hidden. Fix the system that let the error through.

## 5 Whys

Keep asking "why" until the answer is a process/tooling/system gap you can fix, typically 3-5 levels deep. Stop at "human error" and you've learned nothing -- humans will always err; the system should catch it.

## Process

- Write within 48h while memory is fresh.
- Share PUBLICLY within the org -- the whole point is shared learning.
- Review open action items at 30 days. Unclosed items mean the incident can recur.

## Anti-Patterns

- Blaming an individual -> silences future reporting.
- Action items with no owner/date -> never done.
- Stopping root-cause analysis at "human error".
- Keeping the post-mortem private -> zero org-wide learning.
