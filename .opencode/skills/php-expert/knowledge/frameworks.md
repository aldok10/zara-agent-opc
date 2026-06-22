# PHP Frameworks & Tools Reference

## Framework Selection (It Depends)

| Need | Choose | Why |
|------|--------|-----|
| Full-featured web app | Laravel | Rich ecosystem, Eloquent, queues, Octane |
| Enterprise, strict arch | Symfony | Components, Messenger, upgrade path |
| High-QPS microservice | Hyperf | Swoole-native, coroutine DI, connection pooling |
| Laravel syntax + coroutines | Hypervel | Laravel API on Swoole engine |
| Pure PHP WebSocket/TCP | Workerman | No extension needed, event-driven |
| Minimal API/microservice | Slim | PSR-7/15, ~50KB, bring your own |
| Static files + PHP | FrankenPHP | Single binary, auto-TLS, Mercure |

## Code Quality Tools - CI Pipeline Order

```bash
vendor/bin/pint --test              # 1. Style (fast, catches formatting)
vendor/bin/phpstan analyse          # 2. Static analysis (catches type bugs)
vendor/bin/pest --parallel          # 3. Tests (catches logic bugs)
vendor/bin/infection --min-msi=80   # 4. Mutation (catches weak tests)
```

| Tool | Purpose | Config File |
|------|---------|------------|
| PHPStan level 8+ | Types, dead code, nullability | `phpstan.neon` |
| Psalm level 1 | Taint analysis (security), types | `psalm.xml` |
| PHP-CS-Fixer / Pint | PER Coding Style enforcement | `.php-cs-fixer.php` / `pint.json` |
| PHPMD | Complexity, unused, naming | `phpmd.xml` |
| Rector | Auto-upgrade PHP + refactor | `rector.php` |
| Infection | Mutation testing (test quality) | `infection.json5` |

## DDD Quick Reference

```
src/
├── Order/                  # Bounded Context
│   ├── Application/        # Commands, Queries, Handlers
│   ├── Domain/             # Entities, VOs, Events, Repo interfaces
│   └── Infrastructure/     # Doctrine repos, API clients
└── SharedKernel/           # Shared VOs, event contracts
```

- Aggregate = entity cluster with single root entry
- Value Object = `readonly class Money { ... }` (immutable, by-value equality)
- Repository interface in Domain, implementation in Infrastructure
- Domain Events dispatched after state change (PSR-14)
- Command bus: Symfony Messenger / Ecotone / custom

## Laravel Octane Gotchas

- No static/singleton state between requests
- Reset container scoped instances after each request
- Don't rely on `$_GET`/`$_POST`/`$_SERVER` directly
- Use `Octane::concurrently()` for parallel I/O
- `max_requests` setting prevents memory leaks
