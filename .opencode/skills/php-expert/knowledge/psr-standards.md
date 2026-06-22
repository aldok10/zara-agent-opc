# PSR Standards Reference

| PSR | Name | Status | Purpose |
|-----|------|--------|---------|
| 1 | Basic Coding Standard | Accepted | `<?php`, StudlyCaps classes, camelCase methods, UPPER_CASE constants |
| 3 | Logger Interface | Accepted | `LoggerInterface` with 8 severity methods |
| 4 | Autoloading | Accepted | Namespace → directory mapping |
| 6 | Caching Interface | Accepted | `CacheItemPoolInterface`, `CacheItemInterface` |
| 7 | HTTP Message | Accepted | Immutable `RequestInterface`, `ResponseInterface`, `StreamInterface` |
| 11 | Container Interface | Accepted | `ContainerInterface::get($id)`, `has($id)` |
| 12 | Extended Coding Style | Accepted | Superseded by PER Coding Style |
| 13 | Hypermedia Links | Accepted | `LinkInterface`, `LinkProviderInterface` |
| 14 | Event Dispatcher | Accepted | `EventDispatcherInterface`, `ListenerProviderInterface`, `StoppableEventInterface` |
| 15 | HTTP Handlers | Accepted | `RequestHandlerInterface`, `MiddlewareInterface` |
| 16 | Simple Cache | Accepted | `CacheInterface` with get/set/delete/clear |
| 17 | HTTP Factories | Accepted | Factory interfaces for PSR-7 objects |
| 18 | HTTP Client | Accepted | `ClientInterface::sendRequest()` - no throw on 4xx/5xx |
| 20 | Clock | Accepted | `ClockInterface::now(): DateTimeImmutable` |

## PER Coding Style (replaces PSR-12)

- Trailing commas required on multi-line, forbidden on single-line
- Property hooks: opening brace on same line
- Asymmetric visibility: `public private(set) string $name`
- `new Foo()->method()` preferred (no wrapping parens)
- Named args: `foo(name: $value)` - no space before colon
