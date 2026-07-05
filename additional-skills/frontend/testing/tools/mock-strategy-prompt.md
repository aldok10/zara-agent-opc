---
type: tool
title: "Frontend Mock Strategy"
---

# Frontend Mock Strategy

## Purpose

Design a testing mock strategy for frontend applications covering MSW for network mocking, test doubles for dependencies, and fixture management. Ensures tests are reliable, fast, and maintainable.

## When to Use

- Setting up MSW for API mocking in tests
- Deciding between mocking strategies (mock, stub, spy, fake)
- Designing fixture/factory patterns for test data
- Reducing test brittleness from tightly-coupled mocks
- Establishing shared mock infrastructure across test suites

## Prompt Template

```
CONTEXT:
- Framework: [React | Vue | Svelte | Angular]
- Test runner: [Vitest | Jest | Playwright | Cypress]
- API style: [REST | GraphQL | tRPC]
- Current approach: [jest.mock | manual mocks | no mocking | MSW]
- Pain points: [flaky tests | slow tests | coupled to implementation | unclear failures]
- Test types: [unit | integration | component | E2E]

STRATEGY DESIGN:
1. Network mocking (MSW)
   - Request handlers per endpoint/operation
   - Handler organization: per feature or per endpoint
   - Shared handlers for common responses
   - Per-test overrides for error/edge cases
   - Response delay simulation for loading states
   - GraphQL operation matching

2. Test double selection
   - Mock: verify interactions (function was called with X)
   - Stub: provide canned responses (return X when called)
   - Spy: observe without changing behavior
   - Fake: working implementation (in-memory DB, fake timer)
   - When to use each: mocks for boundaries, fakes for infrastructure

3. Fixture and factory patterns
   - Factory functions: createUser(), createOrder()
   - Overrides: createUser({ role: 'admin' })
   - Relationships: createOrder({ user: createUser() })
   - Faker integration for realistic data
   - Shared fixtures vs per-test generation
   - Builder pattern for complex objects

4. Component dependency mocking
   - Module mocking (vi.mock, jest.mock): last resort
   - Dependency injection via props or context
   - Test wrapper providers (QueryClientProvider, ThemeProvider)
   - Stub child components for isolation
   - Custom render helpers with default providers

5. State and routing mocks
   - Initial state injection for store tests
   - Router mocking (MemoryRouter, createMemoryHistory)
   - Auth context simulation
   - Feature flag overrides in tests

6. Mock maintenance
   - Types shared between mocks and implementation
   - Mock validation against real API (contract tests)
   - Centralized mock definitions (single source of truth)
   - Cleanup: afterEach reset, avoid mock leaks

ANTI-PATTERNS:
- Mocking implementation details (internal functions)
- Snapshot testing of mocked data (tests nothing)
- Global mocks that bleed between tests
- Testing the mock instead of the behavior
- Over-mocking: if everything is mocked, what's tested?
```

## Output Format

```
## Mock Strategy: [project/feature]

### Architecture
[Diagram: test -> component -> mock boundary -> MSW/stub/fake]

### MSW Setup
| Endpoint | Default Response | Override Scenarios |
|----------|-----------------|-------------------|
| ... | ... | error, empty, loading |

### Factory Definitions
| Factory | Key Fields | Usage |
|---------|-----------|-------|
| createUser() | id, name, role | user-related tests |

### Test Helper Setup
[Custom render function with providers and default mocks]

### Mock Boundaries
| Layer | Mock Strategy | Rationale |
|-------|--------------|-----------|
| Network (API) | MSW handlers | realistic, decoupled |
| Browser APIs | Fake (timers, intersection) | control time/viewport |
| Child components | Real (not mocked) | integration confidence |
| External services | Stub via context | injectable for tests |

### File Organization
[Where mocks, factories, and handlers live in the project]

### Validation
- [How to ensure mocks stay in sync with real API]
- [Contract test integration if applicable]
```
