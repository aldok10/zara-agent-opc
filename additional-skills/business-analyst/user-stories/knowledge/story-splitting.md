# Story Splitting

## Why Split?

Stories too large for one sprint create risk: partially done work, unclear progress, late discovery of complexity. Splitting creates smaller, independently deliverable increments.

## The Golden Rule

Every split story must deliver user-visible value. If a split produces a story that only a developer would notice, split differently.

## Vertical Slicing

Cut through ALL layers (UI, logic, data) delivering a thin but complete feature.

```
BAD (horizontal):              GOOD (vertical):
  [----UI Layer----]            [UI+Logic+Data] [UI+Logic+Data]
  [---Logic Layer--]            [  Scenario A ] [  Scenario B ]
  [----Data Layer--]
```

Horizontal slices (build DB first, then API, then UI) deliver zero user value until all layers connect. Vertical slices deliver value with each slice.

## Splitting Patterns

### 1. By Workflow Steps

Original: "User can purchase an item"
Split:
- User can add item to cart
- User can enter shipping address
- User can pay with credit card
- User can receive order confirmation

### 2. By Business Rule Variations

Original: "System calculates shipping cost"
Split:
- Standard shipping (flat rate)
- Express shipping (weight-based)
- Free shipping (order > $50)
- International shipping

### 3. By Data Variations

Original: "User can search products"
Split:
- Search by product name
- Search by category
- Search by price range
- Search by availability

### 4. By Interface

Original: "User can view their dashboard"
Split:
- Dashboard with order summary
- Dashboard with spending chart
- Dashboard with recommendations

### 5. By Operations (CRUD)

Original: "User manages payment methods"
Split:
- Add a payment method
- View saved payment methods
- Remove a payment method
- Set default payment method

### 6. By Performance/Quality

Original: "Page loads quickly with all data"
Split:
- Page loads with basic data (< 1s)
- Page loads with full data and pagination
- Page loads with cached data for repeat visits

### 7. By Platform/Channel

Original: "User receives notifications"
Split:
- In-app notifications
- Email notifications
- Push notifications

### 8. By User Role

Original: "Users can manage team members"
Split:
- Admin can invite team members
- Admin can remove team members
- Manager can view team member activity

### 9. By Happy Path vs. Edge Cases

Original: "User uploads profile photo"
Split:
- Upload a valid JPEG/PNG photo
- Handle invalid file types with error message
- Handle oversized files with resize prompt
- Handle upload failure with retry

### 10. Spike Then Story

When you can't estimate:
- Spike: "Investigate payment gateway integration options (time-boxed: 2 days)"
- Then: Write the actual story with real estimates

## Anti-Patterns in Splitting

### Technical Layer Split

"Build the API" / "Build the UI" -- neither delivers value alone.

### Arbitrary Size Split

"Do the first half of the feature" / "Do the second half" -- what's independently valuable?

### Testing as Separate Story

"Implement feature" / "Test feature" -- testing is part of done, not a separate story.

### Spike Without Follow-Up

A spike that doesn't result in actionable stories was wasted time. Always define what comes next.

## Splitting Decision Tree

1. Can you split by workflow step? (delivers value at each step)
2. Can you split by business rule? (each rule is independently useful)
3. Can you split by data type/variation? (subset is still valuable)
4. Can you remove edge cases to a follow-up? (happy path first)
5. Can you simplify the UI and enhance later? (basic then polished)
6. Is there a manual workaround for part of it? (automate incrementally)

## Definition of "Small Enough"

A story is small enough when:
- Team can confidently estimate it (low variance in estimates)
- Fits comfortably in one sprint with buffer
- Can be code-reviewed in one sitting
- Risk of "almost done but not quite" is low
- Acceptance criteria are 3-7 items (more = too big)

## Thin End-to-End Slices

The first story for any new feature should be the thinnest possible end-to-end slice:
- Simplest input
- Simplest processing
- Simplest output
- Proves the architecture works
- Delivers some (even minimal) user value

Then add depth with subsequent stories.
