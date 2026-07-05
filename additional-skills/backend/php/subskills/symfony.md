# Symfony 7

## When to Load

Symfony-specific: Messenger, Workflow, Scheduler, DI container, Twig, Stimulus/Turbo, security voters, console commands.

## Key Patterns

### Application Structure

```
src/
  Domain/           -- Pure PHP: entities, value objects, repository interfaces, events
  Application/      -- Use cases: command/query handlers, DTOs
  Infrastructure/   -- Doctrine repos, external APIs, filesystem
  Presentation/
    Controller/     -- Thin HTTP controllers (#[Route] attributes)
    Twig/           -- Twig extensions, components
    Console/        -- CLI commands (AsCommand attribute)
```

### Dependency Injection

- Autowiring enabled for `src/` namespace.
- Interfaces bound explicitly in `services.yaml`.
- Use `#[Autoconfigure]` and `#[AsAlias]` attributes.
- Tagged services for plugin architectures (`#[AutoconfigureTag]`).
- Compiler passes for advanced container manipulation only.

### Messenger (Async)

- Command bus: one handler per message, `#[AsMessageHandler]`.
- Transports: `doctrine://`, `amqp://`, `redis://` based on durability needs.
- Retry strategy: `max_retries`, `delay`, `multiplier` per transport.
- Stamps for metadata: `DelayStamp`, `TransportNamesStamp`.
- Failure transport for dead letters  -  monitor and replay.

### Workflow Component

- Define states and transitions in PHP config or YAML.
- Guard events for authorization checks on transitions.
- `WorkflowInterface` injected, not static calls.
- Marking store: single-state vs multi-state (places).
- Audit trail via event subscribers on `workflow.transition`.

### Scheduler (Symfony 6.3+)

- `#[AsSchedule]` attribute on schedule providers.
- `#[AsCronTask]` or `#[AsPeriodicTask]` on message classes.
- Replaces ext-cron for application-level scheduling.
- Triggers: `CronExpressionTrigger`, `PeriodicalTrigger`, `CallbackTrigger`.

### Security

- Voters for authorization (`#[IsGranted]` attribute on controllers).
- Custom authenticators via `AuthenticatorInterface`.
- Access token authentication for APIs (`AccessTokenExtractor`).
- Hierarchical roles in `security.yaml`.

### Stimulus/Turbo (Live Components)

- `#[AsLiveComponent]` for reactive server-rendered components.
- `#[LiveProp]` for stateful properties with writable control.
- `#[LiveAction]` for server-side event handlers.
- Turbo Streams for partial page updates without JS.

## Constraints

1. No `ContainerInterface` injection  -  always inject specific services.
2. Controllers must be invokable or max 5 actions.
3. Doctrine entities: no logic beyond invariants. Business logic in domain services.
4. Never use `EntityManager` directly in controllers  -  use repository pattern.
5. All routes via attributes (`#[Route]`), not YAML (consistency).
6. Event subscribers over listeners (explicit priority, multiple events).
7. DTOs for Messenger messages  -  never entities on the bus.
8. Twig: no PHP logic  -  use Twig extensions for complex rendering.

## Testing

- `WebTestCase` for functional tests with `KernelBrowser`.
- `$this->getContainer()->get()` for service testing.
- Messenger: `transport.test` in `messenger.yaml` for assertions.
- Doctrine: `DAMADoctrineTestBundle` for transaction wrapping.
- Security: `$client->loginUser()` for authenticated requests.

## Verify

- `bin/console lint:container`  -  DI container valid.
- `bin/console debug:router`  -  routes resolve correctly.
- `bin/console messenger:stats`  -  transport health.
- `bin/phpunit`  -  all green.
