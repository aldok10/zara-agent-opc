---
type: subskill
title: "Mermaid Diagrams"
---

# Mermaid Diagrams

Flowcharts, sequence diagrams, class diagrams, state machines, ER diagrams, and Gantt charts using Mermaid.

## When to Load

- Creating diagrams in markdown documentation
- Visualizing system interactions or data flow
- Generating diagrams from text that can live in version control
- Choosing the right diagram type for the content

## Key Concepts

**Flowchart** -- Directed graphs for processes and decisions. Nodes (shapes), edges (arrows with labels). Directions: TB (top-bottom), LR (left-right), BT, RL.

**Sequence Diagram** -- Interactions between participants over time. Messages (sync/async), activations, loops, alt/opt blocks, notes.

**Class Diagram** -- Relationships between types. Inheritance, composition, aggregation, association. Methods and properties with visibility markers.

**State Diagram** -- State transitions for a single entity. States, transitions with triggers, nested states, fork/join for parallelism.

**ER Diagram** -- Entity-relationship for data modeling. Entities, attributes, relationships with cardinality (one-to-many, many-to-many).

## Patterns

```mermaid
flowchart LR
    A[Request] --> B{Authenticated?}
    B -->|Yes| C[Authorize]
    B -->|No| D[401 Unauthorized]
    C --> E{Has Permission?}
    E -->|Yes| F[Process Request]
    E -->|No| G[403 Forbidden]
```

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant S as Service
    participant D as Database

    C->>G: POST /orders
    G->>G: Validate token
    G->>S: Forward request
    S->>D: INSERT order
    D-->>S: OK
    S-->>G: 201 Created
    G-->>C: 201 + order_id
```

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Pending: submit()
    Pending --> Approved: approve()
    Pending --> Rejected: reject()
    Rejected --> Draft: revise()
    Approved --> Published: publish()
    Published --> [*]
```

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER_ITEM }o--|| PRODUCT : references
    USER {
        uuid id PK
        string email UK
        string name
    }
    ORDER {
        uuid id PK
        uuid user_id FK
        enum status
        datetime created_at
    }
```

## Gotchas

- Long labels on edges make diagrams unreadable -- use short labels and add a legend
- Mermaid rendering differs between GitHub, GitLab, Docusaurus, and VS Code preview
- Sequence diagrams with 10+ participants become horizontal scrolling nightmares -- split into sub-diagrams
- State diagrams do not support guards/conditions natively -- use labels on transitions
- ER diagrams in Mermaid have limited attribute type support compared to dedicated tools

## Verification

- Diagram renders correctly in the target platform (preview before committing)
- Flow direction matches reading direction of the surrounding documentation
- All nodes are reachable (no orphaned nodes in flowcharts)
- Sequence diagram message arrows point in the correct direction (request vs response)
- ER cardinality matches the actual database constraints
