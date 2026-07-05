---
type: subskill
title: "C4 Notation"
---

# C4 Notation

Context, Container, Component, and Code diagrams for software architecture visualization.

## When to Load

- Documenting software architecture at multiple zoom levels
- Communicating system design to different audiences
- Creating architecture diagrams that are maintainable over time
- Choosing the right level of detail for the audience

## Key Concepts

**Level 1: System Context** -- Highest level. Your system as a box, surrounded by users and external systems. Answers: "What does the system do and who uses it?" Audience: everyone.

**Level 2: Container** -- Zoom into your system. Shows applications, data stores, message brokers. Answers: "What are the main technical building blocks?" Audience: technical staff.

**Level 3: Component** -- Zoom into one container. Shows internal components, services, modules. Answers: "How is this container structured?" Audience: developers on that team.

**Level 4: Code** -- Zoom into one component. Class diagrams, ERDs. Rarely maintained manually -- generate from code. Audience: developers working on that specific code.

**Notation** -- Person (stick figure), Software System (box), Container (box with technology label), Component (box with stereotype). Relationships: arrows with verb labels and protocol/technology.

## Patterns

```
# Level 1: System Context (Mermaid C4)
C4Context
    title System Context - Order Platform

    Person(customer, "Customer", "Places orders via web/mobile")
    Person(admin, "Admin", "Manages products and orders")

    System(platform, "Order Platform", "Handles order lifecycle")

    System_Ext(payment, "Payment Gateway", "Processes payments")
    System_Ext(shipping, "Shipping Provider", "Handles delivery")
    System_Ext(email, "Email Service", "Sends notifications")

    Rel(customer, platform, "Places orders", "HTTPS")
    Rel(admin, platform, "Manages", "HTTPS")
    Rel(platform, payment, "Charges cards", "HTTPS/REST")
    Rel(platform, shipping, "Creates shipments", "HTTPS/REST")
    Rel(platform, email, "Sends emails", "SMTP")
```

```
# Level 2: Container
C4Container
    title Container Diagram - Order Platform

    Person(customer, "Customer")

    System_Boundary(platform, "Order Platform") {
        Container(spa, "Web App", "React", "Single-page application")
        Container(api, "API Service", "Node.js/Express", "REST API")
        Container(worker, "Order Worker", "Node.js", "Async order processing")
        ContainerDb(db, "Database", "PostgreSQL", "Orders, products, users")
        ContainerQueue(queue, "Message Queue", "RabbitMQ", "Order events")
        Container(cache, "Cache", "Redis", "Session + product cache")
    }

    Rel(customer, spa, "Uses", "HTTPS")
    Rel(spa, api, "Calls", "HTTPS/JSON")
    Rel(api, db, "Reads/writes", "TCP/SQL")
    Rel(api, queue, "Publishes", "AMQP")
    Rel(worker, queue, "Consumes", "AMQP")
    Rel(worker, db, "Updates", "TCP/SQL")
    Rel(api, cache, "Reads/writes", "TCP")
```

```
# Structurizr DSL (alternative tooling)
workspace {
    model {
        customer = person "Customer"
        platform = softwareSystem "Order Platform" {
            api = container "API Service" "Node.js" "REST API"
            db = container "Database" "PostgreSQL" "Stores orders"
        }
        customer -> api "Places orders" "HTTPS"
        api -> db "Reads/writes" "SQL"
    }
    views {
        systemContext platform "context" { include * autoLayout }
        container platform "containers" { include * autoLayout }
    }
}
```

## Gotchas

- Level 3 (Component) diagrams go stale fast -- only maintain for critical/complex containers
- Level 4 should be generated, never hand-drawn -- it will be wrong within a week
- Missing technology labels on containers make diagrams ambiguous (is it a queue or a database?)
- Relationship labels should be verbs ("Sends orders to") not nouns ("Order data")
- Too many elements at one level (>15) means you need to split or go one level deeper

## Verification

- Level 1 is understandable by non-technical stakeholders (no jargon)
- Level 2 shows all deployment units (things that are separately deployable)
- Every relationship has: direction, verb label, and technology/protocol
- Diagram matches current architecture (review quarterly or after major changes)
- Supplementary text explains key decisions not visible in the diagram
