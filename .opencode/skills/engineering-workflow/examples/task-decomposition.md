# Task Decomposition Example

## Original Task

"Add real-time notifications to the platform"

## Decomposition Process

### Step 1: Identify the Core Deliverables

- Users receive push notifications for events they subscribe to
- Notifications are delivered within 5 seconds of the triggering event
- Users can configure notification preferences per channel

### Step 2: Break Into Independent Workstreams

**Workstream A: Event Infrastructure**
1. Define event schema (CloudEvents spec)
2. Set up message broker (SNS/SQS or Kafka topic)
3. Implement event publisher in existing services
4. Write integration tests for event flow

**Workstream B: Notification Service**
1. Create notification service skeleton (HTTP + consumer)
2. Implement preference store (DynamoDB)
3. Build channel dispatchers (email, push, in-app)
4. Add retry/dead-letter handling
5. Write unit + integration tests

**Workstream C: Client Integration**
1. WebSocket connection manager
2. Notification UI component
3. Preference settings page
4. E2E tests

### Step 3: Define Dependencies

```
A1 -> A2 -> A3 (sequential within workstream)
A3 -> B3 (publisher needed before dispatcher can receive)
B1 -> B2 -> B3 -> B4 (sequential)
B3 -> C1 (service needed before client connects)
C1 -> C2 -> C3 (sequential)
```

### Step 4: Identify the Critical Path

A1 -> A2 -> A3 -> B3 -> C1 -> C2 (longest chain)

### Step 5: Assign and Parallelize

- Week 1: A1-A3 (backend), C3 preference UI (frontend, no dependency)
- Week 2: B1-B4 (backend), C1-C2 (frontend, after B3)
- Week 3: Integration, E2E tests, load test
