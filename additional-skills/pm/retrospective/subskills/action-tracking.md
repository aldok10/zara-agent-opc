# Action Tracking

## Action Item Format

```
WHAT: [specific, measurable action]
WHO: [single owner — never "the team"]
WHEN: [due date — next retro at latest]
DONE: [definition of done — how to verify completion]
```

## Rules

1. Max 3 action items per retro — fewer done > many abandoned
2. Each must have single owner (not shared, not "team")
3. Each must be completable within one sprint
4. If action needs >1 sprint: break down or escalate to backlog
5. Carry-over limit: same action incomplete 2 sprints = escalate to team lead/PM

## Tracking Process

### During Retro
- Write actions on shared board with full format above
- Owner verbally confirms acceptance
- Facilitator reads back all actions at close

### Between Retros
- Actions visible in project tool (Jira/Linear/board)
- Tag: `retro-action` or equivalent label
- Owner updates status mid-sprint (brief async check)

### At Next Retro Start (first 5-10min)
- Review each previous action:
  - DONE → celebrate, remove
  - IN PROGRESS → brief update, keep or adjust
  - NOT STARTED → why? blocker? reassign or escalate
- Score: completion rate tracked over time (target: >70%)

## Escalation Path

| Condition | Action |
|-----------|--------|
| Action blocked by external dependency | Flag in standup, PM removes blocker |
| Same action incomplete 2 sprints | Escalate: too big? wrong owner? systemic? |
| Same action incomplete 3 sprints | Remove from retro, create proper backlog item with priority |
| Completion rate <50% over 3 retros | Retro on the retro — actions too ambitious? |

## Anti-Patterns

- "We should communicate better" — not actionable, no owner, no done-def
- "Team will improve testing" — no single owner
- "Fix the build" — belongs in backlog, not retro action
- 5+ action items — guarantees nothing gets done

## Good Examples

- WHAT: Add deployment checklist to wiki | WHO: Alex | WHEN: Mar 15 | DONE: checklist linked in deploy docs
- WHAT: Pair on code reviews Tue/Thu | WHO: Sam (initiates) | WHEN: next sprint | DONE: 4 pair sessions logged
- WHAT: Propose async standup format to team | WHO: Jordan | WHEN: Mar 12 | DONE: proposal shared in Slack

## Verification

- [ ] All actions have WHAT/WHO/WHEN/DONE
- [ ] Max 3 actions
- [ ] No "team" owners
- [ ] Previous actions reviewed at retro start
- [ ] Completion rate tracked
