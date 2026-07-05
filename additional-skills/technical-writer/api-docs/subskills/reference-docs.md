---
type: subskill
title: "API Reference Documentation"
---

# API Reference Documentation

## Core Concepts
- Reference docs describe every endpoint, method, parameter, and response in a consistent format
- Structure: endpoint path, HTTP method, description, parameters, request body, responses, examples
- Accuracy is non-negotiable - reference docs are the contract between provider and consumer
- Auto-generation from source (OpenAPI/Swagger, JSDoc, godoc) keeps docs synchronized with code
- Versioning: reference docs must match the API version the reader is using

## Key Practices
- Use consistent template per endpoint: summary, authentication, parameters table, response schema, example
- Include both success and error response examples with realistic payloads
- Document rate limits, pagination, and filtering behavior alongside endpoints
- Mark deprecated endpoints clearly with migration path and sunset date
- Provide "Try It" or curl examples that readers can copy and execute immediately

## Common Mistakes
- Documenting only the happy path - missing error codes, edge cases, and constraints
- Stale examples that don't match current API behavior (manual docs drift)
- Mixing tutorial narrative into reference pages (different audiences, different formats)

## When to Apply
- Publishing a new API for external or internal consumers
- Setting up automated docs generation in CI/CD pipeline
- Auditing existing API docs for completeness and accuracy
