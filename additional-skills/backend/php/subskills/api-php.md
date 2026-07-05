---
type: subskill
title: "API Development in PHP"
---

# API Development in PHP

## When to Load

API Platform, Fractal, resource transformers, API versioning, OpenAPI generation, REST/GraphQL/gRPC.

## API Platform (Symfony)

### Resource Configuration

```php
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
        new Patch(security: "is_granted('ROLE_ADMIN') or object.owner == user"),
    ],
    normalizationContext: ['groups' => ['product:read']],
    denormalizationContext: ['groups' => ['product:write']],
    paginationItemsPerPage: 25,
)]
#[ApiFilter(SearchFilter::class, properties: ['name' => 'partial', 'status' => 'exact'])]
final class Product
{
    #[Groups(['product:read'])]
    public readonly Ulid $id;

    #[Groups(['product:read', 'product:write'])]
    #[Assert\NotBlank]
    public string $name;
}
```

### Key Features

- Auto-generates OpenAPI 3.1 spec from PHP attributes.
- JSON-LD / Hydra / HAL / JSON:API content negotiation.
- State providers/processors replace data providers (API Platform 3.x).
- Custom state processors for write operations (replaces data persisters).
- Subresources via `uriTemplate` on operations.

### State Provider Pattern

```php
#[AsProvider(resourceClass: Product::class)]
final class ProductProvider implements ProviderInterface
{
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        return $this->repository->find($uriVariables['id']);
    }
}
```

## Laravel API Resources

### Resource Transformers

```php
final class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id->toString(),
            'status' => $this->status->value,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'total' => MoneyResource::make($this->total),
            'links' => [
                'self' => route('orders.show', $this),
                'cancel' => $this->when($this->canCancel(), route('orders.cancel', $this)),
            ],
        ];
    }
}
```

### Collection with Pagination

```php
return OrderResource::collection($orders)
    ->additional(['meta' => ['filters_applied' => $request->filters()]]);
```

## Versioning Strategies

| Strategy | Pros | Cons |
|----------|------|------|
| URI (`/v2/orders`) | Simple, clear, cacheable | URL explosion, hard to sunset |
| Header (`Accept: application/vnd.api+json;version=2`) | Clean URLs | Hard to test in browser |
| Query param (`?version=2`) | Easy to test | Pollutes caching |
| Content negotiation | RESTful | Complex implementation |

### Recommended: URI prefix + middleware

```php
Route::prefix('v1')->group(fn () => require 'routes/api/v1.php');
Route::prefix('v2')->group(fn () => require 'routes/api/v2.php');
```

## OpenAPI Generation

- **API Platform**: automatic from attributes  -  zero config.
- **Laravel**: `dedoc/scramble` for auto-generation from types and FormRequests.
- **Framework-agnostic**: `zircote/swagger-php` with `#[OA\*]` attributes.
- Always validate generated spec: `spectral lint openapi.yaml`.

## Fractal (League)

```php
final class OrderTransformer extends TransformerAbstract
{
    protected array $availableIncludes = ['items', 'customer'];

    public function transform(Order $order): array
    {
        return [
            'id' => $order->id->toString(),
            'status' => $order->status->value,
            'total_cents' => $order->total->amount,
            'currency' => $order->total->currency->value,
        ];
    }

    public function includeItems(Order $order): Collection
    {
        return $this->collection($order->items(), new OrderItemTransformer());
    }
}
```

## Best Practices

1. Always return consistent envelope: `{ "data": ..., "meta": ..., "links": ... }`.
2. Use HTTP status codes correctly  -  201 Created, 204 No Content, 422 Unprocessable.
3. Pagination: cursor-based for large datasets, offset for small.
4. Rate limiting via middleware  -  return `X-RateLimit-*` headers.
5. HATEOAS links for discoverability (at minimum: self, next, prev).
6. Error format: RFC 9457 Problem Details (`application/problem+json`).
7. Input validation at API boundary  -  domain layer never sees invalid data.
8. ETag/If-None-Match for conditional requests (caching).

## Security

- Authentication: Bearer token (JWT/Sanctum/Passport)  -  never session for API.
- Authorization: per-operation, not per-endpoint (API Platform `security` attribute).
- Input: validate ALL fields, reject unknown fields (strict mode).
- Output: never expose internal IDs, timestamps, or sensitive fields unintentionally.
- CORS: explicit allowed origins, never `*` in production.

## Verify

- OpenAPI spec validates: `spectral lint`.
- All endpoints return correct status codes.
- Error responses follow RFC 9457.
- Rate limiting headers present.
- No N+1 queries on collection endpoints (check with Debugbar/Telescope).
