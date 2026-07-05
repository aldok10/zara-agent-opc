# PSR Standards Reference

## PSR-4: Autoloading

Maps namespace prefixes to directory paths via `composer.json`.

```json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/",
            "App\\Tests\\": "tests/"
        }
    }
}
```

- One class per file, file name matches class name exactly.
- Namespace structure mirrors directory structure.
- `composer dump-autoload -o` for production (classmap optimization).

## PSR-7 / PSR-17: HTTP Messages & Factories

Immutable HTTP message interfaces  -  request, response, stream, URI.

```php
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

function handle(ServerRequestInterface $request): ResponseInterface
{
    $body = $request->getParsedBody();
    // Messages are immutable  -  withX returns new instance
    return $response->withStatus(200)->withHeader('Content-Type', 'application/json');
}
```

- Implementations: `nyholm/psr7` (lightweight), `guzzlehttp/psr7`, `laminas/laminas-diactoros`.
- PSR-17 factories create PSR-7 objects (framework-agnostic instantiation).

## PSR-15: HTTP Handlers & Middleware

```php
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class AuthMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        if (!$this->isAuthenticated($request)) {
            return $this->responseFactory->createResponse(401);
        }
        return $handler->handle($request->withAttribute('user', $user));
    }
}
```

- `RequestHandlerInterface`: single `handle()` method  -  the final handler.
- `MiddlewareInterface`: wraps handler, can short-circuit or modify request/response.
- Dispatchers: `relay/relay`, `middleware/request-handler`.

## PER Coding Style 2.0 (supersedes PSR-12)

Key rules:
- 4 spaces indentation, no tabs.
- Opening brace on same line for control structures, next line for classes/methods.
- One blank line before `return` (unless only statement).
- `declare(strict_types=1)` on first line after `<?php`.
- Named arguments: no space before colon: `foo(name: $value)`.
- Enums: same rules as classes for formatting.
- Match expressions: cases indented one level.
- Readonly/intersection types: no spaces around `&`.

## PSR-6 / PSR-16: Caching

PSR-6 (pool-based):
```php
$item = $pool->getItem('key');
if (!$item->isHit()) {
    $item->set($computedValue)->expiresAfter(3600);
    $pool->save($item);
}
$value = $item->get();
```

PSR-16 (simple):
```php
$value = $cache->get('key', $default);
$cache->set('key', $value, ttl: 3600);
```

- PSR-16 for simple get/set. PSR-6 for tagging, deferred saves, complex invalidation.
- Implementations: `symfony/cache`, `illuminate/cache`, `phpfastcache`.

## PSR-3: Logging

```php
use Psr\Log\LoggerInterface;

$logger->error('Payment failed', [
    'order_id' => $order->id->toString(),
    'gateway' => $gateway::class,
    'exception' => $e,
]);
```

- 8 levels: emergency, alert, critical, error, warning, notice, info, debug.
- Context array for structured data  -  not string interpolation.
- Implementations: `monolog/monolog` (de facto standard).

## PSR-11: Container Interface

```php
use Psr\Container\ContainerInterface;

// NEVER inject the container  -  inject specific dependencies
// Only use in framework internals and factories
```

- `has()` + `get()`  -  that's it.
- Never inject container directly  -  it's a service locator anti-pattern.
- Type-hint concrete services or interfaces with explicit bindings.

## PSR-14: Event Dispatcher

```php
use Psr\EventDispatcher\EventDispatcherInterface;

$dispatcher->dispatch(new OrderPlaced($order->id));
```

- Stoppable events via `StoppableEventInterface`.
- Listener providers decouple registration from dispatching.
