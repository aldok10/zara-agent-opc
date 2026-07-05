---
type: tool
title: "ADR Writing Prompt"
---

# ADR Writing Prompt

Use this prompt to write Architecture Decision Records following a structured context-decision-consequences format.

## Prompt

```
You are a technical writer helping an engineering team document an architecture decision. Produce a complete ADR that captures the why, not just the what.

Input:
- Decision: [what was decided]
- Problem: [what triggered the need for a decision]
- Context: [constraints, team situation, existing systems]
- Options considered: [alternatives that were evaluated]
- Decision makers: [who was involved]
- Date: [when the decision was made]

Write the ADR following this structure:

1. TITLE
   - Format: "ADR-NNNN: [Verb phrase describing the decision]"
   - Examples: "Use PostgreSQL for transaction storage", "Adopt trunk-based development"
   - Keep under 80 characters
   - Use active voice

2. STATUS
   - Proposed: under discussion, not yet accepted
   - Accepted: agreed upon, being implemented
   - Deprecated: superseded by a later decision
   - Superseded by: [link to replacement ADR]

3. CONTEXT
   - What is the current situation that forces this decision?
   - What constraints exist? (technical, organizational, timeline, budget)
   - What are the quality attributes that matter most? (performance, scalability, cost)
   - What has changed since the last related decision (if any)?
   - Who are the stakeholders affected?
   - Write in present tense, factual, no opinion

4. DECISION
   - State the decision clearly in one sentence
   - "We will [action] because [primary reason]"
   - Elaborate on implementation implications (2-3 sentences max)
   - Scope: what does this decision apply to? What is excluded?

5. OPTIONS CONSIDERED
   For each option:
   - Name and brief description
   - Pros (factual advantages)
   - Cons (factual disadvantages)
   - Why rejected (or why chosen)
   - Use consistent evaluation criteria across all options

6. CONSEQUENCES
   Positive:
   - What becomes easier or better?
   - What new capabilities are enabled?

   Negative:
   - What becomes harder or more complex?
   - What trade-offs are accepted?
   - What technical debt is introduced?

   Neutral:
   - What changes that is neither good nor bad?
   - What follow-up decisions are needed?

7. COMPLIANCE & REVIEW
   - How will we know this decision is working? (success metrics)
   - When should this decision be revisited? (trigger conditions)
   - What would cause us to reverse this decision?

WRITING GUIDELINES:
- Keep the total ADR to 1-2 pages (not counting the options table)
- Use concrete numbers where possible ("supports 10K requests/sec" not "high performance")
- Avoid justifying after the fact -- capture genuine reasoning
- Include what you DIDN'T choose and why (this is often the most valuable part)
- Link to supporting documents (benchmarks, RFCs, spikes) rather than inlining
- One decision per ADR (if a decision depends on another, write separate ADRs and link them)

Output format:
- Complete ADR in markdown following the structure above
- Filename suggestion: NNNN-short-decision-name.md
- Tags for categorization: [infrastructure, language, process, security, data, etc.]
```
