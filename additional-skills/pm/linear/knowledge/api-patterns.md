# Linear API Patterns

Endpoint: `https://api.linear.app/graphql`
Header: `Authorization: Bearer <LINEAR_API_KEY>`

## Query Issues (filtered)

```graphql
query {
  issues(filter: { team: { key: { eq: "ENG" } }, state: { name: { eq: "In Progress" } } }, first: 50) {
    nodes { id identifier title priority assignee { name } state { name } }
  }
}
```

## Create Issue

```graphql
mutation {
  issueCreate(input: { teamId: "TEAM_ID", title: "Bug: login fails", priority: 1, assigneeId: "USER_ID", stateId: "STATE_ID" }) {
    success issue { id identifier url }
  }
}
```

## Update Issue Status

```graphql
mutation {
  issueUpdate(id: "ISSUE_ID", input: { stateId: "DONE_STATE_ID" }) {
    success issue { id state { name } }
  }
}
```

## List Active Cycle

```graphql
query {
  cycles(filter: { isActive: { eq: true }, team: { key: { eq: "ENG" } } }) {
    nodes { id name startsAt endsAt issues { nodes { id title state { name } } } }
  }
}
```

## List Teams

```graphql
query { teams { nodes { id name key } } }
```

## Search Issues

```graphql
query { issueSearch(query: "auth bug", first: 10) { nodes { id identifier title state { name } } } }
```

## Pagination

All list queries support `first`, `after`, `last`, `before`. Use `pageInfo { hasNextPage endCursor }`.

## Rate Limits

- 1500 requests/hour (API key)
- 60 requests/minute burst
- Use `Retry-After` header on 429

## Initiatives (Multi-Level Hierarchy, 2025)

Up to 5 levels of sub-initiatives. Top-level = company goals, leaf = team-scoped work.

```graphql
query {
  initiatives(first: 20) {
    nodes {
      id name description status targetDate
      children { nodes { id name status } }
      projects { nodes { id name progress } }
    }
  }
}
```

### Create Initiative

```graphql
mutation {
  initiativeCreate(input: { name: "Q1 Platform Reliability", description: "Reduce p99 latency", targetDate: "2025-03-31" }) {
    success initiative { id name url }
  }
}
```

### Initiative Updates (Progress Reporting)

```graphql
mutation {
  initiativeUpdateCreate(input: { initiativeId: "INIT_ID", body: "On track. 3/5 milestones complete.", health: onTrack }) {
    success
  }
}
```

## Linear Asks (Request Management, 2025)

Asks = inbound requests via Slack/email, triaged into Linear issues.

```graphql
query {
  asks(first: 20, filter: { status: { eq: "open" } }) {
    nodes { id title requester { name } createdAt linkedIssue { identifier } }
  }
}
```

### Convert Ask to Issue

```graphql
mutation {
  askUpdate(id: "ASK_ID", input: { issueId: "ISSUE_ID" }) {
    success
  }
}
```

## Product Intelligence (AI Insights, Tech Preview)

Not yet in public API. Available in UI only. Surfaces:
- Bottleneck detection (issues stuck in state)
- Cycle time anomalies
- Scope creep alerts per cycle
- Team load distribution recommendations

Monitor `linear.app/changelog` for API exposure.
