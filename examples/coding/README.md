# Coding Examples

## Refactoring

### Scenario
A legacy codebase with a 500-line function handling order processing, validation, discount calculation, inventory checks, and email notifications.

### Ask Zara
```
Refactor this monolithic order processing function.
It handles validation, discounts, inventory, and notifications
all in one place. Make it maintainable.
```

### Expected Workflow
1. Zara engages `code-reviewer` sub-agent
2. Identifies: Long Method, Shotgun Surgery, SRP violations
3. Proposes:
   - Extract OrderValidator
   - Extract DiscountCalculator (with Strategy pattern)
   - Extract InventoryService
   - Extract NotificationService
   - Keep OrderProcessor as orchestrator

---

## Debugging

### Scenario
A race condition in an async payment processing pipeline.

### Ask Zara
```
We have intermittent failures in payment processing.
Two concurrent operations sometimes process the same order.
Stack traces show race conditions in the transaction manager.
```

### Expected Workflow
1. Zara engages `code-reviewer` and `testing-lead`
2. Analysis:
   - Missing transaction isolation
   - No optimistic locking
   - Insufficient state validation
3. Recommendations:
   - Add database-level locks
   - Implement idempotency keys
   - Add state machine validation
   - Write concurrent integration tests

---

## Code Review

### Scenario
A pull request adding a new authentication system.

### Ask Zara
```
Review this PR adding JWT authentication.
Focus on security and maintainability.
```

### Expected Workflow
1. Zara engages `security-reviewer` and `code-reviewer`
2. Security review:
   - Token storage approach
   - Refresh token rotation
   - CSRF protection
   - Rate limiting
3. Code review:
   - Separation of auth concerns
   - Error handling patterns
   - Test coverage
   - Configuration management
