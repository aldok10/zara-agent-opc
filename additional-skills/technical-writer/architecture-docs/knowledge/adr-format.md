# ADR Format

Architecture Decision Records document significant technical decisions with their context and consequences.

## Core Format (Michael Nygard)

Every ADR contains these five sections:

### 1. Title

Format: `{number}. {Decision Title}`

- Sequential numbering with zero-padded prefix in filename: `0001-use-postgres.md`
- Title is a short noun phrase: "Use PostgreSQL for user data"
- Not a question: "Should we use PostgreSQL?" (wrong)
- Not an action: "Migrate to PostgreSQL" (wrong -- that is a task, not a decision)

### 2. Status

One of: `proposed` | `accepted` | `deprecated` | `superseded`

- `proposed` -- under discussion, not yet binding
- `accepted` -- agreed upon, team follows this decision
- `deprecated` -- no longer recommended, migration path documented
- `superseded by [ADR-NNNN]` -- replaced by a newer decision (link to replacement)

### 3. Context

What is the situation that requires a decision?

Include:
- Business or technical forces driving the decision
- Constraints (budget, timeline, team skills, existing contracts)
- Options considered (briefly -- detail in appendix if needed)
- Quality attributes affected (performance, security, maintainability)

Rules:
- State facts, not opinions
- Include relevant metrics or data points
- Keep to 1-3 paragraphs -- this is context, not analysis

### 4. Decision

What was decided and why.

Format: "We will [action] because [reasoning]."

Rules:
- One clear statement of what is being decided
- Brief rationale (1-2 sentences)
- If multiple options were seriously considered, state why this one won
- Include scope: what is and is not covered by this decision

### 5. Consequences

What results from this decision -- both positive and negative.

Format: structured list with explicit positive/negative marking.

```markdown
**Positive:**
- Reduced query latency from 200ms to 50ms
- Team has existing PostgreSQL expertise

**Negative:**
- Requires migration of 2M rows from MongoDB
- Adds operational burden of managing a relational DB

**Neutral:**
- Need to update CI pipeline with new database service
```

Rules:
- Always include both positive AND negative consequences
- Be specific and measurable where possible
- Include operational impact (deployment, monitoring, on-call)
- Note any new risks introduced

## Lifecycle

```
proposed --> accepted --> [active use]
                     \
                      --> deprecated (with migration path)
                      --> superseded by ADR-NNNN
```

- Decisions start as `proposed` during discussion
- Team agrees: change to `accepted` with date
- When replaced: mark `superseded by [link]` -- never delete old ADRs
- When phased out: mark `deprecated` with removal timeline

## File Organization

```
docs/adr/
  0001-use-postgres-for-user-data.md
  0002-adopt-event-sourcing-for-orders.md
  0003-choose-grpc-for-internal-comms.md
  README.md  (index with one-line summaries)
```

## When to Write an ADR

Write one when:
- Choosing between technologies (database, framework, language)
- Defining a pattern the team must follow (error handling, auth flow)
- Making a decision that is expensive to reverse
- A decision affects multiple teams or services
- Someone asks "why did we do it this way?" repeatedly

Do NOT write one for:
- Library minor version bumps
- Code formatting preferences (put in linter config)
- Obvious best practices (use HTTPS, validate inputs)
- Decisions that are trivially reversible

## Linking and Cross-References

- Superseded ADRs link forward to replacement
- New ADRs reference the ones they supersede or build upon
- Related ADRs linked in a "Related" section at bottom
- ADR index (README.md) provides one-line summary of each

## Review Process

1. Author writes ADR with status `proposed`
2. PR opened, team reviews context and consequences
3. Discussion in PR comments (not separate meetings for small decisions)
4. On agreement: merge with status `accepted` and date
5. If rejected: close PR, optionally keep as `rejected` for historical record

## Template

```markdown
# {Number}. {Title}

Date: YYYY-MM-DD
Status: proposed | accepted | deprecated | superseded by [ADR-NNNN](link)

## Context

[Situation requiring a decision]

## Decision

We will [action] because [reasoning].

## Consequences

**Positive:**
- [benefit]

**Negative:**
- [tradeoff]

**Neutral:**
- [side effect]
```
