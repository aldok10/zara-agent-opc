---
type: tool
title: "Java Code Review"
---

# Java Code Review

## Purpose

Review Java code for correctness, modern idioms, and performance. Focuses on virtual threads, records, pattern matching, and Spring/Jakarta EE patterns.

## When to Use

- Reviewing Spring Boot services or Jakarta EE components
- Evaluating virtual thread usage and concurrency patterns
- Checking proper use of records, sealed classes, and pattern matching
- Reviewing stream operations and resource management

## Prompt Template

```
CONTEXT:
- Java version: [21 | 22 | 23]
- Framework: [Spring Boot 3.x | Quarkus | Micronaut | Jakarta EE]
- Code to review: [paste code or file path]
- Key libraries: [Spring Data | Hibernate | Jackson | etc.]

REVIEW AGAINST:
1. Virtual threads: appropriate use (IO-bound tasks), avoid pinning (synchronized blocks),
   no ThreadLocal for request context with virtual threads
2. Records: use for DTOs and value objects, no mutable state,
   compact constructors for validation
3. Pattern matching: instanceof pattern, switch expressions with sealed types,
   exhaustive matching
4. Streams: avoid side effects, prefer collectors, no nested streams on large data
5. Resource management: try-with-resources, proper AutoCloseable implementation,
   no resource leaks in error paths
6. Spring specifics: constructor injection (no @Autowired on fields),
   @Transactional boundaries, proper exception mapping
7. Null safety: Optional for return types (not parameters), @Nullable annotations,
   early validation at boundaries
8. Testing: JUnit 5 patterns, AssertJ over Hamcrest, proper mocking scope,
   @SpringBootTest only for integration tests

IDENTIFY:
- Thread safety issues with shared mutable state
- Improper exception handling (catch-and-swallow, catching Exception/Throwable)
- Memory leaks (unclosed resources, growing collections)
- N+1 queries in JPA/Hibernate code
- Blocking operations on virtual threads (acceptable but note pinning)
- Overly complex inheritance hierarchies
```

## Output Format

```
## Java Review: [class/package name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Modern Java Opportunities
- [Where records/patterns/virtual threads could improve code]

### Positive Patterns
- [What follows current best practices]

### Suggested Changes
1. [Specific refactor with code snippet]
2. ...
```
