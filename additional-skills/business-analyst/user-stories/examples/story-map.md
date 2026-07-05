---
type: example
title: "User Story Map for Checkout Flow"
---

# User Story Map for Checkout Flow

## Context
When planning iterative delivery of a checkout experience. The story map organizes user activities (horizontal) against implementation slices (vertical), making it clear what constitutes the MVP versus later enhancements.

## Code/Template

### Story Map: E-Commerce Checkout

```
USER JOURNEY (left to right) →
────────────────────────────────────────────────────────────────────────

ACTIVITIES:   Review Cart  →  Enter Shipping  →  Choose Payment  →  Confirm Order  →  Post-Purchase

BACKBONE (user tasks under each activity):
              │                │                 │                 │                │
              ├ View items     ├ Enter address   ├ Select method   ├ Review summary  ├ See confirmation
              ├ Edit quantity  ├ Choose speed    ├ Enter card      ├ Apply coupon    ├ Get email
              ├ Remove item    ├ Save address    ├ Save method     ├ Place order     ├ Track order
              └ See total      └ Validate        └ Validate        └ Auth (3DS)     └ Request refund
```

### Release Slices

#### Release 1 — MVP (2 sprints)

| Activity | Stories | Acceptance Criteria |
|----------|---------|-------------------|
| Review Cart | View items with name, price, quantity, subtotal | Cart loads < 1s, shows real-time prices |
| Review Cart | Update quantity (1-99) | Inventory validated, total recalculated |
| Review Cart | Remove item | Confirmation prompt, cart updates immediately |
| Enter Shipping | Enter shipping address (single form) | Required: street, city, state, zip, country |
| Enter Shipping | Standard shipping only (5-7 days) | Flat rate displayed before confirmation |
| Choose Payment | Credit card entry (Stripe Elements) | PCI-compliant iframe, validation on blur |
| Confirm Order | Order summary with line items + shipping + tax | Tax calculated by address |
| Confirm Order | Place order button | Creates order, charges card, redirects to confirmation |
| Post-Purchase | Order confirmation page with number | Shows within 2s of order placement |
| Post-Purchase | Confirmation email | Sent within 5 min, includes order details |

**MVP Definition of Done**: A customer can add items to cart, enter one address, pay with credit card, and receive an order confirmation.

---

#### Release 2 — Enhanced Shipping (1 sprint)

| Story | Details |
|-------|---------|
| Multiple shipping speeds | Standard (5-7d), Express (2-3d), Next-day |
| Real-time shipping rates | Calculate based on weight + destination (EasyPost API) |
| Save shipping address | Store up to 5 addresses per account |
| Address autocomplete | Google Places API for faster entry |

---

#### Release 3 — Payment Options (1 sprint)

| Story | Details |
|-------|---------|
| PayPal checkout | Redirect flow, return to confirmation |
| Apple Pay / Google Pay | Browser Payment Request API |
| Save payment method | Tokenized storage, last-4 display |
| 3D Secure authentication | For cards requiring SCA (EU customers) |

---

#### Release 4 — Promotions & Loyalty (1 sprint)

| Story | Details |
|-------|---------|
| Apply coupon code | Validate code, show discount line item |
| Automatic promotions | "Free shipping over $50" applied without code |
| Gift cards | Apply multiple, show remaining balance |
| Loyalty points redemption | Show points available, partial payment |

---

#### Release 5 — Post-Purchase Experience (1 sprint)

| Story | Details |
|-------|---------|
| Real-time order tracking | Integration with carrier APIs (FedEx, UPS, USPS) |
| Self-service cancellation | Within 1 hour of placement, before fulfillment |
| Self-service refund request | Form submission, routed to support queue |
| Order history page | Past orders with re-order capability |

---

### Story Card Example (detailed)

```
STORY: As a customer, I want to update item quantities in my cart
       so that I can buy more or fewer of a product without re-adding it.

ACCEPTANCE CRITERIA:
  Given I have item X with quantity 2 in my cart
  When I change the quantity to 5
  Then the line item total updates to unit_price × 5
  And the cart subtotal recalculates
  And inventory is validated (cannot exceed available stock)

  Given I change quantity to 0
  Then the item is removed from my cart (with undo option)

  Given the item has max 3 in stock
  When I try to set quantity to 5
  Then I see "Only 3 available" and quantity is set to 3

TECHNICAL NOTES:
  - Debounce quantity input (300ms) to avoid excessive API calls
  - Optimistic UI: update total immediately, revert on error
  - PUT /api/cart/items/:id { quantity: number }

ESTIMATION: 3 story points
```

### Walking Skeleton (end-to-end thin slice)

```
Sprint 0 deliverable - proves the architecture works:

1. Hardcoded cart (1 item, fixed price)
2. Single-field address (zip code only)
3. Test card payment (Stripe test mode)
4. Static confirmation page
5. Console log instead of email

Value: Zero business value, full technical validation.
Validates: API structure, Stripe integration, DB schema, deploy pipeline.
```

## Key Points
- Read the map left-to-right for the user journey, top-to-bottom for priority. MVP is the thinnest horizontal slice that delivers value end-to-end.
- The walking skeleton (Sprint 0) proves architecture without delivering user value. It de-risks integration points before the team builds real features.
- Each release slice is independently shippable. Release 2 (shipping) can ship without Release 3 (payment options) — no hidden dependencies between slices.
