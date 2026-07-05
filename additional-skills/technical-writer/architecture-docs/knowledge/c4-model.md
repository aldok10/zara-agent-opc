# C4 Model

Framework for visualizing software architecture at four levels of abstraction.

## The Four Levels

### Level 1: System Context

Shows the software system as a single box surrounded by its users and external systems.

**Purpose:** Answer "what does this system do and who uses it?"

**Contains:**
- The system under description (single box)
- People (users, actors, roles)
- External systems (other software the system interacts with)

**Rules:**
- One diagram per bounded context or product
- Max 10 elements -- if more, you have multiple systems
- Focus on relationships (who talks to who), not internals
- Label every relationship with verb phrase and protocol where relevant

### Level 2: Container

Zooms into the system box to show deployable units (applications, data stores, message queues).

**Purpose:** Answer "what are the high-level technical building blocks?"

**Contains:**
- Web applications, APIs, mobile apps
- Databases, file stores, caches
- Message brokers, queues, event buses
- Background workers, scheduled jobs

**Rules:**
- A "container" is a separately deployable unit -- not a Docker container specifically
- Show technology choices: "PostgreSQL 16", "Go API", "React SPA"
- Show communication protocols: HTTP/REST, gRPC, AMQP, WebSocket
- Include data stores with data they hold (not schema detail)

### Level 3: Component

Zooms into one container to show its major structural building blocks.

**Purpose:** Answer "how is this container organized internally?"

**Contains:**
- Major components/modules within a single deployable unit
- Their responsibilities and interactions
- External interfaces consumed or provided

**Rules:**
- Only create for complex containers -- skip for simple CRUD services
- Max 12 components per diagram -- decompose further if needed
- Components map to coarse-grained modules, not individual classes
- Show which components talk to external systems (database, APIs)

### Level 4: Code

Class diagrams or similar showing internal structure of a single component.

**Purpose:** Answer "how is this component implemented?"

**Rules:**
- Rarely needed -- only for genuinely complex algorithms or patterns
- Auto-generate from code when possible (UML tools, IDE exports)
- Keep in sync or delete -- stale code diagrams are harmful
- Prefer reading the actual code over maintaining this level

## Diagram Conventions

| Element | Shape | Color |
|---------|-------|-------|
| Person | Stick figure or rounded box | None (outline) |
| Internal system/container | Box | Blue |
| External system | Box | Grey |
| Database | Cylinder | Green |
| Message queue | Rounded rectangle | Orange |

## Relationship Labels

Format: `[Source] --[verb phrase + protocol]--> [Target]`

Good: "Sends order events via AMQP"
Good: "Reads user profiles via gRPC"
Bad: "Communicates with"
Bad: "Uses"

## When to Use Each Level

| Audience | Level | Purpose |
|----------|-------|---------|
| Business stakeholders | Context | System purpose and boundaries |
| Architects, tech leads | Container | Technology decisions, deployment units |
| Developers on a team | Component | Internal organization of their service |
| New developers | Code | Understanding complex internals |

## Common Mistakes

1. Mixing levels -- showing classes inside a context diagram
2. Too many elements -- diagrams become unreadable past 12 items
3. Missing relationships -- boxes without arrows are meaningless
4. No technology labels -- "API" vs "Go REST API on Cloud Run" (be specific)
5. Treating containers as Docker containers -- it is a broader concept
6. Creating component diagrams for trivial services -- overhead with no value
7. Stale diagrams -- an inaccurate diagram is worse than no diagram

## Rendering Tools

| Tool | Best for | Format |
|------|----------|--------|
| Structurizr DSL | Full C4 model management | `.dsl` workspace files |
| Mermaid C4 | Inline in markdown | ```mermaid block |
| D2 | Complex layout needs | `.d2` files |
| PlantUML C4 | Legacy projects already using it | `.puml` files |

## Maintenance Cadence

- System Context: review when system boundaries change (new integrations, removed systems)
- Container: review quarterly or when new deployable units are added/removed
- Component: review when team restructures container internals
- Code: avoid maintaining manually -- auto-generate or delete
