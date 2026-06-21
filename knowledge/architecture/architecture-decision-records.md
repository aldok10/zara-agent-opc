# Architecture Decision Records (ADRs)

## What

Lightweight, append-only documents capturing the WHY behind architecture decisions. They live next to code and build institutional knowledge over time.

## Template (Michael Nygard Format)

```markdown
# ADR-NNN: [Short Title]

**Status:** proposed | accepted | deprecated | superseded by ADR-NNN

## Context
What forces are at play? What is the problem or situation?

## Decision
What did we decide? State it declaratively.

## Consequences
What becomes easier? What becomes harder? What are we accepting?
```

## When to Write an ADR

- New service or component introduced
- Technology or framework choice
- Pattern adoption (e.g., CQRS, event sourcing)
- Security boundary change
- Breaking interface change
- Data storage or schema strategy shift
- Significant dependency added or removed

## Best Practices

- Keep short: 1-2 pages max. If longer, the decision is too big.
- One decision per ADR. Split compound decisions.
- Never edit accepted ADRs. Write a new one that supersedes.
- Include alternatives considered and why rejected.
- Link to related ADRs for context chains.
- Store in `docs/adr/` or `decisions/` in the repo.
- Number sequentially: `0001-use-postgres.md`
- Date them. Context changes over time.
- Review in PRs like code.

## Example

```markdown
# ADR-0003: Use PostgreSQL for Primary Data Store

**Status:** accepted (2024-03-15)

## Context
We need a primary database for the order service. Options: PostgreSQL, MySQL, DynamoDB.
Team has PostgreSQL experience. We need ACID transactions and complex queries.
DynamoDB would require significant query pattern redesign.

## Decision
Use PostgreSQL 16 with pgvector extension for future embedding search needs.

## Consequences
- Good: familiar tooling, strong ecosystem, ACID guarantees, extensible
- Bad: operational burden of managing a stateful service, vertical scaling limits
- Accepted: we will use managed RDS to reduce ops burden
```

## Anti-patterns

- Writing ADRs after the fact without capturing the actual reasoning
- Making ADRs too formal or requiring committee approval (kills adoption)
- Storing in a wiki nobody reads instead of next to the code
- Writing ADRs for trivial decisions (library version bumps, variable names)
