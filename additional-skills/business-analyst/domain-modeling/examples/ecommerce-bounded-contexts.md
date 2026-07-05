---
type: example
title: "E-Commerce Bounded Contexts"
---

# E-Commerce Bounded Contexts

## Context
When decomposing an e-commerce platform into bounded contexts for a microservices or modular monolith architecture. Each context owns its data, has clear boundaries, and communicates through well-defined contracts.

## Code/Template

### Context Map Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         E-Commerce Platform                              │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│   Catalog    │    Order     │  Inventory   │   Payment    │  Shipping   │
│              │              │              │              │             │
│ - Product    │ - Order      │ - Stock      │ - Transaction│ - Shipment  │
│ - Category   │ - LineItem   │ - Warehouse  │ - Refund     │ - Carrier   │
│ - Price      │ - Discount   │ - Reservation│ - Method     │ - Tracking  │
│ - Variant    │ - Status     │ - Restock    │ - Receipt    │ - Address   │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

### Bounded Context: Order Management

```
Ubiquitous Language:
- Order: a customer's intent to purchase one or more items
- LineItem: a single product + quantity within an order
- OrderStatus: draft → confirmed → paid → fulfilled → completed | cancelled

Aggregates:
- Order (root): owns LineItems, applies discounts, calculates total
- Customer (reference only - owned by Identity context)

Domain Events Published:
- OrderPlaced { orderId, customerId, items[], totalAmount, currency }
- OrderCancelled { orderId, reason, cancelledAt }
- OrderFulfilled { orderId, shipmentId }

Commands Accepted:
- PlaceOrder { customerId, items[], shippingAddress, paymentMethodId }
- CancelOrder { orderId, reason }
- ApplyDiscount { orderId, discountCode }
```

### Bounded Context: Inventory

```
Ubiquitous Language:
- Stock: available quantity of a SKU at a specific warehouse
- Reservation: temporary hold on stock for a pending order (TTL: 15 min)
- Restock: inbound shipment increasing available stock

Aggregates:
- StockItem (root): tracks available, reserved, and incoming quantities
- Warehouse: physical location with stock items

Domain Events Published:
- StockReserved { skuId, warehouseId, quantity, reservationId, expiresAt }
- StockReleased { skuId, warehouseId, quantity, reason }
- LowStockAlert { skuId, warehouseId, available, threshold }

Commands Accepted:
- ReserveStock { skuId, quantity, orderId }
- ReleaseStock { reservationId }
- RecordRestock { skuId, warehouseId, quantity, expectedAt }

Reacts To (from other contexts):
- OrderPlaced → ReserveStock
- OrderCancelled → ReleaseStock
- PaymentFailed → ReleaseStock
```

### Bounded Context: Payment

```
Ubiquitous Language:
- Transaction: a single charge or refund attempt against a payment method
- PaymentMethod: stored card, bank account, or wallet reference
- Receipt: proof of successful payment, tied to an order

Aggregates:
- Payment (root): handles charge lifecycle (pending → captured → settled | failed)
- PaymentMethod: tokenized reference (no raw card data stored)

Domain Events Published:
- PaymentCaptured { orderId, transactionId, amount, currency }
- PaymentFailed { orderId, transactionId, reason }
- RefundIssued { orderId, transactionId, amount, reason }

Invariants:
- Total charges for an order never exceed the order total
- Refund amount never exceeds captured amount
- Payment method must be verified before first charge
```

### Integration Patterns

| Producer | Consumer | Event | Pattern |
|----------|----------|-------|---------|
| Order | Inventory | OrderPlaced | Async (event bus) |
| Order | Payment | OrderPlaced | Async (event bus) |
| Payment | Order | PaymentCaptured | Async (event bus) |
| Payment | Inventory | PaymentFailed | Async (event bus) |
| Inventory | Order | LowStockAlert | Async (notification) |
| Order | Shipping | OrderFulfilled | Async (event bus) |

### Anti-Corruption Layer Example

```typescript
// Order context consumes Catalog data through an ACL
// Catalog uses "Product" but Order translates to "OrderableItem"

interface OrderableItem {
  skuId: string;
  name: string;
  unitPrice: Money;
  available: boolean;
}

class CatalogTranslator {
  constructor(private catalogClient: CatalogClient) {}

  async getOrderableItem(productId: string): Promise<OrderableItem> {
    const product = await this.catalogClient.getProduct(productId);
    return {
      skuId: product.variants[0].sku,
      name: product.title,
      unitPrice: { amount: product.price.amount, currency: product.price.iso },
      available: product.status === "active",
    };
  }
}
```

## Key Points
- Each context has its own definition of shared concepts: "Product" in Catalog is a rich entity with images/descriptions; in Order it's just a SKU + price snapshot.
- Events are the primary integration pattern. No context directly queries another's database. This allows independent deployment and scaling.
- Reservations with TTL prevent inventory deadlocks: if payment doesn't confirm within 15 minutes, stock is automatically released.
