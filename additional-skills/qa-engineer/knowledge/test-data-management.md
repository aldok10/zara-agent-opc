---
type: fact
title: "Test Data Management - Factories, Synthetic Data, Environments"
---

# Test Data Management

## Principles

1. Each test owns its data lifecycle (create > use > teardown)
2. No shared mutable state between tests
3. Factories for programmatic generation, fixtures for static reference
4. Production data never used without PII masking
5. Data generation matches production distribution for realistic testing

## Strategies

| Strategy | Use Case | Tools |
|----------|----------|-------|
| Factories | Unit/integration tests, fast | Faker, Fishery, FactoryBot |
| Synthetic | Realistic without PII, AI-powered | Tonic.ai, Gretel, Mockaroo |
| Database branching | PR-level isolated environments | Neon, PlanetScale (CoW snapshots) |
| Masking | Using production structure safely | Delphix, K2View, custom scripts |
| Seeding | Bootstrapping dev/staging | Migration scripts, seed files |

## Factory Pattern (TypeScript)

```typescript
import { faker } from '@faker-js/faker';

// Factory with sensible defaults + override capability
function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    createdAt: faker.date.past(),
    ...overrides,  // explicit overrides win
  };
}

// Usage in tests
const admin = buildUser({ role: 'admin' });
const users = Array.from({ length: 10 }, () => buildUser());
```

## Hermetic Test Data Rules

- Each test creates what it needs, no dependency on pre-existing data
- Transaction rollback or truncate between tests
- Unique identifiers per test run (no collision)
- Deterministic when possible (seeded random for reproducibility)
- Teardown guaranteed (finally/cleanup, not just afterEach)

## Database Per Test Patterns

```typescript
// Testcontainers: fresh DB per test suite
const container = await new PostgreSqlContainer().start();
const db = await connect(container.getConnectionUri());

// Transaction rollback: fast isolation per test
beforeEach(async () => { await db.query('BEGIN'); });
afterEach(async () => { await db.query('ROLLBACK'); });

// Schema-only snapshot: fastest for read-heavy tests
beforeAll(async () => { await db.migrate(); await db.snapshot(); });
beforeEach(async () => { await db.restore(); });
```

## Anti-Patterns

- Shared "golden" test data that multiple tests depend on
- Random data without seed (non-reproducible failures)
- Production data in CI without masking (compliance risk)
- Fixtures files that grow unbounded (hard to maintain)
- Test order determines data state (hidden coupling)
- Manual data setup in external systems (fragile, slow)

## Privacy & Compliance

- Only 7% of companies fully comply with privacy regulations in test envs
- PII masking must preserve data type and relationships
- Anonymization: replace names/emails/phones, keep structure
- Synthetic data eliminates compliance risk entirely
- Audit trail: who accessed what test data, when
