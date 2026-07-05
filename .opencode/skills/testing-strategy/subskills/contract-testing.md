---
type: subskill
title: "Contract Testing"
---

# Contract Testing

Consumer-driven contract testing verifies service boundaries WITHOUT deploying the full system. It replaces slow, flaky end-to-end integration for API compatibility.

## Purpose

The consumer defines what it expects from a provider (a contract). The provider verifies in its own CI that it can fulfill every consumer's contract. No shared environment, no full-system spin-up.

- Consumer expresses: "when I call `GET /users/{id}`, I expect a `200` with `id`, `email`, `name`."
- Provider proves: "I can produce exactly that response."

## Workflow

1. Consumer writes the contract as part of its test suite (mocking the provider against the contract).
2. Contract is published to a broker (or shared repo).
3. Provider fetches all consumer contracts and verifies them in CI.
4. **Break the build on violation** -- a provider change that breaks a consumer expectation fails the provider's pipeline before merge.

## Tools

- **Pact** -- polyglot, most popular, has a broker for contract sharing and can-i-deploy checks.
- **Spring Cloud Contract** -- Java/JVM ecosystem.
- **Specmatic** -- OpenAPI-based; the spec itself is the contract.

## What It Catches

- Schema changes, renamed fields, removed endpoints, type changes (string -> int), removed required fields, changed status codes.
- Especially valuable for AI-edited services: catches schema drift when an AI agent modifies a response shape without knowing who consumes it.

## What It Does NOT Cover

- Business logic correctness (a field can be present but hold a wrong value).
- Performance, latency, throughput.
- Security, auth semantics.

Contract tests prove the shape of the conversation, not the meaning. Cover those with unit, property, and integration tests.

## Anti-Patterns

- **Provider-driven contracts**: the provider dictates the shape. This defeats the purpose -- the point is that consumers declare their real needs.
- **Too many contracts**: keep one contract per consumer-provider pair, scoped to what that consumer actually uses.
- **Testing implementation details**: contracts describe the observable interface, not internal fields the consumer ignores.
- **Skipping the broker**: without `can-i-deploy` gating, contracts become documentation instead of enforcement.
