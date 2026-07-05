---
type: example
title: "API Reference Page Template"
---

# API Reference Page Template

## Context

Standard layout for individual API endpoint documentation in a developer portal. Optimized for quick scanning and copy-paste usage.

## Template

```markdown
# Create Order

Creates a new order for the authenticated user.

## Endpoint

`POST /api/v1/orders`

## Authentication

Bearer token required. Scope: `orders:write`

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer {access_token} |
| Content-Type | Yes | application/json |
| Idempotency-Key | Recommended | UUID for safe retries |

### Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| items | array | Yes | Order line items |
| items[].sku | string | Yes | Product SKU |
| items[].quantity | integer | Yes | Quantity (1-100) |
| shipping_address | object | Yes | Delivery address |
| metadata | object | No | Custom key-value pairs |

### Example Request

\```bash
curl -X POST https://api.example.com/api/v1/orders \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "items": [{"sku": "WIDGET-001", "quantity": 2}],
    "shipping_address": {
      "line1": "123 Main St",
      "city": "Portland",
      "state": "OR",
      "postal_code": "97201",
      "country": "US"
    }
  }'
\```

## Response

### 201 Created

\```json
{
  "id": "ord_abc123",
  "status": "pending",
  "items": [{"sku": "WIDGET-001", "quantity": 2, "unit_price": 1999}],
  "total": 3998,
  "currency": "usd",
  "created_at": "2026-01-15T10:30:00Z"
}
\```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | invalid_request | Missing required field |
| 401 | unauthorized | Invalid or expired token |
| 409 | duplicate_request | Idempotency key already used |
| 422 | validation_error | Invalid field value |
| 429 | rate_limited | Too many requests |

## Rate Limits

- 100 requests/minute per API key
- Burst: 20 requests/second
```

## Key Points

- Always show authentication requirements prominently
- Include real curl examples that can be copy-pasted (with placeholder values)
- Document error responses as thoroughly as success responses
- Idempotency patterns shown where relevant
