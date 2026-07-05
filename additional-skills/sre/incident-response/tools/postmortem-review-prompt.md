---
type: tool
title: "Postmortem Review Prompt"
---

# Postmortem Review Prompt

You are reviewing a postmortem document for quality and completeness. Evaluate whether it meets the standard for a blameless, actionable, and thorough incident retrospective.

## Input Required

Provide the complete postmortem document for review.

## Review Criteria

### Completeness Check

- [ ] Summary is understandable by someone not involved in the incident
- [ ] Impact is quantified with numbers (requests failed, users affected, duration, budget consumed)
- [ ] Timeline has timestamps and covers: trigger, detection, triage, investigation, mitigation, resolution
- [ ] Root causes are identified (plural -- single root cause is usually incomplete)
- [ ] Action items exist in all three categories: mitigate, detect, respond
- [ ] Every action item has an owner, due date, and tracking ticket

### Quality Check

#### Blamelessness
- Does the language focus on systems and processes, not individuals?
- Are decisions described in context (what information was available at the time)?
- Is "human error" absent as a root cause? (If present, dig deeper into system conditions)
- Would any person named in the document feel comfortable presenting it?

#### Root Cause Depth
- Does the analysis go beyond the immediate trigger?
- Are enabling conditions identified (what system gaps allowed this to happen)?
- Is it clear why existing safeguards didn't catch this?
- Would fixing only the primary cause prevent recurrence, or are systemic issues remaining?

Apply the "5 Whys" test:
1. Why did the system fail? -> [immediate cause]
2. Why was that possible? -> [enabling condition]
3. Why wasn't it caught? -> [detection gap]
4. Why did recovery take that long? -> [response gap]
5. Why is this architecture/process in that state? -> [systemic issue]

If the postmortem only addresses layer 1-2, it needs more depth.

#### Action Item Quality
Each action item should be:
- **Specific**: "Add circuit breaker to payment-gateway client" not "Improve resilience"
- **Measurable**: clear definition of done
- **Time-bound**: due date within 30 days for mitigate, 60 days for detect/respond
- **Owned**: single person accountable (not a team)
- **Tracked**: linked to issue tracker

Red flags:
- "Improve monitoring" (too vague)
- "Be more careful next time" (not a system fix)
- "Consider doing X" (not committed)
- All action items assigned to one person (unrealistic)
- No due dates (will never get done)

#### Lessons Learned Quality
- "What went well" should acknowledge things that worked as designed
- "What went poorly" should be honest about gaps
- "Where we got lucky" identifies risks that didn't materialize this time
- Are lessons actionable or just observations?

### Pattern Detection

Look for:
- Is this a repeat of a previous incident? (Check related incidents section)
- Are action items from previous postmortems still incomplete?
- Does this indicate a systemic issue requiring architectural change?
- Is the SLO appropriately set for this service, or does it need revision?

## Output Format

### Scores (1-5 each)
- Completeness: [1-5]
- Blamelessness: [1-5]
- Root Cause Depth: [1-5]
- Action Item Quality: [1-5]
- Overall: [1-5]

### Findings
- **Strengths**: what this postmortem does well
- **Gaps**: what's missing or needs more depth
- **Concerns**: potential issues with proposed action items

### Recommendations
Ordered by priority:
1. [Most important improvement to the postmortem]
2. [Second priority]
3. [Third priority]

### Questions for the Author
- [Clarifying questions that would improve the document]
- [Areas where more detail would help]
