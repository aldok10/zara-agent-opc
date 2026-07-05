---
type: tool
title: "PHP Code Review"
---

# PHP Code Review

## Purpose

Review PHP code for correctness, modern idioms, and performance. Focuses on PSR compliance, async patterns, memory management, and type safety in PHP 8.3+.

## When to Use

- Reviewing Laravel/Symfony controllers, services, or middleware
- Evaluating async patterns (Swoole, ReactPHP, Fibers)
- Checking PSR compliance (PSR-4, PSR-7, PSR-12, PSR-15)
- Reviewing memory usage in long-running processes

## Prompt Template

```
CONTEXT:
- PHP version: [8.3 | 8.4 | 8.5]
- Framework: [Laravel | Symfony | Slim | none]
- Runtime: [FPM | Swoole | FrankenPHP | RoadRunner]
- Code to review: [paste code or file path]
- Key packages: [Doctrine | Eloquent | League | etc.]

REVIEW AGAINST:
1. Type safety: strict_types declaration, union/intersection types, typed properties,
   enums for value objects, never return type where appropriate
2. PSR compliance: PSR-4 autoloading, PSR-7 message interfaces,
   PSR-12 coding style, PSR-15 middleware
3. Memory: generator usage for large datasets, avoid loading full collections,
   unset large variables in loops, garbage collection in workers
4. Async: Fiber usage patterns, Swoole coroutines, non-blocking I/O,
   connection pooling in long-running processes
5. Error handling: typed exceptions, exception hierarchy,
   no catch(Exception) without re-throw, error reporting levels
6. Security: prepared statements (PDO/Doctrine), CSRF tokens,
   output escaping, file upload validation, session fixation prevention
7. Performance: opcode cache awareness, preloading candidates,
   lazy loading vs eager loading (N+1), query builder vs raw
8. Testing: PHPUnit/Pest patterns, data providers, proper mocking,
   integration vs unit boundaries

IDENTIFY:
- Memory leaks in long-running workers (static caches, event listeners)
- SQL injection risks (string concatenation in queries)
- Type coercion bugs (loose comparison, implicit casts)
- Missing null checks on nullable returns
- Circular dependencies in DI container
- Deprecated function usage
```

## Output Format

```
## PHP Review: [class/file name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Type Safety Assessment
- [strict_types: present/missing]
- [Type coverage: full/partial/weak]

### Positive Patterns
- [What follows modern PHP well]

### Suggested Changes
1. [Specific improvement with code snippet]
2. ...
```
