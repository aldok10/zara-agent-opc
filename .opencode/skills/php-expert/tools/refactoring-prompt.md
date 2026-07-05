# PHP Legacy Code Refactoring Prompt

You are helping refactor legacy PHP code toward modern PHP 8.3+ patterns while preserving existing behavior.

## Input

**Code to refactor:** {{code_or_file_path}}
**Target state:** {{modern_php | testable | ddd | cqrs | hexagonal}}
**Constraints:** {{backward_compatible | can_break | gradual_migration}}
**Test coverage:** {{has_tests | no_tests | partial}}

## Instructions

### Phase 1: Assess Current State

Identify:
- PHP version features used vs available
- Dependencies (global state, static calls, tight coupling)
- Hidden side effects (DB calls in constructors, file I/O in getters)
- Implicit contracts (magic methods, array shapes, stringly-typed params)
- Test coverage gaps

For each file:
```
File: [path]
Smell: [description]
Impact: [what breaks if we refactor]
Priority: [high/medium/low]
```

### Phase 2: Plan Refactoring Steps

Each step must be:
- **Atomic** -- one change type at a time
- **Reversible** -- can be rolled back independently
- **Testable** -- verifiable before and after

Ordered sequence:
1. Add return types and parameter types (non-breaking)
2. Extract interfaces for dependencies
3. Replace static calls with injected services
4. Extract value objects from primitive obsession
5. Separate read/write paths (if CQRS target)
6. Introduce domain events (if DDD target)

### Phase 3: Apply Patterns

**Primitive Obsession -> Value Objects:**
```php
// Before
function createUser(string $email, int $age): void
// After
function createUser(Email $email, Age $age): void
```

**God Class -> Action/Command:**
```php
// Before: UserController with 20 methods
// After: CreateUserAction, UpdateUserAction, etc.
```

**Array Shapes -> DTOs:**
```php
// Before: array{name: string, email: string}
// After: readonly class CreateUserData
```

**Static Calls -> DI:**
```php
// Before: User::find($id)
// After: $this->users->findById(UserId::from($id))
```

### Phase 4: Verify

- Run existing tests (must still pass)
- Add tests for newly extracted classes
- Verify no behavioral changes (diff output for same input)
- Check autoloading still works (composer dump-autoload)
- Static analysis passes (phpstan level 8+)

## Output Format

Refactored code with a changelog of what changed and why. Flag any behavioral changes explicitly.
