# Gherkin Patterns

## Structure

Gherkin uses a Given-When-Then format to express expected behavior in structured, testable scenarios.

```gherkin
Feature: [Business capability]
  As a [role]
  I want [action]
  So that [benefit]

  Scenario: [Specific behavior]
    Given [precondition/context]
    When [action/trigger]
    Then [expected outcome]
```

## Core Keywords

| Keyword | Purpose | Usage |
|---------|---------|-------|
| Given | Establish context | System state before action |
| When | Trigger action | Single user action or event |
| Then | Assert outcome | Observable, verifiable result |
| And | Continue previous | Chain same-type steps |
| But | Negative continuation | Exclude specific outcomes |

## Best Practices

### One Behavior Per Scenario

Each scenario tests exactly one business rule. If you need "and also check..." -- that's a second scenario.

### Declarative Over Imperative

Bad (imperative):
```gherkin
When I click the "Login" button
And I type "user@email.com" in the email field
And I type "password123" in the password field
And I click "Submit"
```

Good (declarative):
```gherkin
When I log in with valid credentials
```

### Given Sets Context, Not Actions

Given describes the world as it exists before the test starts. It should not describe user actions.

```gherkin
# Bad
Given I navigate to the settings page

# Good
Given I am on the settings page
```

### Then Asserts Business Outcomes

Focus on what the user observes or the system guarantees -- not implementation details.

```gherkin
# Bad
Then the database contains a row with status "active"

# Good
Then my account status shows "Active"
```

## Scenario Outline (Data-Driven)

Use when the same behavior applies across multiple inputs:

```gherkin
Scenario Outline: Password validation
  Given I am on the registration page
  When I enter a password "<password>"
  Then I should see "<message>"

  Examples:
    | password  | message                    |
    | abc       | Must be at least 8 chars   |
    | abcdefgh  | Password accepted          |
    | ab cd ef  | Must not contain spaces    |
```

## Background (Shared Context)

Use Background for Given steps repeated in every scenario of a feature:

```gherkin
Background:
  Given I am logged in as an admin
  And the reporting module is enabled
```

Limit Background to 2-3 steps. If it grows larger, consider splitting the feature file.

## Anti-Patterns

### Too Many Steps

If a scenario has 10+ steps, it's testing multiple behaviors. Split it.

### UI-Coupled Scenarios

Referencing CSS selectors, button labels, or page structure creates brittle tests. Write at the business behavior level.

### Testing Implementation

```gherkin
# Anti-pattern
Then a POST request is sent to /api/orders
And the response code is 201

# Better
Then my order is confirmed
And I receive an order confirmation email
```

### Incidental Details

Include only details relevant to the behavior being tested:

```gherkin
# Too much detail
Given a user named "John Smith" aged 34 from "New York"
  with email "john@example.com" registered on "2024-01-15"
When they request a password reset

# Sufficient
Given a registered user
When they request a password reset
```

### And/And/And Chains

More than 3 And steps signals a scenario doing too much. Refactor.

## Tags for Organization

```gherkin
@payment @critical
Scenario: Successful card payment

@wip
Scenario: Partial refund processing
```

Common tag categories: priority (@critical, @p1), module (@payment, @auth), status (@wip, @blocked), type (@smoke, @regression).

## Writing Order

1. Start with the happy path scenario
2. Add primary error/edge scenarios
3. Add boundary cases
4. Add permission/role variations
5. Review: can each scenario stand alone?
