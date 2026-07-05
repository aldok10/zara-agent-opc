---
type: subskill
title: "Schema Design"
---

# Schema Design

Schema architecture patterns. Naming conventions, nullability strategy, type hierarchy, pagination, input types, error handling, evolution.

## Rules

1. Schema-first -- write SDL, review with stakeholders, THEN implement resolvers
2. Nullable by default -- `!` only when the field ALWAYS has a value (even during failures, migrations)
3. PascalCase for types, camelCase for fields and arguments, SCREAMING_SNAKE for enum values
4. Verb-noun for mutations (`createUser`, `cancelOrder`) -- specific action, not generic CRUD
5. Relay Connection spec for any list that could grow unbounded -- `first`/`after` pagination
6. Input types for mutations -- `input CreateUserInput { ... }` not inline arguments
7. Error unions for expected failure cases -- `union CreateUserResult = User | ValidationError`
8. Interfaces for shared fields with different behavior -- `interface Node { id: ID! }`
9. Unions for truly disjoint types -- `union SearchResult = Product | Category | Article`
10. `@deprecated(reason: "Use X instead")` before removing any field -- minimum 2 release cycles

## Nullability Decision Tree

```
Can this field ALWAYS be resolved, even if:
  - Downstream service is down? → nullable
  - Data was created before this field existed? → nullable
  - User doesn't have permission? → nullable (or error union)
  - It's a computed aggregation? → nullable
  - It's a foreign key reference? → nullable
Only `!` if: primary key, enum with default, or field set at creation and immutable
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Object type | PascalCase, noun | `User`, `OrderItem` |
| Field | camelCase | `firstName`, `createdAt` |
| Enum | PascalCase type, SCREAMING_SNAKE values | `enum Status { ACTIVE, INACTIVE }` |
| Input | PascalCase + "Input" suffix | `CreateUserInput` |
| Mutation | camelCase, verb + noun | `createUser`, `cancelOrder` |
| Query | camelCase, noun (single) or noun + Connection (list) | `user`, `usersConnection` |
| Subscription | camelCase, "on" + event | `onOrderCreated` |
| Interface | PascalCase, adjective or role | `Node`, `Timestamped` |

## Pagination (Relay Connection Spec)

```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int  # Optional, can be expensive
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

Cursor encoding: `base64(type:field:value)` -- opaque to client, decodable server-side.

## Error Unions Pattern

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = User | ValidationError | EmailTakenError

type ValidationError {
  field: String!
  message: String!
}

type EmailTakenError {
  email: String!
  message: String!
}
```

Client discriminates on `__typename`:
```graphql
mutation {
  createUser(input: $input) {
    ... on User { id name }
    ... on ValidationError { field message }
    ... on EmailTakenError { email message }
  }
}
```

## Interfaces vs Unions

| Use | When |
|-----|------|
| Interface | Types share common fields AND behavior (can query shared fields without fragment) |
| Union | Types are disjoint, no guaranteed shared fields |

```graphql
# Interface: all events have id + timestamp
interface Event {
  id: ID!
  timestamp: DateTime!
}
type OrderEvent implements Event { id: ID! timestamp: DateTime! order: Order! }
type PaymentEvent implements Event { id: ID! timestamp: DateTime! amount: Int! }

# Union: search results have nothing in common
union SearchResult = Product | Category | Article
```

## Schema Evolution

1. Add fields freely (non-breaking)
2. Add optional arguments freely (non-breaking)
3. Deprecate before removing (minimum 2 deploy cycles with monitoring)
4. New required arguments = new field (don't break existing clients)
5. Enum value additions are breaking for clients using exhaustive switches -- document in changelog
6. Use schema registry (Apollo Studio, Hive) to detect breaking changes in CI

## Verification

- [ ] No field named `data` or `result` at top level (be specific)
- [ ] All lists that can grow use Connection pagination
- [ ] Mutations return the mutated entity (not just success boolean)
- [ ] Input types used for all mutations with >2 arguments
- [ ] `@deprecated` fields have monitoring showing zero usage before removal
- [ ] Schema passes linting (`graphql-schema-linter` or Rover lint)
