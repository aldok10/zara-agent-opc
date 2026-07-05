# PHP Code Review Prompt

You are reviewing PHP code for production readiness. Focus on PSR compliance, type safety, security, and architectural patterns.

## Input

**Code to review:** {{code_or_file_path}}
**Context:** {{what_this_code_does}}
**PHP version:** {{version, default 8.3+}}
**Framework:** {{Laravel | Symfony | None}}

## Review Checklist

### Type Safety (PHP 8.3+)
- Are all parameters and return types declared?
- Are union types used instead of mixed where possible?
- Are readonly properties used for immutable data?
- Is `never` return type used for functions that always throw?
- Are typed constants used (PHP 8.3)?
- Are enums used instead of string/int constants?

### PSR Compliance
- PSR-1: Basic coding standard (namespaces, class naming)
- PSR-4: Autoloading (namespace matches directory structure)
- PSR-12: Extended coding style (braces, spacing, declarations)
- PSR-7/15/17: HTTP message interfaces (if applicable)

### Security
- Is user input validated/sanitized before use?
- Are SQL queries parameterized (no string concatenation)?
- Is output escaped for context (HTML, JSON, SQL)?
- Are file operations path-traversal safe?
- Are secrets accessed via environment, not hardcoded?
- Is CSRF protection in place for state-changing requests?

### Architecture
- Single Responsibility: does each class have one reason to change?
- Dependency Inversion: are dependencies injected, not instantiated?
- Are domain objects free of infrastructure concerns?
- Is business logic in services/actions, not controllers?
- Are value objects used for complex values (Money, Email, etc.)?

### Error Handling
- Are specific exceptions thrown (not generic \Exception)?
- Do exceptions include context for debugging?
- Are exceptions caught at appropriate boundaries?
- Is error state recoverable vs fatal clearly distinguished?

### Performance
- Are N+1 queries avoided (eager loading)?
- Are large collections processed in chunks?
- Is caching used for expensive computations?
- Are database indices aligned with query patterns?

## Output Format

For each issue:
```
[SEVERITY] file:line -- description
  Suggestion: [fix]
```

Severity: CRITICAL (bug/security) | WARNING (correctness) | INFO (style/improvement)

End with: total by severity, overall verdict (ship/fix-then-ship/redesign).
