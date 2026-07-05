---
type: fact
title: "Spring DI: constructor injection, qualifiers, profiles, conditional beans"
---

# Dependency Injection in Spring

## Constructor Injection (the only way)

```java
@Service
public class OrderService {
    private final OrderRepository repository;
    private final PaymentGateway paymentGateway;
    private final EventPublisher events;

    // Single constructor  -  @Autowired is implicit
    public OrderService(OrderRepository repository,
                        PaymentGateway paymentGateway,
                        EventPublisher events) {
        this.repository = repository;
        this.paymentGateway = paymentGateway;
        this.events = events;
    }
}
```

Why constructor injection:
- **Immutability**  -  final fields, set once.
- **Testability**  -  pass mocks directly in tests, no Spring context needed.
- **Fail-fast**  -  missing dependency = compile error (or startup failure), not NPE at runtime.
- **Explicit dependencies**  -  constructor shows what the class needs.

## @Qualifier and Custom Annotations

```java
// When multiple beans of same type exist
@Service
public class NotificationService {
    private final MessageSender sender;

    public NotificationService(@Qualifier("emailSender") MessageSender sender) {
        this.sender = sender;
    }
}

// Better: custom qualifier annotation
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Qualifier
public @interface Email {}

@Service
public class NotificationService {
    public NotificationService(@Email MessageSender sender) { ... }
}
```

## Conditional Beans

```java
@Configuration
public class IntegrationConfig {

    @Bean
    @ConditionalOnProperty(name = "app.payments.enabled", havingValue = "true")
    public PaymentGateway stripeGateway(StripeProperties props) {
        return new StripePaymentGateway(props);
    }

    @Bean
    @ConditionalOnMissingBean(PaymentGateway.class)
    public PaymentGateway noopGateway() {
        return new NoopPaymentGateway();  // fallback for dev/test
    }

    @Bean
    @ConditionalOnClass(name = "io.micrometer.core.instrument.MeterRegistry")
    public MetricsService metricsService(MeterRegistry registry) {
        return new MetricsService(registry);
    }
}
```

## Profile-Based Beans

```java
@Configuration
@Profile("local")
public class LocalConfig {
    @Bean
    public EmailSender emailSender() {
        return new ConsoleEmailSender();  // prints to stdout
    }
}

@Configuration
@Profile("prod")
public class ProdConfig {
    @Bean
    public EmailSender emailSender(SmtpProperties props) {
        return new SmtpEmailSender(props);
    }
}
```

## Bean Scope

| Scope | Lifecycle | Use Case |
|-------|-----------|----------|
| `singleton` (default) | One per ApplicationContext | Stateless services |
| `prototype` | New instance per injection | Stateful, short-lived objects |
| `request` | One per HTTP request | Request-scoped data |
| `session` | One per HTTP session | Session state (rare in APIs) |

```java
@Bean
@Scope("prototype")
public ReportGenerator reportGenerator() {
    return new ReportGenerator();  // fresh instance each time
}
```

## Configuration Properties (Record-based)

```java
@ConfigurationProperties(prefix = "app.resilience")
public record ResilienceProperties(
    Duration timeout,
    int maxRetries,
    @DefaultValue("100") int circuitBreakerThreshold,
    @DefaultValue("30s") Duration circuitBreakerWait
) {}
```

```yaml
app:
  resilience:
    timeout: 5s
    max-retries: 3
    circuit-breaker-threshold: 50
```

## Lifecycle Hooks

```java
@Component
public class CacheWarmer {
    @PostConstruct
    void warmCache() {
        // runs after dependency injection completes
    }

    @PreDestroy
    void flushCache() {
        // runs on graceful shutdown
    }
}

// Prefer ApplicationRunner for startup logic
@Component
public class DataInitializer implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) {
        // runs after full context is ready
    }
}
```

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `@Autowired` on field | Constructor injection | Untestable, mutable, hidden deps |
| Setter injection | Constructor injection | Optional dependencies unclear |
| `@ComponentScan("com")` | Default scan from `@SpringBootApplication` | Scans too broadly |
| Circular dependencies | Redesign (events, extract shared) | Design smell, fragile startup |
| `@Autowired List<Service>` without order | `@Order` or explicit collection bean | Unpredictable behavior |
| `ApplicationContext.getBean()` (Service Locator) | Constructor injection | Hides dependencies, breaks testability |
