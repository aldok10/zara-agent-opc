---
type: fact
title: "Schema Patterns"
---

# Schema Patterns

Common GraphQL schema patterns. Polymorphism, error handling, input validation, computed fields, versioning.

## Error Union Pattern

Preferred over throwing exceptions -- gives clients typed, exhaustive error handling:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}

union CreateUserPayload = CreateUserSuccess | ValidationError | EmailTakenError | RateLimitError

type CreateUserSuccess {
  user: User!
}

type ValidationError {
  field: String!
  message: String!
  code: String!
}

type EmailTakenError {
  email: String!
  suggestedAlternatives: [String!]!
}
```

Client query:
```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    ... on CreateUserSuccess { user { id name } }
    ... on ValidationError { field message code }
    ... on EmailTakenError { email suggestedAlternatives }
  }
}
```

## Polymorphism Patterns

### Interface (shared contract)
```graphql
interface Notification {
  id: ID!
  createdAt: DateTime!
  read: Boolean!
}

type MentionNotification implements Notification {
  id: ID!
  createdAt: DateTime!
  read: Boolean!
  mentionedBy: User!
  context: String!
}

type SystemNotification implements Notification {
  id: ID!
  createdAt: DateTime!
  read: Boolean!
  severity: Severity!
  message: String!
}
```

### Union (disjoint results)
```graphql
union SearchResult = Product | Article | Category

type Query {
  search(query: String!, types: [SearchType!]): SearchResultConnection!
}
```

### Decision: Interface vs Union

- Interface: types share fields AND behavior, can query without fragments
- Union: types are conceptually different, require fragment for any field access

## Input Validation Pattern

Schema-level constraints (documented) + resolver-level enforcement:

```graphql
input CreatePostInput {
  title: String!       # "1-200 characters"
  body: String!        # "1-50000 characters, markdown"
  tags: [String!]!     # "1-10 tags, each 1-50 characters"
  categoryId: ID!
}
```

Resolver validation:
```typescript
function validateCreatePost(input: CreatePostInput): ValidationError | null {
  if (input.title.length < 1 || input.title.length > 200) {
    return { field: 'title', message: 'Must be 1-200 characters', code: 'INVALID_LENGTH' };
  }
  if (input.tags.length > 10) {
    return { field: 'tags', message: 'Maximum 10 tags', code: 'TOO_MANY' };
  }
  // ... more checks
  return null;
}
```

## Computed Fields

Fields derived from other data -- resolve lazily, cache where possible:

```graphql
type Order {
  id: ID!
  items: [OrderItem!]!
  subtotal: Money!        # Computed from items
  tax: Money!             # Computed from subtotal + region
  total: Money!           # Computed from subtotal + tax + shipping
  estimatedDelivery: DateTime  # Computed from items + shipping address
}
```

Implementation: compute only when field is actually requested (check `info.fieldNodes`).

## Wrapper Types

Avoid primitives for domain concepts:

```graphql
type Money {
  amount: Int!          # Cents (avoid floating point)
  currency: Currency!
}

type DateRange {
  start: DateTime!
  end: DateTime!
}

type Address {
  line1: String!
  line2: String
  city: String!
  region: String
  postalCode: String!
  country: CountryCode!
}
```

## Batch Mutation Pattern

When clients need to perform multiple related operations atomically:

```graphql
type Mutation {
  # Prefer specific batch operations over generic "batch" wrappers
  reorderItems(input: ReorderItemsInput!): ReorderItemsPayload!
  bulkTagPosts(input: BulkTagPostsInput!): BulkTagPostsPayload!
}

input ReorderItemsInput {
  listId: ID!
  itemIds: [ID!]!  # New order defined by array position
}

type ReorderItemsPayload {
  list: List!        # Return updated parent
  errors: [ReorderError!]!  # Per-item errors
}
```

## Schema Documentation

```graphql
"""
A user account in the system.
Created during registration, cannot be deleted (only deactivated).
"""
type User {
  "Globally unique identifier (opaque, do not parse)"
  id: ID!

  "Display name, 1-100 characters. Updated via updateProfile mutation."
  name: String!

  "Email address. Unique across all users. Verified before activation."
  email: String! @auth(requires: OWNER)
}
```

## Anti-Patterns

- Generic `Result` type for all mutations (loses type safety)
- `success: Boolean!` + `message: String` instead of error unions
- Deeply nested input types (keep mutations flat)
- Exposing database column names directly (use domain language)
- `ID` for everything without global uniqueness guarantee
- Enum values that leak implementation (`POSTGRES_TIMEOUT` vs `SERVICE_UNAVAILABLE`)
