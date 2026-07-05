---
type: tool
title: "GraphQL Schema Design Review"
---

# GraphQL Schema Design Review

## Purpose

Review GraphQL schemas for correctness, performance, and maintainability. Covers type design, federation boundaries, N+1 prevention, and query complexity management.

## When to Use

- Designing new types, queries, or mutations
- Reviewing schema for N+1 query patterns
- Evaluating federation/subgraph boundaries
- Assessing schema evolution and deprecation strategy

## Prompt Template

```
CONTEXT:
- Architecture: [monolithic schema | Apollo Federation | schema stitching]
- Schema SDL: [paste types, queries, mutations]
- Resolvers: [paste resolver code if reviewing implementation]
- Data sources: [REST APIs | databases | microservices]
- Client usage: [web SPA | mobile | internal tools]

REVIEW AGAINST:
1. Type design: appropriate nullability, ID types, custom scalars,
   connection pattern for lists (edges/nodes/pageInfo)
2. Naming: consistent conventions (camelCase fields, PascalCase types),
   verb-object mutations (createUser, not userCreate)
3. N+1 prevention: DataLoader usage, batched resolvers,
   query planning for joins
4. Federation: entity boundaries align with team ownership,
   @key directives, reference resolvers, avoid circular dependencies
5. Input validation: dedicated input types, non-null for required fields,
   scalar validation (email, URL, date)
6. Complexity control: query depth limiting, cost analysis,
   persisted queries for public APIs
7. Error handling: union types for expected errors (Result pattern),
   extensions for metadata, no sensitive data in errors
8. Evolution: @deprecated with reason, additive changes only,
   sunset timeline for removed fields

IDENTIFY:
- Overly nested types causing deep queries
- Missing pagination on list fields
- Mutations returning insufficient data for cache updates
- N+1 patterns in resolver implementations
- Breaking changes without deprecation path
```

## Output Format

```
## GraphQL Review: [schema/subgraph name]

### Summary
[1-2 sentence verdict]

### Schema Issues
| # | Category | Severity | Type/Field | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Performance Concerns
- [N+1 patterns identified]
- [Query complexity hotspots]

### Federation Notes
- [Boundary assessment if applicable]

### Suggested Schema Changes
1. [Specific SDL change with rationale]
2. ...
```
