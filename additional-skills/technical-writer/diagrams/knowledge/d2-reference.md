---
type: fact
title: "D2 Reference"
---

# D2 Reference

Syntax guide for D2 -- a modern diagram-as-code language with advanced layout and styling.

## Basic Syntax

```d2
# Nodes (auto-created on first mention)
client: Web Client
server: API Server
database: PostgreSQL {
  shape: cylinder
}

# Connections
client -> server: HTTPS/REST
server -> database: SQL queries
```

## Shapes

```d2
rectangle: Default Rectangle
oval: Oval Node {shape: oval}
cylinder: Database {shape: cylinder}
queue: Message Queue {shape: queue}
cloud: Cloud Service {shape: cloud}
diamond: Decision {shape: diamond}
hexagon: Worker {shape: hexagon}
package: Package {shape: package}
```

## Containers (Nesting)

```d2
backend: Backend Services {
  api: API Gateway
  auth: Auth Service
  orders: Order Service

  api -> auth: validate token
  api -> orders: forward request
}

frontend: Web App
frontend -> backend.api: HTTPS
```

Containers create visual groupings. Connections can cross boundaries using dot notation.

## Connections

```d2
# Direction and style
a -> b: solid arrow
a -- b: no arrow
a <-> b: bidirectional
a -> b: {
  style.stroke-dash: 3  # dashed line
}

# Multiple connections between same nodes
a -> b: read
a -> b: write {
  style.stroke: "#e74c3c"
}
```

## Labels and Icons

```d2
server: API Server {
  icon: https://icons.terrastruct.com/tech/server.svg
  tooltip: Handles all incoming HTTP requests
}

# Markdown in labels
docs: |md
  ## Documentation
  - API Reference
  - Guides
|
```

## Sequence Diagrams

```d2
shape: sequence_diagram

client: Browser
gateway: API Gateway
service: Order Service
db: Database

client -> gateway: POST /orders
gateway -> gateway: Validate JWT
gateway -> service: CreateOrder(data)
service -> db: INSERT
db -> service: order_id
service -> gateway: Order{201}
gateway -> client: 201 Created {
  style.stroke: green
}
```

## Classes and Styling

```d2
classes: {
  internal: {
    style.fill: "#4a90d9"
    style.font-color: "#fff"
    style.stroke: "#2c5f8a"
  }
  external: {
    style.fill: "#999"
    style.font-color: "#fff"
    style.stroke: "#666"
  }
  database: {
    shape: cylinder
    style.fill: "#27ae60"
    style.font-color: "#fff"
  }
}

api: API Server {class: internal}
stripe: Stripe {class: external}
pg: PostgreSQL {class: database}
```

## Layout

D2 supports multiple layout engines:

| Engine | Best for | Flag |
|--------|----------|------|
| dagre | Simple flowcharts | `--layout dagre` |
| elk | Large diagrams, orthogonal edges | `--layout elk` |
| tala | Production quality, minimal crossings | `--layout tala` (paid) |

Force direction:
```d2
direction: right  # left, right, up, down
```

## Grid Layout

```d2
grid-rows: 3
grid-columns: 4

cell1: Service A
cell2: Service B
cell3: Service C
cell4: Service D
```

## Layers and Scenarios

```d2
layers: {
  current: {
    title: Current Architecture
    a -> b
  }
  future: {
    title: Target Architecture
    a -> c -> b
  }
}
```

Use layers for:
- Current vs target state architecture
- Different deployment environments
- Progressive complexity (overview -> detail)

## Composition (Imports)

```d2
# base.d2
...@./shared/styles.d2

# In shared/styles.d2
classes: {
  internal: { ... }
}
```

Split large diagrams into composable files.

## CLI Usage

```bash
# Render to SVG
d2 input.d2 output.svg

# Watch mode (auto-render on save)
d2 --watch input.d2 output.svg

# Specify layout
d2 --layout elk input.d2 output.svg

# Export to PNG
d2 --format png input.d2 output.png
```

## Best Practices

1. Use containers to group related services (do not flatten everything)
2. Apply consistent styling via classes (not inline on every node)
3. Keep connection labels short -- verb + protocol
4. Use `direction: right` for data flow diagrams, `direction: down` for hierarchies
5. Split diagrams over 12 nodes into multiple files with imports
6. Use layers for current/target state comparisons
7. Store `.d2` files alongside the documentation they support
8. Use tala layout engine for production/presentation diagrams
9. Test rendering in CI -- broken diagrams should fail the build
