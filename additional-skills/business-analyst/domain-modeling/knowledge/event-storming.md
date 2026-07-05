---
type: fact
title: "Event Storming Workshop"
---

# Event Storming Workshop

## Levels

1. **Big Picture**: map entire business domain (2-4h, everyone)
2. **Process Level**: detail a single workflow (smaller group)
3. **Design Level**: translate to software design (developers + 1-2 domain experts)

## Sticky Note Colors

| Color | Represents | Format | Example |
|-------|-----------|--------|---------|
| Orange | Domain Event | Past tense | "Order Placed" |
| Blue | Command | Imperative | "Place Order" |
| Yellow (small) | Actor | Role | "Customer" |
| Purple | Policy | When...then | "When payment received, ship" |
| Green | Read Model | Screen/data | "Order Summary" |
| Pink/Red | Hot Spot | Question | "What if payment fails?" |
| Large Yellow | Aggregate | Noun | "Order" |

## Big Picture Flow

1. **Chaotic exploration** (30 min): everyone writes orange events simultaneously, no ordering
2. **Timeline ordering** (30 min): arrange left-to-right, identify parallel flows
3. **Hot spots** (15 min): mark conflicts, questions, uncertainties with pink stickies
4. **Bounded context boundaries** (20 min): draw lines around clusters, name them

## Process Level

Zoom into one bounded context with full notation:

```
[Actor] → [Command] → [Aggregate] → [Domain Event] → [Policy] → [next Command]
```

Example:
```
Customer → "Place Order" → [Order] → "Order Placed"
  → Policy: "reserve inventory" → [Inventory] → "Inventory Reserved"
  → Policy: "charge payment" → [Payment] → "Payment Charged"
  → Policy: "confirm order"
```

## Design Level: Stickies to Code

```
Aggregate: [Order]
  handles: "Place Order" command
  produces: "Order Placed" event
  invariants: itemCount <= 50, allItemsInStock
  
→ class Order { placeOrder(items, payment) → OrderPlacedEvent }
```

## Facilitation Tips

- Long wall (6-10m) with butcher paper, standing only
- Domain experts write first, developers ask questions
- Time-box strictly (energy drops after 3h)
- No laptops — sticky notes only
- Photographer captures board for later digitization

## Common Failures

1. Developers jump to technical solutions too early
2. No domain experts present → invented terminology
3. Trying to model everything in one session
4. Facilitator writes all stickies → not collaborative

## Output Artifacts

- Event flow diagram (digitized in Miro/FigJam)
- Bounded context map with upstream/downstream relationships
- Domain glossary
- Hot spot list prioritized for follow-up
- Aggregate catalog (commands, events, invariants)
