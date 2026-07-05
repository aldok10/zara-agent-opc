# Subskill: Spring Boot 3.5+

> Activate when: configuring Spring Boot, working with starters, profiles, actuator, Modulith, or `@ConfigurationProperties`.

## Core Principles

1. **Convention over configuration.** Auto-config does the work. Only override what you need to change.
2. **Starters are curated dependency sets.** Use `spring-boot-starter-*`  -  don't manually manage transitive dependencies.
3. **Profiles for environment-specific config.** `application-{profile}.yml` layering. Never hardcode environment-specific values.
4. **Actuator for observability.** Health checks, metrics, info endpoints. Secure in production.
5. **Modulith for bounded contexts.** Enforce module boundaries within a monolith before splitting to microservices.

## Auto-Configuration

Spring Boot auto-configures beans based on classpath and properties:

```java
// application.yml  -  virtual threads enabled (Spring Boot 3.2+)
spring:
  threads:
    virtual:
      enabled: true
  datasource:
    url: jdbc:postgresql://localhost:5432/app
    hikari:
      maximum-pool-size: 20
```

Override auto-config only when necessary:

```java
@Configuration
@ConditionalOnProperty(name = "app.cache.enabled", havingValue = "true")
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        return new CaffeineCacheManager("users", "products");
    }
}
```

## @ConfigurationProperties with Records

```java
@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
    String host,
    int port,
    @DefaultValue("true") boolean starttls,
    Duration timeout
) {}
```

Enable with `@EnableConfigurationProperties(MailProperties.class)` or `@ConfigurationPropertiesScan`.

## Profiles Strategy

| Profile | Purpose | Example |
|---------|---------|---------|
| `local` | Developer machine, embedded DBs | H2, mock services |
| `test` | CI/CD, Testcontainers | Real DBs in containers |
| `staging` | Pre-production validation | Production-like config |
| `prod` | Production | Secrets from vault, full monitoring |

```java
@Profile("!prod")
@Bean
public DataSource embeddedDataSource() { /* dev-only datasource */ }
```

## Actuator Configuration

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true  # Kubernetes liveness/readiness
  metrics:
    tags:
      application: ${spring.application.name}
```

## Spring Modulith

```java
// Package structure enforces modules
com.example.app/
├── order/          // @ApplicationModule
│   ├── Order.java
│   ├── OrderService.java
│   └── internal/   // not exposed outside module
├── inventory/
│   ├── InventoryService.java
│   └── internal/
└── shared/         // @ApplicationModule(type = OPEN)
    └── Money.java
```

```java
// Cross-module communication via events
@Service
@Transactional
public class OrderService {
    private final ApplicationEventPublisher events;

    public void completeOrder(OrderId id) {
        // ... business logic
        events.publishEvent(new OrderCompleted(id));
    }
}

// In inventory module  -  listens without direct dependency
@Service
public class InventoryListener {
    @ApplicationModuleListener
    public void on(OrderCompleted event) {
        // reduce stock
    }
}
```

## Startup Optimization

- Use `spring.main.lazy-initialization=true` for local dev (not production).
- Profile startup with `spring.application.startup` and `ApplicationStartup`.
- Consider `@ImportRuntimeHints` for GraalVM AOT.
- Use Spring Boot DevTools for fast restart during development.

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `@ComponentScan` with broad base packages | Package-per-module, scan defaults | Picks up unintended beans |
| `@Value("${prop}")` for complex config | `@ConfigurationProperties` record | Type-safe, validated, testable |
| Multiple `@SpringBootApplication` | One per deployable | Confusing classpath scanning |
| `application.properties` with secrets | External config / vault | Security risk |
| Fat controller with business logic | Controller → Service → Repository | Testability, separation |

## Delegates To

- Virtual threads config → `subskills/virtual-threads.md`
- GraalVM native compilation → `subskills/graalvm-native.md`
- Testing Spring Boot apps → `subskills/testing-java.md`
- Module boundary testing → `knowledge/spring-modulith.md`
