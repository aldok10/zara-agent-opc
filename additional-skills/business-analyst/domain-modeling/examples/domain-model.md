---
type: example
title: "Example: Domain Model -- Food Delivery Platform"
---

# Example: Domain Model -- Food Delivery Platform

## Bounded Contexts

### Ordering Context

Handles menu browsing, cart management, and order placement.

### Fulfillment Context

Handles order preparation, driver assignment, and delivery tracking.

### Payment Context

Handles charges, refunds, and payouts to restaurants.

### Restaurant Context

Handles restaurant profiles, menus, and availability.

---

## Ubiquitous Language (Ordering Context)

| Term | Definition |
|------|-----------|
| Order | A customer's request to purchase menu items for delivery |
| Cart | A temporary collection of menu items before order placement |
| Line Item | A single menu item entry in an order with quantity and customizations |
| Customization | A modification to a menu item (e.g., extra cheese, no onions) |
| Order Total | Sum of line item prices + delivery fee + service fee - discounts |
| Delivery Window | The promised time range for delivery |
| Minimum Order | The lowest order total a restaurant accepts |

## Ubiquitous Language (Fulfillment Context)

| Term | Definition |
|------|-----------|
| Delivery | The physical transport of an order from restaurant to customer |
| Assignment | Matching an available driver to a pending delivery |
| Pickup | Driver arrives at restaurant and collects the order |
| Drop-off | Driver delivers the order to the customer address |
| ETA | Estimated time of arrival, recalculated continuously |
| Delivery Zone | Geographic area within which a restaurant delivers |

---

## Aggregates (Ordering Context)

### Order (Aggregate Root)

```
Order
  - orderId: OrderId
  - customerId: CustomerId
  - restaurantId: RestaurantId
  - lineItems: List<LineItem>
  - deliveryAddress: Address
  - status: OrderStatus
  - placedAt: Timestamp
  - pricing: OrderPricing

  invariants:
    - Must have at least one line item
    - Total must meet restaurant minimum order
    - Delivery address must be within restaurant delivery zone
    - Cannot modify after status = Confirmed
```

### LineItem (Entity, within Order aggregate)

```
LineItem
  - lineItemId: LineItemId
  - menuItemId: MenuItemId
  - quantity: PositiveInteger
  - customizations: List<Customization>
  - unitPrice: Money
```

### OrderPricing (Value Object)

```
OrderPricing
  - subtotal: Money
  - deliveryFee: Money
  - serviceFee: Money
  - discount: Money
  - total: Money
```

### Address (Value Object)

```
Address
  - street: String
  - unit: String (optional)
  - city: String
  - postalCode: String
  - coordinates: LatLng
  - deliveryInstructions: String (optional)
```

---

## Domain Events (Ordering Context)

| Event | Trigger | Data |
|-------|---------|------|
| OrderPlaced | Customer confirms cart | orderId, customerId, restaurantId, items, total |
| OrderConfirmed | Restaurant accepts | orderId, estimatedPrepTime |
| OrderRejected | Restaurant declines | orderId, reason |
| OrderCancelled | Customer or system cancels | orderId, cancelledBy, reason |
| OrderModified | Customer changes before confirmation | orderId, changes |

---

## Policies

| When | Then |
|------|------|
| OrderPlaced | Notify restaurant for acceptance |
| OrderPlaced | Reserve payment authorization |
| OrderConfirmed | Create Delivery in Fulfillment context |
| OrderRejected | Release payment authorization |
| OrderRejected | Notify customer with reason |
| No restaurant response in 5 min | Auto-reject and notify customer |

---

## Context Map

```
[Ordering] --Customer-Supplier--> [Fulfillment]
  OrderConfirmed event triggers delivery creation

[Ordering] --Customer-Supplier--> [Payment]
  OrderPlaced triggers payment authorization

[Restaurant] --Published Language--> [Ordering]
  Menu and availability data consumed by Ordering

[Fulfillment] --Events--> [Ordering]
  DeliveryCompleted updates order status
```

---

## Anti-Corruption Layer

The Ordering context does NOT directly consume the Restaurant context's internal menu model. Instead, it maintains a read model (MenuView) that is synchronized from the Restaurant context's published events (MenuItemUpdated, MenuItemRemoved, RestaurantAvailabilityChanged).
