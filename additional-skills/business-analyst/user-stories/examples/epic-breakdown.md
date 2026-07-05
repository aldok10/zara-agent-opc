---
type: example
title: "Example: Epic Breakdown -- Multi-Tenant Billing System"
---

# Example: Epic Breakdown -- Multi-Tenant Billing System

## Epic

**As a** SaaS platform operator,
**I want** a multi-tenant billing system,
**So that** customers are charged accurately based on their usage and plan.

---

## Story Map

```
Backbone: Subscribe > Use > Invoice > Pay > Manage

Subscribe:        Use:            Invoice:         Pay:           Manage:
- Select plan     - Track usage   - Generate       - Pay invoice  - View history
- Enter payment   - Enforce       - Send to        - Handle       - Download
- Confirm sub       limits          customer         failure       invoices
- Trial period    - Usage alerts  - Prorate        - Receipts    - Update plan
                                  - Credits                      - Cancel
```

---

## Sprint 1: Walking Skeleton (MVP)

### US-001: Select a subscription plan

**As a** new customer,
**I want** to choose from available plans,
**So that** I can start using the platform with the right tier.

**Acceptance Criteria:**
- Display available plans with name, price, and included features
- Allow selection of one plan
- Show monthly and annual pricing options
- Highlight current selection

Size: 3 points

### US-002: Subscribe with credit card

**As a** customer who selected a plan,
**I want** to enter my payment details and confirm,
**So that** my subscription is activated.

**Acceptance Criteria:**
- Collect card number, expiry, CVV
- Validate card via payment processor
- Create subscription record on success
- Show confirmation with plan details and next billing date
- Handle declined card with clear error message

Size: 5 points

### US-003: Generate monthly invoice

**As a** subscribed customer,
**I want** to receive a monthly invoice,
**So that** I have a record of what I'm paying for.

**Acceptance Criteria:**
- Auto-generate invoice on billing date
- Include: plan name, period, amount, tax, total
- Assign sequential invoice number
- Store invoice as immutable record

Size: 3 points

### US-004: Pay invoice automatically

**As a** customer with a card on file,
**I want** my invoice paid automatically,
**So that** I don't need to take manual action each month.

**Acceptance Criteria:**
- Charge saved payment method on invoice generation
- Mark invoice as paid on successful charge
- Send payment confirmation email
- Retry failed payment after 24 hours (max 3 attempts)

Size: 5 points

---

## Sprint 2: Usage Tracking

### US-005: Track API usage per tenant

**As a** platform operator,
**I want** to track each tenant's API calls,
**So that** usage-based billing is accurate.

**Acceptance Criteria:**
- Count API calls per tenant per billing period
- Store usage in near-real-time (< 5 min delay)
- Usage counter resets at billing period start
- Usage data queryable by tenant and date range

Size: 5 points

### US-006: Enforce plan usage limits

**As a** platform operator,
**I want** requests beyond the plan limit to be rejected,
**So that** customers stay within their subscribed tier.

**Acceptance Criteria:**
- Return 429 when tenant exceeds plan limit
- Response includes current usage and limit
- Include upgrade prompt in error response
- Grace period: 10% overage allowed before hard block

Size: 3 points

### US-007: Usage approaching limit alert

**As a** customer,
**I want** to be notified when I'm near my usage limit,
**So that** I can upgrade or adjust before being blocked.

**Acceptance Criteria:**
- Send email at 80% and 95% of plan limit
- Include current usage, limit, and upgrade link
- Send at most once per threshold per billing period
- In-app notification banner when over 90%

Size: 3 points

---

## Sprint 3: Plan Management

### US-008: Upgrade subscription plan

**As a** customer,
**I want** to upgrade to a higher plan,
**So that** I get more capacity immediately.

**Acceptance Criteria:**
- Show available upgrade options from current plan
- Upgrade takes effect immediately
- Prorate charge for remainder of current period
- New limits apply instantly after upgrade
- Confirmation email with new plan details

Size: 5 points

### US-009: Downgrade subscription plan

**As a** customer,
**I want** to downgrade to a lower plan,
**So that** I can reduce costs when I need less.

**Acceptance Criteria:**
- Downgrade takes effect at end of current billing period
- Warn if current usage exceeds new plan limits
- Confirm acknowledgment of reduced limits
- No refund for current period (already paid)

Size: 3 points

### US-010: Cancel subscription

**As a** customer,
**I want** to cancel my subscription,
**So that** I stop being charged.

**Acceptance Criteria:**
- Cancellation takes effect at end of billing period
- Access maintained until period ends
- Confirmation email with final date of access
- Data retention for 30 days after cancellation
- Option to reactivate within 30 days without re-entering payment

Size: 3 points

---

## Sprint 4: Billing Operations

### US-011: View billing history

**As a** customer,
**I want** to see my past invoices and payments,
**So that** I can track my spending.

**Acceptance Criteria:**
- List all invoices with date, amount, status
- Filter by date range and status (paid, pending, failed)
- Paginate at 20 items per page

Size: 2 points

### US-012: Download invoice as PDF

**As a** customer,
**I want** to download any invoice as a PDF,
**So that** I can submit it for expense reporting.

**Acceptance Criteria:**
- PDF includes company details, invoice number, line items, tax, total
- Formatted for printing on A4/Letter
- Available for all historical invoices

Size: 3 points

### US-013: Handle payment failure

**As a** platform operator,
**I want** failed payments handled gracefully,
**So that** revenue is recovered without losing customers.

**Acceptance Criteria:**
- Retry payment at day 1, 3, and 7 after failure
- Email customer on each failure with "update payment" link
- After all retries exhausted: suspend account (read-only access)
- Reactivate immediately when payment succeeds
- Do not delete any customer data during suspension

Size: 5 points

---

## Dependencies

```
US-001 --> US-002 --> US-003 --> US-004
                                   |
US-005 --> US-006                   +--> US-013
       \-> US-007
                      US-008, US-009, US-010 (depend on US-002)
                      US-011, US-012 (depend on US-003)
```

## Total: 13 stories, ~46 points, ~4 sprints
