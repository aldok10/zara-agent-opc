---
type: fact
title: "Mermaid Reference"
---

# Mermaid Reference

Syntax guide for creating diagrams in Mermaid (natively rendered by GitHub, GitLab, and most doc platforms).

## Diagram Types

### Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

Direction options: `TD` (top-down), `LR` (left-right), `BT` (bottom-top), `RL` (right-left)

Node shapes:
- `[text]` -- rectangle
- `(text)` -- rounded rectangle
- `{text}` -- diamond (decision)
- `[(text)]` -- cylinder (database)
- `[[text]]` -- subroutine
- `((text))` -- circle

Edge types:
- `-->` -- arrow
- `---` -- line (no arrow)
- `-.->` -- dotted arrow
- `==>` -- thick arrow
- `-->|label|` -- labeled edge

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Gateway
    participant S as Service
    participant D as Database

    C->>A: POST /tasks
    A->>A: Validate JWT
    A->>S: CreateTask(payload)
    S->>D: INSERT INTO tasks
    D-->>S: task_id
    S-->>A: Task{id, status}
    A-->>C: 201 Created
```

Arrow types:
- `->>` -- solid arrow (synchronous)
- `-->>` -- dashed arrow (response)
- `--)` -- async message (no response expected)
- `--x` -- cross (failure/rejection)

Grouping:
```mermaid
sequenceDiagram
    rect rgb(240, 240, 240)
        Note over A,B: Authentication Flow
        A->>B: Request
        B-->>A: Response
    end
```

### Class Diagram

```mermaid
classDiagram
    class Order {
        +String id
        +OrderStatus status
        +DateTime createdAt
        +List~OrderItem~ items
        +place()
        +cancel()
        +complete()
    }

    class OrderItem {
        +String productId
        +int quantity
        +Money price
    }

    Order "1" --> "*" OrderItem : contains
```

Relationships:
- `-->` -- association
- `--|>` -- inheritance
- `..|>` -- implementation
- `--*` -- composition
- `--o` -- aggregation

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Open
    Open --> InProgress : assign
    InProgress --> Done : complete
    InProgress --> Open : unassign
    Done --> [*]
    Open --> Cancelled : cancel
    Cancelled --> [*]
```

### Entity Relationship

```mermaid
erDiagram
    USER ||--o{ TASK : creates
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ TASK : contains
    TASK }o--o{ LABEL : tagged_with

    USER {
        uuid id PK
        string email UK
        string name
    }

    TASK {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        string title
        enum status
    }
```

Cardinality:
- `||` -- exactly one
- `o|` -- zero or one
- `}|` -- one or more
- `}o` -- zero or more

### C4 Context (using Mermaid C4 extension)

```mermaid
C4Context
    Person(user, "Developer", "Uses the API")
    System(api, "Task API", "Manages tasks and projects")
    System_Ext(auth, "Auth Provider", "Handles authentication")

    Rel(user, api, "Creates tasks", "HTTPS/REST")
    Rel(api, auth, "Validates tokens", "HTTPS")
```

## Styling

### Theme

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart LR
    A --> B
```

Available themes: `default`, `neutral`, `dark`, `forest`

### Custom Styles

```mermaid
flowchart LR
    A[Service A]:::internal --> B[Service B]:::internal
    B --> C[External API]:::external

    classDef internal fill:#4a90d9,stroke:#2c5f8a,color:#fff
    classDef external fill:#999,stroke:#666,color:#fff
```

## Complexity Limits

| Diagram type | Max elements | If exceeded |
|--------------|-------------|-------------|
| Flowchart | 12 nodes | Split into sub-diagrams |
| Sequence | 7 participants, 15 interactions | Split into phases |
| Class | 8 classes | Focus on one bounded context |
| ER | 10 entities | Split by domain/module |
| State | 8 states | Decompose into nested states |

## Best Practices

1. Title every diagram with a comment: `%% Order Processing Flow`
2. Use aliases for long names: `participant GW as API Gateway`
3. Group related interactions in sequence diagrams using `rect`
4. Use consistent node naming: PascalCase for systems, camelCase for actions
5. Keep labels short (under 5 words)
6. Use notes for clarification: `Note over A,B: Async via queue`
7. Test rendering in target platform before committing
