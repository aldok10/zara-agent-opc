---
type: example
title: "Acceptance Criteria for Login Feature"
---

# Acceptance Criteria for Login Feature

## Context
When specifying login functionality with multiple auth methods, rate limiting, and security requirements. Each scenario is independently testable with clear preconditions and expected outcomes.

## Code/Template

### Feature: User Authentication (Login)

As a registered user, I want to log in to my account so that I can access my personalized dashboard and data.

---

### Scenario: Successful login with email and password

```gherkin
Given I am on the login page
And I have a verified account with email "user@example.com"
When I enter my email "user@example.com"
And I enter my correct password
And I click "Sign In"
Then I am redirected to the dashboard
And I see a welcome message with my display name
And a session cookie is set with httpOnly and secure flags
And a login event is recorded in the audit log
```

### Scenario: Failed login with incorrect password

```gherkin
Given I am on the login page
And I have an account with email "user@example.com"
When I enter my email "user@example.com"
And I enter an incorrect password
And I click "Sign In"
Then I see the message "Invalid email or password"
And the password field is cleared
And the failed attempt counter increments for that email
And no session is created
```

### Scenario: Account locked after 5 failed attempts

```gherkin
Given I have failed to login 4 times with email "user@example.com"
When I fail to login a 5th time
Then my account is temporarily locked for 15 minutes
And I see the message "Account locked. Try again in 15 minutes or reset your password."
And I receive an email notification about the lockout
And subsequent login attempts (even with correct password) are rejected until lockout expires
```

### Scenario: Login with unverified email

```gherkin
Given I registered with email "new@example.com"
And I have not clicked the verification link
When I attempt to login with correct credentials
Then I see the message "Please verify your email before logging in"
And I am shown an option to resend the verification email
And no session is created
```

### Scenario: Login with OAuth provider (Google)

```gherkin
Given I am on the login page
When I click "Continue with Google"
Then I am redirected to Google's OAuth consent screen
When I authorize the application
Then I am redirected back to the dashboard
And my account is linked to the Google identity (if not already)
And a session is created
```

### Scenario: Login from a new device triggers MFA

```gherkin
Given I have MFA enabled on my account
And I am logging in from an unrecognized device
When I enter valid email and password
Then I am prompted to enter my 6-digit TOTP code
When I enter a valid TOTP code
Then I am redirected to the dashboard
And the device is remembered for 30 days (if "trust this device" is checked)
```

### Scenario: Session expiry and re-authentication

```gherkin
Given I am logged in with an active session
And my session has been idle for more than 30 minutes
When I attempt to perform any authenticated action
Then I am redirected to the login page
And I see the message "Your session expired. Please sign in again."
And my previous page URL is preserved for redirect after login
```

---

### Non-Functional Acceptance Criteria

| Criteria | Threshold |
|----------|-----------|
| Login API response time | < 500ms at P99 |
| Rate limiting | Max 10 attempts per email per 15 minutes |
| Password transmission | TLS 1.2+ only, never logged |
| Session token | Cryptographically random, 256-bit minimum |
| Audit logging | All login attempts (success + failure) within 1s |
| Accessibility | WCAG 2.1 AA, keyboard navigable, screen reader labels |

## Key Points
- Security scenarios (lockout, MFA, session expiry) are first-class acceptance criteria, not afterthoughts.
- Error messages never reveal whether an email exists in the system ("Invalid email or password" not "password incorrect").
- Each scenario has exactly one trigger (When) making it independently automatable in a test suite.
