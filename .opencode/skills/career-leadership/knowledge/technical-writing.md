# Technical Writing

## RFC Structure

An RFC (Request for Comments) proposes a significant technical change and
invites structured feedback before implementation begins.

**Sections:**

1. **Title and metadata** -- Author, date, status (draft/review/accepted/rejected),
   reviewers, stakeholders.

2. **Problem statement** -- What's broken or missing? Include data: error rates,
   user complaints, scaling limits. Keep to 2-3 paragraphs max.

3. **Proposal** -- The recommended solution. Enough detail to implement, not so
   much that it's a spec. Include: architecture, data flow, API surface, rollout.

4. **Alternatives considered** -- 2-3 other approaches with clear reasons for
   rejection. Shows you explored the space.

5. **Decision** -- Explicit call: accept, reject, or defer. Include date and
   decision-makers. Never leave an RFC in limbo.

6. **Open questions** -- Things you need input on. Number them for easy reference.

**Tips:**
- Keep RFCs under 3 pages. Long RFCs don't get read.
- Include a one-paragraph TL;DR at the top.
- Link to related RFCs and prior art.

## ADR Format

Architecture Decision Records capture significant decisions with their context.

```
# ADR-NNN: [Decision Title]

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Context
What forces are at play? What constraints exist?
What triggered this decision?

## Decision
What did we decide? State it clearly in one sentence,
then elaborate if needed.

## Consequences
What becomes easier? What becomes harder?
What new constraints does this create?
```

**Rules:**
- One decision per ADR. Never bundle.
- Immutable once accepted. Supersede, don't edit.
- Store in `docs/adr/` or `docs/decisions/` in the repo.
- Number sequentially. Never reuse numbers.

## Design Doc Template

For medium-to-large features that need alignment but aren't org-wide RFCs.

**Sections:**
1. **Goals** -- What success looks like. 3-5 bullet points.
2. **Non-goals** -- What you're explicitly NOT solving. Prevents scope creep.
3. **Background** -- Context for readers unfamiliar with the domain.
4. **Design** -- Architecture, data model, API, sequence diagrams.
5. **Alternatives** -- What else you considered and why you rejected it.
6. **Security/Privacy** -- Data handling, auth, threat model.
7. **Testing strategy** -- How you'll verify correctness.
8. **Rollout plan** -- Phases, feature flags, rollback plan.
9. **Timeline** -- Milestones with rough dates.

**Tips:**
- Get feedback on Goals and Non-goals first, before writing the full design.
- Use diagrams sparingly but effectively.
- Mark assumptions explicitly so reviewers can challenge them.

## Effective Status Updates

Status updates serve different audiences. Tailor format to reader.

**For your team (standup/weekly):**
- What shipped since last update
- What's in progress and expected completion
- Blockers and what you need

**For your manager (1:1 or weekly email):**
- Progress against quarterly goals (% or milestone)
- Risks and mitigation plans
- Decisions you need from them
- Wins worth celebrating

**For executives (monthly/quarterly):**
- Business impact of technical work (revenue, cost, reliability)
- Red/yellow/green status with one sentence each
- Asks: headcount, budget, prioritization calls
- No implementation details unless directly relevant

## Writing for Different Audiences

**Engineers want:**
- Technical precision and correctness
- Code examples and API references
- Tradeoff analysis with data
- "Show me the interface"

**Managers want:**
- Timeline and risk assessment
- Resource needs and dependencies
- Progress toward agreed goals
- "What do you need from me?"

**Executives want:**
- Business outcomes and metrics
- Strategic alignment
- Binary decisions with your recommendation
- "What should we do and why?"

**General rules:**
- Lead with the conclusion, then support it
- Use concrete numbers over vague adjectives
- One idea per paragraph
- Active voice, short sentences
- Define acronyms on first use
