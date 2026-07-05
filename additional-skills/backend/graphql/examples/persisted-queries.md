---
type: example
title: "Persisted Query Allowlist Workflow"
---

# Persisted Query Allowlist Workflow

Production workflow for persisted queries. Extract, register, deploy, enforce.

## Overview

Persisted queries replace arbitrary query strings with operation IDs. In strict mode (allowlist), the server rejects any query not pre-registered. This prevents:
- Query injection attacks
- Resource exhaustion from crafted complex queries
- Schema exploration in production
- LLM-generated malicious queries

## Workflow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌────────────┐
│ Client Code │────→│ Extract Ops  │────→│ Register Manifest│────→│ Deploy     │
│ (.graphql)  │     │ (build step) │     │ (registry/file) │     │ (server)   │
└─────────────┘     └──────────────┘     └────────────────┘     └────────────┘
```

## Step 1: Extract Operations from Client Code

Using `graphql-codegen` with persisted operations plugin:

```yaml
# codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: 'src/**/*.graphql',
  generates: {
    './persisted-operations.json': {
      plugins: ['graphql-codegen-persisted-query-ids'],
      config: {
        algorithm: 'sha256',        // Hash algorithm for operation ID
        output: 'client',           // Outputs { hash: document } mapping
      },
    },
    './src/generated/': {
      preset: 'client',
      plugins: [],
    },
  },
};

export default config;
```

Output (`persisted-operations.json`):
```json
{
  "sha256:a1b2c3d4...": "query GetUser($id: ID!) { user(id: $id) { id name email } }",
  "sha256:e5f6g7h8...": "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { ... on CreatePostSuccess { post { id } } } }"
}
```

## Step 2: Register in Schema Registry

### Apollo Studio (managed)
```bash
# Publish operation manifest
rover persisted-queries publish my-graph@production \
  --manifest ./persisted-operations.json
```

### Self-hosted (file or Redis)
```typescript
// Load manifest at server startup
import manifest from './persisted-operations.json';

const operationStore = new Map<string, string>(Object.entries(manifest));
```

## Step 3: Server Configuration

### Apollo Server
```typescript
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginPersistedQueries } from '@apollo/server/plugin/persistedQueries';

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginPersistedQueries({
      cache: redisCache,
      // Strict mode: reject unregistered queries
    }),
  ],
});
```

### Custom middleware (strict allowlist)
```typescript
function persistedQueryMiddleware(operationStore: Map<string, string>) {
  return (req, res, next) => {
    const { extensions, query } = req.body;

    // Check for persisted query hash
    const hash = extensions?.persistedQuery?.sha256Hash;

    if (hash) {
      const document = operationStore.get(`sha256:${hash}`);
      if (!document) {
        return res.status(400).json({
          errors: [{ message: 'Operation not found in allowlist' }],
        });
      }
      req.body.query = document; // Replace with registered document
      return next();
    }

    // No hash and no query = bad request
    if (!query) {
      return res.status(400).json({
        errors: [{ message: 'Must provide persisted query hash' }],
      });
    }

    // Strict mode: reject raw queries in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        errors: [{ message: 'Raw queries not allowed. Use persisted queries.' }],
      });
    }

    next(); // Allow in development
  };
}
```

## Step 4: Client Configuration

### Apollo Client (automatic persisted queries)
```typescript
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const persistedQueryLink = createPersistedQueryLink({
  sha256,
  useGETForHashedQueries: true, // GET requests are CDN-cacheable
});

const client = new ApolloClient({
  link: persistedQueryLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

### Request format (client sends hash instead of query)
```json
{
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "a1b2c3d4e5f6..."
    }
  },
  "variables": { "id": "123" }
}
```

## CI/CD Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  extract-and-register:
    steps:
      - name: Generate persisted operations
        run: npx graphql-codegen

      - name: Validate all operations against schema
        run: npx graphql-inspector validate './src/**/*.graphql' schema.graphql

      - name: Register operations
        run: rover persisted-queries publish $GRAPH_REF --manifest ./persisted-operations.json
        env:
          APOLLO_KEY: ${{ secrets.APOLLO_KEY }}

      - name: Deploy server (already has latest manifest)
        run: ./deploy.sh
```

## Verification

- [ ] `curl -X POST /graphql -d '{"query": "{ __schema { types { name } } }"}'` returns 403
- [ ] Valid hash returns expected data
- [ ] Invalid hash returns 400 with clear error message
- [ ] CI extracts operations and registers on every client deploy
- [ ] Development environment still allows raw queries (for tooling)
- [ ] Operation IDs are deterministic (same query = same hash across builds)
