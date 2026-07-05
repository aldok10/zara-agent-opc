---
type: subskill
title: "Input Validation"
---

# Input Validation

## Core Concepts
- All external input is untrusted: request params, headers, file uploads, API payloads
- Validation strategy: allowlist (define what's valid) always beats denylist (block known-bad)
- Validation layers: syntactic (format/type), semantic (business rules), contextual (state-dependent)
- Schema validation at API boundaries; type-safe parsing over manual string checks
- Canonicalization before validation prevents encoding bypass attacks

## Key Practices
- Validate on server side regardless of client-side checks (client is attacker-controlled)
- Use structured schemas (JSON Schema, Zod, io-ts) for type + constraint enforcement
- Enforce length limits, character sets, and numeric ranges at every input point
- Reject early: fail on first invalid input rather than collecting partial data
- Normalize Unicode and decode URL-encoding before applying validation rules

## Common Mistakes
- Validating only at the presentation layer, leaving service/data layers exposed
- Using regex denylist for SQL/XSS (incomplete coverage, bypass-prone)
- Trusting content-type headers without verifying actual payload structure

## When to Apply
- Implementing API endpoints that accept user data
- Processing file uploads or form submissions
- Integrating with external systems where payload format is not guaranteed
