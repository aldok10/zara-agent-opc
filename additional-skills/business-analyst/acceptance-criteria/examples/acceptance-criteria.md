---
type: example
title: "Example: Acceptance Criteria for Shopping Cart Checkout"
---

# Example: Acceptance Criteria for Shopping Cart Checkout

## Feature: Shopping Cart Checkout

As a customer, I want to complete my purchase so that I receive the items I selected.

---

### Scenario: Successful checkout with single item

```gherkin
Given I have 1 item in my cart
And I have a valid shipping address saved
And I have a valid payment method on file
When I confirm my order
Then my order is placed successfully
And I receive an order confirmation email within 5 minutes
And my payment method is charged the item total plus shipping
And my cart is emptied
```

### Scenario: Checkout with out-of-stock item

```gherkin
Given I have 3 items in my cart
And 1 item has gone out of stock since I added it
When I proceed to checkout
Then I am notified which item is unavailable
And I am given the option to remove it or wait for restock
And I cannot complete checkout until the conflict is resolved
```

### Scenario: Payment method declined

```gherkin
Given I have items in my cart
And I proceed to the payment step
When my payment method is declined
Then I see a message indicating the payment failed
And I am prompted to use a different payment method
And no order is created
And no charge appears on my account
```

### Scenario: Applying a valid discount code

```gherkin
Given I have items totaling $100 in my cart
When I apply discount code "SAVE20"
Then my order total is reduced by $20
And the discount is shown as a line item in the order summary
And the discount code is marked as used for my account
```

### Scenario: Applying an expired discount code

```gherkin
Given I have items in my cart
When I apply discount code "EXPIRED10"
Then I see a message that the code is no longer valid
And my order total remains unchanged
```

### Scenario: Empty cart checkout attempt

```gherkin
Given my cart is empty
When I attempt to proceed to checkout
Then I am redirected to my cart page
And I see a message suggesting I add items first
And the checkout button is disabled
```

### Scenario: Session timeout during checkout

```gherkin
Given I am on the payment confirmation step
And my session has been inactive for 30 minutes
When I click "Confirm Order"
Then I am redirected to the login page
And my cart contents are preserved
And I can resume checkout after logging in
```

### Scenario: Concurrent inventory reduction

```gherkin
Given I have the last available unit of an item in my cart
And another customer purchases that item simultaneously
When I confirm my order
Then I am notified the item is no longer available
And no charge is made to my payment method
And I am offered similar alternatives
```

---

## Non-Functional Acceptance Criteria

- Checkout page loads within 2 seconds at P95
- Payment processing completes within 10 seconds
- Order confirmation email sent within 5 minutes of order placement
- All payment data transmitted over TLS 1.3
- Checkout flow accessible via keyboard navigation and screen readers
- Works on viewports 320px and wider
