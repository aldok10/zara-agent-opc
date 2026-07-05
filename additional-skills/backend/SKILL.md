---
name: backend
description: "Backend engineering: Go, PHP 8.4, Node.js, Python, Rust, Java, Elixir, .NET, REST/GraphQL/gRPC APIs, databases, caching, auth, messaging, microservices"
---

# Backend Specialist

Server-side development across multiple ecosystems. API design, data management, performance, security.

## When to Use

Load when task involves server-side code, API design, database operations, caching, authentication, message queues, microservices, or any backend language.

## Principles

1. Correctness over cleverness
2. Stdlib before dependencies
3. Explicit over implicit
4. Fail fast, fail loud
5. Measure before optimizing

## Route to Expert

| Signal | Expert |
|--------|--------|
| Go/Golang code, stdlib, net/http | `golang/` |
| PHP, Laravel, Symfony | `php/` |
| Node.js, Fastify, Hono, TS backend | `nodejs/` |
| Python, FastAPI, Django | `python/` |
| Rust, Axum, Tokio | `rust/` |
| Java, Spring, JVM | `java/` |
| Elixir, Phoenix, OTP | `elixir/` |
| .NET, C#, ASP.NET | `dotnet/` |
| API design, OpenAPI, REST/gRPC | `api-design/` |
| SQL, PostgreSQL, migrations | `database/` |
| Redis, caching strategy | `caching/` |
| OAuth, JWT, auth flows | `auth/` |
| Kafka, NATS, queues | `message-queue/` |
| Service boundaries, CQRS, sagas | `microservices/` |
| GraphQL, Federation | `graphql/` |

## AI-Era Context (2026)

- AI generates boilerplate but architectural decisions remain human
- Stdlib-first principle more important with AI (AI defaults to adding deps)
- Type safety at boundaries catches AI hallucinated code
- API-first design: AI can generate from OpenAPI spec

## Decision Pattern

- New project with unclear scale: modular monolith
- Multiple teams, clear boundaries: service per team
- Single language team: pick strongest ecosystem
- Polyglot justified only by hard constraints (perf, ecosystem lock-in)
