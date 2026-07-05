---
type: fact
title: "Test Pyramid vs Trophy vs Diamond"
---

# Test Pyramid vs Trophy vs Diamond

## The Test Pyramid (Mike Cohn)

```
        /\
       /  \     E2E (few, slow, expensive)
      /----\
     /      \   Integration (moderate)
    /--------\
   /          \  Unit (many, fast, cheap)
  /____________\
```

### Distribution
- Unit: 70%
- Integration: 20%
- E2E: 10%

### Philosophy
- Fast feedback at the base
- More isolation = more confidence in individual units
- Higher tests exist only to verify wiring between units
- Unit tests are the primary safety net

### Best For
- Library/framework development
- Complex algorithmic logic
- Systems with clear module boundaries
- Backend services with well-defined interfaces

### Weaknesses
- Many unit tests don't guarantee the system works together
- Can lead to testing implementation details (brittle tests)
- High unit coverage with false confidence

## The Testing Trophy (Kent C. Dodds)

```
        __
       /  \     E2E (few)
      /----\
     |      |   Integration (MOST)
     |      |
     |      |
      \----/
       \  /     Unit (some)
        \/
     --------   Static (types, lint)
```

### Distribution
- Static: (always on, not counted)
- Unit: 20%
- Integration: 60%
- E2E: 10%

### Philosophy
- Integration tests give the best confidence-to-cost ratio
- Test how components work together, not in isolation
- Mock at the network boundary, not between modules
- "Write tests. Not too many. Mostly integration."

### Best For
- Web applications (frontend and full-stack)
- APIs with multiple layers
- Systems where user behavior crosses module boundaries
- React/Vue/Angular applications

### Key Insight
Integration tests catch bugs that unit tests miss (wrong wiring, wrong assumptions about interfaces) while being faster and more stable than E2E tests.

## The Testing Diamond (Google)

```
        /\
       /  \     E2E / Large (few)
      /    \
     /------\
    |        |  Integration / Medium (most)
    |        |
     \------/
      \    /
       \  /     Unit / Small (some)
        \/
```

### Distribution
- Small (unit): 20%
- Medium (integration): 60%
- Large (E2E): 20%

### Philosophy
- Google's naming: Small, Medium, Large tests
- Small: single process, no I/O, no sleep
- Medium: multiple processes, local I/O allowed, time-bounded
- Large: external systems, networks, unbounded time
- Emphasis on medium tests as primary confidence layer

### Best For
- Large-scale distributed systems
- Microservices architectures
- Systems with many service-to-service interactions
- Backend-heavy applications

## Comparison

| Aspect | Pyramid | Trophy | Diamond |
|--------|---------|--------|---------|
| Primary layer | Unit | Integration | Integration |
| Mocking strategy | Mock everything | Mock at boundaries | Mock external only |
| Speed priority | Maximum speed | Balance speed + confidence | Confidence first |
| Maintenance cost | High (many small tests) | Medium | Medium |
| Confidence in wiring | Low | High | High |
| Best domain | Libraries | Web apps | Distributed systems |

## Choosing Your Shape

### Choose Pyramid When:
- Building a library/SDK (no UI, no network)
- Complex algorithms that need exhaustive edge case testing
- Performance-critical code needing many fast tests
- Pure functions dominate the codebase

### Choose Trophy When:
- Building web applications
- User interactions cross multiple components
- You want fewer but more meaningful tests
- Team has limited testing time (maximize confidence per test)

### Choose Diamond When:
- Microservices with many integration points
- System correctness depends on service interactions
- Contract testing is important
- Multiple teams own different services

## Practical Guidelines

### Regardless of Shape
1. Tests should give confidence to deploy
2. Tests should run fast enough that devs actually run them
3. Flaky tests are worse than no tests (they erode trust)
4. Test behavior, not implementation
5. Each test should fail for exactly one reason

### Anti-Patterns (All Shapes)
- Ice cream cone: mostly E2E/manual, few unit (slow, flaky)
- Hourglass: many unit + many E2E, no integration (gap in the middle)
- No shape: random distribution with no strategy

### Right-Sizing Your Tests
```
Ask: "If I delete this test, would I notice the bug it catches?"
- Yes → keep it
- No → it's probably testing implementation, consider removing
- Maybe → it's a candidate for integration-level testing
```
