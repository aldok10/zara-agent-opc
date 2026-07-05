---
type: fact
title: "Spring Modulith: module boundaries, events, testing"
---

# Spring Modulith

Architectural framework for modular monoliths in Spring Boot. Enforces module boundaries without the overhead of microservices.

## Why Modulith

- Microservices add network, deployment, and observability complexity.
- Modular monoliths get clean boundaries with single deployment.
- Migrate to microservices later by extracting modules — boundaries are already defined.

## Module Structure

```
com.example.app/
├── Application.java               // @SpringBootApplication
├── order/                          // Application module (auto-detected)
│   ├── Order.java                  // Public API — exposed to other modules
│   ├── OrderService.java           // Public API
│   ├── OrderCreated.java           // Event — the integration contract
│   └── internal/                   // NOT accessible from other modules
│       ├── OrderRepository.java
│       ├── OrderMapper.java
│       └── JpaOrderEntity.java
├── inventory/
│   ├── InventoryService.java
│   ├── StockReserved.java
│   └── internal/
│       └── InventoryRepository.java
└── shared/                         // Open module — accessible by all
    ├── Money.java
    └── EntityId.java
```

## Module Declaration

```java
// package-info.java in the module root
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {"shared", "notification"}  // explicit dependencies
)
package com.example.app.order;
```

Types in `internal` sub-package are module-private. Only top-level package types are exposed.

## Event-Based Integration

Modules communicate via domain events — no direct service-to-service calls across boundaries.

```java
// In order module — publishes event
@Service
@Transactional
public class OrderService {
    private final ApplicationEventPublisher events;

    public Order complete(OrderId id) {
        Order order = repository.findById(id).orElseThrow();
        order.markCompleted();
        repository.save(order);
        events.publishEvent(new OrderCompleted(order.id(), order.total()));
        return order;
    }
}

// Event record — the public contract
public record OrderCompleted(OrderId orderId, Money total) {}
```

```java
// In inventory module — listens
@Service
public class StockReservationListener {

    @ApplicationModuleListener  // Transactional event listener
    public void on(OrderCompleted event) {
        inventoryService.reserveStock(event.orderId());
    }
}
```

## @ApplicationModuleListener

- Executes in a separate transaction (after the publishing transaction commits).
- Automatically retried on failure (with exponential backoff by default).
- Events persisted to an event publication log — guaranteed delivery.

```java
// Enable event publication log (persistence)
@SpringBootApplication
@EnableApplicationModuleEventPublication
public class Application {}
```

## Testing Module Isolation

```java
@ApplicationModuleTest  // Bootstraps only the "order" module
class OrderModuleTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private AssertablePublishedEvents events;

    @Test
    void completingOrderPublishesEvent() {
        orderService.complete(new OrderId("ORD-1"));

        assertThat(events)
            .contains(OrderCompleted.class)
            .matching(e -> e.orderId().equals(new OrderId("ORD-1")));
    }
}
```

## Verifying Module Structure

```java
@SpringBootTest
class ModularityTest {

    @Test
    void verifyModuleStructure() {
        ApplicationModules.of(Application.class).verify();
        // Fails if:
        // - Module A accesses internal types of Module B
        // - Circular dependencies exist
        // - Module dependencies not declared in allowedDependencies
    }
}
```

## Documenting Modules

```java
@Test
void generateDocumentation() {
    var modules = ApplicationModules.of(Application.class);
    new Documenter(modules)
        .writeModulesAsPlantUml()    // UML diagram
        .writeIndividualModulesAsPlantUml()
        .writeDocumentation();        // Asciidoc
}
```

## Event Externalization

When ready to go async/cross-service:

```java
// Externalize events to Kafka/AMQP without changing producers
@Configuration
public class EventExternalizationConfig {
    @Bean
    EventExternalizationConfiguration eventExternalization() {
        return EventExternalizationConfiguration.externalizing()
            .select(EventExternalizationConfiguration.annotatedAsExternalized())
            .build();
    }
}

@Externalized("orders.completed")  // Topic name
public record OrderCompleted(OrderId orderId, Money total) {}
```

## When to Extract to Microservice

| Signal | Action |
|--------|--------|
| Module needs independent scaling | Extract |
| Module has different deployment cadence | Extract |
| Module needs different tech stack | Extract |
| Team ownership boundaries | Extract |
| "Just because microservices" | Keep as module |
