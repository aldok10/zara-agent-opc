# Relay Connection Specification

Cursor-based pagination standard. Edges, nodes, pageInfo, cursor encoding, global object identification.

## Connection Structure

```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String, filter: UserFilter): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int          # Optional (expensive for large datasets)
}

type UserEdge {
  node: User!
  cursor: String!          # Opaque string, client must not parse
}

type PageInfo {
  hasNextPage: Boolean!    # More items after `endCursor`?
  hasPreviousPage: Boolean!  # More items before `startCursor`?
  startCursor: String      # Cursor of first edge (null if empty)
  endCursor: String        # Cursor of last edge (null if empty)
}
```

## Pagination Arguments

| Argument | Type | Behavior |
|----------|------|----------|
| `first` | Int | Return first N items (forward pagination) |
| `after` | String | Return items after this cursor |
| `last` | Int | Return last N items (backward pagination) |
| `before` | String | Return items before this cursor |

Rules:
- `first` and `last` are mutually exclusive (don't use both)
- `first` + `after` = forward pagination
- `last` + `before` = backward pagination
- If neither `first` nor `last` specified, server applies default limit (e.g., 20)

## Cursor Encoding

Cursors are opaque to clients. Server encodes position information:

```typescript
// Common approach: base64 encode a position identifier
function encodeCursor(type: string, id: string, sortValue?: string): string {
  const payload = sortValue
    ? `${type}:${id}:${sortValue}`
    : `${type}:${id}`;
  return Buffer.from(payload).toString('base64');
}

function decodeCursor(cursor: string): { type: string; id: string; sortValue?: string } {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  const [type, id, sortValue] = decoded.split(':');
  return { type, id, sortValue };
}
```

For sorted results, include the sort field value in cursor to enable keyset pagination:
```
cursor = base64("User:abc123:2024-01-15T10:30:00Z")
-- Enables: WHERE created_at < '2024-01-15T10:30:00Z' ORDER BY created_at DESC LIMIT 21
```

## Global Object Identification (Node Interface)

```graphql
interface Node {
  id: ID!  # Globally unique across all types
}

type Query {
  node(id: ID!): Node      # Fetch any entity by global ID
  nodes(ids: [ID!]!): [Node]!
}

type User implements Node {
  id: ID!  # Encoded: base64("User:internal_db_id")
  name: String!
}
```

Global ID encoding:
```typescript
function toGlobalId(type: string, id: string): string {
  return Buffer.from(`${type}:${id}`).toString('base64');
}

function fromGlobalId(globalId: string): { type: string; id: string } {
  const [type, id] = Buffer.from(globalId, 'base64').toString('utf-8').split(':');
  return { type, id };
}
```

## Implementation (SQL Keyset Pagination)

```typescript
async function resolveUsersConnection(args: ConnectionArgs, db: Database) {
  const limit = args.first ?? args.last ?? 20;
  const fetchLimit = limit + 1; // Fetch one extra to determine hasNextPage

  let query = db.users.query().orderBy('created_at', 'DESC');

  if (args.after) {
    const { sortValue } = decodeCursor(args.after);
    query = query.where('created_at', '<', sortValue);
  }

  const rows = await query.limit(fetchLimit);
  const hasMore = rows.length > limit;
  const nodes = hasMore ? rows.slice(0, limit) : rows;

  return {
    edges: nodes.map(node => ({
      node,
      cursor: encodeCursor('User', node.id, node.created_at),
    })),
    pageInfo: {
      hasNextPage: hasMore,
      hasPreviousPage: !!args.after,
      startCursor: nodes[0] ? encodeCursor('User', nodes[0].id, nodes[0].created_at) : null,
      endCursor: nodes.at(-1) ? encodeCursor('User', nodes.at(-1).id, nodes.at(-1).created_at) : null,
    },
    totalCount: await db.users.count(), // Optional, expensive
  };
}
```

## Key Rules

- Cursors are opaque -- never let clients construct or parse them
- Fetch `limit + 1` to determine `hasNextPage` without COUNT query
- Keyset pagination (WHERE + ORDER BY) over OFFSET (OFFSET is O(n) in DB)
- `totalCount` is optional and expensive -- omit or cache for large datasets
- Empty connections return `edges: []` with `pageInfo.hasNextPage: false`
