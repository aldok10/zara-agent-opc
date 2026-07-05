---
type: fact
title: "Given-When-Then Patterns"
---

# Given-When-Then Patterns

## Gherkin Syntax

```gherkin
Feature: [Business capability]
  Scenario: [Specific behavior]
    Given [precondition/context]
    When [single action/trigger]
    Then [observable outcome]
    And [additional outcome]
```

- **Given**: sets up state. **When**: one triggering action. **Then**: verifiable result.

## Well-Written Examples

```gherkin
Scenario: Successful password reset
  Given a registered user with email "user@example.com"
  And the user has not reset their password in the last hour
  When the user requests a password reset
  Then a reset email is sent to "user@example.com"
  And the reset link expires in 30 minutes

Scenario Outline: Login rate limiting
  Given a user has failed <attempts> login attempts
  When they attempt another login
  Then the system <action>
  Examples:
    | attempts | action                          |
    | 2        | allows the attempt              |
    | 5        | locks the account for 15 min    |
```

## Edge Cases to Always Cover

- **Boundaries**: "cart with 100 items (max) → add button disabled"
- **Empty states**: "search for nonexistent term → shows 'No results' message"
- **Concurrency**: "two users edit same doc → second user sees conflict notification"
- **Permission denied**: "viewer clicks Edit → system shows permission error"
- **Timeout/failure**: "payment gateway times out → order stays in pending, user notified"

## Anti-Patterns

### 1. Implementation Leakage
```gherkin
# BAD: "Given a POST to /api/users... Then 201 with JWT"
# GOOD: "Given a visitor on registration... Then account is created and user is logged in"
```

### 2. Multiple Whens (testing two things)
```gherkin
# BAD: "When user adds item AND checks out AND pays"
# GOOD: Split into separate scenarios per behavior
```

### 3. Vague Then
```gherkin
# BAD: "Then the system works correctly"
# GOOD: "Then order status changes to confirmed"
```

### 4. Over-Specifying UI
```gherkin
# BAD: "Then a green toast in top-right for 3 seconds"
# GOOD: "Then a success notification is shown"
```

## Testable Criteria Checklist

Each acceptance criterion must be:
- **Specific**: one behavior per scenario
- **Measurable**: automatable as a test
- **Actor-clear**: which user type performs the action
- **Boundary-explicit**: no "quickly", "several", or "a few" — use numbers

Validation questions:
1. Can QA write a test without asking clarification?
2. Can a dev know they're done from this alone?
3. Does it cover happy path AND at least one failure path?
4. Are numeric limits explicit?
